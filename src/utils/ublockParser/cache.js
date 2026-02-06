/**
 * ublockParser/cache.js
 * uBlock Origin形式フィルターパーサーのキャッシュ管理
 *
 * 【機能概要】: パーサーのキャッシュ機能を提供
 * 🟢 信頼性レベル: UF-302 パフォーマンス最適化要件
 */

import { CACHE_CONFIG, CLEANUP_INTERVAL } from './constants.js';

// ============================================================================
// キャッシュ管理
// ============================================================================

/** 【キャッシュ】: パーサーキャッシュ 🟢 */
const PARSER_CACHE = new Map();
/** 【LRUキャッシュ】: 最近使用されたエントリを追跡 */
const LRU_TRACKER = new Set();

// 最後にクリーンアップした時間
let lastCleanupTime = Date.now();

/**
 * LRUキャッシュから最も古いエントリを削除
 */
function evictLRUEntry() {
  const firstKey = LRU_TRACKER.values().next().value;
  if (firstKey !== undefined) {
    LRU_TRACKER.delete(firstKey);
    PARSER_CACHE.delete(firstKey);
  }
}

/**
 * LRUトラッカーを更新
 * @param {string} key - キャッシュキー
 */
export function updateLRUTracker(key) {
  // 既存のキーを削除
  LRU_TRACKER.delete(key);
  // キーを最後に追加（最近使用）
  LRU_TRACKER.add(key);

  // LRUキャッシュの最大サイズを超えた場合は最も古いエントリを削除
  if (LRU_TRACKER.size > CACHE_CONFIG.LRU_MAX_ENTRIES) {
    evictLRUEntry();
  }
}

/**
 * LRUキャッシュのクリーンアップ
 */
export function cleanupCache() {
  const now = Date.now();
  if (now - lastCleanupTime > CLEANUP_INTERVAL) {
    PARSER_CACHE.clear();
    LRU_TRACKER.clear();
    lastCleanupTime = now;
  }
}

/**
 * キャッシュキーを生成
 * @param {string} text - キャッシュキーの元となるテキスト
 * @returns {string} - キャッシュキー
 */
export function generateCacheKey(text) {
  return text.substring(0, 100) + '_' + text.length;
}

/**
 * キャッシュから値を取得
 * @param {string} key - キャッシュキー
 * @returns {Object|null} - キャッシュされた値（存在しない場合はnull）
 */
export function getFromCache(key) {
  if (PARSER_CACHE.has(key)) {
    updateLRUTracker(key);
    return { ...PARSER_CACHE.get(key) }; // ディープコピーして返す
  }
  return null;
}

/**
 * キャッシュに値を保存
 * @param {string} key - キャッシュキー
 * @param {Object} value - 保存する値
 */
export function saveToCache(key, value) {
  updateLRUTracker(key);
  PARSER_CACHE.set(key, value);
}

/**
 * キャッシュがキーを持っているか判定
 * @param {string} key - キャッシュキー
 * @returns {boolean} - キャッシュにキーが存在するか
 */
export function hasCacheKey(key) {
  return PARSER_CACHE.has(key);
}