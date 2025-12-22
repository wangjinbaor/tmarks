/**
 * 自动发现并创建分组
 */

import { EXCLUDED_FOLDER_TITLES } from './constants';
import { getChildren, isFolder } from './api';
import type { AddGroupFn, SetGroupBookmarkFolderIdFn, GetGroupsFn, DiscoverResult } from './types';

/**
 * 自动发现 TMarks 根文件夹下的一级文件夹，并为其创建对应的分组
 */
export async function autoDiscoverAndCreateGroups(
  rootId: string,
  addGroup: AddGroupFn,
  setGroupBookmarkFolderId: SetGroupBookmarkFolderIdFn,
  getGroups: GetGroupsFn
): Promise<DiscoverResult> {
  const result: DiscoverResult = { created: [], linked: [], skipped: [] };

  try {
    const rootChildren = await getChildren(rootId);
    const folders = rootChildren.filter(isFolder);

    console.log(`[TMarks] 发现 ${folders.length} 个一级文件夹`);

    for (const folder of folders) {
      if (EXCLUDED_FOLDER_TITLES.has(folder.title)) {
        result.skipped.push(folder.title);
        continue;
      }

      const currentGroups = getGroups();
      const matchedById = currentGroups.find((g) => g.bookmarkFolderId === folder.id);
      if (matchedById) {
        result.skipped.push(folder.title);
        continue;
      }

      const existingGroup = currentGroups.find((g) => g.name === folder.title);

      if (!existingGroup) {
        console.log(`[TMarks] 自动创建分组: ${folder.title}`);
        addGroup(folder.title, 'Folder', { bookmarkFolderId: folder.id, skipBookmarkFolderCreation: true });
        result.created.push(folder.title);
      } else if (!existingGroup.bookmarkFolderId) {
        console.log(`[TMarks] 补充关联分组: ${folder.title}`);
        setGroupBookmarkFolderId(existingGroup.id, folder.id);
        result.linked.push(folder.title);
      } else {
        result.skipped.push(folder.title);
      }
    }
  } catch (error) {
    console.error('[TMarks] 自动发现分组失败:', error);
  }

  return result;
}
