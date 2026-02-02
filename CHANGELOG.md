# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [2.2.4] - 2026-02-03
### Fixed
- **Jest ESM設定修正**: babel-jestバージョン不整合(v30→v29)の解消、`--experimental-vm-modules`とbabel-jest変換の競合を修正
- **テスト基盤改善**: jest.config.jsをCJS形式に変更し、jest.setup.jsをsetupFilesAfterEnvに正しく登録
- **DOMモック強化**: jest.setup.jsにquerySelector/querySelectorAllを追加、domainFilter.js用DOM要素のキャッシュ付きモックを導入
- **domainFilter.test.js全面書き直し**: jest.mockによる正しい依存モック、fakeTimersによるタイマー処理で全12テストがパス

## [2.2.3] - 2026-02-01
### Added
- **Enhanced Logging**: Unified logging system with `addLog` function for consistent error/warning reporting across all modules.
- **Local AI Client Improvements**: Added better error handling and availability checking for local AI models.
- **Settings Management Refactor**: Centralized settings mapping and extraction in popup UI for better maintainability.
- **uBlock Filter Enhancements**: Added reload functionality for filter sources with validation and status updates.

### Changed
- **Improved Error Handling**: Replaced console.log/error/warn statements with structured logging throughout the codebase.
- **Optimized uBlock Matcher**: Refactored rule indexing and matching for better performance with wildcard domains.
- **Storage Utilities**: Added functions for managing saved URLs to prevent duplicates.

### Fixed
- **uBlock Filter Format Compatibility**: Fixed undefined length error when using lightweight uBlock filter format.
- **Content-Type Validation**: Added warning for non-text/plain content types when importing uBlock filters.
- **Crypto API Fallback**: Added fallback for environments where `crypto.randomUUID` is not available.

## [2.2.2] - 2026-01-30
### Added
- **Filter Source Reload**: Added a "Reload" (再読込) button to registered uBlock filter sources, allowing users to refresh rules from the original URL.
  - Updates timestamp and rule count upon successful reload.
  - Validates filter content before updating.

## [2.2.1] - 2026-01-29
### Added
- **uBlock Origin Filter Support**: Advanced domain filtering using uBlock Origin-style syntax.
  - Integrated `ublockParser.js` and `ublockMatcher.js` for rule parsing and matching.
  - Extended `domainUtils.js` to support combined whitelist/blacklist with uBlock rules.
  - Comprehensive test coverage for new functionality.

### Fixed
- **uBlock Filter Format Compatibility**: Fixed "Cannot read properties of undefined (reading 'length')" error when using the lightweight uBlock filter format (`blockDomains`/`exceptionDomains`).
  - Added `hasUblockRules()` helper function in `domainUtils.js` to safely check for rules in both old and new formats.

## [2.2.0] - 2025-01-xx
### Added
- **Masked Information Visualization**: Enhanced PII masking display in preview modal.
  - Shows count of masked items (e.g., "3件の個人情報をマスクしました")
  - Highlighted masked content with tooltip showing PII type (email, phone, creditCard, etc.)
  - Dynamic status message element creation and insertion
- **Loading Spinner**: Visual feedback indicator during recording process.
  - SVG-based spinner with smooth CSS animation
  - Configurable status text (default: "処理中...")
  - Proper show/hide behavior for success and error states
- **Auto-Close Popup**: Automatic popup closure 2 seconds after successful recording.
  - Only closes on main screen (preserves settings screen navigation)
  - Cancelled on error or screen transition
  - Countdown display for user feedback
- **Test Suite Improvements**: Added comprehensive test coverage for new features.
  - Masked information visualization tests (13 test cases)
  - Loading spinner tests (8 test cases)
  - Auto-close timer tests (9 test cases)
  - All tests passing (61/61)

### Changed
- **Refactoring**: Improved `sanitizePreview.js` with constant definitions, helper functions, and JSDoc documentation.
- **Jest Setup**: Enhanced DOM mocking for better test isolation (added loadingSpinner mock).

### Documentation
- **Plan Updates**: Updated plan/TODO.md to reflect current implementation status.
  - Clarified keyboard shortcut feature status (documentation exists but not implemented)
  - Marked UF-405, UF-406, UF-407 as "not implemented"

## [2.1.1] - 2026-01-22
### Changed
- **Refactoring**: Internal code refactoring for improved maintainability.

## [2.1.0] - 2026-01-21
### Added
- **Privacy Protection Suite**: Introduced comprehensive privacy controls with 4 operation modes.
    - **Mode A: Local Only**: Process entirely locally (Experimental, requires browser support).
    - **Mode B: Full Pipeline**: Local summary + Cloud refinement (Experimental).
    - **Mode C: Masked Cloud**: Masks PII (Credit Cards, Phone Numbers, etc.) before sending to Cloud AI (Recommended).
    - **Mode D: Cloud Only**: Legacy behavior.
- **Confirmation UI**: New modal to preview, edit, and confirm content before saving to Obsidian.
    - Conditional display in Mode C (shows only when PII is detected/masked).
- **PII Sanitization**: Regex-based masking for sensitive information.
- **Sanitization Logs**: Local logging system to track masking events (7-day retention).
- **Settings UI**: Reorganized settings into tabs (General, Domain Filter, Privacy).

### Fixed
- **Force Recording**: Fixed a bug where force-recording a blocked domain would fail or loop.


## [2.0.2] - 2026-01-17
### Fixed
- **Error Popup Removal**: Removed unnecessary error popup when a domain is not allowed to be recorded. Errors are now only logged to the console.
- **Improved Error Handling**: Enhanced error messages in the popup for connection issues, providing clearer guidance to users (e.g., "Please reload the page and try again").
- **Service Worker Connection**: Improved handling of "Receiving end does not exist" errors that occur when the service worker is not ready yet.

## [2.0.1] - 2026-01-17
### Added
- **Force Record**: Added a feature to allow users to force record pages even if they are on the blacklist.


## [2.0.0] - 2026-01-16
### Added
- **Domain Filter Feature**: Added whitelist/blacklist functionality to control which domains are recorded.
  - Three filter modes: Disabled (record all), Whitelist (record only specified domains), Blacklist (exclude specified domains)
  - Wildcard pattern support (e.g., `*.example.com`)
  - "Add Current Domain" button to easily add the domain of the currently open page
  - Automatic subdomain removal (www.example.com → example.com)
  - Default blacklist mode with common sites pre-configured
- **Manual Recording Feature**: Added "Record Now" button to manually record any page instantly without duplicate URL restrictions.
- **Improved UI**: Separated main screen and settings screen with hamburger menu navigation.
- **Main Screen Display**: Shows current page information (title, URL, favicon) in the main popup.
- **Navigation System**: Implemented screen switching between main and settings views.
- **LICENSE**: Added MIT License file (`LICENSE.md`).
- **Privacy Policy**: Updated `PRIVACY.md` to explicitly mention data usage with OpenAI-compatible APIs (user-specified endpoints).

### Changed
- **Popup Layout**: Redesigned popup to show main screen by default instead of direct settings access.
- **User Experience**: Enhanced workflow with manual recording option alongside automatic detection.

## [Commit 98a3686] - 2026-01-15
### Documentation
- Updated `README.md` to include a reference and credit to the original article/project.

## [Commit 35d09a5] - 2026-01-15
### Added
- **OpenAI Compatible API Support**: Added full support for OpenAI-compatible APIs (e.g., Groq, Ollama, LM Studio).
- **Dual Provider Configuration**: Implemented `OpenAI Compatible` and `OpenAI Compatible 2` settings, allowing users to switch between multiple providers (e.g., a fast cloud provider like Groq and a local private LLM) without re-entering keys.

### Changed
- **Unified AI Client**: Refactored `aiClient.js` to dynamically switch between Google Gemini and OpenAI-compatible providers based on user settings.
- **Settings UI**: Updated the popup UI to support provider selection and multiple API configurations.

## [1.0.0] - Initial Release
Original idea and codebase was introduced in this article: https://note.com/izuru_tcnkc/n/nd0a758483901
### Released
- Initial version of Obsidian Smart History.
- **Features**:
    - Automatic browsing history tracking locally.
    - Smart detection of "read" pages based on duration (5s) and scroll depth (50%).
    - AI Summarization using Google Gemini API.
    - Automatic saving to Obsidian Daily Notes via Local REST API.
