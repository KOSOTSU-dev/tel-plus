'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';

export default function FriendSearch() {
  const [friendCode, setFriendCode] = useState('');
  const [searchResult, setSearchResult] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  const handleSearch = async () => {
    if (!friendCode || friendCode.length !== 6) {
      setError('6桁のフレンドコードを入力してください');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      const { data, error: searchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('friend_code', friendCode.toUpperCase())
        .single();

      if (searchError) {
        if (searchError.code === 'PGRST116') {
          setError('該当するユーザーが見つかりませんでした');
        } else {
          throw searchError;
        }
        return;
      }

      setSearchResult(data);
    } catch (err: any) {
      setError(err.message || '検索に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('ログインが必要です');
        return;
      }

      // 既存の申請をチェック
      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('from_user_id', user.id)
        .eq('to_user_id', searchResult.user_id)
        .single();

      if (existingRequest) {
        setError('既に申請済みです');
        return;
      }

      // フレンド関係をチェック
      const { data: existingFriend } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', user.id)
        .eq('friend_id', searchResult.user_id)
        .single();

      if (existingFriend) {
        setError('既にフレンドです');
        return;
      }

      // 申請を送信
      const { error: requestError } = await supabase
        .from('friend_requests')
        .insert({
          from_user_id: user.id,
          to_user_id: searchResult.user_id,
          status: 'pending',
        });

      if (requestError) throw requestError;

      setSuccess('申請を送信しました');
      setSearchResult(null);
      setFriendCode('');
    } catch (err: any) {
      setError(err.message || '申請の送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-4">フレンド検索</h2>

      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="フレンドコード (6桁)"
            className="flex-1 px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-400"
            maxLength={6}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? '検索中...' : '検索'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        {searchResult && (
          <div className="border border-gray-300 rounded-lg p-4 space-y-3 bg-gray-50">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-lg text-gray-900">
                  {searchResult.nickname || '未設定'}
                </div>
                {searchResult.organization && (
                  <div className="text-sm text-gray-600">
                    {searchResult.organization}
                  </div>
                )}
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[searchResult.status]}`}
              >
                {statusLabels[searchResult.status]}
              </span>
            </div>

            {searchResult.note && (
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {searchResult.note}
              </div>
            )}

            <button
              onClick={handleSendRequest}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? '送信中...' : 'フレンド申請を送信'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

