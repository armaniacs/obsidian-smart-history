# Refactoring Plan: Unify AI Clients

Refactor the AI interaction layer to centralize logic within `AIClient`. This reduces complexity in the `service-worker.js` and provides a single entry point for all AI operations (Local and Cloud).

## User Review Required

> [!NOTE]
> This refactoring changes the internal structure of how AI clients are instantiated and used. No external behavior changes are expected, but verification of both Local and Cloud summarization is required.

## Proposed Changes

### Background
#### [MODIFY] [aiClient.js](file:///Users/yaar/Playground/obsidian-smart-history/src/background/aiClient.js)
- Import `LocalAIClient`.
- Instantiate `LocalAIClient` internally.
- Add methods to expose Local AI capabilities:
    - `summarizeLocally(content)`
    - `getLocalAvailability()`
- Update `generateSummary` to potentially support a 'local' provider or just remain as the "Cloud" summarizer.

#### [MODIFY] [service-worker.js](file:///Users/yaar/Playground/obsidian-smart-history/src/background/service-worker.js)
- Remove `LocalAIClient` import and instantiation.
- Update L1 pipeline to use `aiClient.summarizeLocally` and `aiClient.getLocalAvailability`.

## Verification Plan

### Manual Verification
1.  **Test Local AI (L1)**:
    - Enable "Local Only" mode or standard mode.
    - Verify that summarization works (if Chrome Built-in AI is available).
2.  **Test Cloud AI (L3)**:
    - process recording with Gemini/OpenAI.
    - Verify summary is generated.
3.  **Test Fallback**:
    - Disconnect network and check error handling.

### Automated Tests
- Run existing tests: `npm test`
- Note: Existing tests might need updates if they mock `LocalAIClient` or `AIClient`.
