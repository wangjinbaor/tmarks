import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, Trash2, X } from 'lucide-react';
import { ActionSheet } from './ui/ActionSheet';
import { ConfirmModal } from './ui/ConfirmModal';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { GridItem } from '../types';
import { Z_INDEX } from '../constants/z-index';
import { WidgetRenderer } from './widgets/WidgetRenderer';
import { useNewtabStore } from '../hooks/useNewtabStore';

interface BookmarkFolderModalProps {
  folder: GridItem;
  items: GridItem[];
  isOpen: boolean;
  onClose: () => void;
  onOpenFolder?: (folderId: string) => void;
  isBatchMode?: boolean;
  batchSelectedIds?: Set<string>;
  onBatchSelectedIdsChange?: (next: Set<string>) => void;
}

function SortableModalItem({
  item,
  onOpenFolder,
  isBatchMode,
  isSelected,
  onToggleSelect,
}: {
  item: GridItem;
  onOpenFolder?: (folderId: string) => void;
  isBatchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 批量模式下，点击时切换选中状态
  const handlePointerUp = (e: React.PointerEvent) => {
    if (isBatchMode && onToggleSelect) {
      // 只有在没有拖拽的情况下才触发选中
      if (!isDragging) {
        e.preventDefault();
        e.stopPropagation();
        onToggleSelect(item.id);
      }
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onPointerUp={handlePointerUp}
      className="touch-none cursor-grab active:cursor-grabbing"
    >
      <div className="h-[88px] w-[80px]">
        <WidgetRenderer
          item={item}
          onOpenFolder={onOpenFolder}
          isEditing
          isBatchMode={isBatchMode}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
        />
      </div>
    </div>
  );
}

export function BookmarkFolderModal({
  folder,
  items,
  isOpen,
  onClose,
  onOpenFolder,
  isBatchMode,
  batchSelectedIds,
  onBatchSelectedIdsChange,
}: BookmarkFolderModalProps) {
  const { removeGridFolder, updateGridItem, browserBookmarksRootId, homeBrowserFolderId } = useNewtabStore();
  const [isVisible, setIsVisible] = useState(false);
  const [title, setTitle] = useState(folder.bookmarkFolder?.title || '文件夹');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [effectiveParentId, setEffectiveParentId] = useState<string | null>(folder.parentId ?? null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isBrowserSyncedFolder = !!folder.browserBookmarkId;

  const dropId = useMemo(() => `folder-modal:${folder.id}`, [folder.id]);
  const outsideDropId = useMemo(() => `folder-modal-outside:${folder.id}`, [folder.id]);
  const undockParentDropId = useMemo(
    () => `folder-modal-undock-parent:${folder.id}:${effectiveParentId ?? 'root'}`,
    [folder.id, effectiveParentId]
  );

  const { setNodeRef: setDropRef, isOver: isOverDrop } = useDroppable({ id: dropId });
  const { setNodeRef: setOutsideDropRef, isOver: isOverOutside } = useDroppable({ id: outsideDropId });
  const { setNodeRef: setUndockParentDropRef, isOver: isOverUndockParent } = useDroppable({
    id: undockParentDropId,
    disabled: false,
  });

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => setIsVisible(true));
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(folder.bookmarkFolder?.title || '文件夹');
    setIsEditingTitle(false);
  }, [folder.bookmarkFolder?.title, isOpen]);

  useEffect(() => {
    setEffectiveParentId(folder.parentId ?? null);
  }, [folder.parentId]);

  useEffect(() => {
    if (!isOpen) return;
    if (!folder.browserBookmarkId) return;
    if ((folder.parentId ?? null) !== null) return;
    if (typeof chrome === 'undefined' || !chrome.bookmarks) return;

    (async () => {
      try {
        const nodes = await chrome.bookmarks.get(folder.browserBookmarkId!);
        const node = nodes?.[0];
        const parentBookmarkId = node?.parentId ?? null;
        if (!parentBookmarkId) return;

        if (
          parentBookmarkId === browserBookmarksRootId ||
          parentBookmarkId === homeBrowserFolderId
        ) {
          setEffectiveParentId(null);
          return;
        }

        // 如果父节点是「分组根目录」(group.bookmarkFolderId)，在 Grid 上表现为 parentId=null
        // 这样“移到上一级”就是移到分组根目录（仍属于该 groupId）
        const state = useNewtabStore.getState();
        const groupRootBookmarkId =
          folder.groupId && folder.groupId !== 'home'
            ? state.shortcutGroups.find((g) => g.id === folder.groupId)?.bookmarkFolderId
            : undefined;
        if (groupRootBookmarkId && parentBookmarkId === groupRootBookmarkId) {
          setEffectiveParentId(null);
          return;
        }

        setEffectiveParentId(`bb-${parentBookmarkId}`);
      } catch {
        // ignore
      }
    })();
  }, [
    isOpen,
    folder.browserBookmarkId,
    folder.parentId,
    folder.groupId,
    browserBookmarksRootId,
    homeBrowserFolderId,
  ]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const parentHint = effectiveParentId
    ? '上一级'
    : folder.groupId && folder.groupId !== 'home'
      ? '分组'
      : '首页';

  const handleDeleteFolder = () => {
    if (isBrowserSyncedFolder) return;
    setShowDeleteSheet(true);
  };

  const handleDeleteKeep = () => {
    setShowDeleteSheet(false);
    removeGridFolder(folder.id, 'keep');
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handleDeleteAll = () => {
    setShowDeleteSheet(false);
    setShowDeleteAllConfirm(true);
  };

  const confirmDeleteAll = () => {
    setShowDeleteAllConfirm(false);
    removeGridFolder(folder.id, 'all');
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handleTitleSave = () => {
    setIsEditingTitle(false);
    const trimmed = title.trim();
    const current = folder.bookmarkFolder?.title || '文件夹';
    if (trimmed && trimmed !== current) {
      updateGridItem(folder.id, { bookmarkFolder: { ...(folder.bookmarkFolder ?? {}), title: trimmed } });
    } else {
      setTitle(current);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handleListWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight <= el.clientHeight + 1) return;

    // 每次滚动一行（行高 + gap）
    const step = 104;
    e.preventDefault();
    el.scrollBy({ top: Math.sign(e.deltaY) * step, behavior: 'smooth' });
  };

  const tileHeight = 88;
  const gap = 16;
  const visibleRows = 3;
  const listHeight = tileHeight * visibleRows + gap * (visibleRows - 1);

  return createPortal(
    <div
      data-folder-modal="1"
      ref={setOutsideDropRef}
      className={`fixed inset-0 flex items-center justify-center p-4 transition-all duration-200 ${
        isVisible ? 'bg-black/60 backdrop-blur-md opacity-100' : 'opacity-0'
      } ${isOverOutside ? 'bg-black/70' : ''}`}
      style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-label={title}
        className={`liquid-glass rounded-3xl w-full max-w-2xl shadow-2xl transition-all duration-200 ease-[cubic-bezier(0.33,1,0.68,1)] ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{ zIndex: Z_INDEX.MODAL_CONTENT }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') {
                    setTitle(folder.bookmarkFolder?.title || '文件夹');
                    setIsEditingTitle(false);
                  }
                }}
                className="liquid-glass-mini border border-white/30 rounded-lg px-3 py-1.5 text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-white/40 w-full max-w-[320px] transition-all"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="text-lg font-medium text-white truncate flex items-center gap-2 hover:text-blue-300 transition-colors"
                title="点击重命名"
              >
                <span className="truncate">{title}</span>
                <Edit2 className="w-4 h-4 opacity-60" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isBrowserSyncedFolder && (
              <button
                type="button"
                onClick={handleDeleteFolder}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-red-400"
                aria-label="删除文件夹"
                title="删除文件夹"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          <div
            ref={setDropRef}
            className={`rounded-2xl p-4 transition-colors ${isOverDrop ? 'bg-white/10' : 'bg-white/5'}`}
          >
            <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
              <div
                ref={listRef}
                onWheel={handleListWheel}
                className="overflow-y-auto pr-1"
                style={{ height: `${listHeight}px` }}
              >
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 min-h-[140px]">
                  {items.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-white/50 text-sm">文件夹为空</div>
                  ) : (
                    items.map((item) => (
                      <SortableModalItem
                        key={item.id}
                        item={item}
                        onOpenFolder={onOpenFolder}
                        isBatchMode={isBatchMode}
                        isSelected={batchSelectedIds?.has(item.id)}
                        onToggleSelect={(id) => {
                          if (!onBatchSelectedIdsChange) return;
                          const next = new Set(batchSelectedIds ?? []);
                          if (next.has(id)) next.delete(id);
                          else next.add(id);
                          onBatchSelectedIdsChange(next);
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            </SortableContext>
          </div>

          <div className="mt-4">
            <div
              ref={setUndockParentDropRef}
              className={`rounded-2xl px-4 py-3 text-sm text-white/70 border border-dashed transition-colors ${
                isOverUndockParent ? 'bg-white/10 border-white/40' : 'bg-white/5 border-white/20'
              }`}
              title={(folder.parentId ?? null) ? '移到上一级文件夹' : '移到首页'}
            >
              移到上一级（{parentHint}）
            </div>
          </div>
        </div>
      </div>

      {/* 删除文件夹操作表 */}
      <ActionSheet
        isOpen={showDeleteSheet}
        title="删除文件夹"
        message="选择删除方式"
        actions={[
          { label: '保留内容（移出文件夹）', onClick: handleDeleteKeep },
          { label: '删除文件夹及全部内容', onClick: handleDeleteAll, variant: 'danger' },
        ]}
        onCancel={() => setShowDeleteSheet(false)}
      />

      {/* 删除全部确认弹窗 */}
      <ConfirmModal
        isOpen={showDeleteAllConfirm}
        title="确认删除"
        message="确定删除文件夹及全部内容吗？此操作不可恢复。"
        confirmText="删除"
        cancelText="取消"
        confirmVariant="danger"
        onConfirm={confirmDeleteAll}
        onCancel={() => setShowDeleteAllConfirm(false)}
      />
    </div>,
    document.body
  );
}
