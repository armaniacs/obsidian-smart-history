# APIリファレンス

## 概要

uBlock Origin形式インポート機能のAPI一覧です。

---

## ublockParser.js

### parseUblockFilterLine

```javascript
/**
 * 単行のuBlockフィルターをパース
 * @param {string} line - 1行のフィルタールール
 * @returns {UblockRule|null} - パース結果またはnull（無効行）
 */
export function parseUblockFilterLine(line)
```

| 入力 | 型 | 説明 |
|------|-----|------|
| `line` | `string` | 1行のフィルタールール |
| 出力 | 型 | 説明 |
| `return` | `UblockRule\|null` | パース結果。無効行の場合はnull |

**例**:
```javascript
parseUblockFilterLine('||example.com^');
// → { id: '...', rawLine: '||example.com^', type: 'block', domain: 'example.com', ... }

parseUblockFilterLine('! Comment');
// → null

parseUblockFilterLine('@@||trusted.com^');
// → { id: '...', rawLine: '@@||trusted.com^', type: 'exception', domain: 'trusted.com', ... }
```

---

### parseUblockFilterList

```javascript
/**
 * 複数行のuBlockフィルターを一括パース
 * @param {string} text - 複数行のフィルターテキスト
 * @returns {UblockRules} - パース結果
 */
export function parseUblockFilterList(text)
```

| 入力 | 型 | 説明 |
|------|-----|------|
| `text` | `string` | 複数行のフィルターテキスト（改行区切り） |
| 出力 | 型 | 説明 |
| `return` | `UblockRules` | blockRules, exceptionRules, metadata を含む |

**例**:
```javascript
parseUblockFilterList('||example.com^\n@@||trusted.com^\n! Comment');
// → {
//     blockRules: [{ ... }],
//     exceptionRules: [{ ... }],
//     metadata: { source: 'paste', importedAt: ..., lineCount: 3, ruleCount: 2 }
//   }
```

---

### parseUblockFilterListWithErrors

```javascript
/**
 * エラー情報を含むパース
 * @param {string} text - 複数行のフィルターテキスト
 * @returns {ParseResult} - パース結果とエラー情報
 */
export function parseUblockFilterListWithErrors(text)
```

| 入力 | 型 | 説明 |
|------|-----|------|
| `text` | `string` | 複数行のフィルターテキスト |
| 出力 | 型 | 説明 |
| `return` | `ParseResult` | rules と errors を含む |

**例**:
```javascript
parseUblockFilterListWithErrors('||example.com^\ninvalid\n! Comment');
// → {
//     rules: { blockRules: [...], exceptionRules: [], metadata: {...} },
//     errors: [
//       { lineNumber: 2, line: 'invalid', message: 'Missing prefix ||', code: 'MISSING_PREFIX' }
//     ]
//   }
```

---

### isCommentLine

```javascript
/**
 * コメント行か判定
 * @param {string} line - 行テキスト
 * @returns {boolean}
 */
export function isCommentLine(line)
```

| 入力 | 型 | 説明 |
|------|-----|------|
| `line` | `string` | 行テキスト |
| 出力 | 型 | 説明 |
| `return` | `boolean` | コメント行なら true |

**例**:
```javascript
isCommentLine('! Comment');
// → true

isCommentLine('||example.com^');
// → false
```

---

### isEmptyLine

```javascript
/**
 * 空行か判定
 * @param {string} line - 行テキスト
 * @returns {boolean}
 */
export function isEmptyLine(line)
```

| 入力 | 型 | 説明 |
|------|-----|------|
| `line` | `string` | 行テキスト |
| 出力 | 型 | 説明 |
| `return` | `boolean` | 空行なら true |

**例**:
```javascript
isEmptyLine('');
// → true

isEmptyLine('   ');
// → true

isEmptyLine('||example.com^');
// → false
```

---

### isValidRulePattern

```javascript
/**
 * 有効なルールパターンか判定
 * @param {string} line - 行テキスト
 * @returns {boolean}
 */
export function isValidRulePattern(line)
```

| 入力 | 型 | 説明 |
|------|-----|------|
| `line` | `string` | 行テキスト |
| 出力 | 型 | 説明 |
| `return` | `boolean` | 有効なパターンなら true |

**例**:
```javascript
isValidRulePattern('||example.com^');
// → true

isValidRulePattern('||example.com');
// → false (^がない)

isValidRulePattern('example.com^');
// → false (||がない)
```

---

### parseOptions

```javascript
/**
 * オプション文字列をパース
 * @param {string} optionsString - $の後のオプション文字列
 * @returns {UblockRuleOptions} - パースされたオプション
 */
export function parseOptions(optionsString)
```

| 入力 | 型 | 説明 |
|------|-----|------|
| `optionsString` | `string` | `domain=example.com,3p` などの文字列 |
| 出力 | 型 | 説明 |
| `return` | `UblockRuleOptions` | { domains, thirdParty, firstParty, important } |

**例**:
```javascript
parseOptions('domain=example.com|test.com,3p');
// → { domains: ['example.com', 'test.com'], thirdParty: true }

parseOptions('important');
// → { important: true }

parseOptions('');
// → {}
```

---

## ublockMatcher.js

### isUrlBlocked

```javascript
/**
 * uBlockルールに基づきURLがブロック済みか判定
 * @param {string} url - チェック対象URL
 * @param {UblockRules} ublockRules - uBlockルールセット
 * @param {UblockMatcherContext} [context={}] - 文脈情報
 * @returns {boolean} - ブロック済み: true
 */
export function isUrlBlocked(url, ublockRules, context = {})
```

| 入力 | 型 | 説明 |
|------|-----|------|
| `url` | `string` | チェック対象URL |
| `ublockRules` | `UblockRules` | uBlockルールセット |
| `context` | `UblockMatcherContext` | 文脈情報（オプション） |
| 出力 | 型 | 説明 |
| `return` | `boolean` | ブロック済みなら true |

**例**:
```javascript
const rules = { blockRules: [{ domain: 'ads.com', pattern: '^ads\\.com$', type: 'block', options: {} }], exceptionRules: [], metadata: {...} };

isUrlBlocked('https://ads.com/', rules);
// → true

isUrlBlocked('https://example.com/', rules);
// → false
```

---

### matchesPattern

```javascript
/**
 * URLがパターンに一致するか
 * @param {string} url - チェック対象URL
 * @param {string} pattern - ドメインパターン（正規表現）}
 * @returns {boolean}
 */
export function matchesPattern(url, pattern)
```

| 入力 | 型 | 説明 |
|------|-----|------|
| `url` | `string` | チェック対象URL |
| `pattern` | `string` | 正規表現パターン |
| 出力 | 型 | 説明 |
| `return` | `boolean` | 一致すれば true |

**例**:
```javascript
matchesPattern('https://example.com/', '^example\\.com$');
// → true

matchesPattern('https://sub.example.com/', '^(.+\.)?example\\.com$');
// → true

matchesPattern('https://other.com/', '^example\\.com$');
// → false
```

---

### matchesWithOptions

```javascript
/**
 * ルールのオプションに基づきマッチング判定
 * @param {string} url - チェック対象URL
 * @param {UblockRule} rule - ルール
 * @param {UblockMatcherContext} context - 文脈情報
 * @returns {boolean} - オプションを満たせば true
 */
export function matchesWithOptions(url, rule, context)
```

| 入力 | 型 | 説明 |
|------|-----|------|
| `url` | `string` | チェック対象URL |
| `rule` | `UblockRule` | ルール |
| `context` | `UblockMatcherContext` | 文脈情報 |
| 出力 | 型 | 説明 |
| `return` | `boolean` | オプション条件を満たせば true |

**例**:
```javascript
const rule = { domain: 'tracker.com', options: { thirdParty: true } };
const context = { currentDomain: 'example.com', isThirdParty: true };

matchesWithOptions('https://tracker.com/', rule, context);
// → true

const context2 = { currentDomain: 'example.com', isThirdParty: false };
matchesWithOptions('https://tracker.com/', rule, context2);
// → false
```

---

## domainUtils.js (拡張)

### isDomainAllowed (拡張版)

```javascript
/**
 * uBlock形式を含むドメイン許可判定
 * @param {string} url - チェック対象URL
 * @param {UblockRules} [ublockRules] - uBlockルールセット（オプション）
 * @returns {Promise<boolean>} - 許可: true
 */
export async function isDomainAllowed(url, ublockRules)
```

| 入力 | 型 | 説明 |
|------|-----|------|
| `url` | `string` | チェック対象URL |
| `ublockRules` | `UblockRules\|undefined` | uBlockルールセット |
| 出力 | 型 | 説明 |
| `return` | `Promise<boolean>` | 許可なら true |

**例**:
```javascript
// 既存のsimple形式チェック
await isDomainAllowed('https://example.com/');
// → true/false (既存ロジックに基づく)

// uBlock形式を併用
const rules = { ... }; // uBlockルール
await isDomainAllowed('https://ads.com/', rules);
// → false (uBlockルールによりブロック)
```

---

## ublockImport.js

### init

```javascript
/**
 * uBlockインポートUIを初期化
 */
export function init()
```

なし

---

### toggleFormatUI

```javascript
/**
 * フォーマットUIの切替
 * simple形式とuBlock形式のUIを切り替える
 */
export function toggleFormatUI()
```

なし

---

### handleTextInputPreview

```javascript
/**
 * テキスト入力プレビュー処理
 */
export function handleTextInputPreview()
```

なし

---

### previewUblockFilter

```javascript
/**
 * uBlockフィルターのプレビュー
 * @param {string} text - フィルターテキスト
 * @returns {PreviewInfo} プレビュー情報
 */
export function previewUblockFilter(text)
```

| 入力 | 型 | 説明 |
|------|-----|------|
| `text` | `string` | フィルターテキスト |
| 出力 | 型 | 説明 |
| `return` | `PreviewInfo` | { blockCount, exceptionCount, errorCount, ... } |

**例**:
```javascript
previewUblockFilter('||example.com^\n@@||trusted.com^\n! Comment');
// → {
//     blockCount: 1,
//     exceptionCount: 1,
//     errorCount: 0,
//     errorDetails: [],
//     validCount: 2,
//     totalLines: 3
//   }
```

---

### saveUblockSettings

```javascript
/**
 * uBlock設定の保存
 * @returns {Promise<void>}
 */
export async function saveUblockSettings()
```

なし

---

### readFile

```javascript
/**
 * ファイル読み込み
 * @param {File} file - ファイルオブジェクト
 * @returns {Promise<string>} ファイル内容
 */
export function readFile(file)
```

| 入力 | 型 | 説明 |
|------|-----|------|
| `file` | `File` | ファイルオブジェクト |
| 出力 | 型 | 説明 |
| `return` | `Promise<string>` | ファイル内容 |

---

### setupDragAndDrop

```javascript
/**
 * ドラッグ&ドロップの設定
 */
export function setupDragAndDrop()
```

なし

---

## ublockExport.js

### exportToText

```javascript
/**
 * uBlockルールをテキスト形式でエクスポート
 * @param {UblockRules} rules - ルールセット
 * @returns {string} uBlock形式テキスト
 */
export function exportToText(rules)
```

| 入力 | 型 | 説明 |
|------|-----|------|
| `rules` | `UblockRules` | ルールセット |
| 出力 | 型 | 説明 |
| `return` | `string` | uBlock形式テキスト |

**例**:
```javascript
const rules = {
  blockRules: [{ rawLine: '||example.com^', ... }],
  exceptionRules: [{ rawLine: '@@||trusted.com^', ... }],
  metadata: {...}
};

exportToText(rules);
// → "! Auto-exported from Obsidian Smart History\n! ...\n@@||trusted.com^\n||example.com^\n"
```

---

### downloadAsFile

```javascript
/**
 * uBlockルールを .txt ファイルとしてダウンロード
 * @param {UblockRules} rules - ルールセット
 * @param {string} [filename='ublock-filters.txt'] - ファイル名
 */
export function downloadAsFile(rules, filename)
```

| 入力 | 型 | 説明 |
|------|-----|------|
| `rules` | `UblockRules` | ルールセット |
| `filename` | `string` | ファイル名（オプション） |

なし

---

### copyToClipboard

```javascript
/**
 * uBlockルールをクリップボードにコピー
 * @param {UblockRules} rules - ルールセット
 * @returns {Promise<boolean>} 成功: true
 */
export async function copyToClipboard(rules)
```

| 入力 | 型 | 説明 |
|------|-----|------|
| `rules` | `UblockRules` | ルールセット |
| 出力 | 型 | 説明 |
| `return` | `Promise<boolean>` | 成功なら true |

---

## storage.js (拡張)

### 新規追加 StorageKeys

```javascript
StorageKeys.UBLOCK_RULES = 'ublock_rules';
StorageKeys.UBLOCK_FORMAT_ENABLED = 'ublock_format_enabled';
```

### 新規追加 DEFAULT_SETTINGS

```javascript
[StorageKeys.UBLOCK_RULES] = {
  blockRules: [],
  exceptionRules: [],
  metadata: {
    source: 'none',
    importedAt: 0,
    lineCount: 0,
    ruleCount: 0
  }
},
[StorageKeys.UBLOCK_FORMAT_ENABLED] = false
```

---

## 定数定義

### エラーコード

```javascript
const PARSE_ERROR_CODES = {
  MISSING_PREFIX: 'MISSING_PREFIX',      // || がない
  MISSING_SUFFIX: 'MISSING_SUFFIX',      // ^ がない
  INVALID_DOMAIN: 'INVALID_DOMAIN',      // ドメイン形式が無効
  INVALID_OPTION: 'INVALID_OPTION'       // オプションが無効
};
```

### ファイル拡張子

```javascript
const ALLOWED_FILE_EXTENSIONS = ['.txt'];
```

### 最大行数

```javascript
const MAX_FILTER_LINES = 10000;  // パース・保存の上限
```

---

## 実装状況

2026年1月時点で、上記すべてのAPIが実装されています。

- ✅ ublockParser.js
- ✅ ublockMatcher.js
- ✅ domainUtils.js (拡張)
- ✅ ublockImport.js
- ✅ ublockExport.js
- ✅ storage.js (拡張)
- ✅ 定数定義