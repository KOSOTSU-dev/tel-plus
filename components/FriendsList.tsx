'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createClient } from '@/lib/supabase/client';
import { Friend, UserStatus } from '@/types';
import FriendListItem from './FriendListItem';
import FriendDetailModal from './FriendDetailModal';

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

interface SortableFriendItemProps {
  friend: Friend;
  onDelete: (friendId: string) => void;
  onTogglePin: (friend: Friend) => void;
  onUpdateMemo: (friendId: string, memo: string) => void;
  onOpenDetail?: (friend: Friend) => void;
  isPinned: boolean;
  disabled?: boolean;
}

function SortableFriendItem({
  friend,
  onDelete,
  onTogglePin,
  onUpdateMemo,
  onOpenDetail,
  isPinned,
  disabled = false,
}: SortableFriendItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: friend.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div {...(disabled ? {} : listeners)} className={disabled ? '' : 'cursor-grab active:cursor-grabbing'}>
        <FriendListItem
          friend={friend}
          onDelete={onDelete}
          onTogglePin={onTogglePin}
          onUpdateMemo={onUpdateMemo}
          onOpenDetail={onOpenDetail}
          isPinned={isPinned}
        />
      </div>
    </div>
  );
}

export default function FriendsList({ friends, isGuest, onUpdate }: FriendsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<UserStatus | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 検索フィルタリング（名前またはステータスで検索）とステータスフィルター
  const filteredFriends = friends.filter((friend) => {
    const profile = friend.friend_profile || friend;
    const nickname = 'nickname' in profile ? profile.nickname || '' : '';
    const status = 'status' in profile ? profile.status || 'available' : 'available';
    const statusLabel = statusLabels[status];
    
    // ステータスフィルターの適用
    if (selectedStatusFilter && status !== selectedStatusFilter) {
      return false;
    }
    
    // 検索クエリの適用
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      nickname.toLowerCase().includes(query) ||
      statusLabel.includes(query)
    );
  });

  // 並び順でソート（orderがnullまたはundefinedの場合は0として扱う）
  const pinnedFriends = filteredFriends.filter((f) => f.pinned).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const unpinnedFriends = filteredFriends.filter((f) => !f.pinned).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    if (active.id === over.id) {
      setActiveId(null);
      return;
    }

    // アクティブなアイテムがピン留めされている場合は移動不可
    const activeFriend = [...pinnedFriends, ...unpinnedFriends].find(f => f.id === active.id);
    if (activeFriend?.pinned) {
      setActiveId(null);
      return;
    }

    // ピン留めされていないフレンドのみ並び替え可能
    const oldIndex = unpinnedFriends.findIndex((f) => f.id === active.id);
    const newIndex = unpinnedFriends.findIndex((f) => f.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      setActiveId(null);
      return;
    }

    // 並び順を更新
    const newUnpinnedFriends = arrayMove(unpinnedFriends, oldIndex, newIndex);
    const updatedList = newUnpinnedFriends.map((friend, index) => ({
      ...friend,
      order: index,
    }));

    // 他のリストとマージ
    const updatedFriends = [...pinnedFriends, ...updatedList];

    // まず即座にUIを更新して、もたつきを防ぐ
    setActiveId(null);

    // 即座に状態を更新
    if (isGuest) {
      localStorage.setItem('guest_friends', JSON.stringify(updatedFriends));
      onUpdate(updatedFriends);
    } else {
      // サンプルフレンドと実際のフレンドを分離
      const allSampleFriends = updatedFriends.filter(friend => friend.id.startsWith('sample'));
      const sampleFriendsInList = updatedList.filter(friend => friend.id.startsWith('sample'));
      const realFriends = updatedList.filter(friend => !friend.id.startsWith('sample'));

      // サンプルフレンドの状態をlocalStorageに保存（ピン留めされたものも含む）
      if (allSampleFriends.length > 0) {
        localStorage.setItem('sample_friends', JSON.stringify(allSampleFriends));
      }

      // 即座にUIを更新
      onUpdate(updatedFriends);

      // バックグラウンドでデータベースに保存
      if (realFriends.length > 0) {
        (async () => {
          try {
            const updatePromises = realFriends.map(async (friend) => {
              const { error } = await createClient()
                .from('friends')
                .update({ order: friend.order })
                .eq('id', friend.id);
              
              if (error) {
                console.error(`フレンド ${friend.id} の更新に失敗:`, error);
                throw error;
              }
              return friend;
            });
            
            await Promise.all(updatePromises);
            console.log(`${realFriends.length}件のフレンドの並び順を更新しました`);
          } catch (error: any) {
            console.error('並び順の更新に失敗しました:', error);
            alert('並び順の更新に失敗しました: ' + error.message);
            // エラーが発生した場合は、元の状態に戻すためデータを再読み込み
            window.dispatchEvent(new Event('dashboard:refresh-friends'));
          }
        })();
      }
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
        // サンプルフレンドの場合は、localStorageに保存
        if (friend.id.startsWith('sample')) {
          const updatedFriends = friends.map((f) =>
            f.id === friend.id ? { ...f, pinned: !f.pinned } : f
          );
          // サンプルフレンドの状態をlocalStorageに保存
          const sampleFriends = updatedFriends.filter(f => f.id.startsWith('sample'));
          if (sampleFriends.length > 0) {
            localStorage.setItem('sample_friends', JSON.stringify(sampleFriends));
          }
          onUpdate(updatedFriends);
        } else {
          const newPinnedStatus = !friend.pinned;
          
          // ピン留め状態を更新
          const { data, error } = await createClient()
            .from('friends')
            .update({ pinned: newPinnedStatus })
            .eq('id', friend.id)
            .select()
            .single();

          if (error) {
            console.error('ピン留めの更新に失敗:', error);
            alert('ピン留めの更新に失敗しました: ' + error.message);
            return;
          }

          console.log('ピン留めを更新しました:', data);

          // ローカル状態を更新
          const updatedFriends = friends.map((f) =>
            f.id === friend.id ? { ...f, pinned: newPinnedStatus } : f
          );
          onUpdate(updatedFriends);
        }
      }
    } catch (error: any) {
      console.error('ピン留めの更新エラー:', error);
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
        // サンプルフレンドの場合は、localStorageに保存
        if (friendId.startsWith('sample')) {
          const updatedFriends = friends.map((f) =>
            f.id === friendId ? { ...f, memo } : f
          );
          // サンプルフレンドの状態をlocalStorageに保存
          const sampleFriends = updatedFriends.filter(f => f.id.startsWith('sample'));
          if (sampleFriends.length > 0) {
            localStorage.setItem('sample_friends', JSON.stringify(sampleFriends));
          }
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

  const activeFriend = activeId ? [...pinnedFriends, ...unpinnedFriends].find(f => f.id === activeId) : null;

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-1">
            {/* 見出し行 */}
            {(pinnedFriends.length > 0 || unpinnedFriends.length > 0) && (
              <div className="space-y-1 mb-1.5">
                {unpinnedFriends.length > 0 && (
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">フレンド</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'available' ? null : 'available')}
                        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                          selectedStatusFilter === 'available'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        type="button"
                      >
                        対応可
                      </button>
                      <button
                        onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'unavailable' ? null : 'unavailable')}
                        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                          selectedStatusFilter === 'unavailable'
                            ? 'bg-gray-400 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        type="button"
                      >
                        不可
                      </button>
                      <button
                        onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'emergency' ? null : 'emergency')}
                        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                          selectedStatusFilter === 'emergency'
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        type="button"
                      >
                        緊急のみ
                      </button>
                    </div>
                  </div>
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
            {pinnedFriends.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 rounded-lg p-1">
                {pinnedFriends.map((friend) => (
                  <div key={friend.id}>
                    <FriendListItem
                      friend={friend}
                      onDelete={handleDelete}
                      onTogglePin={handleTogglePin}
                      onUpdateMemo={handleUpdateMemo}
                      onOpenDetail={(friend) => {
                        setSelectedFriend(friend);
                        setIsDetailModalOpen(true);
                      }}
                      isPinned={true}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ピン留めされていないフレンドリスト */}
            {unpinnedFriends.length > 0 && (
              <SortableContext
                items={unpinnedFriends.map(f => f.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {unpinnedFriends.map((friend) => (
                    <SortableFriendItem
                      key={friend.id}
                      friend={friend}
                      onDelete={handleDelete}
                      onTogglePin={handleTogglePin}
                      onUpdateMemo={handleUpdateMemo}
                      onOpenDetail={(friend) => {
                        setSelectedFriend(friend);
                        setIsDetailModalOpen(true);
                      }}
                      isPinned={false}
                    />
                  ))}
                </div>
              </SortableContext>
            )}

            <DragOverlay>
              {activeFriend ? (
                <div style={{ opacity: 0.5, transform: 'rotate(5deg)' }}>
                  <FriendListItem
                    friend={activeFriend}
                    onDelete={handleDelete}
                    onTogglePin={handleTogglePin}
                    onUpdateMemo={handleUpdateMemo}
                    isPinned={activeFriend.pinned}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </div>
        </DndContext>
      )}

      {/* フレンド詳細モーダル */}
      <FriendDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedFriend(null);
        }}
        friend={selectedFriend}
      />
    </div>
  );
}
