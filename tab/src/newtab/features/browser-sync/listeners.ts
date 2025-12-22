/**
 * Chrome 书签事件监听器
 */

import { hasBookmarksApi } from './api';
import type { BookmarkEventHandlers } from './types';

/**
 * 注册书签事件监听器
 * @returns 清理函数
 */
export function registerBookmarkListeners(handlers: BookmarkEventHandlers): () => void {
  if (!hasBookmarksApi() || !chrome.bookmarks?.onCreated) {
    return () => {};
  }

  const { onCreated, onRemoved, onChanged, onMoved, onChildrenReordered } = handlers;

  if (onCreated) chrome.bookmarks.onCreated.addListener(onCreated);
  if (onRemoved) chrome.bookmarks.onRemoved.addListener(onRemoved);
  if (onChanged) chrome.bookmarks.onChanged.addListener(onChanged);
  if (onMoved) chrome.bookmarks.onMoved.addListener(onMoved);
  if (onChildrenReordered) chrome.bookmarks.onChildrenReordered.addListener(onChildrenReordered);

  return () => {
    if (onCreated) chrome.bookmarks.onCreated.removeListener(onCreated);
    if (onRemoved) chrome.bookmarks.onRemoved.removeListener(onRemoved);
    if (onChanged) chrome.bookmarks.onChanged.removeListener(onChanged);
    if (onMoved) chrome.bookmarks.onMoved.removeListener(onMoved);
    if (onChildrenReordered) chrome.bookmarks.onChildrenReordered.removeListener(onChildrenReordered);
  };
}
