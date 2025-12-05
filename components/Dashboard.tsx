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
      }
      if (savedFriends) {
        // ローカルストレージから読み込んだデータをFriend型として扱う
        const parsedFriends = JSON.parse(savedFriends) as Friend[];
        setFriends(parsedFriends);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">電話帳プラス</h1>
          <div className="flex items-center gap-4">
            {isGuest && (
              <span className="text-sm text-gray-500 dark:text-gray-400">ゲストモード</span>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ProfileSection
              profile={profile}
              isGuest={isGuest}
              onUpdate={updateProfile}
            />
          </div>
          
          <div className="lg:col-span-2 space-y-6">
            {!isGuest ? (
              <>
                <FriendSearch />
                <FriendRequests />
              </>
            ) : (
              <GuestFriendAdd onAdd={handleAddGuestFriend} />
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

