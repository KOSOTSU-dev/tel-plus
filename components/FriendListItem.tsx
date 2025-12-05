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
    <div className="border-b border-gray-200 pb-2">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{nickname}</span>
              {organization && (
                <span className="text-sm text-gray-500">({organization})</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[status]}`}
              >
                ● {statusLabels[status]}
              </button>
              <button
                onClick={() => onTogglePin(friend)}
                className={`p-1 rounded hover:bg-gray-100 transition-colors ${friend.pinned ? 'text-yellow-500' : 'text-gray-400'}`}
                title={friend.pinned ? 'ピン留め解除' : 'ピン留め'}
              >
                <svg className="w-4 h-4" fill={friend.pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(friend.id)}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                title="削除"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          {note && (
            <div className="text-sm text-gray-600 mb-1">{note}</div>
          )}
          <div className="mt-1">
            <label className="text-xs text-gray-500 mb-0.5 block">メモ</label>
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
                className="min-h-[1.5rem] px-2 py-0.5 text-sm border border-gray-200 rounded cursor-text hover:border-gray-300"
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

