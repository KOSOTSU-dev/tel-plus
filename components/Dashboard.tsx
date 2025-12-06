'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Profile, Friend } from '@/types';
import ProfileSection from './ProfileSection';
import FriendsList from './FriendsList';
import FriendModal from './FriendModal';
import SettingsModal from './SettingsModal';
import GuestFriendAdd from './GuestFriendAdd';
import { GuestFriend } from '@/types';

export default function Dashboard() {
  const [isGuest, setIsGuest] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
    if (!isGuest) {
      loadPendingRequestCount();
    }

    // フレンド更新イベントをリッスン
    const handleFriendUpdated = () => {
      loadData();
      if (!isGuest) {
        loadPendingRequestCount();
      }
    };

    window.addEventListener('friendUpdated', handleFriendUpdated);

    // フレンド申請のリアルタイム更新
    if (!isGuest) {
      const channel = supabase
        .channel('friend_requests_notification')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friend_requests',
          },
          () => {
            loadPendingRequestCount();
          }
        )
        .subscribe();

      return () => {
        window.removeEventListener('friendUpdated', handleFriendUpdated);
        supabase.removeChannel(channel);
      };
    }

    return () => {
      window.removeEventListener('friendUpdated', handleFriendUpdated);
    };
  }, [isGuest]);

  const loadData = async () => {
    const guestMode = localStorage.getItem('guest_mode') === 'true';
    setIsGuest(guestMode);

    if (guestMode) {
      // ゲストモード: ローカルストレージから読み込み
      const savedProfile = localStorage.getItem('guest_profile');
      const savedFriends = localStorage.getItem('guest_friends');
      
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      } else {
        // 初期プロフィールを作成
        const initialProfile: Profile = {
          id: 'guest',
          user_id: 'guest',
          username: 'guest',
          nickname: 'ごいせ',
          organization: '',
          phone: '',
          public_email: '',
          status: 'available',
          note: '30分ご対応可能',
          friend_code: '00E9VE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem('guest_profile', JSON.stringify(initialProfile));
        setProfile(initialProfile);
      }
      
      if (savedFriends) {
        // ローカルストレージから読み込んだデータをFriend型として扱う
        const parsedFriends = JSON.parse(savedFriends) as Friend[];
        setFriends(parsedFriends);
      } else {
        // 初期サンプルフレンドを作成
        const sampleFriends: Friend[] = [
          {
            id: 'sample1',
            user_id: 'guest',
            friend_id: 'TANAKA01',
            pinned: true,
            order: 0,
            memo: '',
            created_at: new Date().toISOString(),
            friend_profile: {
              id: 'sample1',
              user_id: 'TANAKA01',
              username: 'tanaka',
              nickname: '田中',
              organization: 'サンプル',
              phone: '',
              public_email: '',
              status: 'available',
              note: '30分ご対応可能',
              friend_code: 'TANAKA01',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
          {
            id: 'sample2',
            user_id: 'guest',
            friend_id: 'SATO01',
            pinned: false,
            order: 1,
            memo: '',
            created_at: new Date().toISOString(),
            friend_profile: {
              id: 'sample2',
              user_id: 'SATO01',
              username: 'sato',
              nickname: '佐藤',
              organization: 'サンプル',
              phone: '',
              public_email: '',
              status: 'unavailable',
              note: '会議中',
              friend_code: 'SATO01',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
          {
            id: 'sample3',
            user_id: 'guest',
            friend_id: 'SUZUKI01',
            pinned: false,
            order: 2,
            memo: '',
            created_at: new Date().toISOString(),
            friend_profile: {
              id: 'sample3',
              user_id: 'SUZUKI01',
              username: 'suzuki',
              nickname: '鈴木',
              organization: 'サンプル',
              phone: '',
              public_email: '',
              status: 'emergency',
              note: '緊急のみ',
              friend_code: 'SUZUKI01',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
        ];
        localStorage.setItem('guest_friends', JSON.stringify(sampleFriends));
        setFriends(sampleFriends);
      }
      setLoading(false);
    } else {
      // 通常モード: Supabaseから読み込み
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/');
        return;
      }

      // プロフィール取得
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('プロフィールの取得に失敗しました:', profileError);
      } else if (profileData) {
        setProfile(profileData);
      }

      // フレンド一覧取得
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', user.id)
        .order('pinned', { ascending: false })
        .order('order', { ascending: true });

      if (friendsError && friendsError.code !== 'PGRST116') {
        console.error('フレンド一覧の取得に失敗しました:', friendsError);
      }

      // サンプルフレンドの初期状態を定義
      const defaultSampleFriends: Friend[] = [
        {
          id: 'sample1',
          user_id: user.id,
          friend_id: '00000000-0000-0000-0000-000000000001',
          pinned: true,
          order: 0,
          memo: '',
          created_at: new Date().toISOString(),
          friend_profile: {
            id: 'sample1',
            user_id: '00000000-0000-0000-0000-000000000001',
            username: 'tanaka',
            nickname: '田中',
            organization: 'サンプル',
            phone: '',
            public_email: '',
            status: 'available',
            note: '30分ご対応可能',
            friend_code: 'TANAKA1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        {
          id: 'sample2',
          user_id: user.id,
          friend_id: '00000000-0000-0000-0000-000000000002',
          pinned: false,
          order: 1,
          memo: '',
          created_at: new Date().toISOString(),
          friend_profile: {
            id: 'sample2',
            user_id: '00000000-0000-0000-0000-000000000002',
            username: 'sato',
            nickname: '佐藤',
            organization: 'サンプル',
            phone: '',
            public_email: '',
            status: 'unavailable',
            note: '会議中',
            friend_code: 'SATO001',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        {
          id: 'sample3',
          user_id: user.id,
          friend_id: '00000000-0000-0000-0000-000000000003',
          pinned: false,
          order: 2,
          memo: '',
          created_at: new Date().toISOString(),
          friend_profile: {
            id: 'sample3',
            user_id: '00000000-0000-0000-0000-000000000003',
            username: 'suzuki',
            nickname: '鈴木',
            organization: 'サンプル',
            phone: '',
            public_email: '',
            status: 'emergency',
            note: '緊急のみ',
            friend_code: 'SUZUKI1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
      ];

      // localStorageから保存されたサンプルフレンドの状態を読み込む
      const savedSampleFriends = localStorage.getItem('sample_friends');
      let sampleFriends: Friend[] = defaultSampleFriends;
      if (savedSampleFriends) {
        try {
          const parsed = JSON.parse(savedSampleFriends) as Friend[];
          // デフォルトのサンプルフレンドを基準に、保存された状態をマージ
          sampleFriends = defaultSampleFriends.map(defaultFriend => {
            const saved = parsed.find(p => p.id === defaultFriend.id);
            if (saved) {
              return {
                ...defaultFriend,
                pinned: saved.pinned,
                order: saved.order,
                memo: saved.memo || '',
              };
            }
            return defaultFriend;
          });
        } catch (e) {
          console.error('サンプルフレンドの読み込みに失敗:', e);
        }
      }

      if (friendsData && friendsData.length > 0) {
        // friend_idのリストを取得
        const friendIds = friendsData.map(f => f.friend_id);
        
        // 各friend_idに対応するプロフィールを取得
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', friendIds);

        if (profilesError) {
          console.error('プロフィールの取得に失敗しました:', profilesError);
        }

        // プロフィールをマップに変換して結合
        const profilesMap = new Map<string, Profile>();
        if (profilesData) {
          profilesData.forEach(profile => {
            profilesMap.set(profile.user_id, profile);
          });
        }

        // フレンドデータとプロフィールを結合
        const friendsWithProfiles: Friend[] = friendsData.map(friend => ({
          ...friend,
          friend_profile: profilesMap.get(friend.friend_id),
        }));

        // 実際のフレンドとサンプルフレンドを結合
        // すべてのフレンドを結合してorderでソート
        const allFriends = [...friendsWithProfiles, ...sampleFriends];
        // orderでソート（ピン留めされていないフレンドはorder順、ピン留めされているフレンドは先頭）
        allFriends.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return (a.order ?? 0) - (b.order ?? 0);
        });

        setFriends(allFriends);
      } else {
        // フレンドがいない場合は、サンプルフレンドのみを表示
        setFriends(sampleFriends);
      }

      setLoading(false);
    }
  };

  const loadPendingRequestCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('to_user_id', user.id)
        .eq('status', 'pending');

      if (error) {
        if (error.code !== 'PGRST205' && error.code !== '42P01') {
          console.error('フレンド申請数の取得に失敗しました:', error);
        }
        return;
      }

      setPendingRequestCount(count || 0);
    } catch (error) {
      console.error('フレンド申請数の取得に失敗しました:', error);
    }
  };

  const handleLogout = async () => {
    if (isGuest) {
      localStorage.removeItem('guest_mode');
      localStorage.removeItem('guest_profile');
      localStorage.removeItem('guest_friends');
    } else {
      await supabase.auth.signOut();
    }
    router.push('/');
    router.refresh();
  };

  const updateProfile = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
  };

  const updateFriends = (updatedFriends: Friend[]) => {
    setFriends(updatedFriends);
  };

  const handleAddGuestFriend = (guestFriend: GuestFriend) => {
    const currentFriends = [...friends];
    guestFriend.order = currentFriends.length;
    
    // GuestFriendをFriend型に変換
    const friendAsFriend: Friend = {
      id: guestFriend.id,
      user_id: 'guest',
      friend_id: guestFriend.friend_code,
      pinned: guestFriend.pinned,
      order: guestFriend.order,
      memo: guestFriend.memo,
      created_at: new Date().toISOString(),
      friend_profile: {
        id: guestFriend.id,
        user_id: guestFriend.friend_code,
        username: guestFriend.friend_code,
        nickname: guestFriend.nickname,
        organization: guestFriend.organization,
        phone: guestFriend.phone,
        public_email: guestFriend.public_email,
        status: guestFriend.status,
        note: guestFriend.note,
        friend_code: guestFriend.friend_code,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
    
    const updatedFriends = [...currentFriends, friendAsFriend];
    
    if (isGuest) {
      localStorage.setItem('guest_friends', JSON.stringify(updatedFriends));
    }
    
    setFriends(updatedFriends);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-green-600 text-white">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">電話アポ</h1>
          <div className="flex items-center gap-4">
            {!isGuest && (
              <button 
                onClick={() => setIsFriendModalOpen(true)}
                className="flex items-center gap-1 text-sm hover:underline relative"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>+フレンド</span>
                {pendingRequestCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingRequestCount > 9 ? '9+' : pendingRequestCount}
                  </span>
                )}
              </button>
            )}
            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex items-center gap-1 text-sm hover:underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>設定</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm hover:underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>ログアウト</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 py-4">
        <div className="flex flex-col gap-8">
          <div className="w-full">
            <ProfileSection
              profile={profile}
              isGuest={isGuest}
              onUpdate={updateProfile}
            />
          </div>
          
          <div className="w-full">
            <FriendsList
              friends={friends}
              isGuest={isGuest}
              onUpdate={updateFriends}
            />
          </div>
        </div>
      </main>

      {/* フレンドモーダル */}
      {!isGuest && (
        <FriendModal
          isOpen={isFriendModalOpen}
          onClose={() => {
            setIsFriendModalOpen(false);
            loadPendingRequestCount();
          }}
          profile={profile}
        />
      )}

      {/* 設定モーダル */}
      {!isGuest && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}
    </div>
  );
}

