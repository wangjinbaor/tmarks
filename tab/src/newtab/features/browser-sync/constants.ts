/**
 * 浏览器书签同步常量
 */

/** TMarks 根文件夹名称 */
export const ROOT_TITLE = 'TMarks';

/** 首页文件夹名称 */
export const HOME_FOLDER_TITLE = 'NewTab Home';

/** 根文件夹 ID 存储键 */
export const STORAGE_KEY_ROOT_ID = 'tmarks_root_bookmark_id';

/** 首页文件夹 ID 存储键 */
export const STORAGE_KEY_HOME_FOLDER_ID = 'tmarks_home_bookmark_id';

/** 写锁默认时长 (ms) */
export const WRITE_LOCK_DURATION = 1500;

/** 批量操作写锁时长 (ms) */
export const BATCH_WRITE_LOCK_DURATION = 3000;

/** 书签栏可能的标题 */
export const BOOKMARKS_BAR_TITLES = new Set([
  'Bookmarks Bar',
  'Bookmarks bar',
  'Bookmarks Toolbar',
  '书签栏',
  '收藏夹栏',
  'Favorites bar',
  '收藏夹',
]);

/** 需要排除的特殊文件夹 */
export const EXCLUDED_FOLDER_TITLES = new Set([HOME_FOLDER_TITLE]);
