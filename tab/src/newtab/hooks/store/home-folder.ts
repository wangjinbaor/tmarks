/**
 * 首页文件夹管理 - Store 内部辅助函数
 */

import { hasBookmarksApi } from './utils';

let writableRootBookmarkIdPromise: Promise<string | null> | null = null;

export async function getWritableRootBookmarkId(
  browserBookmarksRootId: string | null
): Promise<string | null> {
  if (!browserBookmarksRootId) return null;
  if (browserBookmarksRootId !== '0') return browserBookmarksRootId;

  if (writableRootBookmarkIdPromise) {
    return writableRootBookmarkIdPromise;
  }

  writableRootBookmarkIdPromise = (async () => {
    try {
      if (!hasBookmarksApi()) return null;

      const tree = await chrome.bookmarks.getTree();
      const root = tree[0];

      const byId = root.children?.find((c) => c.id === '1' && !c.url);
      if (byId) return byId.id;

      const titles = new Set([
        'Bookmarks Bar',
        'Bookmarks bar',
        'Bookmarks Toolbar',
        '书签栏',
        '收藏夹栏',
        'Favorites bar',
        '收藏夹',
      ]);
      const byTitle = root.children?.find((c) => !c.url && titles.has(c.title));
      if (byTitle) return byTitle.id;

      const firstFolder = root.children?.find((c) => !c.url);
      return firstFolder?.id || null;
    } catch {
      return null;
    }
  })();

  return writableRootBookmarkIdPromise;
}
