'use client';

import { useState } from 'react';
import { Friend } from '@/types';

interface FriendCardProps {
  friend: Friend;
  onDelete: (friendId: string) => void;
  onTogglePin: (friend: Friend) => void;
  onUpdateMemo: (friendId: string, memo: string) => void;
}

export default function FriendCard({
  friend,
  onDelete,
  onTogglePin,
  onUpdateMemo,
}: FriendCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showMemoEdit, setShowMemoEdit] = useState(false);
  const [memo, setMemo] = useState(friend.memo || '');

  const profile = friend.friend_profile || friend;
  const statusColors = {
    available: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    unavailable: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    emergency: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const statusLabels = {
    available: '対応可能',
    unavailable: '対応不可',
    emergency: '緊急',
  };

  const handleSaveMemo = () => {
    onUpdateMemo(friend.id, memo);
    setShowMemoEdit(false);
  };

  return (
    <>
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow relative group">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="font-bold text-gray-900 dark:text-white">
              {'nickname' in profile ? profile.nickname : '未設定'}
            </div>
            {'organization' in profile && profile.organization && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {profile.organization}
              </div>
            )}
          </div>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[profile.status]}`}
          >
            {statusLabels[profile.status]}
          </span>
        </div>

        {'note' in profile && profile.note && (
          <div className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
            {profile.note}
          </div>
        )}

        {friend.memo && !showMemoEdit && (
          <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded mb-2">
            <strong>メモ:</strong> {friend.memo}
          </div>
        )}

        {showMemoEdit && (
          <div className="mb-2">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
              placeholder="メモを入力..."
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={handleSaveMemo}
                className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setShowMemoEdit(false);
                  setMemo(friend.memo || '');
                }}
                className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowDetails(true)}
            className="flex-1 px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
          >
            詳細
          </button>
          <button
            onClick={() => setShowMemoEdit(true)}
            className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded transition-colors"
            title="メモ"
          >
            📝
          </button>
          <button
            onClick={() => onTogglePin(friend)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              friend.pinned
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white'
            }`}
            title={friend.pinned ? 'ピン留め解除' : 'ピン留め'}
          >
            📌
          </button>
          <button
            onClick={() => onDelete(friend.id)}
            className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
            title="削除"
          >
            🗑️
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">フレンド詳細</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">ニックネーム</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {'nickname' in profile ? profile.nickname : '未設定'}
                </div>
              </div>

              {'organization' in profile && profile.organization && (
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">所属</div>
                  <div className="text-lg text-gray-900 dark:text-white">{profile.organization}</div>
                </div>
              )}

              {'phone' in profile && profile.phone && (
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">電話番号</div>
                  <div className="text-lg text-gray-900 dark:text-white">{profile.phone}</div>
                </div>
              )}

              {'public_email' in profile && profile.public_email && (
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">公開用メール</div>
                  <div className="text-lg text-gray-900 dark:text-white">
                    {profile.public_email}
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">ステータス</div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[profile.status]}`}
                >
                  {statusLabels[profile.status]}
                </span>
              </div>

              {'note' in profile && profile.note && (
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">ノート</div>
                  <div className="text-gray-900 dark:text-white whitespace-pre-wrap">
                    {profile.note}
                  </div>
                </div>
              )}

              {friend.memo && (
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">メモ</div>
                  <div className="text-gray-900 dark:text-white">{friend.memo}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

