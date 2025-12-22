/**
 * 分组相关 Actions
 */

import type { Shortcut, ShortcutGroup, ShortcutFolder, NewTabSettings, GridItem } from '../../../types';
import { generateId } from '../utils';
import { debouncedSync } from '../sync';

export interface GroupActions {
  setActiveGroup: (groupId: string | null) => void;
  addGroup: (
    name: string,
    icon: string,
    options?: {
      bookmarkFolderId?: string | null;
      skipBookmarkFolderCreation?: boolean;
    }
  ) => void;
  updateGroup: (id: string, updates: Partial<ShortcutGroup>) => void;
  removeGroup: (id: string, options?: { skipBrowserBookmarkDeletion?: boolean }) => void;
  setGroupBookmarkFolderId: (groupId: string, folderId: string | null) => void;
  cleanupEmptyGroups: () => void;
}

export function createGroupActions(
  get: () => {
    shortcuts: Shortcut[];
    shortcutGroups: ShortcutGroup[];
    shortcutFolders: ShortcutFolder[];
    settings: NewTabSettings;
    gridItems: GridItem[];
    activeGroupId: string | null;
    saveData: () => Promise<void>;
    setBrowserBookmarkWriteLockUntil: (until: number) => void;
  },
  set: (
    state: Partial<{
      shortcutGroups: ShortcutGroup[];
      shortcuts: Shortcut[];
      gridItems: GridItem[];
      activeGroupId: string | null;
      currentFolderId: string | null;
    }>
  ) => void,
  ensureGroupFolderId: (
    groupId: string,
    options?: { createIfMissing?: boolean; bookmarkFolderIdOverride?: string | null }
  ) => Promise<string | null>
): GroupActions {
  return {
    setActiveGroup: (groupId) => {
      const { saveData } = get();
      set({ activeGroupId: groupId, currentFolderId: null });
      saveData();
    },

    addGroup: (name, icon, options) => {
      const { shortcuts, shortcutGroups, shortcutFolders, settings, gridItems, saveData } = get();
      const newGroup: ShortcutGroup = {
        id: generateId(),
        name,
        icon,
        position: shortcutGroups.length,
        bookmarkFolderId: options?.bookmarkFolderId ?? undefined,
      };
      const newGroups = [...shortcutGroups, newGroup];
      set({ shortcutGroups: newGroups });
      saveData();
      debouncedSync({
        shortcuts,
        groups: newGroups,
        folders: shortcutFolders,
        settings,
        gridItems,
      });

      if (!options?.skipBookmarkFolderCreation) {
        void ensureGroupFolderId(newGroup.id, {
          createIfMissing: !options?.bookmarkFolderId,
          bookmarkFolderIdOverride: options?.bookmarkFolderId ?? undefined,
        });
      }
    },

    updateGroup: (id, updates) => {
      const { shortcuts, shortcutGroups, shortcutFolders, settings, gridItems, saveData } = get();
      const newGroups = shortcutGroups.map((g) => (g.id === id ? { ...g, ...updates } : g));
      set({ shortcutGroups: newGroups });
      saveData();
      debouncedSync({
        shortcuts,
        groups: newGroups,
        folders: shortcutFolders,
        settings,
        gridItems,
      });
    },

    removeGroup: (id, options) => {
      const {
        shortcutGroups,
        shortcutFolders,
        shortcuts,
        activeGroupId,
        settings,
        gridItems,
        saveData,
        setBrowserBookmarkWriteLockUntil,
      } = get();
      if (id === 'home') {
        console.warn('不能删除首页分组');
        return;
      }
      const targetGroup = shortcutGroups.find((g) => g.id === id);
      if (!targetGroup) return;
      const isBrowserSynced = !!targetGroup.bookmarkFolderId;

      const updatedShortcuts = isBrowserSynced
        ? shortcuts.filter((s) => s.groupId !== id)
        : shortcuts.map((s) => (s.groupId === id ? { ...s, groupId: 'home' } : s));

      const updatedGridItems = isBrowserSynced
        ? gridItems.filter((item) => item.groupId !== id)
        : gridItems.map((item) =>
            item.groupId === id ? { ...item, groupId: 'home', parentId: null } : item
          );

      const filtered = shortcutGroups
        .filter((g) => g.id !== id)
        .map((group, index) => ({ ...group, position: index }));

      // 如果当前激活的分组被删除，同时重置 currentFolderId
      const shouldResetCurrentFolder = activeGroupId === id;

      set({
        shortcutGroups: filtered,
        shortcuts: updatedShortcuts,
        gridItems: updatedGridItems,
        activeGroupId: activeGroupId === id ? 'home' : activeGroupId,
        ...(shouldResetCurrentFolder ? { currentFolderId: null } : {}),
      });
      saveData();
      debouncedSync({
        shortcuts: updatedShortcuts,
        groups: filtered,
        folders: shortcutFolders,
        settings,
        gridItems: updatedGridItems,
      });

      if (targetGroup.bookmarkFolderId && !options?.skipBrowserBookmarkDeletion) {
        (async () => {
          try {
            setBrowserBookmarkWriteLockUntil(Date.now() + 1200);
            try {
              await chrome.bookmarks.removeTree(targetGroup.bookmarkFolderId!);
            } catch {
              try {
                await chrome.bookmarks.remove(targetGroup.bookmarkFolderId!);
              } catch {}
            }
          } catch {}
        })();
      }
    },

    setGroupBookmarkFolderId: (groupId, folderId) => {
      const { shortcuts, shortcutGroups, shortcutFolders, settings, gridItems, saveData } = get();
      const nextGroups = shortcutGroups.map((group) =>
        group.id === groupId ? { ...group, bookmarkFolderId: folderId ?? undefined } : group
      );
      set({ shortcutGroups: nextGroups });
      saveData();
      debouncedSync({
        shortcuts,
        groups: nextGroups,
        folders: shortcutFolders,
        settings,
        gridItems,
      });
    },

    cleanupEmptyGroups: () => {
      const {
        shortcutGroups,
        shortcutFolders,
        shortcuts,
        activeGroupId,
        settings,
        gridItems,
        saveData,
        setBrowserBookmarkWriteLockUntil,
      } = get();

      // 找出空的分组（除了首页）
      const emptyGroupIds = shortcutGroups
        .filter((group) => {
          if (group.id === 'home') return false; // 首页不删除
          // 检查该分组下是否有任何 gridItems
          const hasItems = gridItems.some(
            (item) => (item.groupId ?? 'home') === group.id && (item.parentId ?? null) === null
          );
          return !hasItems;
        })
        .map((g) => g.id);

      if (emptyGroupIds.length === 0) return;

      // 收集需要删除的浏览器书签文件夹 ID
      const bookmarkFolderIdsToDelete: string[] = [];
      emptyGroupIds.forEach((groupId) => {
        const group = shortcutGroups.find((g) => g.id === groupId);
        if (group?.bookmarkFolderId) {
          bookmarkFolderIdsToDelete.push(group.bookmarkFolderId);
        }
      });

      // 过滤掉空分组
      const filtered = shortcutGroups
        .filter((g) => !emptyGroupIds.includes(g.id))
        .map((group, index) => ({ ...group, position: index }));

      // 如果当前激活的分组被删除，切换到首页
      const newActiveGroupId = emptyGroupIds.includes(activeGroupId ?? '') ? 'home' : activeGroupId;
      // 如果激活分组被删除，同时重置 currentFolderId
      const shouldResetCurrentFolder = emptyGroupIds.includes(activeGroupId ?? '');

      set({
        shortcutGroups: filtered,
        activeGroupId: newActiveGroupId,
        ...(shouldResetCurrentFolder ? { currentFolderId: null } : {}),
      });
      saveData();
      debouncedSync({
        shortcuts,
        groups: filtered,
        folders: shortcutFolders,
        settings,
        gridItems,
      });

      // 删除浏览器书签中的空分组文件夹
      if (bookmarkFolderIdsToDelete.length > 0) {
        (async () => {
          try {
            setBrowserBookmarkWriteLockUntil(Date.now() + 1200);
            for (const bid of bookmarkFolderIdsToDelete) {
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
    },
  };
}
