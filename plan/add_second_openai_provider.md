# Add Second OpenAI Compatible Provider Plan

## Goal
Allow users to configure a secondary OpenAI compatible provider (e.g. one for Groq, one for LocalHost).

## Proposed Changes

### 1. Storage (`src/utils/storage.js`)
Add new keys:
*   `OPENAI_2_BASE_URL`: Default `http://127.0.0.1:11434/v1` (Common for Ollama).
*   `OPENAI_2_API_KEY`: No default.
*   `OPENAI_2_MODEL`: Default `llama3`.

### 2. UI (`src/popup/`)
*   **Popup HTML**:
    *   Add "OpenAI Compatible 2" option to `aiProvider` select.
    *   Duplicate the OpenAI settings div (e.g., `openai2Settings` div) with unique IDs (`openai2BaseUrl`, etc.).
*   **Popup JS**:
    *   Update `load()` and `saveSettings()` to handle new keys.
    *   Update `updateVisibility()` to show `openai2Settings` when selected.

### 3. Backend (`src/background/aiClient.js`)
*   Update `generateSummary` to handle provider `'openai2'`.
*   It should reuse `generateOpenAISummary` method but pass the `_2` settings.

## Verification
*   Manual test:
    *   Set Provider 1 to Groq.
    *   Set Provider 2 to something else (e.g. mocked URL or just different model).
    *   Switch between them and verify the correct endpoint/credential is used in logs.
