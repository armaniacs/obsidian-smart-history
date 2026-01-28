// ublockMatcher.js
// Implements URL block checking based on uBlock Origin filter rules.
// This module is used by domainUtils.js to extend domain filtering with uBlock rules.

import { extractDomain, matchesPattern } from './domainUtils.js';

/**
 * Rule index for fast lookup (UF-302 performance optimization).
 * 軽量化版: ドメイン配列のみを使用したSetベースの高速マッチング
 */
class RuleIndex {
  constructor(ublockRules) {
    this.blockDomainSet = new Set();  // exact block domains
    this.exceptionDomainSet = new Set();  // exact exception domains
    this.wildcardBlockDomains = [];  // block domains with wildcards
    this.wildcardExceptionDomains = [];  // exception domains with wildcards

    this.buildIndex(ublockRules);
  }

  /**
   * Build indices from rule sets.
   * @param {Object} ublockRules - 軽量化版ルールセット（ドメイン配列）または旧形式
   */
  buildIndex(ublockRules) {
    // 新形式: blockDomains/exceptionDomains（配列）
    if (ublockRules.blockDomains) {
      for (const domain of ublockRules.blockDomains) {
        if (domain.includes('*')) {
          this.wildcardBlockDomains.push(domain);
        } else {
          this.blockDomainSet.add(domain);
        }
      }
    }
    // 旧形式互換: blockRules（オブジェクト配列）
    else if (ublockRules.blockRules) {
      for (const rule of ublockRules.blockRules) {
        if (rule.domain && rule.domain.includes('*')) {
          this.wildcardBlockDomains.push(rule.domain);
        } else if (rule.domain) {
          this.blockDomainSet.add(rule.domain);
        }
      }
    }

    // 新形式: exceptionDomains
    if (ublockRules.exceptionDomains) {
      for (const domain of ublockRules.exceptionDomains) {
        if (domain.includes('*')) {
          this.wildcardExceptionDomains.push(domain);
        } else {
          this.exceptionDomainSet.add(domain);
        }
      }
    }
    // 旧形式互換: exceptionRules
    else if (ublockRules.exceptionRules) {
      for (const rule of ublockRules.exceptionRules) {
        if (rule.domain && rule.domain.includes('*')) {
          this.wildcardExceptionDomains.push(rule.domain);
        } else if (rule.domain) {
          this.exceptionDomainSet.add(rule.domain);
        }
      }
    }
  }

  /**
   * Check if domain is blocked (fast Set lookup + wildcard check).
   * @param {string} domain - The domain to check.
   * @returns {Object} - { isBlocked, isException }
   */
  checkDomain(domain) {
    // 例外チェック（優先）
    if (this.exceptionDomainSet.has(domain)) {
      return { isBlocked: false, isException: true };
    }
    for (const pattern of this.wildcardExceptionDomains) {
      if (matchesPattern(domain, pattern)) {
        return { isBlocked: false, isException: true };
      }
    }

    // ブロックチェック
    if (this.blockDomainSet.has(domain)) {
      return { isBlocked: true, isException: false };
    }
    for (const pattern of this.wildcardBlockDomains) {
      if (matchesPattern(domain, pattern)) {
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

  // 軽量化版: シンプルなドメインチェック
  const result = index.checkDomain(domain);
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

  // $domain=example.com|other.com – allow only when currentDomain matches one of the list.
  if (opts.domains && opts.domains.length > 0) {
    if (!context.currentDomain) return false;
    const allowed = opts.domains.some(d => matchesPattern(context.currentDomain, d));
    if (!allowed) return false;
  }

  // $~domain=example.com|other.com – block when currentDomain matches any of the list.
  if (opts.negatedDomains && opts.negatedDomains.length > 0) {
    if (!context.currentDomain) return false;
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
