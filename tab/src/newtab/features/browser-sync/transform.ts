/**
 * 书签数据转换
 */

import type { GridItem, GridItemSize } from '../../types';
import type { ToGridItemsOptions } from './types';
import { isFolder } from './api';

/** 生成 GridItem ID */
export function toGridId(bookmarkId: string): string {
  return `bb-${bookmarkId}`;
}

/** 从 GridItem ID 提取书签 ID */
export function fromGridId(gridId: string): string | null {
  return gridId.startsWith('bb-') ? gridId.slice(3) : null;
}

/** 检查是否为浏览器书签关联的 GridItem */
export function isBrowserBookmarkItem(item: GridItem): boolean {
  return !!item.browserBookmarkId;
}

/** 获取默认尺寸 */
export function getDefaultSize(): GridItemSize {
  return '1x1';
}

/**
 * 将书签节点数组转换为 GridItem 数组
 */
export function toGridItems(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  opts: ToGridItemsOptions
): GridItem[] {
  const items: GridItem[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (isFolder(node)) {
      const folderItem: GridItem = {
        id: toGridId(node.id),
        type: 'bookmarkFolder',
        size: getDefaultSize(),
        position: i,
        groupId: opts.groupId,
        parentId: opts.parentGridId ?? undefined,
        browserBookmarkId: node.id,
        bookmarkFolder: { title: node.title },
        createdAt: Date.now(),
      };
      items.push(folderItem);

      const children = node.children || [];
      if (children.length > 0) {
        items.push(...toGridItems(children, { groupId: opts.groupId, parentGridId: folderItem.id }));
      }
    } else {
      items.push({
        id: toGridId(node.id),
        type: 'shortcut',
        size: '1x1',
        position: i,
        groupId: opts.groupId,
        parentId: opts.parentGridId ?? undefined,
        browserBookmarkId: node.id,
        shortcut: { url: node.url || '', title: node.title || node.url || '' },
        createdAt: Date.now(),
      });
    }
  }

  return items;
}
