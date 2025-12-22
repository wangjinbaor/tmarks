/**
 * NewTab Store 类型定义
 */

import type {
  Shortcut,
  ShortcutGroup,
  ShortcutFolder,
  NewTabSettings,
  GridItem,
  GridItemType,
  GridItemSize,
} from '../../types';

export interface NewTabState {
  // 数据
  shortcuts: Shortcut[];
  shortcutGroups: ShortcutGroup[];
  shortcutFolders: ShortcutFolder[];
  activeGroupId: string | null;
  settings: NewTabSettings;
  isLoading: boolean;
  gridItems: GridItem[];
  currentFolderId: string | null;
  browserBookmarksRootId: string | null;
  homeBrowserFolderId: string | null;
  isApplyingBrowserBookmarks: boolean;
  browserBookmarkWriteLockUntil: number;

  // Actions
  loadData: () => Promise<void>;
  saveData: () => Promise<void>;

  // 快捷方式操作
  addShortcut: (shortcut: Omit<Shortcut, 'id' | 'position' | 'createdAt' | 'clickCount'>) => void;
  updateShortcut: (id: string, updates: Partial<Shortcut>) => void;
  removeShortcut: (id: string) => void;
  reorderShortcuts: (fromIndex: number, toIndex: number) => void;
  incrementClickCount: (id: string) => void;
  getFilteredShortcuts: () => Shortcut[];

  // 分组操作
  setActiveGroup: (groupId: string | null) => void;
  addGroup: (
    name: string,
    icon: string,
    options?: {
      bookmarkFolderId?: string | null;
      skipBookmarkFolderCreation?: boolean;
    }
  ) => void;
  updateGroup: (id: string, updates: Partial<ShortcutGroup>) => void;
  removeGroup: (id: string, options?: { skipBrowserBookmarkDeletion?: boolean }) => void;

  // 文件夹操作
  addFolder: (name: string, groupId?: string) => string;
  updateFolder: (id: string, updates: Partial<ShortcutFolder>) => void;
  removeFolder: (id: string) => void;
  getFolderShortcuts: (folderId: string) => Shortcut[];
  moveShortcutToFolder: (shortcutId: string, folderId: string | undefined) => void;

  // 设置操作
  updateSettings: (updates: Partial<NewTabSettings>) => void;

  // 网格项操作
  addGridItem: (
    type: GridItemType,
    options?: {
      size?: GridItemSize;
      groupId?: string;
      shortcut?: GridItem['shortcut'];
      bookmarkFolder?: GridItem['bookmarkFolder'];
      parentId?: string | null;
    }
  ) => void;
  updateGridItem: (id: string, updates: Partial<GridItem>) => void;
  removeGridItem: (id: string) => void;
  removeGridFolder: (id: string, mode: 'keep' | 'all') => void;
  reorderGridItems: (fromIndex: number, toIndex: number) => void;
  getFilteredGridItems: () => GridItem[];
  migrateToGridItems: () => void;
  setCurrentFolderId: (folderId: string | null) => void;
  moveGridItemToFolder: (id: string, folderId: string | null) => void;
  reorderGridItemsInCurrentScope: (activeId: string, overId: string) => void;
  reorderGridItemsInFolderScope: (folderId: string, activeId: string, overId: string) => void;
  mergeFolders: (sourceFolderId: string, targetFolderId: string) => void;
  createFolderFromShortcuts: (shortcutId1: string, shortcutId2: string, folderName?: string) => string | null;
  cleanupEmptySecondLevelFolders: () => void;
  cleanupAllEmptyFolders: () => void;
  cleanupEmptyGroups: () => void;
  setBrowserBookmarksRootId: (rootId: string | null) => void;
  setHomeBrowserFolderId: (folderId: string | null) => void;
  setIsApplyingBrowserBookmarks: (isApplying: boolean) => void;
  setBrowserBookmarkWriteLockUntil: (until: number) => void;
  replaceBrowserBookmarkGridItems: (items: GridItem[], options?: { groupIds?: string[] }) => void;
  ensureGroupBookmarkFolderId: (
    groupId: string,
    options?: { createIfMissing?: boolean; bookmarkFolderIdOverride?: string | null }
  ) => Promise<string | null>;

  // Browser bookmarks incremental apply
  upsertBrowserBookmarkNode: (node: {
    id: string;
    parentId?: string;
    title?: string;
    url?: string;
    index?: number;
  }) => void;
  removeBrowserBookmarkById: (bookmarkId: string) => void;
  applyBrowserBookmarkChildrenOrder: (
    parentBookmarkId: string,
    orderedChildBookmarkIds: string[]
  ) => void;
  mirrorHomeItemsToBrowser: (ids: string[]) => void;
  setGroupBookmarkFolderId: (groupId: string, folderId: string | null) => void;
}
