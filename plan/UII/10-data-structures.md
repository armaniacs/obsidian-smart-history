# データ構造詳細設計

## 概要

uBlock Origin形式インポート機能で使用するデータ構造を定義します。

---

## 型定義

### 1. UblockRule

単一のuBlockフィルタールールを表します。

```typescript
/**
 * 単一のuBlockフィルタールール
 */
interface UblockRule {
  /**
   * ルールの一意識別子
   *
   * rawLine の SHA-256ハッシュ（簡易版）を使用
   * 重複排除・変更検出に使用
   *
   * @example
   * "a1b2c3d4..."
   */
  id: string;

  /**
   * 元の入力行
   *
   * エクスポート時に使用するため保持
   *
   * @example
   * "||ads.google.com^$3p"
   */
  rawLine: string;

  /**
   * ルール種類
   *
   * - block: ドメインをブロック
   * - exception: ブロックの例外（許可）
   */
  type: 'block' | 'exception';

  /**
   * 対象ドメインパターン
   *
   * ワイルドカードを含む可能性があります
   *
   * @example
   * "example.com"           - 正確一致
   * "*.ads.net"             - ワイルドカード
   * "sub.example.com"       - サブドメイン
   */
  domain: string | null;

  /**
   * マッチング用パターン
   *
   * 内部処理用。正規表現への変換などを行う
   *
   * @example
   * "^(.+\.)?example\.com$"
   */
  pattern: string;

  /**
   * オプション情報
   *
   * `$domain=example.com` などのオプション
   */
  options: UblockRuleOptions;

  /**
   * 元テキスト内の行番号
   *
   * エラーハンドリング・デバッグ用
   */
  lineNumber?: number;
}
```

### 2. UblockRuleOptions

ルールに付与されるオプション情報です。

```typescript
/**
 * ルールオプション
 */
interface UblockRuleOptions {
  /**
   * サードパーティのみ適用
   *
   * `$3p` オプションで設定
   */
  thirdParty?: boolean;

  /**
   * ファーストパーティのみ適用
   *
   * `$1p` オプションで設定
   */
  firstParty?: boolean;

  /**
   * 重要フラグ（他ルールを上書き）
   *
   * `$important` オプションで設定
   */
  important?: boolean;

  /**
   * $domain= 指定ドメインリスト
   *
   * `|` 区切りの配列
   *
   * @example
   * `domain=example.com|test.com`
   * → `['example.com', 'test.com']`
   */
  domains?: string[];

  /**
   * $domain=~ 指定除外ドメインリスト
   *
   * `|` 区切りの配列
   *
   * @example
   * `domain=~trusted.com|safe.com`
   * → `['trusted.com', 'safe.com']`
   */
  negatedDomains?: string[];
}
```

### 3. UblockRules

uBlockルールセット全体を表します。

```typescript
/**
 * uBlockルールセット
 */
interface UblockRules {
  /**
   * ブロックルール配列
   *
   * ドメインをブロックするルール
   */
  blockRules: UblockRule[];

  /**
   * 例外ルール配列
   *
   * ブロックの例外として許可するルール
   */
  exceptionRules: UblockRule[];

  /**
   * メタデータ
   */
  metadata: UblockMetadata;
}
```

### 4. UblockMetadata

ルールセットのメタデータです。

```typescript
/**
 * メタデータ
 */
interface UblockMetadata {
  /**
   * データソース
   *
   * - paste: テキストエリアからの貼り付け
   * - file: ファイルからの読み込み
   * - url: URLからのフェッチ（将来的）
   * - none: 未入力
   */
  source: 'paste' | 'file' | 'url' | 'none';

  /**
   * インポート日時（UNIXタイムスタンプ）
   *
   * ミリ秒単位
   */
  importedAt: number;

  /**
   * 元データの行数
   *
   * コメント・空行を含む
   */
  lineCount: number;

  /**
   * 有効ルール数
   *
   * blockRules + exceptionRules
   */
  ruleCount: number;
}
```

### 5. ParseError

パース時のエラー情報です。

```typescript
/**
 * パースエラー情報
 */
interface ParseError {
  /**
   * 行番号（1始まり）
   */
  lineNumber: number;

  /**
   * エラー行の内容
   */
  line: string;

  /**
   * エラーメッセージ
   */
  message: string;

  /**
   * エラーコード
   *
   * - MISSING_PREFIX: || がない
   * - MISSING_SUFFIX: ^ がない
   * - INVALID_DOMAIN: ドメイン形式が無効
   * - INVALID_OPTION: オプションが無効
   */
  code?: 'MISSING_PREFIX' | 'MISSING_SUFFIX' | 'INVALID_DOMAIN' | 'INVALID_OPTION';
}
```

### 6. ParseResult

パース結果（エラー情報を含む）です。

```typescript
/**
 * パース結果（エラー情報含む）
 */
interface ParseResult {
  /**
   * パース結果
   */
  rules: UblockRules;

  /**
   * エラー一覧
   */
  errors: ParseError[];
}
```

### 7. PreviewInfo

プレビュー情報です。

```typescript
/**
 * プレビュー情報
 */
interface PreviewInfo {
  /**
   * ブロックルール数
   */
  blockCount: number;

  /**
   * 例外ルール数
   */
  exceptionCount: number;

  /**
   * エラー数
   */
  errorCount: number;

  /**
   * エラー詳細
   */
  errorDetails: string[];

  /**
   * 有効ルール数
   */
  validCount: number;

  /**
   * 合計行数
   */
  totalLines: number;
}
```

### 8. UblockMatcherContext

マッチング時の文脈情報です。

```typescript
/**
 * マッチング時の文脈情報
 */
interface UblockMatcherContext {
  /**
   * 現在のページドメイン
   */
  currentDomain: string;

  /**
   * サードパーティリクエストか
   *
   * 注: ページ内リソースでは常に false
   */
  isThirdParty: boolean;
}
```

---

## シリアライズ形式

### Storage 形式

chrome.storage.local に保存する形式:

```json
{
  "ublock_rules": {
    "blockRules": [
      {
        "id": "a1b2c3d4...",
        "rawLine": "||ads.google.com^",
        "type": "block",
        "domain": "ads.google.com",
        "pattern": "^ads\\.google\\.com$",
        "options": {},
        "lineNumber": 1
      },
      {
        "id": "e5f6g7h8...",
        "rawLine": "||*.doubleclick.net^$3p",
        "type": "block",
        "domain": "*.doubleclick.net",
        "pattern": "^(.+\.)?doubleclick\\.net$",
        "options": {
          "thirdParty": true
        },
        "lineNumber": 2
      }
    ],
    "exceptionRules": [
      {
        "id": "i9j0k1l2...",
        "rawLine": "@@||trusted-site.com^",
        "type": "exception",
        "domain": "trusted-site.com",
        "pattern": "^trusted-site\\.com$",
        "options": {},
        "lineNumber": 3
      }
    ],
    "metadata": {
      "source": "paste",
      "importedAt": 1737696000000,
      "lineCount": 10,
      "ruleCount": 3
    }
  },
  "ublock_format_enabled": true
}
```

### エクスポート形式

uBlock形式のテキスト:

```
! Auto-exported from Obsidian Smart History
! Exported at: 2026-01-24T10:00:00.000Z
! Total rules: 3

@@||trusted-site.com^
||ads.google.com^
||*.doubleclick.net^$3p
```

---

## データフロー図

### インポートフロー

```
┌─────────────────────────────────────────────────────────────┐
│                           ユーザー入力                        │
│                      (テキストエリア/ファイル)                 │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      ublockParser.js                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  parseUblockFilterListWithErrors(text)                  │ │
│  │  │                                                     │ │
│  │  ├─ 行分割                                            │ │
│  │  ├─ 各行に対して parseUblockFilterLine()              │ │
│  │  │                                                     │ │
│  │  ├─ blockRules[]  ← type='block'                    │ │
│  │  ├─ exceptionRules[] ← type='exception'              │ │
│  │  └─ errors[]    ← invalid lines                     │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      UblockRules オブジェクト                 │
│  {                                                       │
│    blockRules: [...],                                      │
│    exceptionRules: [...],                                   │
│    metadata: { source, importedAt, lineCount }            │
│  }                                                       │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      chrome.storage.local                   │
│                    (StorageKeys.UBLOCK_RULES)                │
└─────────────────────────────────────────────────────────────┘
```

### マッチングフロー

```
┌─────────────────────────────────────────────────────────────┐
│                    isUrlBlocked(url, rules, context)        │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      例外ルールチェック                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  for (const exception of exceptionRules) {              │ │
│  │    if (matchesPattern(url, exception.pattern) {        │ │
│  │      if (matchesWithOptions(url, exception, context)) { │ │
│  │        return false;  // 例外により許可                  │ │
│  │      }                                                 │ │
│  │    }                                                   │ │
│  │  }                                                     │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      ブロックルールチェック                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  for (const rule of blockRules) {                      │ │
│  │    if (matchesPattern(url, rule.pattern)) {            │ │
│  │      if (matchesWithOptions(url, rule, context)) {     │ │
│  │        return true;  // ブロック                        │ │
│  │      }                                                 │ │
│  │    }                                                   │ │
│  │  }                                                     │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
                    return false;  // 許可
```

---

## 制約・注意点

### ID生成

- `id` は SHA-256ハッシュの簡易版を使用
- 重複排除・変更検出に使用
- エクスポート時に `id` は保存されない

### rawLine の保持

- エクスポート時に元の形式を再現するため保持
- ユーザーが入力した形式をそのまま維持

### 配列の順序

- `blockRules`, `exceptionRules` の順序は維持される
- 元テキストの順序を保持することで可読性を確保

### optional プロパティ

- `options` 内のプロパティはすべて optional
- 未指定の場合はデフォルト値を使用

---

## 移行計画

### Simple形式 から uBlock形式への移行

将来的な機能として、simple形式のドメインリストをuBlock形式に変換する機能の実装を検討可能です。

```javascript
/**
 * Simple形式をuBlock形式に変換
 */
function convertSimpleToUblock(simpleDomains) {
  return simpleDomains.map(domain => `||${domain}^`).join('\n');
}

/**
 * uBlock形式をsimple形式に変換（可能なルールのみ）
 */
function convertUblockToSimple(ublockRules) {
  return ublockRules.blockRules
    .filter(rule => !rule.domain?.includes('*') && Object.keys(rule.options).length === 0)
    .map(rule => rule.domain);
}
```

ただし、**初回実装ではこの変換機能は含めません**。

---

## 実装状況

2026年1月時点で、上記すべてのデータ構造が実装されています。

- ✅ UblockRule
- ✅ UblockRuleOptions
- ✅ UblockRules
- ✅ UblockMetadata
- ✅ ParseError
- ✅ ParseResult
- ✅ PreviewInfo
- ✅ UblockMatcherContext
- ✅ Storage形式
- ✅ エクスポート形式
- ✅ データフロー図
- ✅ 制約・注意点
- ✅ 移行計画