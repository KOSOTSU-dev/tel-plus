'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, UserStatus } from '@/types';
import { generateFriendCode } from '@/lib/utils';

interface ProfileSectionProps {
  profile: Profile | null;
  isGuest: boolean;
  onUpdate: (profile: Profile) => void;
}

export default function ProfileSection({ profile, isGuest, onUpdate }: ProfileSectionProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isEditingIcon, setIsEditingIcon] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [noteValue, setNoteValue] = useState('');
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

  useEffect(() => {
    if (profile) {
      setFormData({
        nickname: profile.nickname || '',
        username: profile.username || '',
        organization: profile.organization || '',
        phone: profile.phone || '',
        public_email: profile.public_email || '',
        status: profile.status || 'available',
        note: profile.note || '',
      });
      setNameValue(profile.nickname || '');
      setNoteValue(profile.note || '');
    }
  }, [profile]);

  const handleSave = async (field?: 'name' | 'note' | 'status' | 'all') => {
    // 名前のバリデーション
    if (field === 'name' || field === 'all') {
      const finalName = field === 'name' ? nameValue : formData.nickname;
      if (!finalName || finalName.trim() === '') {
        alert('名前を入力してください');
        return;
      }
      if (finalName.length > 11) {
        alert('名前は11文字以内で入力してください');
        return;
      }
    }

    if (field === 'name' && nameValue !== formData.nickname) {
      setFormData({ ...formData, nickname: nameValue });
    }
    if (field === 'note' && noteValue !== formData.note) {
      setFormData({ ...formData, note: noteValue });
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        ...(field === 'name' && { nickname: nameValue }),
        ...(field === 'note' && { note: noteValue }),
      };

      if (isGuest) {
        const guestProfile: Profile = {
          id: 'guest',
          user_id: 'guest',
          username: dataToSave.username || 'guest',
          nickname: dataToSave.nickname || 'ゲスト',
          organization: dataToSave.organization,
          phone: dataToSave.phone,
          public_email: dataToSave.public_email,
          status: dataToSave.status,
          note: dataToSave.note,
          friend_code: profile?.friend_code || generateFriendCode(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem('guest_profile', JSON.stringify(guestProfile));
        onUpdate(guestProfile);
        setFormData(dataToSave);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (!profile) {
          let friendCode = generateFriendCode();
          let attempts = 0;
          let data;
          let error;
          
          while (attempts < 3) {
            const result = await supabase
              .from('profiles')
              .insert({
                user_id: user.id,
                username: dataToSave.username || user.email?.split('@')[0] || '',
                nickname: dataToSave.nickname || '',
                organization: dataToSave.organization,
                phone: dataToSave.phone,
                public_email: dataToSave.public_email,
                status: dataToSave.status,
                note: dataToSave.note,
                friend_code: friendCode,
              })
              .select()
              .single();

            error = result.error;
            data = result.data;

            if (error && error.code === '23505') {
              friendCode = generateFriendCode();
              attempts++;
            } else {
              break;
            }
          }

          if (error) throw error;
          if (data) {
            onUpdate(data);
            setFormData(dataToSave);
          }
        } else {
          const { data, error } = await supabase
            .from('profiles')
            .update({
              nickname: dataToSave.nickname,
              organization: dataToSave.organization,
              phone: dataToSave.phone,
              public_email: dataToSave.public_email,
              status: dataToSave.status,
              note: dataToSave.note,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id)
            .select()
            .single();

          if (error) throw error;
          if (data) {
            onUpdate(data);
            setFormData(dataToSave);
          }
        }
      }
      setIsEditingName(false);
      setIsEditingNote(false);
      setIsEditingIcon(false);
    } catch (error: any) {
      alert('保存に失敗しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="bg-white p-6 border border-gray-200 rounded-lg">
      {!profile ? (
        <div className="space-y-4">
          <div className="text-gray-500 text-center py-2 text-sm mb-4">
            プロフィールを設定してください
          </div>
          {/* 初期プロフィール作成フォーム */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <label className="text-sm w-20 text-gray-700">ニックネーム *</label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value.slice(0, 11) })}
                placeholder="ニックネームを入力（必須）"
                maxLength={11}
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-green-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm w-20 text-gray-700">ステータス</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-green-500"
              >
                <option value="available">対応可</option>
                <option value="unavailable">不可</option>
                <option value="emergency">緊急のみ</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm w-20 text-gray-700">ノート</label>
              <input
                type="text"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="30分ご対応可能など"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-green-500"
              />
            </div>
            <button
              onClick={() => handleSave('all')}
              disabled={loading || !formData.nickname || formData.nickname.trim() === ''}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '保存中...' : 'プロフィールを作成'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* アイコンと名前・コードの行 */}
          <div className="flex items-start gap-4 mb-4">
            {/* 左上：アイコン（編集可能） */}
            <div 
              className="w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm cursor-pointer hover:opacity-80 transition-opacity relative group"
              style={{
                background: 'linear-gradient(to bottom, #4ade80, #22c55e)'
              }}
              onClick={() => setIsEditingIcon(true)}
              title="アイコンを編集"
            >
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {isEditingIcon && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs">編集</span>
                </div>
              )}
            </div>

            {/* 右側：名前・コード・ステータス・ノート */}
            <div className="flex-1 min-w-0">
              {/* 上段：名前とフレンドコード */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isEditingName ? (
                    <input
                      type="text"
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value.slice(0, 11))}
                      onBlur={() => {
                        if (nameValue.trim() !== '') {
                          handleSave('name');
                        } else {
                          setNameValue(profile.nickname || '');
                          setIsEditingName(false);
                          alert('名前を入力してください');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (nameValue.trim() !== '') {
                            handleSave('name');
                          } else {
                            setNameValue(profile.nickname || '');
                            setIsEditingName(false);
                            alert('名前を入力してください');
                          }
                        } else if (e.key === 'Escape') {
                          setNameValue(profile.nickname || '');
                          setIsEditingName(false);
                        }
                      }}
                      className="text-2xl font-bold border-b-2 border-green-500 focus:outline-none max-w-[200px]"
                      maxLength={11}
                      autoFocus
                    />
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-gray-900">{profile.nickname || '未設定'}</span>
                      <button
                        onClick={() => {
                          setNameValue(profile.nickname || '');
                          setIsEditingName(true);
                        }}
                        className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100 transition-colors"
                        type="button"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
                {/* 右端：フレンドコード */}
                <div className="text-sm text-gray-500 font-mono bg-blue-100 px-2 py-1 rounded">
                  {profile.friend_code}
                </div>
              </div>

              {/* 下段：ステータスボタンとノート */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* ステータスボタン（ドロップダウン） */}
                {isEditingStatus ? (
                  <select
                    value={formData.status}
                    onChange={(e) => {
                      setFormData({ ...formData, status: e.target.value as UserStatus });
                      handleSave('status');
                    }}
                    className={`px-3 py-1.5 rounded text-white font-medium border-0 focus:outline-none ${statusColors[formData.status]}`}
                    autoFocus
                    onBlur={() => setIsEditingStatus(false)}
                  >
                    <option value="available">対応可</option>
                    <option value="unavailable">不可</option>
                    <option value="emergency">緊急のみ</option>
                  </select>
                ) : (
                  <button
                    onClick={() => setIsEditingStatus(true)}
                    className={`px-3 py-1.5 rounded text-white font-medium flex items-center gap-2 ${statusColors[profile.status]}`}
                    type="button"
                  >
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                    <span>{statusLabels[profile.status]}</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}

                {/* ノート（編集可能） */}
                {isEditingNote ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                      onBlur={() => handleSave('note')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSave('note');
                        } else if (e.key === 'Escape') {
                          setNoteValue(profile.note || '');
                          setIsEditingNote(false);
                        }
                      }}
                      className="px-3 py-1.5 bg-gray-100 rounded border-b-2 border-green-500 focus:outline-none"
                      placeholder="30分後対応可能など"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {profile.note ? (
                      <span className="px-3 py-1.5 bg-gray-100 rounded text-gray-700">{profile.note}</span>
                    ) : (
                      <span className="px-3 py-1.5 bg-gray-100 rounded text-gray-400">30分後対応可能など</span>
                    )}
                    <button
                      onClick={() => {
                        setNoteValue(profile.note || '');
                        setIsEditingNote(true);
                      }}
                      className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100 transition-colors"
                      type="button"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* プライバシー説明文 */}
          <div className="text-xs text-gray-500 mb-4">
            入力した所属名・電話番号・メールはフレンドに公開されます。
          </div>

          {/* 入力フィールド（三行） */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <label className="text-sm w-20 text-gray-700">所属名</label>
              <input
                type="text"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                onBlur={() => handleSave('all')}
                placeholder="任意"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-green-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm w-20 text-gray-700">メール</label>
              <input
                type="email"
                value={formData.public_email}
                onChange={(e) => setFormData({ ...formData, public_email: e.target.value })}
                onBlur={() => handleSave('all')}
                placeholder="任意"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-green-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm w-20 text-gray-700">電話番号</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                onBlur={() => handleSave('all')}
                placeholder="任意"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
