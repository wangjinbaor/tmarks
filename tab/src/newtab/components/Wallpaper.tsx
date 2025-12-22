/**
 * 壁纸背景组件
 */

import { useState, useEffect } from 'react';
import { RefreshCw, Info, X } from 'lucide-react';
import type { WallpaperConfig, BingWallpaperInfo } from '../types';
import { UNSPLASH_API } from '../constants';

interface WallpaperProps {
  config: WallpaperConfig;
  onRefresh?: () => void;
}

const WALLPAPER_CACHE_KEY = 'newtab_wallpaper_cache';
const BING_INFO_CACHE_KEY = 'newtab_bing_info_cache';

export function Wallpaper({ config, onRefresh }: WallpaperProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [bingInfo, setBingInfo] = useState<BingWallpaperInfo | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (config.type === 'bing') {
      fetchBingWallpaper();
    } else if (config.type === 'unsplash') {
      fetchUnsplashWallpaper();
    } else if (config.type === 'image') {
      setImageUrl(config.value);
    }
  }, [config.type, config.value, config.bingHistoryIndex]);

  const fetchBingWallpaper = async (forceRefresh = false) => {
    try {
      const idx = config.bingHistoryIndex || 0;
      const cacheKey = `bing_${idx}`;
      
      // 检查缓存
      if (!forceRefresh) {
        const cached = await getCachedWallpaper(cacheKey);
        const cachedInfo = await getCachedBingInfo(idx);
        if (cached && cachedInfo) {
          setImageUrl(cached);
          setBingInfo(cachedInfo);
          return;
        }
      }

      // 获取指定索引的图片（idx=0 是今天，idx=1 是昨天，最多支持 7 天）
      const apiUrl = `https://www.bing.com/HPImageArchive.aspx?format=js&idx=${idx}&n=1&mkt=zh-CN`;
      const res = await fetch(apiUrl);
      const data = await res.json();
      
      if (data.images?.[0]) {
        const image = data.images[0];
        // 添加时间戳参数强制刷新图片（仅在手动刷新时）
        let url = `https://www.bing.com${image.url}`;
        if (forceRefresh) {
          url += `${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
        }
        
        const info: BingWallpaperInfo = {
          url,
          title: image.title || '',
          copyright: image.copyright || '',
          date: image.startdate || '',
        };
        
        setImageUrl(url);
        setBingInfo(info);
        await cacheWallpaper(cacheKey, url);
        await cacheBingInfo(idx, info);
      }
    } catch (error) {
      console.error('Failed to fetch Bing wallpaper:', error);
    }
  };

  const fetchUnsplashWallpaper = async (forceRefresh = false) => {
    try {
      // 检查缓存（每小时更新一次）
      if (!forceRefresh) {
        const cached = await getCachedWallpaper('unsplash');
        if (cached) {
          setImageUrl(cached);
          return;
        }
      }

      // 使用 picsum.photos 作为免费替代
      const url = `${UNSPLASH_API}?random=${Date.now()}`;
      setImageUrl(url);
      await cacheWallpaper('unsplash', url);
    } catch (error) {
      console.error('Failed to fetch Unsplash wallpaper:', error);
    }
  };

  const getCachedWallpaper = async (cacheKey: string): Promise<string | null> => {
    try {
      const result = await chrome.storage.local.get(WALLPAPER_CACHE_KEY);
      const cache = result[WALLPAPER_CACHE_KEY] as Record<string, { url: string; timestamp: number }> | undefined;
      if (cache?.[cacheKey]) {
        const cacheAge = Date.now() - cache[cacheKey].timestamp;
        const maxAge = cacheKey.startsWith('bing') ? 6 * 60 * 60 * 1000 : 60 * 60 * 1000; // bing 6小时, unsplash 1小时
        if (cacheAge < maxAge) {
          return cache[cacheKey].url;
        }
      }
    } catch {}
    return null;
  };

  const cacheWallpaper = async (cacheKey: string, url: string) => {
    try {
      const result = await chrome.storage.local.get(WALLPAPER_CACHE_KEY);
      const cache = (result[WALLPAPER_CACHE_KEY] as Record<string, { url: string; timestamp: number }>) || {};
      cache[cacheKey] = { url, timestamp: Date.now() };
      await chrome.storage.local.set({ [WALLPAPER_CACHE_KEY]: cache });
    } catch (error) {
      console.error('Failed to cache wallpaper:', error);
    }
  };

  const getCachedBingInfo = async (idx: number): Promise<BingWallpaperInfo | null> => {
    try {
      const result = await chrome.storage.local.get(BING_INFO_CACHE_KEY);
      const cache = result[BING_INFO_CACHE_KEY] as Record<number, { info: BingWallpaperInfo; timestamp: number }> | undefined;
      if (cache?.[idx]) {
        const cacheAge = Date.now() - cache[idx].timestamp;
        const maxAge = 6 * 60 * 60 * 1000; // 6小时
        if (cacheAge < maxAge) {
          return cache[idx].info;
        }
      }
    } catch {}
    return null;
  };

  const cacheBingInfo = async (idx: number, info: BingWallpaperInfo) => {
    try {
      const result = await chrome.storage.local.get(BING_INFO_CACHE_KEY);
      const cache = (result[BING_INFO_CACHE_KEY] as Record<number, { info: BingWallpaperInfo; timestamp: number }>) || {};
      cache[idx] = { info, timestamp: Date.now() };
      await chrome.storage.local.set({ [BING_INFO_CACHE_KEY]: cache });
    } catch (error) {
      console.error('Failed to cache Bing info:', error);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    
    try {
      if (config.type === 'bing') {
        await fetchBingWallpaper(true);
      } else if (config.type === 'unsplash') {
        await fetchUnsplashWallpaper(true);
      }
      onRefresh?.();
    } catch (error) {
      console.error('Failed to refresh wallpaper:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const style: React.CSSProperties = {
    filter: `blur(${config.blur}px) brightness(${config.brightness}%)`,
  };

  if (config.type === 'color') {
    return (
      <div
        className="absolute inset-0 z-0"
        style={{ ...style, backgroundColor: config.value }}
      />
    );
  }

  const url = config.type === 'bing' || config.type === 'unsplash' ? imageUrl : config.value;

  if (!url) {
    return <div className="absolute inset-0 z-0" style={{ backgroundColor: 'var(--background)' }} />;
  }

  return (
    <>
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ ...style, backgroundImage: `url(${url})` }}
      />
      
      {/* 刷新按钮和信息按钮 */}
      {(config.type === 'bing' || config.type === 'unsplash') && (
        <div className="fixed bottom-6 right-24 z-50 flex items-center gap-2">
          {/* Bing 信息按钮 */}
          {config.type === 'bing' && config.showBingInfo && bingInfo && (
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 rounded-full glass-light hover:bg-white/20 transition-all group"
              title="图片信息"
            >
              <Info className="w-4 h-4 text-white/80 group-hover:text-white" />
            </button>
          )}
          
          {/* 刷新按钮 */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-full glass-light hover:bg-white/20 transition-all group disabled:opacity-50"
            title="刷新壁纸"
          >
            <RefreshCw className={`w-4 h-4 text-white/80 group-hover:text-white ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Bing 图片信息面板 */}
      {config.type === 'bing' && config.showBingInfo && showInfo && bingInfo && (
        <div className="fixed bottom-20 right-24 z-50 w-80 glass-modal-dark rounded-xl p-4 animate-fadeIn">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-sm font-medium text-white">图片信息</h3>
            <button
              onClick={() => setShowInfo(false)}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <div className="text-white/50 mb-1">标题</div>
              <div className="text-white/90">{bingInfo.title}</div>
            </div>
            <div>
              <div className="text-white/50 mb-1">版权信息</div>
              <div className="text-white/90 leading-relaxed">{bingInfo.copyright}</div>
            </div>
            <div>
              <div className="text-white/50 mb-1">日期</div>
              <div className="text-white/90">
                {bingInfo.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
