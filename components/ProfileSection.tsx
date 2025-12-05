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
  const [isEditingStatus, setIsEditingStatus] = useState(false);
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
    }
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (isGuest) {
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
      setIsEditingName(false);
      setIsEditingNote(false);
      setIsEditingStatus(false);
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

  if (!profile) {
    return (
      <div className="bg-white p-6">
        <div className="text-gray-500 text-center py-4">
          プロフィールを設定してください
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-20 h-20 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                onBlur={handleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave();
                  }
                }}
                className="text-xl font-bold border-b-2 border-green-500 focus:outline-none"
                autoFocus
              />
              <button onClick={handleSave} className="text-gray-400 hover:text-gray-600">✓</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{profile.nickname || '未設定'}</span>
              <button
                onClick={() => setIsEditingName(true)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✏️
              </button>
            </div>
          )}
          <div className="text-sm text-gray-600 mt-1 font-mono">{profile.friend_code}</div>
        </div>
      </div>

      <div className="mb-4">
        {isEditingStatus ? (
          <select
            value={formData.status}
            onChange={(e) => {
              setFormData({ ...formData, status: e.target.value as UserStatus });
              handleSave();
            }}
            className={`px-3 py-1 rounded text-white font-medium border-0 focus:outline-none ${statusColors[formData.status]}`}
            autoFocus
          >
            <option value="available">対応可</option>
            <option value="unavailable">不可</option>
            <option value="emergency">緊急のみ</option>
          </select>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingStatus(true)}
              className={`px-3 py-1 rounded text-white font-medium ${statusColors[profile.status]} flex items-center gap-1`}
            >
              <span>●</span>
              <span>{statusLabels[profile.status]}</span>
              <span>▼</span>
            </button>
          </div>
        )}
      </div>

      <div className="mb-4">
        {isEditingNote ? (
          <div className="flex items-start gap-2">
            <input
              type="text"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
              className="flex-1 border-b-2 border-green-500 focus:outline-none"
              placeholder="30分ご対応可能など"
              autoFocus
            />
            <button onClick={handleSave} className="text-gray-400 hover:text-gray-600">✓</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-gray-700">{profile.note || ''}</span>
            <button
              onClick={() => setIsEditingNote(true)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ✏️
            </button>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 mb-4">
        入力した所属名・電話番号・メールはフレンドに公開されます。
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <label className="text-sm w-20 text-gray-700">所属名</label>
          <input
            type="text"
            value={formData.organization}
            onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
            onBlur={handleSave}
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
            onBlur={handleSave}
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
            onBlur={handleSave}
            placeholder="任意"
            className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-green-500"
          />
        </div>
      </div>
    </div>
  );
}
