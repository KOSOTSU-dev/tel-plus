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

  return (
    <div className="border-b border-gray-200 pb-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-green-500 rounded flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{nickname}</span>
              {organization && (
                <span className="text-sm text-gray-500">({organization})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status]}`}
              >
                ● {statusLabels[status]}
              </button>
              <button
                onClick={() => onTogglePin(friend)}
                className={`text-lg ${friend.pinned ? 'text-yellow-500' : 'text-gray-300'}`}
                title={friend.pinned ? 'ピン留め解除' : 'ピン留め'}
              >
                📌
              </button>
              <button
                onClick={() => onDelete(friend.id)}
                className="text-red-500 hover:text-red-700"
                title="削除"
              >
                🗑️
              </button>
            </div>
          </div>
          {note && (
            <div className="text-sm text-gray-600 mb-2">{note}</div>
          )}
          <div className="mt-2">
            <label className="text-xs text-gray-500 mb-1 block">メモ</label>
            {isEditingMemo ? (
              <div className="flex items-center gap-2">
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={2}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-500"
                  placeholder="メモを入力..."
                  autoFocus
                />
                <button
                  onClick={handleSaveMemo}
                  className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setIsEditingMemo(false);
                    setMemo(friend.memo || '');
                  }}
                  className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingMemo(true)}
                className="min-h-[2rem] px-2 py-1 text-sm border border-gray-200 rounded cursor-text hover:border-gray-300"
              >
                {memo || <span className="text-gray-400">メモを入力...</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

