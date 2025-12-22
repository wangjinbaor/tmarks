/**
 * 浏览器书签同步 Hook
 */

import { useEffect, useRef } from 'react';
import { useNewtabStore } from '../../../hooks/useNewtabStore';
import { hasBookmarksApi, getChildren, getSubTree, getBookmarkNode } from '../api';
import { ensureRootFolder } from '../root-folder';
import { ensureHomeFolder } from '../home-folder';
import { autoDiscoverAndCreateGroups } from '../auto-discover';
import { toGridItems } from '../transform';
import { registerBookmarkListeners } from '../listeners';
import type { GridItem } from '../../../types';

export function useBrowserBookmarksSync() {
  const {
    isLoading,
    ensureGroupBookmarkFolderId,
    removeGroup,
    setBrowserBookmarksRootId,
    setHomeBrowserFolderId,
    setIsApplyingBrowserBookmarks,
    replaceBrowserBookmarkGridItems,
    upsertBrowserBookmarkNode,
    removeBrowserBookmarkById,
    applyBrowserBookmarkChildrenOrder,
  } = useNewtabStore();

  const refreshInFlight = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (!hasBookmarksApi()) return;

    let disposed = false;

    const isInScopeParent = (parentId?: string) => {
      const state = useNewtabStore.getState();
      const rootId = state.browserBookmarksRootId;
      const homeId = state.homeBrowserFolderId;
      if (!rootId || !parentId) return false;
      if (parentId === rootId || parentId === homeId) return true;
      if (state.shortcutGroups.some((g) => g.bookmarkFolderId === parentId)) return true;
      return state.gridItems.some((i) => i.browserBookmarkId === parentId && i.type === 'bookmarkFolder');
    };

    const refreshChildrenOrder = async (parentBookmarkId: string) => {
      try {
        const children = await getChildren(parentBookmarkId);
        const ordered = children.map((c) => c.id);
        setIsApplyingBrowserBookmarks(true);
        applyBrowserBookmarkChildrenOrder(parentBookmarkId, ordered);
      } finally {
        setIsApplyingBrowserBookmarks(false);
      }
    };

    const purgeBrowserLinkedGridItems = () => {
      const snapshot = useNewtabStore.getState();
      const filtered = snapshot.gridItems.filter((item) => !item.browserBookmarkId);
      const nextCurrentFolderId =
        snapshot.currentFolderId && filtered.some((item) => item.id === snapshot.currentFolderId)
          ? snapshot.currentFolderId
          : null;
      useNewtabStore.setState({ gridItems: filtered, currentFolderId: nextCurrentFolderId });
      snapshot.saveData();
      // 清理可能变空的分组
      useNewtabStore.getState().cleanupEmptyGroups();
    };

    const resetBrowserLinkedState = () => {
      const snapshot = useNewtabStore.getState();
      snapshot.shortcutGroups
        .filter((g) => g.id !== 'home')
        .forEach((g) => removeGroup(g.id, { skipBrowserBookmarkDeletion: true }));
      purgeBrowserLinkedGridItems();
      setBrowserBookmarksRootId(null);
      setHomeBrowserFolderId(null);
    };

    const refreshFromBrowser = async () => {
      if (refreshInFlight.current) return;
      refreshInFlight.current = true;

      try {
        const result = await ensureRootFolder();
        if (!result || disposed) return;

        const { id: rootId, wasRecreated } = result;
        if (wasRecreated) resetBrowserLinkedState();

        setBrowserBookmarksRootId(rootId);

        const homeFolder = await ensureHomeFolder(rootId);
        if (homeFolder) setHomeBrowserFolderId(homeFolder.id);

        const state = useNewtabStore.getState();
        await autoDiscoverAndCreateGroups(
          rootId,
          state.addGroup,
          state.setGroupBookmarkFolderId,
          () => useNewtabStore.getState().shortcutGroups
        );

        if (wasRecreated) {
          window.dispatchEvent(
            new CustomEvent('tmarks-folder-recreated', {
              detail: { message: 'TMarks 书签文件夹已重建' },
            })
          );
        }

        const configuredGroups = ['home', ...useNewtabStore.getState().shortcutGroups.filter((g) => g.id !== 'home').map((g) => g.id)];
        const collected: GridItem[] = [];
        const refreshedGroups: string[] = [];

        for (const groupId of configuredGroups) {
          let folderId: string | null = null;
          if (groupId === 'home') {
            folderId = homeFolder?.id ?? state.homeBrowserFolderId ?? (await ensureGroupBookmarkFolderId(groupId));
          } else {
            folderId = await ensureGroupBookmarkFolderId(groupId);
          }
          if (!folderId) continue;

          refreshedGroups.push(groupId);
          const subTree = await getSubTree(folderId);
          if (subTree) {
            collected.push(...toGridItems(subTree.children || [], { groupId, parentGridId: null }));
          }
        }

        setIsApplyingBrowserBookmarks(true);
        replaceBrowserBookmarkGridItems(collected, { groupIds: refreshedGroups });
      } finally {
        setIsApplyingBrowserBookmarks(false);
        refreshInFlight.current = false;
      }
    };

    refreshFromBrowser();

    const cleanup = registerBookmarkListeners({
      onCreated: (id, node) => {
        const now = Date.now();
        if (now < useNewtabStore.getState().browserBookmarkWriteLockUntil) return;
        if (!isInScopeParent((node as any).parentId)) return;

        setIsApplyingBrowserBookmarks(true);
        try {
          upsertBrowserBookmarkNode({
            id,
            parentId: (node as any).parentId,
            title: node.title,
            url: node.url,
            index: (node as any).index,
          });
        } finally {
          setIsApplyingBrowserBookmarks(false);
        }
        if ((node as any).parentId) refreshChildrenOrder((node as any).parentId);
      },

      onRemoved: (id, removeInfo) => {
        const now = Date.now();
        if (now < useNewtabStore.getState().browserBookmarkWriteLockUntil) return;

        const state = useNewtabStore.getState();
        if (state.browserBookmarksRootId && id === state.browserBookmarksRootId) {
          resetBrowserLinkedState();
          refreshFromBrowser();
          return;
        }

        if (!isInScopeParent(removeInfo?.parentId)) return;

        const matchingGroup = state.shortcutGroups.find((g) => g.bookmarkFolderId === id);
        if (matchingGroup && matchingGroup.id !== 'home') {
          removeGroup(matchingGroup.id, { skipBrowserBookmarkDeletion: true });
        }

        setIsApplyingBrowserBookmarks(true);
        try {
          removeBrowserBookmarkById(id);
        } finally {
          setIsApplyingBrowserBookmarks(false);
        }
        if (removeInfo?.parentId) refreshChildrenOrder(removeInfo.parentId);
      },

      onChanged: async (id, changeInfo) => {
        const now = Date.now();
        if (now < useNewtabStore.getState().browserBookmarkWriteLockUntil) return;

        const node = await getBookmarkNode(id);
        if (!node || !isInScopeParent((node as any).parentId)) return;

        setIsApplyingBrowserBookmarks(true);
        try {
          upsertBrowserBookmarkNode({
            id,
            parentId: (node as any).parentId,
            title: changeInfo.title ?? node.title,
            url: changeInfo.url ?? node.url,
            index: (node as any).index,
          });
        } finally {
          setIsApplyingBrowserBookmarks(false);
        }
      },

      onMoved: async (id, moveInfo) => {
        const now = Date.now();
        if (now < useNewtabStore.getState().browserBookmarkWriteLockUntil) return;

        const inNew = isInScopeParent(moveInfo.parentId);
        const inOld = isInScopeParent(moveInfo.oldParentId);
        if (!inNew && !inOld) return;

        if (inOld && !inNew) {
          setIsApplyingBrowserBookmarks(true);
          try {
            removeBrowserBookmarkById(id);
          } finally {
            setIsApplyingBrowserBookmarks(false);
          }
          await refreshChildrenOrder(moveInfo.oldParentId);
          return;
        }

        const node = await getBookmarkNode(id);
        if (node && inNew) {
          setIsApplyingBrowserBookmarks(true);
          try {
            upsertBrowserBookmarkNode({
              id,
              parentId: moveInfo.parentId,
              title: node.title,
              url: node.url,
              index: moveInfo.index,
            });
          } finally {
            setIsApplyingBrowserBookmarks(false);
          }
        }

        if (inOld) await refreshChildrenOrder(moveInfo.oldParentId);
        if (inNew) await refreshChildrenOrder(moveInfo.parentId);
      },

      onChildrenReordered: (id) => {
        const now = Date.now();
        if (now < useNewtabStore.getState().browserBookmarkWriteLockUntil) return;
        if (!isInScopeParent(id)) return;
        refreshChildrenOrder(id);
      },
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [isLoading]);
}
