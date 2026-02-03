/**
 * migration.js
 * Data migration functions for uBlock format rules (old to lightweight format).
 *
 * Old format (v2.2.4 and earlier):
 * { blockRules: [{domain, options, ...}], exceptionRules: [{domain, options, ...}], metadata }
 *
 * New lightweight format (v2.2.5+):
 * { blockDomains: ['domain1', 'domain2', ...], exceptionDomains: ['domain1', 'domain2', ...], metadata }
 */

/**
 * Migrate old format uBlock rules to new lightweight format.
 * @param {Object} oldRules - Old format {blockRules, exceptionRules, metadata}
 * @returns {Object} - New format {blockDomains, exceptionDomains, metadata}
 */
export function migrateToLightweightFormat(oldRules) {
  // If already in new format, return as-is
  if (oldRules.blockDomains && oldRules.exceptionDomains) {
    return oldRules;
  }

  const blockDomains = (oldRules.blockRules || []).map(r => r.domain);
  const exceptionDomains = (oldRules.exceptionRules || []).map(r => r.domain);

  return {
    blockDomains,
    exceptionDomains,
    metadata: {
      ...oldRules.metadata,
      importedAt: oldRules.metadata?.importedAt || Date.now(),
      ruleCount: blockDomains.length + exceptionDomains.length,
      migrated: true
    }
  };
}

/**
 * Migrate uBlock settings in storage to new lightweight format.
 * @returns {Promise<boolean>} - true if migration was performed, false otherwise
 */
export async function migrateUblockSettings() {
  const { StorageKeys } = await import('./storage.js');

  const result = await chrome.storage.local.get([StorageKeys.UBLOCK_RULES]);
  const ublockRules = result[StorageKeys.UBLOCK_RULES];

  // If already in new format or no data exists, nothing to do
  if (!ublockRules || ublockRules.blockDomains) {
    return false;
  }

  // Perform migration
  const newRules = migrateToLightweightFormat(ublockRules);
  await chrome.storage.local.set({ [StorageKeys.UBLOCK_RULES]: newRules });

  return true;
}