# UF-501: uBlock + Simple Simultaneous Use - Comprehensive Test Plan

## Overview

This document provides a comprehensive test plan for the feature that allows simultaneous use of "Simple (1 line 1 domain)" and "uBlock Origin" filter formats via checkboxes in the settings UI.

## Feature Summary

- **Feature ID**: UF-501
- **Description**: Enable concurrent use of Simple and uBlock Origin filter formats
- **Components Modified**:
  - `src/popup/popup.html` - UI checkboxes
  - `src/popup/domainFilter.js` - UI logic
  - `src/popup/ublockImport.js` - uBlock import logic
  - `src/utils/domainUtils.js` - Filtering logic

## Test Categories

### 1. Unit Tests - UI Components

#### 1.1 domainFilter.js Tests

| Test ID | Test Case | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| UI-001 | Checkbox initialization | Verify checkboxes are initialized with correct default values | `simpleFormatEnabled` checked, `ublockFormatEnabled` unchecked |
| UI-002 | Checkbox state persistence | Verify checkbox states are saved and restored from storage | States persist across popup open/close |
| UI-003 | Simple UI visibility | Verify Simple UI shows/hides based on checkbox | Shows when checked, hides when unchecked |
| UI-004 | uBlock UI visibility | Verify uBlock UI shows/hides based on checkbox | Shows when checked, hides when unchecked |
| UI-005 | Both UIs visible simultaneously | Verify both UIs can be visible at the same time | Both visible when both checkboxes checked |
| UI-006 | Both UIs hidden | Verify both UIs can be hidden | Both hidden when both checkboxes unchecked |
| UI-007 | Save with Simple only | Verify saving with only Simple enabled | Simple settings saved, uBlock disabled |
| UI-008 | Save with uBlock only | Verify saving with only uBlock enabled | uBlock settings saved, Simple disabled |
| UI-009 | Save with both enabled | Verify saving with both enabled | Both settings saved |
| UI-010 | Save with both disabled | Verify saving with both disabled | Both formats disabled |

#### 1.2 ublockImport.js Tests

| Test ID | Test Case | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| UI-011 | Text input preview | Verify preview updates on text input | Preview shows correct counts |
| UI-012 | File import | Verify file import works correctly | File content loaded into textarea |
| UI-013 | URL import | Verify URL import works correctly | URL content loaded into textarea |
| UI-014 | Drag and drop | Verify drag and drop works correctly | File content loaded into textarea |
| UI-015 | Save with errors | Verify save fails with errors | Error message shown, not saved |
| UI-016 | Save with no rules | Verify save fails with no rules | Error message shown, not saved |
| UI-017 | Save with valid rules | Verify save succeeds with valid rules | Success message shown, rules saved |

### 2. Unit Tests - Logic Components

#### 2.1 domainUtils.js Tests

| Test ID | Test Case | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| LOG-001 | Disabled mode - all allowed | Verify all URLs allowed when filter disabled | Returns `true` for any URL |
| LOG-002 | Simple whitelist - allowed domain | Verify whitelisted domain is allowed | Returns `true` |
| LOG-003 | Simple whitelist - blocked domain | Verify non-whitelisted domain is blocked | Returns `false` |
| LOG-004 | Simple blacklist - blocked domain | Verify blacklisted domain is blocked | Returns `false` |
| LOG-005 | Simple blacklist - allowed domain | Verify non-blacklisted domain is allowed | Returns `true` |
| LOG-006 | uBlock block rule - blocked | Verify uBlock block rule blocks URL | Returns `false` |
| LOG-007 | uBlock exception rule - allowed | Verify uBlock exception rule allows URL | Returns `true` |
| LOG-008 | Both enabled - Simple blocks | Verify Simple blocks when both enabled | Returns `false` |
| LOG-009 | Both enabled - uBlock blocks | Verify uBlock blocks when both enabled | Returns `false` |
| LOG-010 | Both enabled - both block | Verify both block when both enabled | Returns `false` |
| LOG-011 | Both enabled - both allow | Verify both allow when both enabled | Returns `true` |
| LOG-012 | Simple only - uBlock ignored | Verify uBlock ignored when Simple only | uBlock rules not evaluated |
| LOG-013 | uBlock only - Simple ignored | Verify Simple ignored when uBlock only | Simple rules not evaluated |
| LOG-014 | Invalid URL - blocked | Verify invalid URL is blocked | Returns `false` |
| LOG-015 | Empty rules - all allowed | Verify empty rules allow all | Returns `true` |
| LOG-016 | Wildcard in Simple list | Verify wildcard patterns work | Matches subdomains correctly |
| LOG-017 | uBlock with options | Verify uBlock options work | Options evaluated correctly |
| LOG-018 | uBlock exception overrides block | Verify exception overrides block | Returns `true` |

### 3. Integration Tests

| Test ID | Test Case | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| INT-001 | End-to-end - Simple blacklist | Add domain to Simple blacklist, save, navigate | Domain blocked |
| INT-002 | End-to-end - uBlock block | Add uBlock rule, save, navigate | URL blocked |
| INT-003 | End-to-end - Both enabled | Add rules to both, save, navigate | Both rules applied |
| INT-004 | End-to-end - Toggle Simple | Enable Simple, save, disable, save | Simple rules no longer applied |
| INT-005 | End-to-end - Toggle uBlock | Enable uBlock, save, disable, save | uBlock rules no longer applied |
| INT-006 | End-to-end - Complex scenario | Multiple rules in both formats | All rules evaluated correctly |
| INT-007 | Storage persistence | Save settings, reload extension | Settings persist |
| INT-008 | Cross-tab consistency | Open popup in multiple tabs | Settings consistent |

### 4. Edge Case Tests

| Test ID | Test Case | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| EDGE-001 | Empty Simple list | Empty Simple list with uBlock enabled | uBlock rules evaluated |
| EDGE-002 | Empty uBlock rules | Empty uBlock rules with Simple enabled | Simple rules evaluated |
| EDGE-003 | Both empty | Both lists empty | All URLs allowed |
| EDGE-004 | Invalid Simple domain | Invalid domain in Simple list | Validation error, not saved |
| EDGE-005 | Invalid uBlock rule | Invalid uBlock rule | Validation error, not saved |
| EDGE-006 | Very large Simple list | 1000+ domains in Simple list | Performance acceptable |
| EDGE-007 | Very large uBlock list | 1000+ uBlock rules | Performance acceptable |
| EDGE-008 | Special characters in domain | Domain with special characters | Validation error |
| EDGE-009 | Unicode in domain | Unicode domain name | Handled correctly |
| EDGE-010 | Mixed case domains | Domains with mixed case | Case-insensitive matching |
| EDGE-011 | URL with port | URL with port number | Handled correctly |
| EDGE-012 | URL with path | URL with long path | Handled correctly |
| EDGE-013 | URL with query | URL with query parameters | Handled correctly |
| EDGE-014 | URL with fragment | URL with fragment | Handled correctly |
| EDGE-015 | HTTPS vs HTTP | Same domain, different protocol | Treated as same domain |

### 5. Security Tests

| Test ID | Test Case | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| SEC-001 | XSS in domain | Script tag in domain | Validation error |
| SEC-002 | SQL injection in domain | SQL pattern in domain | Validation error |
| SEC-003 | Path traversal in domain | Path traversal pattern | Validation error |
| SEC-004 | Command injection in domain | Command pattern | Validation error |
| SEC-005 | Malformed uBlock rule | Malformed rule syntax | Validation error |
| SEC-006 | uBlock rule with script | Script in uBlock rule | Validation error |
| SEC-007 | Very long domain | Domain exceeding max length | Validation error |

### 6. Performance Tests

| Test ID | Test Case | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| PERF-001 | Large Simple list lookup | 1000 domains in Simple list | Lookup < 10ms |
| PERF-002 | Large uBlock list lookup | 1000 uBlock rules | Lookup < 50ms |
| PERF-003 | Both large lists | 1000 domains in each | Lookup < 100ms |
| PERF-004 | Popup load time | Popup with large lists | Load < 500ms |
| PERF-005 | Save time | Saving large lists | Save < 1000ms |

### 7. Manual Verification Tests

| Test ID | Test Case | Description | Expected Result |
|---------|-----------|-------------|-----------------|
| MAN-001 | Checkbox visibility | Verify checkboxes are visible | Checkboxes present |
| MAN-002 | Simple UI appears | Check Simple checkbox | Simple UI appears |
| MAN-003 | uBlock UI appears | Check uBlock checkbox | uBlock UI appears |
| MAN-004 | Both UIs visible | Check both checkboxes | Both UIs visible |
| MAN-005 | Add to Simple blacklist | Add domain-a.com to Simple blacklist | Domain added |
| MAN-006 | Add to uBlock rules | Add ||domain-b.com^ to uBlock | Rule added |
| MAN-007 | Save settings | Click save button | Settings saved |
| MAN-008 | Navigate to blocked-simple | Navigate to domain-a.com | Page blocked |
| MAN-009 | Navigate to blocked-ublock | Navigate to domain-b.com | Page blocked |
| MAN-010 | Uncheck Simple | Uncheck Simple checkbox | Simple UI hidden |
| MAN-011 | Save after uncheck | Click save button | Settings saved |
| MAN-012 | Navigate to allowed-simple | Navigate to domain-a.com | Page allowed |
| MAN-013 | Navigate to blocked-ublock | Navigate to domain-b.com | Page still blocked |

## Test Implementation Priority

### Phase 1: Critical Tests (Must Have)
- LOG-001 to LOG-018: Core logic tests
- UI-001 to UI-010: UI component tests
- INT-001 to INT-003: Basic integration tests

### Phase 2: Important Tests (Should Have)
- UI-011 to UI-017: uBlock import tests
- INT-004 to INT-008: Advanced integration tests
- EDGE-001 to EDGE-006: Common edge cases

### Phase 3: Nice to Have Tests
- EDGE-007 to EDGE-015: Rare edge cases
- SEC-001 to SEC-007: Security tests
- PERF-001 to PERF-005: Performance tests
- MAN-001 to MAN-013: Manual verification

## Test Files to Create/Update

### New Test Files
1. `src/popup/__tests__/domainFilter.test.js` - UI component tests
2. `src/popup/__tests__/ublockImport.test.js` - uBlock import tests

### Updated Test Files
1. `src/utils/__tests__/domainUtils.test.js` - Add new logic tests

## Test Data

### Sample Test Data

#### Simple Format Test Data
```
example.com
*.test.com
blocked-domain.com
allowed-domain.com
*.sub.example.com
```

#### uBlock Format Test Data
```
||blocked.com^
@@||allowed.com^
||*.ads.net^$3p
||tracking.example.com^$domain=example.com
! This is a comment
```

## Test Execution

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test src/utils/__tests__/domainUtils.test.js
npm test src/popup/__tests__/domainFilter.test.js
npm test src/popup/__tests__/ublockImport.test.js

# Run with coverage
npm test -- --coverage
```

### Manual Testing Checklist
1. Open Chrome extension settings
2. Navigate to Domain Filter tab
3. Verify checkboxes are present
4. Test each checkbox independently
5. Test both checkboxes together
6. Add test domains/rules
7. Save settings
8. Navigate to test URLs
9. Verify blocking behavior
10. Toggle checkboxes and retest

## Success Criteria

- All Phase 1 tests pass
- 90%+ code coverage for modified files
- All manual verification tests pass
- No critical bugs found
- Performance within acceptable limits
- Security vulnerabilities addressed

## Notes

- Tests should be written following Jest conventions
- Mock Chrome APIs appropriately
- Use descriptive test names
- Include comments explaining test purpose
- Update this document as tests are implemented