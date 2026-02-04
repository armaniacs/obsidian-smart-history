// ublockMatcher.js
// Implements URL block checking based on uBlock Origin filter rules.
// This module is used by domainUtils.js to extend domain filtering with uBlock rules.

import { extractDomain, matchesPattern } from './domainUtils.js';
import { migrateToLightweightFormat } from './migration.js';

/**
 * Rule index for fast lookup (UF-302 performance optimization).
 * 軽量化版: ドメイン配列のみを使用したSetベースの高速マッチング
 */
class RuleIndex {
  constructor(ublockRules) {
    this.blockRulesByDomain = new Map();
    this.exceptionRulesByDomain = new Map();
    this.wildcardBlockRules = [];
    this.wildcardExceptionRules = [];

    this.buildIndex(ublockRules);
  }

  /**
   * Build indices from rule sets.
   * @param {Object} ublockRules - 軽量化版ルールセット（ドメイン配列）または旧形式
   */
  buildIndex(ublockRules) {
    // 【修正】: 移行前の元のルールを直接使用する
    // 【理由】: migrateToLightweightFormat関数がblockRulesをblockDomainsに変換する際に
    // options情報を失っているため、元のルールが必要
    // 🟡 信頼性レベル: テスト失敗によるバグ特定
    const rules = ublockRules;  // 移行前のルールを使用

    // 【優先度設定】: 新しい軽量形式（blockDomains）が存在する場合は、古い形式（blockRules）を処理しない
    const hasBlockDomains = rules.blockDomains && rules.blockDomains.length > 0;
    const shouldProcessBlockRules = !hasBlockDomains && rules.blockRules;

    if (shouldProcessBlockRules) {
      // Handle blockRules (old format)
      for (const rule of rules.blockRules) {
        if (!rule.domain) continue;
        if (rule.domain.includes('*')) {
          this.wildcardBlockRules.push(rule);
        } else {
          if (!this.blockRulesByDomain.has(rule.domain)) {
            this.blockRulesByDomain.set(rule.domain, []);
          }
          this.blockRulesByDomain.get(rule.domain).push(rule);  // 【修正】: 元のルールオブジェクトをそのまま追加
        }
      }
    }

    // Handle blockDomains (new lightweight format)
    if (rules.blockDomains) {
      for (const domain of rules.blockDomains) {
        if (domain.includes('*')) {
          this.wildcardBlockRules.push({ domain, options: {} });
        } else {
          if (!this.blockRulesByDomain.has(domain)) {
            this.blockRulesByDomain.set(domain, []);
          }
          // 【修正】: 新しい形式のドメインは options: {} で追加（軽量形式）
          this.blockRulesByDomain.get(domain).push({ domain, options: {} });
        }
      }
    }

    // 【優先度設定】: 例外ルールについても同様の優先度設定
    const hasExceptionDomains = rules.exceptionDomains && rules.exceptionDomains.length > 0;
    const shouldProcessExceptionRules = !hasExceptionDomains && rules.exceptionRules;

    if (shouldProcessExceptionRules) {
      // Handle exceptionRules (old format)
      for (const rule of rules.exceptionRules) {
        if (!rule.domain) continue;
        if (rule.domain.includes('*')) {
          this.wildcardExceptionRules.push(rule);
        } else {
          if (!this.exceptionRulesByDomain.has(rule.domain)) {
            this.exceptionRulesByDomain.set(rule.domain, []);
          }
          this.exceptionRulesByDomain.get(rule.domain).push(rule);
        }
      }
    }

    // Handle exceptionDomains (new lightweight format)
    if (rules.exceptionDomains) {
      for (const domain of rules.exceptionDomains) {
        if (domain.includes('*')) {
          this.wildcardExceptionRules.push({ domain, options: {} });
        } else {
          if (!this.exceptionRulesByDomain.has(domain)) {
            this.exceptionRulesByDomain.set(domain, []);
          }
          this.exceptionRulesByDomain.get(domain).push({ domain, options: {} });
        }
      }
    }
  }

  /**
   * Check if domain is blocked (fast Set lookup + wildcard check).
   * @param {string} domain - The domain to check.
   * @returns {Object} - { isBlocked, isException }
   */
  checkDomain(domain, context) {
    // 例外チェック（優先）
    const exactExceptions = this.exceptionRulesByDomain.get(domain) || [];
    for (const rule of exactExceptions) {
      if (evaluateOptions(rule, context)) {
        return { isBlocked: false, isException: true };
      }
    }
    for (const rule of this.wildcardExceptionRules) {
      if (matchesPattern(domain, rule.domain) && evaluateOptions(rule, context)) {
        return { isBlocked: false, isException: true };
      }
    }

    // ブロックチェック
    const exactBlocks = this.blockRulesByDomain.get(domain) || [];
    for (const rule of exactBlocks) {
      if (evaluateOptions(rule, context)) {
        return { isBlocked: true, isException: false };
      }
    }
    for (const rule of this.wildcardBlockRules) {
      if (matchesPattern(domain, rule.domain) && evaluateOptions(rule, context)) {
        return { isBlocked: true, isException: false };
      }
    }

    return { isBlocked: false, isException: false };
  }
}

// Global index cache for performance (WeakMap for automatic cleanup)
const RULE_INDEX_CACHE = new WeakMap();

/**
 * Context information for rule evaluation.
 * @typedef {Object} UblockMatcherContext
 * @property {string} [currentDomain] - The domain of the page where the request originates (for $domain option).
 * @property {boolean} [isThirdParty] - Whether the request is third‑party (for $3p / $1p options).
 */

/**
 * Determine if a URL is blocked by the provided uBlock rules.
 * 軽量化版: Setベースの高速マッチング対応
 * @param {string} url - The URL to evaluate.
 * @param {Object} ublockRules - 軽量化版ルールセットまたは旧形式
 * @param {UblockMatcherContext} [context={}] - Optional matching context (軽量版では未使用).
 * @returns {Promise<boolean>} - true if the URL is blocked, false otherwise.
 */
export async function isUrlBlocked(url, ublockRules, context = {}) {
  // Guard against invalid input – safe fallback to not block.
  if (typeof url !== 'string' || !url) {
    return false;
  }

  const domain = extractDomain(url);
  if (!domain) {
    return false;
  }

  // Get or create rule index for performance (UF-302 optimization)
  let index = RULE_INDEX_CACHE.get(ublockRules);
  if (!index) {
    index = new RuleIndex(ublockRules);
    RULE_INDEX_CACHE.set(ublockRules, index);
  }

  // Perform matching with context
  const result = index.checkDomain(domain, context);
  return result.isBlocked;
}

/**
 * Evaluate a single rule against a domain.
 * @param {string} urlDomain - Domain extracted from the URL.
 * @param {Object} rule - A rule object produced by ublockParser.js.
 * @param {UblockMatcherContext} context - Matching context.
 * @returns {boolean} - true if the rule matches the URL.
 */
function matchRule(urlDomain, rule, context) {
  // Basic domain pattern match (supports wildcards via matchesPattern).
  if (!matchesPattern(urlDomain, rule.domain)) {
    return false;
  }

  // Evaluate optional rule options if present.
  if (rule.options && Object.keys(rule.options).length > 0) {
    return evaluateOptions(rule, context);
  }

  // No options → rule matches.
  return true;
}

/**
 * Evaluate rule options such as $domain, $~domain, $3p, $1p, $important.
 * The implementation covers the most common options required for UF‑103.
 * @param {Object} rule - Rule object with an `options` field.
 * @param {UblockMatcherContext} context - Matching context.
 * @returns {boolean} - true if all specified options are satisfied.
 */
function evaluateOptions(rule, context) {
  const opts = rule.options;
  if (!opts) return true; // No options means rule matches domain.
  // $domain=example.com|other.com – allow only when currentDomain matches one of the list.
  if (opts.domains && opts.domains.length > 0) {
    if (!context.currentDomain) return false;
    // 【引数順序修正】: matchesPattern(pattern, domain) ではなく matchesPattern(domain, pattern)
    // 【バグ原因】: テストでは「currentDomainがドメインリストに含まれるか」をチェックする必要がある
    // 【元動作】: context.currentDomain を pattern として扱っていたためマッチしなかった
    // 🟡 信頼性レベル: テスト失敗によるバグ特定
    const allowed = opts.domains.some(d => matchesPattern(context.currentDomain, d));
    if (!allowed) return false;
  }

  // $~domain=example.com|other.com – block when currentDomain matches any of the list.
  if (opts.negatedDomains && opts.negatedDomains.length > 0) {
    if (!context.currentDomain) return false;
    // 【引数順序修正】: matchesPattern(pattern, domain) ではなく matchesPattern(domain, pattern)
    // 【バグ原因】: 上記と同様に引数順序が逆だった
    // 🟡 信頼性レベル: テスト失敗によるバグ特定
    const blocked = opts.negatedDomains.some(d => matchesPattern(context.currentDomain, d));
    if (blocked) return false;
  }

  // $3p – only match when request is third‑party.
  if (opts.thirdParty) {
    if (!context.isThirdParty) return false;
  }

  // $1p – only match when request is first‑party.
  if (opts.firstParty) {
    if (context.isThirdParty) return false;
  }

  // $important – for this simple matcher we treat it as a normal match.
  // If the rule has `important: false` (i.e., ~important) we still consider the rule matched.
  // Advanced priority handling can be added later.

  // $match-case – for this simple matcher we treat it as a normal match.
  // If the rule has `matchCase: true` we could do case-sensitive matching.
  // If the rule has `matchCase: false` we do case-insensitive matching (default).

  return true;
}
