'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { createClient } from '@/lib/supabase/client';
import { Friend, GuestFriend, Profile } from '@/types';
import FriendCard from './FriendCard';

interface FriendsListProps {
  friends: Friend[];
  isGuest: boolean;
  onUpdate: (friends: Friend[]) => void;
}

export default function FriendsList({ friends, isGuest, onUpdate }: FriendsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'unavailable' | 'emergency'>('all');

  const filteredFriends = friends.filter((friend) => {
    const profile = friend.friend_profile || friend;
    const nickname = 'nickname' in profile ? profile.nickname : '';
    const matchesSearch = nickname.toLowerCase().includes(searchQuery.toLowerCase());
    const status = 'status' in profile && profile.status ? profile.status : 'available';
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pinnedFriends = filteredFriends.filter((f) => f.pinned);
  const unpinnedFriends = filteredFriends.filter((f) => !f.pinned);

  const handleDelete = async (friendId: string) => {
    if (!confirm('このフレンドを削除しますか？')) return;

    try {
      if (isGuest) {
        const updatedFriends = friends.filter((f) => f.id !== friendId);
        localStorage.setItem('guest_friends', JSON.stringify(updatedFriends));
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
    } catch (error: any) {
      alert('メモの更新に失敗しました: ' + error.message);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    const isPinned = result.destination.droppableId === 'pinned';

    // ピン留めされたフレンドとそうでないフレンドを別々に処理
    const currentPinned = friends.filter((f) => f.pinned);
    const currentUnpinned = friends.filter((f) => !f.pinned);

    let reorderedFriends: Friend[] = [];

    if (result.source.droppableId === 'pinned' && isPinned) {
      // ピン留めエリア内での並び替え
      const newPinned = Array.from(currentPinned);
      const [removed] = newPinned.splice(sourceIndex, 1);
      newPinned.splice(destIndex, 0, removed);
      
      // orderを更新
      const updatedPinned = newPinned.map((f, index) => ({
        ...f,
        order: index,
      }));

      reorderedFriends = [...updatedPinned, ...currentUnpinned];
    } else if (result.source.droppableId === 'unpinned' && !isPinned) {
      // 通常エリア内での並び替え
      const newUnpinned = Array.from(currentUnpinned);
      const [removed] = newUnpinned.splice(sourceIndex, 1);
      newUnpinned.splice(destIndex, 0, removed);
      
      // orderを更新（ピン留めの数をオフセットとして使用）
      const updatedUnpinned = newUnpinned.map((f, index) => ({
        ...f,
        order: currentPinned.length + index,
      }));

      reorderedFriends = [...currentPinned, ...updatedUnpinned];
    } else {
      // ピン留め/解除による移動（ここでは並び替えのみなので、このケースは無視）
      return;
    }

    // データベースを更新
    try {
      if (isGuest) {
        localStorage.setItem('guest_friends', JSON.stringify(reorderedFriends));
        onUpdate(reorderedFriends);
      } else {
        // 各フレンドのorderを更新
        const updates = reorderedFriends.map((friend, index) =>
          createClient()
            .from('friends')
            .update({ order: index })
            .eq('id', friend.id)
        );

        await Promise.all(updates);
        onUpdate(reorderedFriends);
      }
    } catch (error: any) {
      alert('並び替えに失敗しました: ' + error.message);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">フレンド一覧</h2>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="名前で検索..."
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:w-48"
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | 'available' | 'unavailable' | 'emergency')
            }
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">すべて</option>
            <option value="available">対応可能</option>
            <option value="unavailable">対応不可</option>
            <option value="emergency">緊急</option>
          </select>
        </div>
      </div>

      {friends.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          フレンドがいません
        </div>
      ) : filteredFriends.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          該当するフレンドが見つかりません
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-6">
            {pinnedFriends.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  ピン留め
                </h3>
                <Droppable droppableId="pinned" direction="horizontal">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${
                        snapshot.isDraggingOver ? 'bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2' : ''
                      }`}
                    >
                      {pinnedFriends.map((friend, index) => (
                        <Draggable key={friend.id} draggableId={friend.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={snapshot.isDragging ? 'opacity-50' : ''}
                            >
                              <FriendCard
                                friend={friend}
                                onDelete={handleDelete}
                                onTogglePin={handleTogglePin}
                                onUpdateMemo={handleUpdateMemo}
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
            )}

            {unpinnedFriends.length > 0 && (
              <div>
                {pinnedFriends.length > 0 && (
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    フレンド
                  </h3>
                )}
                <Droppable droppableId="unpinned" direction="horizontal">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${
                        snapshot.isDraggingOver ? 'bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2' : ''
                      }`}
                    >
                      {unpinnedFriends.map((friend, index) => (
                        <Draggable key={friend.id} draggableId={friend.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={snapshot.isDragging ? 'opacity-50' : ''}
                            >
                              <FriendCard
                                friend={friend}
                                onDelete={handleDelete}
                                onTogglePin={handleTogglePin}
                                onUpdateMemo={handleUpdateMemo}
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
            )}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}

