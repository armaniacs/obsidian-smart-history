# Allow Simultaneous Use of Simple and uBlock Filters

Enable concurrent use of "Simple (1 line 1 domain)" and "uBlock Origin" filter formats via checkboxes in the settings UI.

## Proposed Changes

### [Component: Popup UI]

- #### [MODIFY] [popup.html](file:///Users/yaar/Playground/obsidian-smart-history/src/popup/popup.html)
    - Replace the `<select id="filterFormat">` with two checkboxes: `simpleFormatEnabled` and `ublockFormatEnabled`.
    - Adjust labels and help text for better clarity.

- #### [MODIFY] [domainFilter.js](file:///Users/yaar/Playground/obsidian-smart-history/src/popup/domainFilter.js)
    - Update `init()` to handle the new checkboxes.
    - Update `loadDomainSettings()` to restore both enablement states from storage.
    - Update visibility logic to show/hide the Simple and uBlock sections independently based on their respective checkboxes.
    - Update `handleSaveDomainSettings()` to save settings for all enabled formats.

- #### [MODIFY] [ublockImport.js](file:///Users/yaar/Playground/obsidian-smart-history/src/popup/ublockImport.js)
    - Update `setupFormatToggle` and `toggleFormatUI` to work with the new checkbox-based UI.

### [Component: Logic]

- #### [MODIFY] [domainUtils.js](file:///Users/yaar/Playground/obsidian-smart-history/src/utils/domainUtils.js)
    - Update `isDomainAllowed` to concurrently check both Simple filters (whitelist/blacklist) and uBlock rules if they are enabled.

## Verification Plan

### Automated Tests
- Run existing tests: `npm test src/utils/__tests__/domainUtils.test.js`
- Add new test cases to `domainUtils.test.js` to verify simultaneous filtering logic.

### Manual Verification
1.  Open the extension settings.
2.  Switch to the "Domain Filter" tab.
3.  Verify that checkboxes for "Simple" and "uBlock Origin" are present.
4.  Check "Simple" -> the Simple list UI appears.
5.  Check "uBlock" -> the uBlock import UI appears.
6.  Verify that both UIs can be visible at the same time.
7.  Add `domain-a.com` to the Simple Blacklist.
8.  Add `||domain-b.com^` to uBlock rules.
9.  Save settings.
10. Navigate to `domain-a.com` and verify it's blocked.
11. Navigate to `domain-b.com` and verify it's blocked.
12. Uncheck "Simple", save, and verify `domain-a.com` is now allowed but `domain-b.com` is still blocked.
