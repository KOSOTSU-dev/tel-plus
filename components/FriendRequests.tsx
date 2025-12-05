'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FriendRequest } from '@/types';

export default function FriendRequests() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadRequests();
    
    // リアルタイム更新の購読
    const channel = supabase
      .channel('friend_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          from_profile:profiles!friend_requests_from_user_id_fkey(*),
          to_profile:profiles!friend_requests_to_user_id_fkey(*)
        `)
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        // テーブルが存在しない場合はエラーを無視（開発中の場合）
        if (error.code === 'PGRST205' || error.code === '42P01') {
          console.warn('friend_requestsテーブルが存在しません。データベーススキーマを確認してください。');
          setRequests([]);
        } else {
          throw error;
        }
      } else if (data) {
        setRequests(data as FriendRequest[]);
      }
    } catch (error: any) {
      // エラーをコンソールに出力しない（テーブルが存在しない場合は正常な状態）
      if (error.code !== 'PGRST205' && error.code !== '42P01') {
        console.error('フレンド申請の読み込みに失敗しました:', error);
      }
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (request: FriendRequest) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 申請を承認
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // フレンド関係を双方向に作成
      const { data: friendsData } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', user.id);

      const maxOrder = friendsData?.reduce((max, f) => Math.max(max, f.order || 0), 0) || 0;

      const { error: friend1Error } = await supabase.from('friends').insert({
        user_id: user.id,
        friend_id: request.from_user_id,
        pinned: false,
        order: maxOrder + 1,
      });

      if (friend1Error) throw friend1Error;

      const { data: friend2Data } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', request.from_user_id);

      const maxOrder2 = friend2Data?.reduce((max, f) => Math.max(max, f.order || 0), 0) || 0;

      const { error: friend2Error } = await supabase.from('friends').insert({
        user_id: request.from_user_id,
        friend_id: user.id,
        pinned: false,
        order: maxOrder2 + 1,
      });

      if (friend2Error) throw friend2Error;

      loadRequests();
    } catch (error: any) {
      alert('承認に失敗しました: ' + error.message);
    }
  };

  const handleReject = async (request: FriendRequest) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', request.id);

      if (error) throw error;
      loadRequests();
    } catch (error: any) {
      alert('拒否に失敗しました: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-gray-500 dark:text-gray-400">読み込み中...</div>
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">フレンド申請</h2>

      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-bold text-gray-900 dark:text-white">
                  {request.from_profile?.nickname || '未設定'}
                </div>
                {request.from_profile?.organization && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {request.from_profile.organization}
                  </div>
                )}
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  request.from_profile?.status === 'available'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : request.from_profile?.status === 'emergency'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}
              >
                {request.from_profile?.status === 'available'
                  ? '対応可能'
                  : request.from_profile?.status === 'emergency'
                  ? '緊急'
                  : '対応不可'}
              </span>
            </div>

            {request.from_profile?.note && (
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
                {request.from_profile.note}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(request)}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                承認
              </button>
              <button
                onClick={() => handleReject(request)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors"
              >
                拒否
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

