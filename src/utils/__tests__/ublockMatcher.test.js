// ublockMatcher.test.js
// Tests for the uBlock matcher integration (UF-103)

import { isUrlBlocked } from '../ublockMatcher.js';
import { parseUblockFilterList } from '../ublockParser.js';

/** Helper to create a simple rule set */
function rulesFromText(text) {
  return parseUblockFilterList(text);
}

describe('isUrlBlocked', () => {
  test('basic block rule matches URL', async () => {
    const ublockRules = rulesFromText('||ads.google.com^');
    const result = await isUrlBlocked('https://ads.google.com/tracker.js', ublockRules);
    expect(result).toBe(true);
  });

  test('exception rule overrides block', async () => {
    const ublockRules = rulesFromText(`||ads.google.com^\n@@||ads.google.com^$domain=example.com`);
    const result = await isUrlBlocked('https://ads.google.com/asset.js', ublockRules, { currentDomain: 'example.com' });
    expect(result).toBe(false);
  });

  test('domain option restricts block to specific domain', async () => {
    const ublockRules = rulesFromText('||tracker.com^$domain=example.com');
    const blocked = await isUrlBlocked('https://tracker.com/track', ublockRules, { currentDomain: 'example.com' });
    const notBlocked = await isUrlBlocked('https://tracker.com/track', ublockRules, { currentDomain: 'other.com' });
    expect(blocked).toBe(true);
    expect(notBlocked).toBe(false);
  });

  test('~domain option excludes specific domain', async () => {
    const ublockRules = rulesFromText('||ads.google.com^$~domain=example.com');
    const blocked = await isUrlBlocked('https://ads.google.com/asset.js', ublockRules, { currentDomain: 'other.com' });
    const allowed = await isUrlBlocked('https://ads.google.com/asset.js', ublockRules, { currentDomain: 'example.com' });
    expect(blocked).toBe(true);
    expect(allowed).toBe(false);
  });

  test('3p option matches only third‑party requests', async () => {
    const ublockRules = rulesFromText('||adnetwork.com^$3p');
    const thirdParty = await isUrlBlocked('https://adnetwork.com/ad.js', ublockRules, { isThirdParty: true });
    const firstParty = await isUrlBlocked('https://adnetwork.com/ad.js', ublockRules, { isThirdParty: false });
    expect(thirdParty).toBe(true);
    expect(firstParty).toBe(false);
  });

  test('wildcard pattern matches subdomains', async () => {
    const ublockRules = rulesFromText('||*.ads.net^');
    const result = await isUrlBlocked('https://sub.ads.net/image.gif', ublockRules);
    expect(result).toBe(true);
  });

  test('no matching rule returns false', async () => {
    const ublockRules = rulesFromText('||ads.google.com^');
    const result = await isUrlBlocked('https://example.com', ublockRules);
    expect(result).toBe(false);
  });
});
