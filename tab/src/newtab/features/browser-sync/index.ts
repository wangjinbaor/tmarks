/**
 * 浏览器书签同步功能模块
 */

// 类型
export type * from './types';

// 常量
export {
  ROOT_TITLE,
  HOME_FOLDER_TITLE,
  WRITE_LOCK_DURATION,
  EXCLUDED_FOLDER_TITLES,
} from './constants';

// API
export { hasBookmarksApi, isFolder, getChildren, getSubTree, createBookmark } from './api';

// 核心功能
export { ensureRootFolder, getRootFolderId } from './root-folder';
export { ensureHomeFolder, getHomeFolderId } from './home-folder';
export { autoDiscoverAndCreateGroups } from './auto-discover';

// 数据转换
export { toGridItems, toGridId, fromGridId, isBrowserBookmarkItem } from './transform';

// 写锁
export { setWriteLock, isWriteLocked, withWriteLock } from './write-lock';

// 事件监听
export { registerBookmarkListeners } from './listeners';

// Hook
export { useBrowserBookmarksSync } from './hooks/use-browser-bookmarks-sync';
