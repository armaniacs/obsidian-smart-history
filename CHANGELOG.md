# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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

## [Commit c016a91] - Initial Import
Original idea and codebase was introduced in this article: https://note.com/izuru_tcnkc/n/nd0a758483901
### Released
- Initial version of Obsidian Smart History.
- **Features**:
    - Automatic browsing history tracking locally.
    - Smart detection of "read" pages based on duration (5s) and scroll depth (50%).
    - AI Summarization using Google Gemini API.
    - Automatic saving to Obsidian Daily Notes via Local REST API.
