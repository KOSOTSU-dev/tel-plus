'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Profile, Friend } from '@/types';
import ProfileSection from './ProfileSection';
import FriendsList from './FriendsList';
import FriendSearch from './FriendSearch';
import FriendRequests from './FriendRequests';
import GuestFriendAdd from './GuestFriendAdd';
import { GuestFriend } from '@/types';

export default function Dashboard() {
  const [isGuest, setIsGuest] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

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
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // フレンド一覧取得
      const { data: friendsData } = await supabase
        .from('friends')
        .select(`
          *,
          friend_profile:profiles!friends_friend_id_fkey(*)
        `)
        .eq('user_id', user.id)
        .order('pinned', { ascending: false })
        .order('order', { ascending: true });

      if (friendsData) {
        setFriends(friendsData as Friend[]);
      }

      setLoading(false);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">電話アポ</h1>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1 text-sm hover:underline">
              <span>👤</span>
              <span>+フレンド</span>
            </button>
            <button className="flex items-center gap-1 text-sm hover:underline">
              <span>⚙️</span>
              <span>設定</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm hover:underline"
            >
              <span>→</span>
              <span>ログアウト</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <ProfileSection
              profile={profile}
              isGuest={isGuest}
              onUpdate={updateProfile}
            />
          </div>
          
          <div className="lg:col-span-2">
            {!isGuest && (
              <>
                <div className="mb-6">
                  <FriendSearch />
                </div>
                <div className="mb-6">
                  <FriendRequests />
                </div>
              </>
            )}
            <FriendsList
              friends={friends}
              isGuest={isGuest}
              onUpdate={updateFriends}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

