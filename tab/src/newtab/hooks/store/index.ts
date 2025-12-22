/**
 * NewTab Store 模块导出
 */

export * from './types';
export * from './utils';
export * from './sync';
export * from './actions';

// 从 browser-sync 模块重新导出
export { ensureHomeFolder, getHomeFolderId } from '../../features/browser-sync';
export { HOME_FOLDER_TITLE } from '../../features/browser-sync';

// 保留 getWritableRootBookmarkId（store 内部使用）
export { getWritableRootBookmarkId } from './home-folder';
