# OpenAI Compatible & Obsidian Path Configuration Plan

This plan outlines the changes required to support OpenAI compatible APIs (e.g., OpenAI, Local LLMs, etc.) and allow configuration of the Obsidian Daily Note path.

## 実装ステータス

| タスク | ステータス | 実装ファイル |
|------|-----------|-------------|
| 🔧 Storage & Configuration 設定 | ✅ 完了 | `src/utils/storage.js` |
| 🔧 AI Provider Selection UI | ✅ 完了 | `src/popup/popup.html` |
| 🔧 OpenAI Settings UI | ✅ 完了 | `src/popup/popup.html` |
| 🔧 Obsidian Daily Path UI | ✅ 完了 | `src/popup/popup.html` |
| 🔧 UI Logic (popup.js) | ✅ 完了 | `src/popup/popup.js` + domainFilter.js |
| 🔧 Unified AIClient | ✅ 完了 | `src/background/aiClient.js` |
| 🔧 Service Worker Integration | ✅ 完了 | `src/background/service-worker.js` |
| 🔧 ObsidianClient Path Support | ✅ 完了 | `src/background/obsidianClient.js` |

**全体進捗**: ✅ 完了

---

## 1. Goal
*   Allow users to configure an **OpenAI Compatible** endpoint (Base URL, API Key, Model).
*   Allow users to configure the **Obsidian Daily Note Path** (currently hardcoded/defaulted to `092.Daily`).
*   **Default Provider**: Set to **Groq** compatible endpoint.

## 2. Proposed Changes

### 2.1 Storage & Configuration (`src/utils/storage.js`)
**✅ 完了**

Add the following keys to `StorageKeys` and `DEFAULT_SETTINGS`:

*   `AI_PROVIDER`: `'openai'` (Default).
*   `OPENAI_BASE_URL`: Default `'https://api.groq.com/openai/v1'`.
*   `OPENAI_API_KEY`: No default.
*   `OPENAI_MODEL`: Default `'openai/gpt-oss-20b'`.
*   `OPENAI_2_BASE_URL`, `OPENAI_2_API_KEY`, `OPENAI_2_MODEL`: 追加実装済み（ローカルLLM等用）

*Note: `OBSIDIAN_DAILY_PATH` already exists in `storage.js`, so we just need to expose it.*

### 2.2 UI Changes (`src/popup/popup.html`, `src/popup/popup.js`)
**✅ 完了**

Update the Settings popup to include:

1.  **AI Provider Selection**: A dropdown to choose between "Google Gemini", "OpenAI Compatible", and "OpenAI Compatible 2".
2.  **OpenAI Settings** (visible only when OpenAI is selected):
    *   Base URL (defaulting to Groq URL)
    *   API Key
    *   Model Name (defaulting to Groq model)
3.  **Obsidian Settings**:
    *   Add an input field for **Daily Note Path** (e.g., `092.Daily`).
    *   Supports YYYY/MM/DD placeholders

### 2.3 Logic Refactoring (`src/background/`)
**✅ 完了**

#### Refactor `gemini.js` -> `aiClient.js`
Create a common interface or a unified client `AIClient` that handles both providers.

*   `generateSummary(content)`:
    *   Fetch settings.
    *   If `AI_PROVIDER` is 'gemini', use the existing Gemini logic.
    *   If `AI_PROVIDER` is 'openai' or 'openai2', call the OpenAI compatible endpoint (`POST /chat/completions`).

#### Update `service-worker.js`
*   Replace usage of `GeminiClient` with the new `AIClient`.

#### Update `obsidianClient.js`
*   Supports YYYY/MM/DD placeholders in Daily Note Path

## 3. Implementation Steps

1.  **Modify `storage.js`**: ✅ 完了 Add new keys for OpenAI settings with Groq defaults.
2.  **Update `popup.html`**: ✅ 完了 Add HTML for AI provider toggle, OpenAI fields, and Obsidian Path field.
3.  **Update `popup.js`**: ✅ 完了 Implement logic to save/load these new settings and toggle visibility of AI fields.
4.  **Create `src/background/openai.js` (or similar)**: ✅ 完了 Implement the OpenAI request logic (integrated into aiClient.js).
5.  **Refactor `service-worker.js`**: ✅ 完了 Integrate the OpenAI logic alongside Gemini.
6.  **Verify**:
    *   Test with default Groq settings (user needs to provide key). ✅ 完了
    *   Test changing Obsidian Daily Path. ✅ 完了

## 4. Verification

*   **Manual Testing**: ✅ 完了
    *   Check default values in Popup.
    *   Enter a Groq API Key.
    *   Trigger summary.
    *   Check logs.
