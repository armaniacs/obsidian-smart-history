/**
 * ublockParser/validation.js
 * uBlock Origin形式フィルターパーサーのバリデーション関数
 *
 * 【機能概要】: 入力値検証とデータ検証を提供
 * 🟢 信頼性レベル: 基本的な型安全パターンおよび plan/UII/10-data-structures.md に記載される制約
 */

import { PATTERNS } from './constants.js';

// ============================================================================
// 入力値検証
// ============================================================================

/**
 * 【ヘルパー関数】: 文字列型の入力値を検証
 * 【再利用性】: すべてのpublic関数で使用する共通の入力検証
 * 【単一責任】: 文字列型妥当性の確認
 * 🟢 信頼性レベル: 基本的な型安全パターン
 * @param {unknown} value - 検証対象の値
 * @returns {boolean} - 有効な文字列ならtrue
 */
export function isValidString(value) {
  return value != null && typeof value === 'string';
}

// ============================================================================
// データ検証
// ============================================================================

/**
 * 【ヘルパー関数】: ドメインの妥当性を検証
 * 【設計方針】: 空ドメインチェックと形式チェックを分離して明確化
 * 【処理効率化】: 短絡評価で不要なチェックをスキップ
 * 【可読性向上】: 各検証が独立したif文で明確
 * 🟢 信頼性レベル: plan/UII/10-data-structures.md に記載されるドメイン制約
 * @param {string} domain - 検証対象のドメイン
 * @returns {boolean} - 有効なドメインならtrue
 */
export function validateDomain(domain) {
  // 【空ドメイン検証】: ドメインが空の場合は無効
  if (!domain) {
    return false;
  }

  // 【不正文字検証】: ドメインとして不適切な文字を含む場合は無効
  // 【セキュリティ】: 正規表現によるXSSリスク低減 🟢
  return PATTERNS.DOMAIN_VALIDATION.test(domain);
}

// ============================================================================
// 行タイプ検証
// ============================================================================

/**
 * 指定された行がuBlock形式のコメント行か判定
 *
 * 【設計方針】: シンプルなプレフィックス判定で確実性を確保
 * 【パフォーマンス】: 正規表現キャッシュによる高速判定
 * 【保守性】: isValidStringの変更があれば一箇所で適用
 * 🟢 信頼性レベル: plan/UII/00-overview.md に記載される基本構文
 * @param {string} line - 判定対象の行
 * @returns {boolean} - コメント行ならtrue
 */
export function isCommentLine(line) {
  // 【入力値検証】: null/undefinedの場合はfalseを返してエラーを防ぐ 🟢
  if (!isValidString(line)) {
    return false;
  }
  // 【パターンマッチング】: `!` で始まる行をコメント行と判定
  return PATTERNS.COMMENT_PREFIX.test(line);
}

/**
 * 指定された行が空行か判定
 *
 * 【設計方針】: trim後の空白行チェックで柔軟な判定
 * 【パフォーマンス】: trimと空文字列比較は最効率的
 * 【保守性]: isValidStringの変更があれば一箇所で適用
 * 🟢 信頼性レベル: 基本的な文字列判定機能
 * @param {string} line - 判定対象の行
 * @returns {boolean} - 空行ならtrue
 */
export function isEmptyLine(line) {
  // 【入力値検証】: null/undefinedの場合はtrueを返して処理をスキップ 🟢
  if (!isValidString(line)) {
    return true;
  }
  // 【空白判定】: trimした後に空文字列になるかチェック
  return line.trim() === '';
}

/**
 * 指定された行が有効なuBlockルールパターンか判定
 *
 * 【設計方針】: `||` プレフィックスと `^` サフィックスの両方をチェック
 * 【パフォーマンス】: 正規表現キャッシュによる高速判定
 * 【保守性】: isValidStringの変更があれば一箇所で適用
 * 🟢 信頼性レベル: plan/UII/00-overview.md に記載される基本構文
 * @param {string} line - 判定対象の行
 * @returns {boolean} - 有効なパターンならtrue
 */
export function isValidRulePattern(line) {
  // 【入力値検証】: null/undefinedの場合はinvalid 🟢
  if (!isValidString(line)) {
    return false;
  }
  // 【パターン検証】: `||` プレフィックスと `^` サフィックスの両方を検出
  const hasPrefix = PATTERNS.RULE_PREFIX.test(line);
  const hasSuffix = PATTERNS.RULE_SUFFIX.test(line);
  return hasPrefix && hasSuffix;
}