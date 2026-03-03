/**
 * 导入 API 调用
 */

import type { ParsedBookmark, ImportOptions, ImportResult } from '@/types/import'

// 批量大小（每批处理的书签数量）
const BATCH_SIZE = 50

/**
 * 导入书签到 TMarks（使用批量创建 API）
 */
export async function importToTMarks(
  bookmarks: ParsedBookmark[],
  _options: ImportOptions,
  tmarksUrl: string,
  accessToken?: string
): Promise<ImportResult> {
  // 验证 API Key
  if (!accessToken) {
    throw new Error('未配置 TMarks API Key，请先在「设置 → 同步设置」中配置')
  }

  console.log('[Import] Starting batch import:', {
    bookmarkCount: bookmarks.length,
    batchSize: BATCH_SIZE,
    tmarksUrl,
    hasApiKey: !!accessToken
  })

  let imported = 0
  let skipped = 0
  let failed = 0
  const errors: Array<{ item: { title?: string; url?: string }; error: string }> = []

  // 规范化 URL
  const baseUrl = tmarksUrl.replace(/\/+$/, '')
  const batchApiUrl = `${baseUrl}/api/tab/bookmarks`

  // 分批处理书签
  for (let i = 0; i < bookmarks.length; i += BATCH_SIZE) {
    const batch = bookmarks.slice(i, i + BATCH_SIZE)
    
    console.log(`[Import] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(bookmarks.length / BATCH_SIZE)}`)

    try {
      const response = await fetch(batchApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': accessToken
        },
        body: JSON.stringify({
          bookmarks: batch.map(bookmark => ({
            title: bookmark.title,
            url: bookmark.url,
            description: bookmark.description || '',
            tags: bookmark.tags || []
          }))
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('API Key 认证失败，请检查「设置 → 同步设置」中的 API Key 是否正确')
        }
        const error = await response.json().catch(() => ({ message: 'Failed to create bookmarks' }))
        throw new Error(error.message || `批量创建失败 (${response.status})`)
      }

      const data = await response.json()
      const batchResult = data.data

      // 累计结果
      imported += batchResult.success || 0
      skipped += batchResult.skipped || 0
      failed += batchResult.failed || 0

      // 收集错误信息
      if (batchResult.errors && Array.isArray(batchResult.errors)) {
        for (const error of batchResult.errors) {
          const bookmarkIndex = i + error.index
          const bookmark = bookmarks[bookmarkIndex]
          errors.push({
            item: { title: bookmark?.title, url: bookmark?.url || error.url },
            error: error.error
          })
        }
      }

      console.log(`[Import] Batch complete:`, {
        success: batchResult.success,
        skipped: batchResult.skipped,
        failed: batchResult.failed
      })

    } catch (error) {
      // 批量请求失败，记录整批错误
      console.error(`[Import] Batch request failed:`, error)
      
      // 将整批标记为失败
      for (const bookmark of batch) {
        failed++
        errors.push({
          item: { title: bookmark.title, url: bookmark.url },
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
  }

  const result: ImportResult = {
    success: failed === 0,
    imported,
    skipped,
    failed,
    total: bookmarks.length,
    errors: errors.length > 0 ? errors : undefined
  }

  console.log('[Import] Complete:', result)
  return result
}
