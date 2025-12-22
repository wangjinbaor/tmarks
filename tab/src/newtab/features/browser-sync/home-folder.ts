/**
 * 首页文件夹管理
 */

import { HOME_FOLDER_TITLE } from './constants';
import { hasBookmarksApi, checkFolderExists, getChildren, createBookmark, moveBookmark } from './api';
import { getSavedHomeFolderId, saveHomeFolderId } from './storage';
import type { EnsureHomeFolderResult } from './types';

/**
 * 确保首页文件夹存在
 */
export async function ensureHomeFolder(rootId: string | null): Promise<EnsureHomeFolderResult | null> {
  if (!hasBookmarksApi() || !rootId) return null;

  const savedId = await getSavedHomeFolderId();

  // 1. 通过已保存的 ID 查找
  if (savedId) {
    const existingNode = await checkFolderExists(savedId);
    if (existingNode) {
      const parentId = (existingNode as any).parentId;
      if (parentId !== rootId) {
        await moveBookmark(existingNode.id, { parentId: rootId });
      }
      await saveHomeFolderId(existingNode.id);
      return { id: existingNode.id, wasRecreated: false };
    }
  }

  // 2. 按名称查找
  const children = await getChildren(rootId);
  const existing = children.find((c) => !c.url && c.title === HOME_FOLDER_TITLE);
  if (existing) {
    await saveHomeFolderId(existing.id);
    return { id: existing.id, wasRecreated: false };
  }

  // 3. 创建新的首页文件夹
  const created = await createBookmark({ parentId: rootId, title: HOME_FOLDER_TITLE });
  if (!created) return null;

  await saveHomeFolderId(created.id);
  return { id: created.id, wasRecreated: savedId !== null };
}

/** 获取首页文件夹 ID（不创建） */
export async function getHomeFolderId(): Promise<string | null> {
  const savedId = await getSavedHomeFolderId();
  if (savedId) {
    const exists = await checkFolderExists(savedId);
    if (exists) return savedId;
  }
  return null;
}
