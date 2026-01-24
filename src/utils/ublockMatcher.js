// ublockMatcher.js
// Implements URL block checking based on uBlock Origin filter rules.
// This module is used by domainUtils.js to extend domain filtering with uBlock rules.

import { extractDomain, matchesPattern } from './domainUtils.js';

/**
 * Context information for rule evaluation.
 * @typedef {Object} UblockMatcherContext
 * @property {string} [currentDomain] - The domain of the page where the request originates (for $domain option).
 * @property {boolean} [isThirdParty] - Whether the request is third‑party (for $3p / $1p options).
 */

/**
 * Determine if a URL is blocked by the provided uBlock rules.
 * @param {string} url - The URL to evaluate.
 * @param {Object} ublockRules - The parsed rule set from ublockParser.js.
 * @param {UblockMatcherContext} [context={}] - Optional matching context.
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

  const { blockRules = [], exceptionRules = [] } = ublockRules || {};

  // 1. Exception rules have priority – if any matches, the URL is allowed.
  for (const rule of exceptionRules) {
    if (matchRule(domain, rule, context)) {
      return false; // allowed
    }
  }

  // 2. Block rules – if any matches, the URL is blocked.
  for (const rule of blockRules) {
    if (matchRule(domain, rule, context)) {
      return true; // blocked
    }
  }

  // No matching rule → not blocked.
  return false;
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

  return true;
}
