'use client';

import { Friend, UserStatus } from '@/types';

interface FriendDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: Friend | null;
}

const statusColors: Record<UserStatus, string> = {
  available: 'bg-green-100 text-green-800',
  unavailable: 'bg-gray-100 text-gray-800',
  emergency: 'bg-orange-100 text-orange-800',
};

const statusLabels: Record<UserStatus, string> = {
  available: '対応可',
  unavailable: '不可',
  emergency: '緊急のみ',
};

export default function FriendDetailModal({ isOpen, onClose, friend }: FriendDetailModalProps) {
  if (!isOpen || !friend) return null;

  const profile = friend.friend_profile || friend;
  const status = 'status' in profile && profile.status ? profile.status : 'available';
  const nickname = 'nickname' in profile ? profile.nickname : '未設定';
  const organization = 'organization' in profile ? profile.organization : '';
  const phone = 'phone' in profile ? profile.phone : '';
  const public_email = 'public_email' in profile ? profile.public_email : '';
  const note = 'note' in profile ? profile.note : '';
  const friend_code = 'friend_code' in profile ? profile.friend_code : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* ヘッダー */}
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900">フレンド詳細</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* アイコンと名前 */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-1">{nickname}</h3>
              {organization && (
                <p className="text-sm text-gray-600">{organization}</p>
              )}
            </div>
          </div>

          {/* ステータス */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2">
              <span
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusColors[status]}`}
              >
                {statusLabels[status]}
              </span>
            </div>
          </div>

          {/* 対応状況 */}
          {note && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">対応状況</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                {note}
              </p>
            </div>
          )}

          {/* 連絡先情報 */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">連絡先情報</h4>

            {organization && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">所属名</label>
                <p className="text-sm text-gray-900">{organization}</p>
              </div>
            )}

            {phone && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">電話番号</label>
                <p className="text-sm text-gray-900">{phone}</p>
              </div>
            )}

            {public_email && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">メールアドレス</label>
                <p className="text-sm text-gray-900 break-all">{public_email}</p>
              </div>
            )}

            {friend_code && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">フレンドコード</label>
                <p className="text-sm text-gray-900 font-mono">{friend_code}</p>
              </div>
            )}

            {!organization && !phone && !public_email && (
              <p className="text-sm text-gray-500">連絡先情報が設定されていません</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

