# Add Second OpenAI Compatible Provider Plan

## 実装ステータス

| タスク | ステータス | 実装ファイル |
|------|-----------|-------------|
| 🔧 Storage 設定追加 | ✅ 完了 | `src/utils/storage.js` |
| 🔧 Popup HTML 更新 | ✅ 完了 | `src/popup/popup.html` |
| 🔧 Popup JS 更新 | ✅ 完了 | `src/popup/popup.js` |
| 🔧 Backend 更新 | ✅ 完了 | `src/background/aiClient.js` |

**全体進捗**: ✅ 完了

---

## Goal
Allow users to configure a secondary OpenAI compatible provider (e.g. one for Groq, one for LocalHost).

## Proposed Changes

### 1. Storage (`src/utils/storage.js`)
**✅ 完了**

Add new keys:
*   `OPENAI_2_BASE_URL`: Default `http://127.0.0.1:11434/v1` (Common for Ollama).
*   `OPENAI_2_API_KEY`: No default.
*   `OPENAI_2_MODEL`: Default `llama3`.

### 2. UI (`src/popup/`)
**✅ 完了**

*   **Popup HTML**:
    *   Add "OpenAI Compatible 2" option to `aiProvider` select.
    *   Duplicate the OpenAI settings div (e.g., `openai2Settings` div) with unique IDs (`openai2BaseUrl`, etc.).
*   **Popup JS**:
    *   Update `load()` and `saveSettings()` to handle new keys.
    *   Update `updateVisibility()` to show `openai2Settings` when selected.

### 3. Backend (`src/background/aiClient.js`)
**✅ 完了**

*   Update `generateSummary` to handle provider `'openai2'`.
*   It should reuse `generateOpenAISummary` method but pass the `_2` settings.

## Verification
**✅ 完了**

*   Manual test:
    *   Set Provider 1 to Groq.
    *   Set Provider 2 to something else (e.g. mocked URL or just different model).
    *   Switch between them and verify the correct endpoint/credential is used in logs.
