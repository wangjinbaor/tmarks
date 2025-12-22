/**
 * Chrome Bookmarks API 封装
 */

import { BOOKMARKS_BAR_TITLES } from './constants';

/** 检查书签 API 是否可用 */
export function hasBookmarksApi(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.bookmarks;
}

/** 判断节点是否为文件夹 */
export function isFolder(node: chrome.bookmarks.BookmarkTreeNode): boolean {
  return !node.url;
}

/** 获取书签节点 */
export async function getBookmarkNode(
  id: string
): Promise<chrome.bookmarks.BookmarkTreeNode | null> {
  if (!hasBookmarksApi()) return null;
  try {
    const nodes = await chrome.bookmarks.get(id);
    return nodes?.[0] ?? null;
  } catch {
    return null;
  }
}

/** 获取文件夹的子节点 */
export async function getChildren(
  folderId: string
): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
  if (!hasBookmarksApi()) return [];
  try {
    return await chrome.bookmarks.getChildren(folderId);
  } catch {
    return [];
  }
}

/** 获取子树 */
export async function getSubTree(
  folderId: string
): Promise<chrome.bookmarks.BookmarkTreeNode | null> {
  if (!hasBookmarksApi()) return null;
  try {
    const tree = await chrome.bookmarks.getSubTree(folderId);
    return tree?.[0] ?? null;
  } catch {
    return null;
  }
}

/** 创建书签或文件夹 */
export async function createBookmark(params: {
  parentId: string;
  title: string;
  url?: string;
  index?: number;
}): Promise<chrome.bookmarks.BookmarkTreeNode | null> {
  if (!hasBookmarksApi()) return null;
  try {
    return await chrome.bookmarks.create(params);
  } catch (error) {
    console.error('[Bookmarks API] 创建失败:', error);
    return null;
  }
}

/** 移动书签 */
export async function moveBookmark(
  id: string,
  destination: { parentId?: string; index?: number }
): Promise<chrome.bookmarks.BookmarkTreeNode | null> {
  if (!hasBookmarksApi()) return null;
  try {
    return await chrome.bookmarks.move(id, destination);
  } catch (error) {
    console.error('[Bookmarks API] 移动失败:', error);
    return null;
  }
}

/** 更新书签 */
export async function updateBookmark(
  id: string,
  changes: { title?: string; url?: string }
): Promise<chrome.bookmarks.BookmarkTreeNode | null> {
  if (!hasBookmarksApi()) return null;
  try {
    return await chrome.bookmarks.update(id, changes);
  } catch (error) {
    console.error('[Bookmarks API] 更新失败:', error);
    return null;
  }
}

/** 删除书签或文件夹 */
export async function removeBookmark(id: string): Promise<boolean> {
  if (!hasBookmarksApi()) return false;
  try {
    await chrome.bookmarks.remove(id);
    return true;
  } catch (error) {
    console.error('[Bookmarks API] 删除失败:', error);
    return false;
  }
}

/** 删除文件夹及其内容 */
export async function removeTree(id: string): Promise<boolean> {
  if (!hasBookmarksApi()) return false;
  try {
    await chrome.bookmarks.removeTree(id);
    return true;
  } catch (error) {
    console.error('[Bookmarks API] 删除树失败:', error);
    return false;
  }
}

/** 获取书签栏根 ID */
export async function getBookmarksBarId(): Promise<string | null> {
  if (!hasBookmarksApi()) return null;

  try {
    const tree = await chrome.bookmarks.getTree();
    const root = tree[0];

    // 优先通过 ID 查找
    const byId = root.children?.find((c) => c.id === '1' && !c.url);
    if (byId) return byId.id;

    // 通过标题查找
    const byTitle = root.children?.find((c) => !c.url && BOOKMARKS_BAR_TITLES.has(c.title));
    if (byTitle) return byTitle.id;

    // 回退到第一个文件夹
    const firstFolder = root.children?.find((c) => !c.url);
    return firstFolder?.id ?? null;
  } catch {
    return null;
  }
}

/** 检查文件夹是否存在 */
export async function checkFolderExists(
  folderId: string
): Promise<chrome.bookmarks.BookmarkTreeNode | null> {
  const node = await getBookmarkNode(folderId);
  if (node && !node.url) {
    return node;
  }
  return null;
}
