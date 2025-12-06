'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { createClient } from '@/lib/supabase/client';
import { Friend, UserStatus } from '@/types';
import FriendListItem from './FriendListItem';

interface FriendsListProps {
  friends: Friend[];
  isGuest: boolean;
  onUpdate: (friends: Friend[]) => void;
}

const statusLabels: Record<UserStatus, string> = {
  available: '対応可',
  unavailable: '不可',
  emergency: '緊急のみ',
};

export default function FriendsList({ friends, isGuest, onUpdate }: FriendsListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 検索フィルタリング（名前またはステータスで検索）
  const filteredFriends = friends.filter((friend) => {
    const profile = friend.friend_profile || friend;
    const nickname = 'nickname' in profile ? profile.nickname || '' : '';
    const status = 'status' in profile ? profile.status || 'available' : 'available';
    const statusLabel = statusLabels[status];
    
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      nickname.toLowerCase().includes(query) ||
      statusLabel.includes(query)
    );
  });

  // 並び順でソート
  const pinnedFriends = filteredFriends.filter((f) => f.pinned).sort((a, b) => (a.order || 0) - (b.order || 0));
  const unpinnedFriends = filteredFriends.filter((f) => !f.pinned).sort((a, b) => (a.order || 0) - (b.order || 0));

  // グリッドの列数を取得（画面幅に応じて）
  const getGridCols = () => {
    if (typeof window === 'undefined') return 4;
    const width = window.innerWidth;
    if (width >= 1280) return 4; // xl
    if (width >= 1024) return 3; // lg
    if (width >= 768) return 2;  // md
    return 1;
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;

    // ピン留めは入れ替え不可
    if (source.droppableId === 'pinned') return;

    // ピン留め同士、非ピン留め同士の移動のみ許可
    if (source.droppableId !== destination.droppableId) return;

    const isPinned = source.droppableId === 'pinned';
    const sourceList = isPinned ? pinnedFriends : unpinnedFriends;
    
    // グリッド列数を取得
    const gridCols = getGridCols();
    
    // グリッド内の位置を計算（横方向の移動を考慮）
    const sourceRow = Math.floor(source.index / gridCols);
    const sourceCol = source.index % gridCols;
    const destRow = Math.floor(destination.index / gridCols);
    const destCol = destination.index % gridCols;
    
    // 同じ行内での移動のみ許可（横方向のみ）
    if (sourceRow !== destRow) return;
    
    // 並び順を更新
    const newList = Array.from(sourceList);
    const [removed] = newList.splice(source.index, 1);
    newList.splice(destination.index, 0, removed);

    // orderフィールドを更新
    const updatedList = newList.map((friend, index) => ({
      ...friend,
      order: index,
    }));

    // 他のリストとマージ
    const updatedFriends = isPinned
      ? [...unpinnedFriends, ...updatedList]
      : [...pinnedFriends, ...updatedList];

    // データベースに保存
    try {
      if (isGuest) {
        localStorage.setItem('guest_friends', JSON.stringify(updatedFriends));
        onUpdate(updatedFriends);
      } else {
        // 全ての更新されたフレンドを保存
        const updatePromises = updatedList.map(async (friend) => {
          if (!friend.id.startsWith('sample')) {
            return createClient()
              .from('friends')
              .update({ order: friend.order })
              .eq('id', friend.id);
          }
          return Promise.resolve();
        });
        await Promise.all(updatePromises);
        onUpdate(updatedFriends);
      }
    } catch (error: any) {
      console.error('並び順の更新に失敗しました:', error);
      alert('並び順の更新に失敗しました: ' + error.message);
    }
  };

  const handleDelete = async (friendId: string) => {
    if (!confirm('このフレンドを削除しますか？')) return;

    try {
      if (isGuest) {
        const updatedFriends = friends.filter((f) => f.id !== friendId);
        localStorage.setItem('guest_friends', JSON.stringify(updatedFriends));
        onUpdate(updatedFriends);
      } else {
        // サンプルフレンド（idがsampleで始まる）の場合は、クライアント側のみで削除
        if (friendId.startsWith('sample')) {
          const updatedFriends = friends.filter((f) => f.id !== friendId);
          onUpdate(updatedFriends);
        } else {
          const { error } = await createClient()
            .from('friends')
            .delete()
            .eq('id', friendId);

          if (error) throw error;

          const updatedFriends = friends.filter((f) => f.id !== friendId);
          onUpdate(updatedFriends);
        }
      }
    } catch (error: any) {
      alert('削除に失敗しました: ' + error.message);
    }
  };

  const handleTogglePin = async (friend: Friend) => {
    try {
      if (isGuest) {
        const updatedFriends = friends.map((f) =>
          f.id === friend.id ? { ...f, pinned: !f.pinned } : f
        );
        localStorage.setItem('guest_friends', JSON.stringify(updatedFriends));
        onUpdate(updatedFriends);
      } else {
        // サンプルフレンドの場合は、クライアント側のみで更新
        if (friend.id.startsWith('sample')) {
          const updatedFriends = friends.map((f) =>
            f.id === friend.id ? { ...f, pinned: !f.pinned } : f
          );
          onUpdate(updatedFriends);
        } else {
          const { error } = await createClient()
            .from('friends')
            .update({ pinned: !friend.pinned })
            .eq('id', friend.id);

          if (error) throw error;

          const updatedFriends = friends.map((f) =>
            f.id === friend.id ? { ...f, pinned: !f.pinned } : f
          );
          onUpdate(updatedFriends);
        }
      }
    } catch (error: any) {
      alert('ピン留めの更新に失敗しました: ' + error.message);
    }
  };

  const handleUpdateMemo = async (friendId: string, memo: string) => {
    try {
      if (isGuest) {
        const updatedFriends = friends.map((f) =>
          f.id === friendId ? { ...f, memo } : f
        );
        localStorage.setItem('guest_friends', JSON.stringify(updatedFriends));
        onUpdate(updatedFriends);
      } else {
        // サンプルフレンドの場合は、クライアント側のみで更新
        if (friendId.startsWith('sample')) {
          const updatedFriends = friends.map((f) =>
            f.id === friendId ? { ...f, memo } : f
          );
          onUpdate(updatedFriends);
        } else {
          const { error } = await createClient()
            .from('friends')
            .update({ memo })
            .eq('id', friendId);

          if (error) throw error;

          const updatedFriends = friends.map((f) =>
            f.id === friendId ? { ...f, memo } : f
          );
          onUpdate(updatedFriends);
        }
      }
    } catch (error: any) {
      alert('メモの更新に失敗しました: ' + error.message);
    }
  };

  return (
    <div className="bg-white p-6 border border-gray-200 rounded-lg">
      {/* フレンド検索（名前or状況） */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="フレンド検索（名前or状況）"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
        />
      </div>

      {isGuest && (
        <div className="mb-4">
          <button className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>+フレンド交換</span>
          </button>
        </div>
      )}

      {friends.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          フレンドがいません
        </div>
      ) : filteredFriends.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          該当するフレンドが見つかりません
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-1">
            {/* 見出し行 */}
            {(pinnedFriends.length > 0 || unpinnedFriends.length > 0) && (
              <div className="space-y-1 mb-1.5">
                {unpinnedFriends.length > 0 && (
                  <h3 className="text-sm font-medium text-gray-700">フレンド</h3>
                )}
                {pinnedFriends.length > 0 && (
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    ピン留め
                  </h3>
                )}
              </div>
            )}

            {/* ピン留めフレンドリスト */}
            <Droppable droppableId="pinned" isDropDisabled={pinnedFriends.length === 0}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 border border-yellow-200 rounded-lg p-1 ${pinnedFriends.length === 0 ? 'hidden' : ''}`}
                >
                  {pinnedFriends.map((friend, index) => (
                    <Draggable key={friend.id} draggableId={friend.id} index={index} isDragDisabled={true}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={snapshot.isDragging ? 'opacity-50' : ''}
                          style={provided.draggableProps.style}
                        >
                          <FriendListItem
                            friend={friend}
                            onDelete={handleDelete}
                            onTogglePin={handleTogglePin}
                            onUpdateMemo={handleUpdateMemo}
                            isPinned={true}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* ピン留めされていないフレンドリスト */}
            <Droppable droppableId="unpinned" isDropDisabled={unpinnedFriends.length === 0}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 ${unpinnedFriends.length === 0 ? 'hidden' : ''}`}
                >
                  {unpinnedFriends.map((friend, index) => (
                    <Draggable key={friend.id} draggableId={friend.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={snapshot.isDragging ? 'opacity-50' : ''}
                          style={provided.draggableProps.style}
                        >
                          <FriendListItem
                            friend={friend}
                            onDelete={handleDelete}
                            onTogglePin={handleTogglePin}
                            onUpdateMemo={handleUpdateMemo}
                            isPinned={false}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
