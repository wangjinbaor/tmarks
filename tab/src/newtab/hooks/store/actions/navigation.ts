/**
 * 导航相关 Actions（文件夹导航、重排序等）
 */

import type { NewTabState } from '../types';
import type { GridItem } from '../../../types';
import { MAX_FOLDER_DEPTH, pruneEmptySecondLevelFolders, pruneEmptyFoldersCascade, generateId } from '../utils';
import { debouncedSync } from '../sync';

export interface NavigationActions {
  setCurrentFolderId: (folderId: string | null) => void;
  moveGridItemToFolder: (id: string, folderId: string | null) => void;
  reorderGridItemsInCurrentScope: (activeId: string, overId: string) => void;
  reorderGridItemsInFolderScope: (folderId: string, activeId: string, overId: string) => void;
  mergeFolders: (sourceFolderId: string, targetFolderId: string) => void;
  createFolderFromShortcuts: (shortcutId1: string, shortcutId2: string, folderName?: string) => string | null;
  cleanupEmptySecondLevelFolders: () => void;
  cleanupAllEmptyFolders: () => void;
  migrateToGridItems: () => void;
}

export function createNavigationActions(
  set: (partial: Partial<NewTabState> | ((state: NewTabState) => Partial<NewTabState>)) => void,
  get: () => NewTabState,
  resolveBookmarkParentId: (opts: {
    parentGridId?: string | null;
    inferredGroupId?: string | null;
  }) => Promise<string | null>
): NavigationActions {
  return {
    setCurrentFolderId: (folderId) => {
      set({ currentFolderId: folderId });
    },

    moveGridItemToFolder: (id, folderId) => {
      const { shortcuts, shortcutGroups, shortcutFolders, settings, gridItems, saveData, browserBookmarksRootId } = get();
      const moving = gridItems.find((i) => i.id === id);
      if (!moving) return;

      const getDepth = (parentId: string | null): number => {
        if (!parentId) return 0;
        const parent = gridItems.find((i) => i.id === parentId);
        if (!parent) return 0;
        return 1 + getDepth(parent.parentId ?? null);
      };

      const targetDepth = getDepth(folderId);

      const getMaxChildDepth = (itemId: string): number => {
        const children = gridItems.filter((i) => i.parentId === itemId);
        if (children.length === 0) return 0;
        return 1 + Math.max(...children.map((c) => getMaxChildDepth(c.id)));
      };

      const movingMaxChildDepth = moving.type === 'bookmarkFolder' ? getMaxChildDepth(moving.id) : 0;
      const totalDepth = targetDepth + 1 + movingMaxChildDepth;

      if (totalDepth > MAX_FOLDER_DEPTH) {
        console.warn(`[NewTab] 文件夹层级超出限制 (${totalDepth} > ${MAX_FOLDER_DEPTH})`);
        return;
      }

      const targetParentId = folderId ?? null;
      const isBrowserSynced = !!moving.browserBookmarkId;
      const inferredGroupId = (() => {
        if (isBrowserSynced) return moving.groupId ?? 'home';
        const activeGroupId = get().activeGroupId ?? 'home';
        const targetFolder = folderId ? gridItems.find((i) => i.id === folderId) : null;
        const sourceFolder = moving.parentId ? gridItems.find((i) => i.id === moving.parentId) : null;
        return (targetFolder?.groupId ?? sourceFolder?.groupId ?? moving.groupId ?? activeGroupId) as string;
      })();

      const targetScope = gridItems
        .filter((item) => {
          if (item.id === id) return false;
          if ((item.parentId ?? null) !== targetParentId) return false;
          if (isBrowserSynced) return !!item.browserBookmarkId;
          return !item.browserBookmarkId && (item.groupId ?? 'home') === inferredGroupId;
        })
        .sort((a, b) => a.position - b.position);

      const nextPosition = targetScope.length;

      const newGridItems = gridItems.map((item) => {
        if (item.id !== id) return item;
        return { ...item, groupId: inferredGroupId, parentId: targetParentId ?? undefined, position: nextPosition };
      });
      const protectedBrowserBookmarkIds = new Set<string>([browserBookmarksRootId].filter(Boolean) as string[]);
      const cleaned = pruneEmptyFoldersCascade(newGridItems, get().currentFolderId, protectedBrowserBookmarkIds);
      set({ gridItems: cleaned.items, currentFolderId: cleaned.currentFolderId });
      saveData();
      debouncedSync({ shortcuts, groups: shortcutGroups, folders: shortcutFolders, settings, gridItems: cleaned.items });

      const state = get();
      if (!state.isApplyingBrowserBookmarks && cleaned.removedBrowserBookmarkIds.length > 0) {
        (async () => {
          try {
            state.setBrowserBookmarkWriteLockUntil(Date.now() + 1200);
            for (const bid of cleaned.removedBrowserBookmarkIds) {
              try {
                await chrome.bookmarks.removeTree(bid);
              } catch {
                try {
                  await chrome.bookmarks.remove(bid);
                } catch {}
              }
            }
          } catch {}
        })();
      }

      if (!isBrowserSynced && inferredGroupId === 'home' && targetParentId === null) {
        get().mirrorHomeItemsToBrowser([id]);
      }

      // 清理空分组
      get().cleanupEmptyGroups();

      const state2 = get();
      if (!state2.isApplyingBrowserBookmarks && moving.browserBookmarkId) {
        (async () => {
          try {
            const targetParentBookmarkId = await resolveBookmarkParentId({
              parentGridId: folderId,
              inferredGroupId,
            });
            if (!targetParentBookmarkId) return;

            state2.setBrowserBookmarkWriteLockUntil(Date.now() + 800);
            await chrome.bookmarks.move(moving.browserBookmarkId!, {
              parentId: targetParentBookmarkId,
              index: nextPosition,
            });
          } catch (e) {
            console.warn('[NewTab] Failed to move browser bookmark:', e);
          }
        })();
      }
    },

    reorderGridItemsInCurrentScope: (activeId, overId) => {
      const { shortcuts, shortcutGroups, shortcutFolders, settings, gridItems, activeGroupId, currentFolderId, saveData } = get();
      const targetGroupId = activeGroupId ?? 'home';
      const scopeItems = gridItems
        .filter((item) => (item.groupId ?? 'home') === targetGroupId && (item.parentId ?? null) === (currentFolderId ?? null))
        .sort((a, b) => a.position - b.position);

      const fromIndex = scopeItems.findIndex((i) => i.id === activeId);
      const toIndex = scopeItems.findIndex((i) => i.id === overId);

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

      const reorderedScope = [...scopeItems];
      const [removed] = reorderedScope.splice(fromIndex, 1);
      reorderedScope.splice(toIndex, 0, removed);

      const positionById = new Map(reorderedScope.map((item, index) => [item.id, index] as const));
      const newGridItems = gridItems.map((item) => {
        const nextPos = positionById.get(item.id);
        return nextPos === undefined ? item : { ...item, position: nextPos };
      });

      set({ gridItems: newGridItems });
      saveData();
      debouncedSync({ shortcuts, groups: shortcutGroups, folders: shortcutFolders, settings, gridItems: newGridItems });

      const state = get();
      const activeItem = scopeItems[fromIndex];
      if (!state.isApplyingBrowserBookmarks && activeItem?.browserBookmarkId) {
        (async () => {
          try {
            const parentBookmarkId = await resolveBookmarkParentId({
              parentGridId: state.currentFolderId,
              inferredGroupId: targetGroupId,
            });
            if (!parentBookmarkId) return;

            state.setBrowserBookmarkWriteLockUntil(Date.now() + 800);
            await chrome.bookmarks.move(activeItem.browserBookmarkId!, {
              parentId: parentBookmarkId,
              index: toIndex,
            });
          } catch (e) {
            console.warn('[NewTab] Failed to reorder browser bookmark:', e);
          }
        })();
      }
    },

    reorderGridItemsInFolderScope: (folderId, activeId, overId) => {
      const { shortcuts, shortcutGroups, shortcutFolders, settings, gridItems, saveData } = get();
      const folder = gridItems.find((i) => i.id === folderId);
      if (!folder) return;

      const targetGroupId = folder.groupId ?? 'home';
      const scopeItems = gridItems
        .filter((item) => (item.groupId ?? 'home') === targetGroupId && (item.parentId ?? null) === folderId)
        .sort((a, b) => a.position - b.position);

      const fromIndex = scopeItems.findIndex((i) => i.id === activeId);
      const toIndex = scopeItems.findIndex((i) => i.id === overId);

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

      const reorderedScope = [...scopeItems];
      const [removed] = reorderedScope.splice(fromIndex, 1);
      reorderedScope.splice(toIndex, 0, removed);

      const positionById = new Map(reorderedScope.map((item, index) => [item.id, index] as const));
      const newGridItems = gridItems.map((item) => {
        const nextPos = positionById.get(item.id);
        return nextPos === undefined ? item : { ...item, position: nextPos };
      });

      set({ gridItems: newGridItems });
      saveData();
      debouncedSync({ shortcuts, groups: shortcutGroups, folders: shortcutFolders, settings, gridItems: newGridItems });

      const state = get();
      const activeItem = scopeItems[fromIndex];
      if (!state.isApplyingBrowserBookmarks && activeItem?.browserBookmarkId) {
        (async () => {
          try {
            const parentBookmarkId = await resolveBookmarkParentId({
              parentGridId: folderId,
              inferredGroupId: state.gridItems.find((i) => i.id === folderId)?.groupId ?? null,
            });
            if (!parentBookmarkId) return;

            state.setBrowserBookmarkWriteLockUntil(Date.now() + 800);
            await chrome.bookmarks.move(activeItem.browserBookmarkId!, {
              parentId: parentBookmarkId,
              index: toIndex,
            });
          } catch (e) {
            console.warn('[NewTab] Failed to reorder browser bookmark:', e);
          }
        })();
      }
    },

    /**
     * 合并两个文件夹：将源文件夹的所有内容移动到目标文件夹，然后删除源文件夹
     */
    mergeFolders: (sourceFolderId, targetFolderId) => {
      const { shortcuts, shortcutGroups, shortcutFolders, settings, gridItems, saveData, browserBookmarksRootId } = get();

      const sourceFolder = gridItems.find((i) => i.id === sourceFolderId && i.type === 'bookmarkFolder');
      const targetFolder = gridItems.find((i) => i.id === targetFolderId && i.type === 'bookmarkFolder');

      if (!sourceFolder || !targetFolder) {
        console.warn('[NewTab] mergeFolders: 源文件夹或目标文件夹不存在');
        return;
      }

      // 不能合并到自己
      if (sourceFolderId === targetFolderId) return;

      // 获取源文件夹的所有直接子项
      const sourceChildren = gridItems
        .filter((item) => (item.parentId ?? null) === sourceFolderId)
        .sort((a, b) => a.position - b.position);

      // 获取目标文件夹的现有子项数量，用于计算新的 position
      const targetChildren = gridItems
        .filter((item) => (item.parentId ?? null) === targetFolderId)
        .sort((a, b) => a.position - b.position);

      const basePosition = targetChildren.length;

      // 移动所有子项到目标文件夹
      let newGridItems = gridItems.map((item) => {
        if ((item.parentId ?? null) === sourceFolderId) {
          const newPosition = basePosition + sourceChildren.findIndex((c) => c.id === item.id);
          return {
            ...item,
            parentId: targetFolderId,
            groupId: targetFolder.groupId ?? 'home',
            position: newPosition,
          };
        }
        return item;
      });

      // 删除源文件夹
      newGridItems = newGridItems.filter((item) => item.id !== sourceFolderId);

      // 重新计算目标文件夹内的 position
      const mergedChildren = newGridItems
        .filter((item) => (item.parentId ?? null) === targetFolderId)
        .sort((a, b) => a.position - b.position);

      const posById = new Map(mergedChildren.map((item, index) => [item.id, index] as const));
      newGridItems = newGridItems.map((item) => {
        const nextPos = posById.get(item.id);
        return nextPos !== undefined ? { ...item, position: nextPos } : item;
      });

      // 清理空文件夹
      const protectedBrowserBookmarkIds = new Set<string>([browserBookmarksRootId].filter(Boolean) as string[]);
      const cleaned = pruneEmptyFoldersCascade(newGridItems, get().currentFolderId, protectedBrowserBookmarkIds);

      set({ gridItems: cleaned.items, currentFolderId: cleaned.currentFolderId });
      saveData();
      debouncedSync({ shortcuts, groups: shortcutGroups, folders: shortcutFolders, settings, gridItems: cleaned.items });

      // 处理浏览器书签同步
      const state = get();
      if (!state.isApplyingBrowserBookmarks) {
        (async () => {
          try {
            // 移动源文件夹的子书签到目标文件夹
            if (targetFolder.browserBookmarkId) {
              state.setBrowserBookmarkWriteLockUntil(Date.now() + 2000);

              for (let i = 0; i < sourceChildren.length; i++) {
                const child = sourceChildren[i];
                if (child.browserBookmarkId) {
                  try {
                    await chrome.bookmarks.move(child.browserBookmarkId, {
                      parentId: targetFolder.browserBookmarkId,
                      index: basePosition + i,
                    });
                  } catch (e) {
                    console.warn('[NewTab] Failed to move bookmark during merge:', e);
                  }
                }
              }
            }

            // 删除源文件夹的浏览器书签
            if (sourceFolder.browserBookmarkId) {
              try {
                await chrome.bookmarks.removeTree(sourceFolder.browserBookmarkId);
              } catch {
                try {
                  await chrome.bookmarks.remove(sourceFolder.browserBookmarkId);
                } catch {}
              }
            }

            // 删除清理过程中移除的空文件夹
            if (cleaned.removedBrowserBookmarkIds.length > 0) {
              for (const bid of cleaned.removedBrowserBookmarkIds) {
                try {
                  await chrome.bookmarks.removeTree(bid);
                } catch {
                  try {
                    await chrome.bookmarks.remove(bid);
                  } catch {}
                }
              }
            }
          } catch (e) {
            console.warn('[NewTab] Failed to sync browser bookmarks during merge:', e);
          }
        })();
      }

      // 清理空分组
      get().cleanupEmptyGroups();
    },

    /**
     * 将两个快捷方式合并创建新文件夹
     * @param shortcutId1 第一个快捷方式 ID（被拖拽的）
     * @param shortcutId2 第二个快捷方式 ID（目标）
     * @param folderName 可选的文件夹名称
     * @returns 新创建的文件夹 ID，失败返回 null
     */
    createFolderFromShortcuts: (shortcutId1, shortcutId2, folderName) => {
      const { shortcuts, shortcutGroups, shortcutFolders, settings, gridItems, saveData } = get();

      const item1 = gridItems.find((i) => i.id === shortcutId1);
      const item2 = gridItems.find((i) => i.id === shortcutId2);

      // 验证两个项目都存在且都是快捷方式类型
      if (!item1 || !item2) {
        console.warn('[NewTab] createFolderFromShortcuts: 快捷方式不存在');
        return null;
      }

      if (item1.type !== 'shortcut' || item2.type !== 'shortcut') {
        console.warn('[NewTab] createFolderFromShortcuts: 只能合并快捷方式类型');
        return null;
      }

      // 不能合并自己
      if (shortcutId1 === shortcutId2) return null;

      // 使用目标快捷方式的位置和分组信息
      const targetGroupId = item2.groupId ?? 'home';
      const targetParentId = item2.parentId ?? null;
      const targetPosition = item2.position;

      // 生成文件夹名称
      const defaultFolderName = folderName || '新文件夹';
      const folderId = generateId();

      // 创建新文件夹
      const newFolder: GridItem = {
        id: folderId,
        type: 'bookmarkFolder',
        size: '1x1',
        position: targetPosition,
        groupId: targetGroupId,
        parentId: targetParentId ?? undefined,
        bookmarkFolder: {
          title: defaultFolderName,
        },
        createdAt: Date.now(),
      };

      // 更新两个快捷方式的 parentId 和 position
      let newGridItems = gridItems.map((item) => {
        if (item.id === shortcutId1) {
          return { ...item, parentId: folderId, groupId: targetGroupId, position: 0 };
        }
        if (item.id === shortcutId2) {
          return { ...item, parentId: folderId, groupId: targetGroupId, position: 1 };
        }
        return item;
      });

      // 添加新文件夹
      newGridItems = [...newGridItems, newFolder];

      // 重新计算同 scope 内其他项目的 position
      const scopeItems = newGridItems
        .filter((item) => 
          (item.groupId ?? 'home') === targetGroupId && 
          (item.parentId ?? null) === targetParentId &&
          item.id !== shortcutId1 &&
          item.id !== shortcutId2
        )
        .sort((a, b) => a.position - b.position);

      const posById = new Map<string, number>();
      scopeItems.forEach((item, index) => {
        // 新文件夹占据原来 item2 的位置
        if (item.id === folderId) {
          posById.set(item.id, targetPosition);
        } else if (item.position >= targetPosition) {
          posById.set(item.id, index);
        } else {
          posById.set(item.id, item.position);
        }
      });

      // 重新排序
      const reorderedScopeItems = scopeItems.sort((a, b) => {
        const posA = posById.get(a.id) ?? a.position;
        const posB = posById.get(b.id) ?? b.position;
        return posA - posB;
      });

      reorderedScopeItems.forEach((item, index) => {
        posById.set(item.id, index);
      });

      newGridItems = newGridItems.map((item) => {
        const nextPos = posById.get(item.id);
        return nextPos !== undefined ? { ...item, position: nextPos } : item;
      });

      set({ gridItems: newGridItems });
      saveData();
      debouncedSync({ shortcuts, groups: shortcutGroups, folders: shortcutFolders, settings, gridItems: newGridItems });

      // 处理浏览器书签同步
      const state = get();
      if (!state.isApplyingBrowserBookmarks) {
        (async () => {
          try {
            const parentBookmarkId = await resolveBookmarkParentId({
              parentGridId: targetParentId,
              inferredGroupId: targetGroupId,
            });

            if (parentBookmarkId) {
              state.setBrowserBookmarkWriteLockUntil(Date.now() + 2000);

              // 创建浏览器书签文件夹
              const createdFolder = await chrome.bookmarks.create({
                parentId: parentBookmarkId,
                title: defaultFolderName,
                index: targetPosition,
              });

              // 更新 gridItem 的 browserBookmarkId
              set({
                gridItems: get().gridItems.map((i) =>
                  i.id === folderId ? { ...i, browserBookmarkId: createdFolder.id } : i
                ),
              });
              state.saveData();

              // 移动两个快捷方式的浏览器书签到新文件夹
              if (item1.browserBookmarkId) {
                try {
                  await chrome.bookmarks.move(item1.browserBookmarkId, {
                    parentId: createdFolder.id,
                    index: 0,
                  });
                } catch (e) {
                  console.warn('[NewTab] Failed to move bookmark 1:', e);
                }
              }

              if (item2.browserBookmarkId) {
                try {
                  await chrome.bookmarks.move(item2.browserBookmarkId, {
                    parentId: createdFolder.id,
                    index: 1,
                  });
                } catch (e) {
                  console.warn('[NewTab] Failed to move bookmark 2:', e);
                }
              }
            }
          } catch (e) {
            console.warn('[NewTab] Failed to create browser bookmark folder:', e);
          }
        })();
      }

      return folderId;
    },

    cleanupEmptySecondLevelFolders: () => {
      const { gridItems, currentFolderId, shortcuts, shortcutGroups, shortcutFolders, settings, saveData } = get();
      const { items, currentFolderId: nextFolderId, changed } = pruneEmptySecondLevelFolders(gridItems, currentFolderId);
      if (!changed) return;

      set({ gridItems: items, currentFolderId: nextFolderId });
      saveData();
      debouncedSync({ shortcuts, groups: shortcutGroups, folders: shortcutFolders, settings, gridItems: items });

      // 清理空分组
      get().cleanupEmptyGroups();
    },

    cleanupAllEmptyFolders: () => {
      const { gridItems, currentFolderId, shortcuts, shortcutGroups, shortcutFolders, settings, saveData, browserBookmarksRootId } = get();
      const protectedBrowserBookmarkIds = new Set<string>([browserBookmarksRootId].filter(Boolean) as string[]);
      const cleaned = pruneEmptyFoldersCascade(gridItems, currentFolderId, protectedBrowserBookmarkIds);
      if (!cleaned.changed) return;

      set({ gridItems: cleaned.items, currentFolderId: cleaned.currentFolderId });
      saveData();
      debouncedSync({ shortcuts, groups: shortcutGroups, folders: shortcutFolders, settings, gridItems: cleaned.items });

      // 删除浏览器书签中的空文件夹
      const state = get();
      if (!state.isApplyingBrowserBookmarks && cleaned.removedBrowserBookmarkIds.length > 0) {
        (async () => {
          try {
            state.setBrowserBookmarkWriteLockUntil(Date.now() + 1200);
            for (const bid of cleaned.removedBrowserBookmarkIds) {
              try {
                await chrome.bookmarks.removeTree(bid);
              } catch {
                try {
                  await chrome.bookmarks.remove(bid);
                } catch {}
              }
            }
          } catch {}
        })();
      }

      // 清理空分组
      get().cleanupEmptyGroups();
    },

    migrateToGridItems: () => {
      // Migration logic if needed
    },
  };
}
