/**
 * 书签同步本地存储
 */

import { STORAGE_KEY_ROOT_ID, STORAGE_KEY_HOME_FOLDER_ID } from './constants';

/** 获取已保存的根文件夹 ID */
export async function getSavedRootFolderId(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_ROOT_ID);
    const savedId = result[STORAGE_KEY_ROOT_ID];
    return typeof savedId === 'string' ? savedId : null;
  } catch {
    return null;
  }
}

/** 保存根文件夹 ID */
export async function saveRootFolderId(id: string): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY_ROOT_ID]: id });
  } catch (error) {
    console.error('[Storage] 保存根文件夹 ID 失败:', error);
  }
}

/** 获取已保存的首页文件夹 ID */
export async function getSavedHomeFolderId(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_HOME_FOLDER_ID);
    const savedId = result[STORAGE_KEY_HOME_FOLDER_ID];
    return typeof savedId === 'string' ? savedId : null;
  } catch {
    return null;
  }
}

/** 保存首页文件夹 ID */
export async function saveHomeFolderId(id: string): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY_HOME_FOLDER_ID]: id });
  } catch (error) {
    console.error('[Storage] 保存首页文件夹 ID 失败:', error);
  }
}
