'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, FriendRequest } from '@/types';

interface FriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
}

export default function FriendModal({ isOpen, onClose, profile }: FriendModalProps) {
  const [friendCode, setFriendCode] = useState('');
  const [searchResult, setSearchResult] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      loadRequests();
    }
  }, [isOpen]);

  const loadRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // friend_requestsテーブルから取得
      const { data: requestsData, error: requestsError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsError) {
        if (requestsError.code === 'PGRST205' || requestsError.code === '42P01') {
          console.warn('friend_requestsテーブルが存在しません。データベーススキーマを確認してください。');
          setRequests([]);
          return;
        } else {
          throw requestsError;
        }
      }

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        return;
      }

      // from_user_idとto_user_idのリストを取得
      const userIds = [
        ...new Set([
          ...requestsData.map(r => r.from_user_id),
          ...requestsData.map(r => r.to_user_id),
        ])
      ];

      // 各user_idに対応するプロフィールを取得
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('プロフィールの取得に失敗しました:', profilesError);
        setRequests([]);
        return;
      }

      // プロフィールをマップに変換
      const profilesMap = new Map<string, any>();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.user_id, profile);
        });
      }

      // フレンド申請データとプロフィールを結合
      const requestsWithProfiles: FriendRequest[] = requestsData.map(request => ({
        ...request,
        from_profile: profilesMap.get(request.from_user_id),
        to_profile: profilesMap.get(request.to_user_id),
      }));

      setRequests(requestsWithProfiles);
    } catch (error: any) {
      if (error.code !== 'PGRST205' && error.code !== '42P01') {
        console.error('フレンド申請の読み込みに失敗しました:', error);
      }
      setRequests([]);
    }
  };

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
      loadRequests();
    } catch (err: any) {
      setError(err.message || '申請の送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (request: FriendRequest) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('ログインが必要です');
        return;
      }

      // 既存のフレンド関係をチェック
      const { data: existingFriend1 } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', user.id)
        .eq('friend_id', request.from_user_id)
        .single();

      if (existingFriend1) {
        alert('既にフレンド関係が存在します');
        // 申請は既に処理済みとして、申請をacceptedに更新して終了
        await supabase
          .from('friend_requests')
          .update({ status: 'accepted' })
          .eq('id', request.id);
        loadRequests();
        return;
      }

      // 申請を承認
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', request.id);

      if (updateError) {
        console.error('申請の更新エラー:', updateError);
        throw updateError;
      }

      // フレンド関係を双方向に作成
      const { data: friendsData } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', user.id);

      const maxOrder = friendsData?.reduce((max, f) => Math.max(max, f.order || 0), 0) || 0;

      // 自分のフレンドリストに追加
      const { error: friend1Error } = await supabase.from('friends').insert({
        user_id: user.id,
        friend_id: request.from_user_id,
        pinned: false,
        order: maxOrder + 1,
      });

      if (friend1Error) {
        // 409 Conflictの場合は既に存在するため、スキップ
        if (friend1Error.code === '23505') {
          console.warn('既にフレンド関係が存在します（自分の側）');
        } else {
          console.error('フレンド関係の作成エラー（自分の側）:', friend1Error);
          throw friend1Error;
        }
      }

      // 相手のフレンドリストに追加
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

      if (friend2Error) {
        // 409 Conflictの場合は既に存在するため、スキップ
        if (friend2Error.code === '23505') {
          console.warn('既にフレンド関係が存在します（相手の側）');
        } else {
          console.error('フレンド関係の作成エラー（相手の側）:', friend2Error);
          // 自分の側は作成済みなので、ロールバックは不要
          // エラーメッセージだけ表示
        }
      }

      setSuccess('フレンド申請を承認しました');
      loadRequests();
      
      // ダッシュボードを更新するためにカスタムイベントを発火
      window.dispatchEvent(new CustomEvent('friendUpdated'));
      
      // モーダルを閉じる
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('承認エラー:', error);
      alert('承認に失敗しました: ' + (error.message || '不明なエラー'));
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

  const statusColors = {
    available: 'bg-green-100 text-green-800',
    unavailable: 'bg-gray-100 text-gray-800',
    emergency: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    available: '対応可能',
    unavailable: '対応不可',
    emergency: '緊急',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* ヘッダー */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">フレンド</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 自分のフレンドコード */}
          {profile && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">自分のフレンドコード</div>
              <div className="text-xl font-mono font-bold text-blue-700">{profile.friend_code}</div>
            </div>
          )}

          {/* フレンド検索 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">フレンド検索</h3>
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
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            {searchResult && (
              <div className="mt-4 border border-gray-300 rounded-lg p-4 space-y-3 bg-gray-50">
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

          {/* フレンド申請 */}
          {requests.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">フレンド申請 ({requests.length})</h3>
              <div className="space-y-3">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-gray-900">
                          {request.from_profile?.nickname || '未設定'}
                        </div>
                        {request.from_profile?.organization && (
                          <div className="text-sm text-gray-500">
                            {request.from_profile.organization}
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.from_profile?.status === 'available'
                            ? 'bg-green-100 text-green-800'
                            : request.from_profile?.status === 'emergency'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
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
                      <div className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
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
                        className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                      >
                        拒否
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

