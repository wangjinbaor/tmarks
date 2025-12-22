/**
 * 书签写锁管理
 */

import { WRITE_LOCK_DURATION, BATCH_WRITE_LOCK_DURATION } from './constants';

let writeLockUntil = 0;

/** 设置写锁 */
export function setWriteLock(duration: number = WRITE_LOCK_DURATION): void {
  writeLockUntil = Date.now() + duration;
}

/** 设置批量操作写锁 */
export function setBatchWriteLock(): void {
  writeLockUntil = Date.now() + BATCH_WRITE_LOCK_DURATION;
}

/** 检查是否在写锁期间 */
export function isWriteLocked(): boolean {
  return Date.now() < writeLockUntil;
}

/** 获取写锁过期时间 */
export function getWriteLockUntil(): number {
  return writeLockUntil;
}

/** 清除写锁 */
export function clearWriteLock(): void {
  writeLockUntil = 0;
}

/** 在写锁保护下执行操作 */
export async function withWriteLock<T>(fn: () => Promise<T>, duration?: number): Promise<T> {
  setWriteLock(duration);
  return fn();
}
