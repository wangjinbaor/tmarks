/**
 * TMarks 根文件夹管理
 */

import { ROOT_TITLE } from './constants';
import { hasBookmarksApi, getBookmarksBarId, checkFolderExists, getChildren, createBookmark } from './api';
import { getSavedRootFolderId, saveRootFolderId } from './storage';
import type { EnsureRootFolderResult } from './types';

/**
 * 确保 TMarks 根文件夹存在
 */
export async function ensureRootFolder(): Promise<EnsureRootFolderResult | null> {
  if (!hasBookmarksApi()) return null;

  const barId = await getBookmarksBarId();
  if (!barId) {
    console.warn('[TMarks] 无法获取书签栏 ID');
    return null;
  }

  // 1. 通过已保存的 ID 查找
  const savedId = await getSavedRootFolderId();
  if (savedId) {
    const existingNode = await checkFolderExists(savedId);
    if (existingNode) {
      return { id: savedId, wasRecreated: false };
    }
    console.log('[TMarks] 根文件夹被删除，正在重新创建...');
  }

  // 2. 按名称查找
  const children = await getChildren(barId);
  const existingByName = children.find((c) => !c.url && c.title === ROOT_TITLE);
  if (existingByName) {
    await saveRootFolderId(existingByName.id);
    return { id: existingByName.id, wasRecreated: false };
  }

  // 3. 创建新的根文件夹
  const created = await createBookmark({ parentId: barId, title: ROOT_TITLE });
  if (!created) {
    console.error('[TMarks] 创建根文件夹失败');
    return null;
  }

  await saveRootFolderId(created.id);
  const wasRecreated = savedId !== null;
  console.log(wasRecreated ? `[TMarks] 根文件夹已重建: ${created.id}` : `[TMarks] 根文件夹已创建: ${created.id}`);

  return { id: created.id, wasRecreated };
}

/** 获取根文件夹 ID（不创建） */
export async function getRootFolderId(): Promise<string | null> {
  const savedId = await getSavedRootFolderId();
  if (savedId) {
    const exists = await checkFolderExists(savedId);
    if (exists) return savedId;
  }

  const barId = await getBookmarksBarId();
  if (!barId) return null;

  const children = await getChildren(barId);
  const existing = children.find((c) => !c.url && c.title === ROOT_TITLE);
  return existing?.id ?? null;
}
