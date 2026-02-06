/**
 * rulesBuilder.js
 * uBlockインポートモジュール - 変換ロジック
 */

import { parseUblockFilterListWithErrors } from '../../utils/ublockParser.js';

/**
 * 超軽量化: ソースからドメインセットを構築
 * ストレージにはドメイン文字列の配列のみを保存
 * @param {Array} sources - ソースリスト
 * @returns {Object} 軽量なルールデータ
 */
export function rebuildRulesFromSources(sources) {
  const blockDomains = new Set();
  const exceptionDomains = new Set();

  for (const source of sources) {
    if (source.blockDomains) {
      source.blockDomains.forEach(d => blockDomains.add(d));
    }
    if (source.exceptionDomains) {
      source.exceptionDomains.forEach(d => exceptionDomains.add(d));
    }
  }

  // ストレージには配列のみ保存（オブジェクトは保存しない）
  return {
    blockDomains: Array.from(blockDomains),
    exceptionDomains: Array.from(exceptionDomains),
    metadata: {
      importedAt: Date.now(),
      ruleCount: blockDomains.size + exceptionDomains.size
    }
  };
}

/**
 * uBlockフィルターのプレビュー
 * @param {string} text - フィルターテキスト
 * @returns {Object} プレビュー結果
 */
export function previewUblockFilter(text) {
  try {
    const result = parseUblockFilterListWithErrors(text);

    return {
      blockCount: result.rules.blockRules.length,
      exceptionCount: result.rules.exceptionRules.length,
      errorCount: result.errors.length,
      errorDetails: result.errors
    };
  } catch (error) {
    return {
      blockCount: 0,
      exceptionCount: 0,
      errorCount: 1,
      errorDetails: [error.message]
    };
  }
}