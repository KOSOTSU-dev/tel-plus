export type UserStatus = 'available' | 'unavailable' | 'emergency';

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  nickname: string;
  organization?: string;
  phone?: string;
  public_email?: string;
  status: UserStatus;
  note?: string;
  friend_code: string;
  created_at: string;
  updated_at: string;
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  pinned: boolean;
  order: number;
  memo?: string;
  created_at: string;
  friend_profile?: Profile;
}

export interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  from_profile?: Profile;
  to_profile?: Profile;
}

export interface GuestFriend {
  id: string;
  friend_code: string;
  nickname: string;
  organization?: string;
  phone?: string;
  public_email?: string;
  status: UserStatus;
  note?: string;
  pinned: boolean;
  order: number;
  memo?: string;
}

