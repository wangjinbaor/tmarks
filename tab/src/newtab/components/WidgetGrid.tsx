/**
 * 组件网格 - 统一渲染快捷方式和小组件
 * 支持不同尺寸的组件和拖拽排序
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings2, Check } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragCancelEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useNewtabStore } from '../hooks/useNewtabStore';
import { Z_INDEX } from '../constants/z-index';
import { WidgetRenderer } from './widgets/WidgetRenderer';
import { WidgetConfigModal } from './widgets/WidgetConfigModal';
import { BookmarkFolderModal } from './BookmarkFolderModal';
import { SortableGridItem } from './grid';
import { useDndDebug, useDndDebugListeners } from './grid';
import { ActionSheet } from './ui/ActionSheet';
import type { GridItem } from '../types';

interface WidgetGridProps {
  columns: 6 | 8 | 10;
  isBatchMode?: boolean;
  batchSelectedIds?: Set<string>;
  onBatchSelectedIdsChange?: (next: Set<string>) => void;
  isEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
}

export function WidgetGrid({
  columns,
  isBatchMode,
  batchSelectedIds,
  onBatchSelectedIdsChange,
  isEditing = false,
  onEditingChange,
}: WidgetGridProps) {
  const {
    gridItems,
    updateGridItem,
    removeGridItem,
    getFilteredGridItems,
    migrateToGridItems,
    currentFolderId,
    setCurrentFolderId,
    moveGridItemToFolder,
    mergeFolders,
    createFolderFromShortcuts,
    reorderGridItemsInCurrentScope,
    reorderGridItemsInFolderScope,
  } = useNewtabStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItemSnapshot, setActiveItemSnapshot] = useState<GridItem | null>(null);
  const [configItem, setConfigItem] = useState<GridItem | null>(null);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [folderMergePrompt, setFolderMergePrompt] = useState<{
    sourceId: string;
    targetId: string;
    sourceName: string;
    targetName: string;
  } | null>(null);
  // 快捷方式碰撞创建文件夹的提示
  const [shortcutMergePrompt, setShortcutMergePrompt] = useState<{
    sourceId: string;
    targetId: string;
    sourceName: string;
    targetName: string;
  } | null>(null);
  const lastOverIdRef = useRef<string | null>(null);

  const { pushDndDebug } = useDndDebug();
  useDndDebugListeners(activeId, pushDndDebug);

  // 首次加载时尝试迁移数据
  useEffect(() => {
    migrateToGridItems();
  }, [migrateToGridItems]);

  // 获取当前分组的网格项
  const filteredItems = getFilteredGridItems();
  const allSelectedInView =
    isBatchMode &&
    filteredItems.length > 0 &&
    filteredItems.every((item) => batchSelectedIds?.has(item.id));

  const openFolder = useMemo(
    () => (openFolderId ? gridItems.find((item) => item.id === openFolderId && item.type === 'bookmarkFolder') ?? null : null),
    [gridItems, openFolderId]
  );

  const openFolderItems = useMemo(() => {
    if (!openFolder) return [];
    return gridItems
      .filter((item) => (item.parentId ?? null) === openFolder.id)
      .sort((a, b) => a.position - b.position);
  }, [gridItems, openFolder]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 响应式网格列数
  const gridCols = {
    6: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6',
    8: 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8',
    10: 'grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10',
  };

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      setActiveId(id);
      const snapshot = gridItems.find((item) => item.id === id) ?? null;
      setActiveItemSnapshot(snapshot);
      lastOverIdRef.current = null;
      pushDndDebug({
        type: 'start',
        id,
        hasSnapshot: !!snapshot,
        snapshotType: snapshot?.type ?? null,
        ts: Date.now(),
      });
    },
    [gridItems, pushDndDebug]
  );

  const handleDragCancel = useCallback((event: DragCancelEvent) => {
    pushDndDebug({
      type: 'cancel',
      id: String(event.active.id),
      lastOverId: lastOverIdRef.current,
      ts: Date.now(),
    });
    setActiveId(null);
    setActiveItemSnapshot(null);
    lastOverIdRef.current = null;
  }, [pushDndDebug]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over?.id ? String(event.over.id) : null;
    if (lastOverIdRef.current !== overId) {
      lastOverIdRef.current = overId;
      pushDndDebug({
        type: 'over',
        id: String(event.active.id),
        overId,
        ts: Date.now(),
      });
    }
  }, [pushDndDebug]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      pushDndDebug({
        type: 'end',
        id: String(active.id),
        overId: over?.id ? String(over.id) : null,
        ts: Date.now(),
      });
      setActiveId(null);
      setActiveItemSnapshot(null);
      lastOverIdRef.current = null;

      if (!over || active.id === over.id) return;

      const overId = String(over.id);

      if (overId.startsWith('folder-modal-undock-parent:')) {
        // Supported formats:
        // - folder-modal-undock-parent:<sourceFolderGridId>
        // - folder-modal-undock-parent:<sourceFolderGridId>:<targetParentGridId|root>
        const payload = overId.replace('folder-modal-undock-parent:', '');
        const [sourceFolderId, targetParentToken] = payload.split(':');
        const targetParentId =
          !targetParentToken || targetParentToken === 'root'
            ? null
            : (targetParentToken as string);

        // Backward compatible fallback (if token missing)
        if (!targetParentToken) {
          const sourceFolder = gridItems.find((item) => item.id === sourceFolderId);
          moveGridItemToFolder(active.id as string, (sourceFolder?.parentId ?? null) as string | null);
          return;
        }

        moveGridItemToFolder(active.id as string, targetParentId);
        return;
      }

      // Folder modal re-order (same parent folder)
      if (openFolder?.id) {
        const activeItem = gridItems.find((item) => item.id === String(active.id));
        const overItem = gridItems.find((item) => item.id === String(over.id));
        if (
          activeItem &&
          overItem &&
          (activeItem.parentId ?? null) === openFolder.id &&
          (overItem.parentId ?? null) === openFolder.id
        ) {
          reorderGridItemsInFolderScope(openFolder.id, String(active.id), String(over.id));
          return;
        }
      }

      const overItem = gridItems.find((item) => item.id === over.id);
      if (overItem?.type === 'bookmarkFolder') {
        const activeItem = gridItems.find((item) => item.id === active.id);
        
        // 如果拖拽的也是文件夹，显示合并提示
        if (activeItem?.type === 'bookmarkFolder') {
          setFolderMergePrompt({
            sourceId: String(active.id),
            targetId: overItem.id,
            sourceName: activeItem.bookmarkFolder?.title || '文件夹',
            targetName: overItem.bookmarkFolder?.title || '文件夹',
          });
          return;
        }
        
        // 否则移动到文件夹内
        moveGridItemToFolder(active.id as string, overItem.id);
        return;
      }

      // 检测两个快捷方式碰撞，提示创建文件夹
      const activeItem = gridItems.find((item) => item.id === active.id);
      if (activeItem?.type === 'shortcut' && overItem?.type === 'shortcut') {
        setShortcutMergePrompt({
          sourceId: String(active.id),
          targetId: String(over.id),
          sourceName: activeItem.shortcut?.title || '快捷方式',
          targetName: overItem.shortcut?.title || '快捷方式',
        });
        return;
      }

      reorderGridItemsInCurrentScope(active.id as string, over.id as string);
    },
    [gridItems, moveGridItemToFolder, openFolder, pushDndDebug, reorderGridItemsInCurrentScope, reorderGridItemsInFolderScope]
  );

  // 处理文件夹合并
  const handleMergeFolders = useCallback(() => {
    if (!folderMergePrompt) return;
    mergeFolders(folderMergePrompt.sourceId, folderMergePrompt.targetId);
    setFolderMergePrompt(null);
  }, [folderMergePrompt, mergeFolders]);

  // 处理快捷方式合并创建文件夹
  const handleCreateFolderFromShortcuts = useCallback(() => {
    if (!shortcutMergePrompt) return;
    createFolderFromShortcuts(shortcutMergePrompt.sourceId, shortcutMergePrompt.targetId);
    setShortcutMergePrompt(null);
  }, [shortcutMergePrompt, createFolderFromShortcuts]);

  // 处理快捷方式重排序（不创建文件夹）
  const handleReorderShortcuts = useCallback(() => {
    if (!shortcutMergePrompt) return;
    reorderGridItemsInCurrentScope(shortcutMergePrompt.sourceId, shortcutMergePrompt.targetId);
    setShortcutMergePrompt(null);
  }, [shortcutMergePrompt, reorderGridItemsInCurrentScope]);

  // 处理文件夹移入（不合并）
  const handleMoveToFolder = useCallback(() => {
    if (!folderMergePrompt) return;
    moveGridItemToFolder(folderMergePrompt.sourceId, folderMergePrompt.targetId);
    setFolderMergePrompt(null);
  }, [folderMergePrompt, moveGridItemToFolder]);

  const handleOpenFolder = useCallback((folderId: string) => {
    setOpenFolderId(folderId);
  }, []);

  const handleToggleSelect = useCallback(
    (id: string) => {
      if (!onBatchSelectedIdsChange) return;
      const prev = batchSelectedIds ?? new Set<string>();
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onBatchSelectedIdsChange(next);
    },
    [batchSelectedIds, onBatchSelectedIdsChange]
  );

  useEffect(() => {
    if (currentFolderId) {
      setOpenFolderId(currentFolderId);
      setCurrentFolderId(null);
    }
  }, [currentFolderId, setCurrentFolderId]);

  // 获取当前拖拽的项
  const activeItem = activeItemSnapshot ?? (activeId ? gridItems.find((item) => item.id === activeId) : null);

  // 空状态
  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 text-white/50">
        <span className="text-sm">当前分组没有内容</span>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={filteredItems.map((item) => item.id)} strategy={rectSortingStrategy}>
          <div className={`grid ${gridCols[columns]} gap-4 auto-rows-[80px]`}>
            {filteredItems.map((item) => (
              <SortableGridItem
                key={item.id}
                item={item}
                onUpdate={updateGridItem}
                onRemove={removeGridItem}
                isEditing={isEditing}
                onConfigClick={setConfigItem}
                onOpenFolder={handleOpenFolder}
                isBatchMode={isBatchMode}
                isSelected={!!batchSelectedIds?.has(item.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))}

          </div>
        </SortableContext>

        {typeof document !== 'undefined'
          ? createPortal(
              <DragOverlay zIndex={Z_INDEX.DRAG_OVERLAY}>
                {activeItem ? (
                  <div className="opacity-80 pointer-events-none">
                    <WidgetRenderer
                      item={activeItem}
                      onOpenFolder={handleOpenFolder}
                      isEditing
                      isBatchMode={isBatchMode}
                      isSelected={!!batchSelectedIds?.has(activeItem.id)}
                      onToggleSelect={handleToggleSelect}
                    />
                  </div>
                ) : null}
              </DragOverlay>,
              document.body
            )
          : (
              <DragOverlay zIndex={Z_INDEX.DRAG_OVERLAY}>
                {activeItem ? (
                  <div className="opacity-80 pointer-events-none">
                    <WidgetRenderer
                      item={activeItem}
                      onOpenFolder={handleOpenFolder}
                      isBatchMode={isBatchMode}
                      isSelected={!!batchSelectedIds?.has(activeItem.id)}
                      onToggleSelect={handleToggleSelect}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            )}

        {openFolder ? (
          <BookmarkFolderModal
            folder={openFolder}
            items={openFolderItems}
            isOpen
            onClose={() => setOpenFolderId(null)}
            onOpenFolder={handleOpenFolder}
            isBatchMode={isBatchMode}
            batchSelectedIds={batchSelectedIds}
            onBatchSelectedIdsChange={onBatchSelectedIdsChange}
          />
        ) : null}
      </DndContext>

      {configItem && (
        <WidgetConfigModal
          item={configItem}
          isOpen={!!configItem}
          onClose={() => setConfigItem(null)}
          onUpdate={updateGridItem}
          onRemove={removeGridItem}
        />
      )}

      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => onEditingChange?.(!isEditing)}
          className={`p-3 rounded-full shadow-lg transition-all ${
            isEditing
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'glass hover:bg-white/20 text-white/70'
          }`}
          title={isEditing ? '完成编辑' : '编辑布局'}
        >
          {isEditing ? (
            <Check className="w-5 h-5" />
          ) : (
            <Settings2 className="w-5 h-5" />
          )}
        </button>
      </div>

      {isBatchMode && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full glass text-sm text-white/80 animate-fadeIn">
          <button
            onClick={() => {
              const next = new Set(batchSelectedIds ?? []);
              if (allSelectedInView) {
                filteredItems.forEach((i) => next.delete(i.id));
              } else {
                filteredItems.forEach((i) => next.add(i.id));
              }
              onBatchSelectedIdsChange?.(next);
            }}
            className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            {allSelectedInView ? '取消全选当前分组' : '全选当前分组'}
          </button>
        </div>
      )}

      {/* 文件夹合并/移入选择弹窗 */}
      <ActionSheet
        isOpen={!!folderMergePrompt}
        title="文件夹操作"
        message={`将「${folderMergePrompt?.sourceName}」拖到了「${folderMergePrompt?.targetName}」上`}
        actions={[
          {
            label: '合并文件夹',
            onClick: handleMergeFolders,
          },
          {
            label: '移入文件夹',
            onClick: handleMoveToFolder,
          },
        ]}
        onCancel={() => setFolderMergePrompt(null)}
      />

      {/* 快捷方式合并创建文件夹弹窗 */}
      <ActionSheet
        isOpen={!!shortcutMergePrompt}
        title="创建文件夹"
        message={`将「${shortcutMergePrompt?.sourceName}」拖到了「${shortcutMergePrompt?.targetName}」上`}
        actions={[
          {
            label: '合并为文件夹',
            onClick: handleCreateFolderFromShortcuts,
          },
          {
            label: '仅调整顺序',
            onClick: handleReorderShortcuts,
          },
        ]}
        onCancel={() => setShortcutMergePrompt(null)}
      />
    </>
  );
}
