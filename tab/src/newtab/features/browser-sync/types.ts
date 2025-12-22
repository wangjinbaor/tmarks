/**
 * 浏览器书签同步类型定义
 */

import type { ShortcutGroup } from '../../types';

/** 确保根文件夹结果 */
export interface EnsureRootFolderResult {
  id: string;
  wasRecreated: boolean;
  previousTitle?: string;
}

/** 确保首页文件夹结果 */
export interface EnsureHomeFolderResult {
  id: string;
  wasRecreated: boolean;
}

/** 自动发现结果 */
export interface DiscoverResult {
  created: string[];
  linked: string[];
  skipped: string[];
}

/** 书签节点信息 */
export interface BookmarkNodeInfo {
  id: string;
  parentId?: string;
  title?: string;
  url?: string;
  index?: number;
}

/** 同步状态 */
export interface BrowserSyncState {
  rootId: string | null;
  homeFolderId: string | null;
  isApplying: boolean;
  writeLockUntil: number;
}

/** 添加分组函数类型 */
export type AddGroupFn = (
  name: string,
  icon: string,
  options?: { bookmarkFolderId?: string | null; skipBookmarkFolderCreation?: boolean }
) => void;

/** 设置分组书签文件夹 ID 函数类型 */
export type SetGroupBookmarkFolderIdFn = (groupId: string, folderId: string | null) => void;

/** 获取分组列表函数类型 */
export type GetGroupsFn = () => ShortcutGroup[];

/** GridItem 转换选项 */
export interface ToGridItemsOptions {
  groupId: string;
  parentGridId: string | null;
}

/** 替换 GridItems 选项 */
export interface ReplaceGridItemsOptions {
  groupIds?: string[];
}

/** 书签事件处理器 */
export interface BookmarkEventHandlers {
  onCreated?: (id: string, node: chrome.bookmarks.BookmarkTreeNode) => void;
  onRemoved?: (
    id: string,
    removeInfo: { parentId: string; index: number; node?: chrome.bookmarks.BookmarkTreeNode }
  ) => void;
  onChanged?: (id: string, changeInfo: { title?: string; url?: string }) => void;
  onMoved?: (
    id: string,
    moveInfo: { parentId: string; oldParentId: string; index: number; oldIndex: number }
  ) => void;
  onChildrenReordered?: (id: string, reorderInfo: { childIds: string[] }) => void;
}
