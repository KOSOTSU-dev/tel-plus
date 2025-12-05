'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, UserStatus } from '@/types';
import { generateFriendCode } from '@/lib/utils';

interface ProfileSectionProps {
  profile: Profile | null;
  isGuest: boolean;
  onUpdate: (profile: Profile) => void;
}

export default function ProfileSection({ profile, isGuest, onUpdate }: ProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nickname: profile?.nickname || '',
    username: profile?.username || '',
    organization: profile?.organization || '',
    phone: profile?.phone || '',
    public_email: profile?.public_email || '',
    status: (profile?.status || 'available') as UserStatus,
    note: profile?.note || '',
  });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    setLoading(true);
    try {
      if (isGuest) {
        // ゲストモード: ローカルストレージに保存
        const guestProfile: Profile = {
          id: 'guest',
          user_id: 'guest',
          username: formData.username || 'guest',
          nickname: formData.nickname || 'ゲスト',
          organization: formData.organization,
          phone: formData.phone,
          public_email: formData.public_email,
          status: formData.status,
          note: formData.note,
          friend_code: profile?.friend_code || generateFriendCode(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem('guest_profile', JSON.stringify(guestProfile));
        onUpdate(guestProfile);
      } else {
        // 通常モード: Supabaseに保存
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // プロフィールが存在しない場合は作成
        if (!profile) {
          // フレンドコードの重複チェック（最大3回リトライ）
          let friendCode = generateFriendCode();
          let attempts = 0;
          let data;
          let error;
          
          while (attempts < 3) {
            const result = await supabase
              .from('profiles')
              .insert({
                user_id: user.id,
                username: formData.username || user.email?.split('@')[0] || '',
                nickname: formData.nickname || '',
                organization: formData.organization,
                phone: formData.phone,
                public_email: formData.public_email,
                status: formData.status,
                note: formData.note,
                friend_code: friendCode,
              })
              .select()
              .single();

            error = result.error;
            data = result.data;

            // 重複エラーの場合は新しいコードを生成してリトライ
            if (error && error.code === '23505') {
              friendCode = generateFriendCode();
              attempts++;
            } else {
              break;
            }
          }

          if (error) throw error;
          if (data) onUpdate(data);
        } else {
          // 既存プロフィールを更新
          const { data, error } = await supabase
            .from('profiles')
            .update({
              nickname: formData.nickname,
              organization: formData.organization,
              phone: formData.phone,
              public_email: formData.public_email,
              status: formData.status,
              note: formData.note,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id)
            .select()
            .single();

          if (error) throw error;
          if (data) onUpdate(data);
        }
      }
      setIsEditing(false);
    } catch (error: any) {
      alert('保存に失敗しました: ' + error.message);
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">プロフィール</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            編集
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ニックネーム
            </label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              所属
            </label>
            <input
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              電話番号
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              公開用メール
            </label>
            <input
              type="email"
              value={formData.public_email}
              onChange={(e) => setFormData({ ...formData, public_email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ステータス
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="available">対応可能</option>
              <option value="unavailable">対応不可</option>
              <option value="emergency">緊急</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ノート
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="30分ご対応可能など"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? '保存中...' : '保存'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  nickname: profile?.nickname || '',
                  username: profile?.username || '',
                  organization: profile?.organization || '',
                  phone: profile?.phone || '',
                  public_email: profile?.public_email || '',
                  status: (profile?.status || 'available') as UserStatus,
                  note: profile?.note || '',
                });
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {profile && (
            <>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">フレンドコード</div>
                <div className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {profile.friend_code}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">ニックネーム</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {profile.nickname || '未設定'}
                </div>
              </div>

              {profile.organization && (
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">所属</div>
                  <div className="text-lg text-gray-900 dark:text-white">{profile.organization}</div>
                </div>
              )}

              {profile.phone && (
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">電話番号</div>
                  <div className="text-lg text-gray-900 dark:text-white">{profile.phone}</div>
                </div>
              )}

              {profile.public_email && (
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">公開用メール</div>
                  <div className="text-lg text-gray-900 dark:text-white">{profile.public_email}</div>
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

              {profile.note && (
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">ノート</div>
                  <div className="text-gray-900 dark:text-white whitespace-pre-wrap">{profile.note}</div>
                </div>
              )}
            </>
          )}

          {!profile && (
            <div className="text-gray-500 dark:text-gray-400 text-center py-4">
              プロフィールを設定してください
            </div>
          )}
        </div>
      )}
    </div>
  );
}

