'use client';

import { useState } from 'react';
import { Friend, UserStatus } from '@/types';

interface FriendListItemProps {
  friend: Friend;
  onDelete: (friendId: string) => void;
  onTogglePin: (friend: Friend) => void;
  onUpdateMemo: (friendId: string, memo: string) => void;
}

export default function FriendListItem({
  friend,
  onDelete,
  onTogglePin,
  onUpdateMemo,
}: FriendListItemProps) {
  const [memo, setMemo] = useState(friend.memo || '');
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [lastEnterTime, setLastEnterTime] = useState(0);

  const profile = friend.friend_profile || friend;
  const statusColors: Record<UserStatus, string> = {
    available: 'bg-green-500 text-white',
    unavailable: 'bg-gray-400 text-white',
    emergency: 'bg-orange-500 text-white',
  };

  const statusLabels: Record<UserStatus, string> = {
    available: '対応可',
    unavailable: '不可',
    emergency: '緊急のみ',
  };

  const status = 'status' in profile && profile.status ? profile.status : 'available';
  const nickname = 'nickname' in profile ? profile.nickname : '未設定';
  const organization = 'organization' in profile ? profile.organization : '';
  const note = 'note' in profile ? profile.note : '';

  const handleSaveMemo = () => {
    onUpdateMemo(friend.id, memo);
    setIsEditingMemo(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const now = Date.now();
      // ダブルエンター（500ms以内に2回Enter）で確定
      if (now - lastEnterTime < 500) {
        e.preventDefault();
        handleSaveMemo();
        setLastEnterTime(0);
      } else {
        setLastEnterTime(now);
      }
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg py-1.5 px-2">
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 text-sm">{nickname}</span>
              {organization && (
                <span className="text-xs text-gray-500">({organization})</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColors[status]}`}
              >
                ● {statusLabels[status]}
              </button>
              <button
                onClick={() => onTogglePin(friend)}
                className={`p-0.5 rounded hover:bg-gray-100 transition-colors ${friend.pinned ? 'text-yellow-500' : 'text-gray-400'}`}
                title={friend.pinned ? 'ピン留め解除' : 'ピン留め'}
              >
                <svg className="w-3.5 h-3.5" fill={friend.pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(friend.id)}
                className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                title="削除"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          {note && (
            <div className="text-xs text-gray-600 mt-0.5">{note}</div>
          )}
          <div className="mt-1">
            {isEditingMemo ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 px-2 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-green-500"
                  placeholder="メモを入力..."
                  autoFocus
                />
                <button
                  onClick={handleSaveMemo}
                  className="p-1 rounded hover:bg-gray-100 text-green-600 transition-colors"
                  title="確定"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">メモ</span>
                <button
                  onClick={() => setIsEditingMemo(true)}
                  className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  title="メモを編集"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                {memo && (
                  <span className="text-xs text-gray-700 ml-1">{memo}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

