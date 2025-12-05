'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Friend, UserStatus } from '@/types';
import FriendListItem from './FriendListItem';

interface FriendsListProps {
  friends: Friend[];
  isGuest: boolean;
  onUpdate: (friends: Friend[]) => void;
}

const statusLabels: Record<UserStatus, string> = {
  available: '対応可',
  unavailable: '不可',
  emergency: '緊急のみ',
};

export default function FriendsList({ friends, isGuest, onUpdate }: FriendsListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 検索フィルタリング（名前またはステータスで検索）
  const filteredFriends = friends.filter((friend) => {
    const profile = friend.friend_profile || friend;
    const nickname = 'nickname' in profile ? profile.nickname || '' : '';
    const status = 'status' in profile ? profile.status || 'available' : 'available';
    const statusLabel = statusLabels[status];
    
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      nickname.toLowerCase().includes(query) ||
      statusLabel.includes(query)
    );
  });

  const pinnedFriends = filteredFriends.filter((f) => f.pinned);
  const unpinnedFriends = filteredFriends.filter((f) => !f.pinned);

  const handleDelete = async (friendId: string) => {
    if (!confirm('このフレンドを削除しますか？')) return;

    try {
      if (isGuest) {
        const updatedFriends = friends.filter((f) => f.id !== friendId);
        localStorage.setItem('guest_friends', JSON.stringify(updatedFriends));
        onUpdate(updatedFriends);
      } else {
        // サンプルフレンド（idがsampleで始まる）の場合は、クライアント側のみで削除
        if (friendId.startsWith('sample')) {
          const updatedFriends = friends.filter((f) => f.id !== friendId);
          onUpdate(updatedFriends);
        } else {
          const { error } = await createClient()
            .from('friends')
            .delete()
            .eq('id', friendId);

          if (error) throw error;

          const updatedFriends = friends.filter((f) => f.id !== friendId);
          onUpdate(updatedFriends);
        }
      }
    } catch (error: any) {
      alert('削除に失敗しました: ' + error.message);
    }
  };

  const handleTogglePin = async (friend: Friend) => {
    try {
      if (isGuest) {
        const updatedFriends = friends.map((f) =>
          f.id === friend.id ? { ...f, pinned: !f.pinned } : f
        );
        localStorage.setItem('guest_friends', JSON.stringify(updatedFriends));
        onUpdate(updatedFriends);
      } else {
        // サンプルフレンドの場合は、クライアント側のみで更新
        if (friend.id.startsWith('sample')) {
          const updatedFriends = friends.map((f) =>
            f.id === friend.id ? { ...f, pinned: !f.pinned } : f
          );
          onUpdate(updatedFriends);
        } else {
          const { error } = await createClient()
            .from('friends')
            .update({ pinned: !friend.pinned })
            .eq('id', friend.id);

          if (error) throw error;

          const updatedFriends = friends.map((f) =>
            f.id === friend.id ? { ...f, pinned: !f.pinned } : f
          );
          onUpdate(updatedFriends);
        }
      }
    } catch (error: any) {
      alert('ピン留めの更新に失敗しました: ' + error.message);
    }
  };

  const handleUpdateMemo = async (friendId: string, memo: string) => {
    try {
      if (isGuest) {
        const updatedFriends = friends.map((f) =>
          f.id === friendId ? { ...f, memo } : f
        );
        localStorage.setItem('guest_friends', JSON.stringify(updatedFriends));
        onUpdate(updatedFriends);
      } else {
        // サンプルフレンドの場合は、クライアント側のみで更新
        if (friendId.startsWith('sample')) {
          const updatedFriends = friends.map((f) =>
            f.id === friendId ? { ...f, memo } : f
          );
          onUpdate(updatedFriends);
        } else {
          const { error } = await createClient()
            .from('friends')
            .update({ memo })
            .eq('id', friendId);

          if (error) throw error;

          const updatedFriends = friends.map((f) =>
            f.id === friendId ? { ...f, memo } : f
          );
          onUpdate(updatedFriends);
        }
      }
    } catch (error: any) {
      alert('メモの更新に失敗しました: ' + error.message);
    }
  };

  return (
    <div className="bg-white p-6 border border-gray-200 rounded-lg">
      {/* フレンド検索（名前or状況） */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="フレンド検索（名前or状況）"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
        />
      </div>

      {isGuest && (
        <div className="mb-4">
          <button className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>+フレンド交換</span>
          </button>
        </div>
      )}

      {friends.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          フレンドがいません
        </div>
      ) : filteredFriends.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          該当するフレンドが見つかりません
        </div>
      ) : (
        <div className="space-y-6">
          {pinnedFriends.length > 0 && (
            <div className="border-t-2 border-gray-300 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                ピン留め
              </h3>
              <div className="space-y-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                {pinnedFriends.map((friend) => (
                  <FriendListItem
                    key={friend.id}
                    friend={friend}
                    onDelete={handleDelete}
                    onTogglePin={handleTogglePin}
                    onUpdateMemo={handleUpdateMemo}
                  />
                ))}
              </div>
            </div>
          )}

          {unpinnedFriends.length > 0 && (
            <div>
              {pinnedFriends.length > 0 && (
                <h3 className="text-sm font-medium text-gray-700 mb-3">フレンド</h3>
              )}
              <div className="space-y-3">
                {unpinnedFriends.map((friend) => (
                  <FriendListItem
                    key={friend.id}
                    friend={friend}
                    onDelete={handleDelete}
                    onTogglePin={handleTogglePin}
                    onUpdateMemo={handleUpdateMemo}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
