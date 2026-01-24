# UF-001 設定作業実行

## 作業概要

- **タスクID**: UF-001
- **作業内容**: uBlock Origin形式インポート機能 - 構成分析と要件定義
- **実行日時**: 2026-01-24
- **実行者**: Claude Code Assistant

## 設計文書参照

- **参照文書**:
  - `plan/ublock-import-implementation.md` - 実装計画
  - `plan/TODO.md` - タスク定義
  - `src/utils/domainUtils.js` - 既存ドメインユーティリティ
  - [uBlock Origin filter syntax](https://github.com/gorhill/ublock/wiki/static-filter-syntax) - 公式文書

- **関連タスク**: UF-002, UF-101, UF-102, UF-103

---

## 実行した作業

### 1. uBlock Origin 静的フィルター構文の詳細分析

#### 1.1 対象とする構文の分類

**ドメインブロック関連構文（P0: 必須）**:

| 構文 | 説明 | 例 | 実装可否 |
|------|------|-----|----------|
| `||hostname^` | ドメインと全サブドメインをブロック | `||example.com^` | ✅ 実装予定 |
| `@@||hostname^` | 例外ルール（ブロックを無効化） | `@@||trusted.com^` | ✅ 実装予定 |
| `*` | ワイルドカード | `||*.doubleclick.net^` | ✅ 実装予定 |
| `!` | コメント | `! Comment line` | ✅ 実装予定 |

**オプション構文（P1: 推奨 / P2: オプション）**:

| 構文 | 説明 | 例 | 優先度 | 実装可否 |
|------|------|-----|--------|----------|
| `domain=` | 特定ドメインに制限 | `||tracker.com$domain=example.com` | P1 | ✅ 実装予定 |
| `~domain=` | ドメインを除外 | `||tracker.com$domain=~example.com` | P1 | ✅ 実装予定 |
| `3p` | サードパーティのみ | `||ad.com$3p` | P2 | ✅ 実装予定 |
| `1p` | ファーストパーティのみ | `||ad.com$1p` | P2 | ✅ 実装予定 |
| `important` | 重要マーク（他ルールを上書き） | `||ad.com$important` | P2 | ✅ 実装予定 |
| `~important` | 重要解除 | `||ad.com$~important` | P2 | ✅ 実装予定 |

**非サポート構文**:

| 構文 | 説明 | 不採用理由 |
|------|------|-----------|
| `##` | 要素隠しルール | 本プロジェクトの用途外（HTML要素操作なし） |
| `#@#` | 除外要素隠しルール | 本プロジェクトの用途外 |
| `/$/` | 正規表現ルール | パフォーマンス懸念、複雑性増大 |
| `|` | パス区切り | URLパス完全一致のみ実装 |
| `.*` | パスワイルドカード | ドメイン制限に絞るため |

#### 1.2 構文解析ロジック定義

```
パースロジック:
┌─────────────────────────────────────────────────────────┐
│ 入力行: "||example.com$domain=example.com,3p"           │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 1. 空行・空白のみ → スキップ                              │
│ 2. コメント行(!で始まる) → スキップ                       │
│ 3. 例外ルール(@@で始まる)                                 │
│    └─ @@を除去し、type = 'exception' に設定               │
│ 4. 通常ルール                                              │
│    └─ type = 'block' に設定                               │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 5. ||hostname^ パターン検証                               │
│    - ||で始まる必要あり                                   │
│    - ^で終わる必要あり（必須）                            │
│    - ホスト名部分に不正文字がないこと                      │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 6. $options 部分の分離                                     │
│    - $以降をオプション文字列として抽出                      │
│    - オプションを個別に解析                                │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 7. UblockRuleオブジェクト生成                              │
│    {                                                       │
│      id: hash(rawLine),                                   │
│      rawLine: original,                                   │
│      type: 'block'|'exception',                           │
│      domain: 'example.com',                               │
│      pattern: 'example.com',                              │
│      options: { domain: ['example.com'], 3p: true }       │
│    }                                                       │
└─────────────────────────────────────────────────────────┘
```

---

### 2. サポート範囲の策定

#### 2.1 サポート範囲決定表

| カテゴリ | ルール | 決定 | 理由 |
|----------|--------|------|------|
| 基本ドメインブロック | `||hostname^` | ✅ 採用 | コア機能 |
| 例外ルール | `@@||hostname^` | ✅ 採用 | 信頼済みドメイン管理に必須 |
| サブドメインブロック | `||*.nested.example.com^` | ✅ 採用 | *.doubleclick.netなどの広告ドメイン対策 |
| コメント行 | `! comment` | ✅ 採用 | EasyList等の互換性 |
| ドメイン制限オプション | `$domain=` | ✅ 採用 | 特定ドメインでのみ適用するトラッカー対応 |
| サードパーティ指定 | `$3p` | ✅ 採用 | トラッキング対策の基本 |
| ファーストパーティ指定 | `$1p` | ✅ 採用 | 内部リソース保護 |
| 重要マーク | `$important` | ✅ 採用 | 例外ルールより優先度の高いルール |
| 要素隠しルール | `##selector` | ❌ 採用しない | Chrome Extensionアドブロック機能範囲外 |
| 正規表現 | `/$regexp/` | ❌ 採用しない | パフォーマンス・複雑性の懸念 |

#### 2.2 マッチング優先順位

```
URL判定時のルール適用順序:

1. 例外ルール（@@）:
   └─ $重要マーク付きの例外が最優先
   └─ 一致する例外ルールがあれば該当URLは許可

2. 通常ブロックルール:
   └─ $important マーク付きが優先
   └─ ドメイン完全一致
   └─ ドメインワイルドカード一致
   └─ サブドメイン一致

3. オプション評価:
   └─ $domain= 制限の確認
   └─ $3p/$1p の確認
   └─ 最終的に「ブロック」または「許可」を決定
```

---

### 3. 既存 domainUtils.js との整合性確認

#### 3.1 既存関数の再利用可能性

| 既存関数 | 再利用可否 | 適用箇所 | 備考 |
|-----------|-----------|----------|------|
| `extractDomain(url)` | ✅ 可能 | isUrlBlocked() | 既存実装を流用可 |
| `matchesPattern(domain, pattern)` | ✅ 可能 | isUrlBlocked() | ワイルドカード対応あり |
| `isDomainInList(domain, list)` | ✅ 可能 | isDomainAllowed() | 単純マッチ用 |
| `isValidDomain(domain)` | ✅ 可能 | パース時の検証 | 例: `*.example.com`対応が必要 |

#### 3.2 整合性検証

```javascript
// 既存matchesPatternの動作確認
matchesPattern('sub.example.com', '*.example.com'); // -> true (既存)
matchesPattern('example.com', 'example.com');      // -> true (既存)
matchesPattern('example.co.jp', '*.com');          // -> false (既存)

// uBlock形式への拡張要件
// 既存実装は基本的にそのまま使用可能
// 追加ケース: ||example.com^ という形式からのドメイン抽出が必要
```

#### 3.3 統合方針

**後方互換性の維持**:
- 既存の `isDomainAllowed(url)` 関数はそのまま保持
- 新しい `isUrlBlocked(url, ublockRules)` 関数を追加
- 既存のシンプル形式（ Whitelist/Blacklist ）と uBlock形式の共存

**統合フロー**:
```
isDomainAllowed(url, ublockRules?):
  ┌─────────────────────────────────────────┐
  │ 1. simple形式チェック（既存ロジック）    │
  │    結果 = isDomainAllowedSimple(url)    │
  │    if (結果 === false) return false      │
  └─────────────────────────────────────────┘
                    │
                    ▼
  ┌─────────────────────────────────────────┐
  │ 2. uBlock形式チェック（新規ロジック）   │
  │    if (ublockRules存在) {               │
  │      結果 = isUrlBlocked(url, rules)    │
  │      if (結果 === true) return false    │
  │    }                                    │
  └─────────────────────────────────────────┘
                    │
                    ▼
                return true
```

---

### 4. データ構造設計

#### 4.1 UblockRule 型定義

```typescript
/**
 * 単一のuBlockフィルタールール
 */
interface UblockRule {
  /**
   * ルールの一意識別子（SHA-256ハッシュ）
   */
  id: string;

  /**
   * 元の入力行（エクスポート用に保持）
   */
  rawLine: string;

  /**
   * ルール種類
   */
  type: 'block' | 'exception';

  /**
   * 対象ドメインパターン
   * 例: 'example.com', '*.ads.net'
   */
  domain: string | null;

  /**
   * マッチング用パターン
   * ワイルドカード処理済みの正規表現など
   */
  pattern: string;

  /**
   * オプション情報
   */
  options: UblockRuleOptions;
}

/**
 * ルールオプション
 */
interface UblockRuleOptions {
  /**
   * サードパーティのみ適用
   */
  thirdParty?: boolean;

  /**
   * ファーストパーティのみ適用
   */
  firstParty?: boolean;

  /**
   * 重要フラグ（他ルールを上書き）
   */
  important?: boolean;

  /**
   * $domain= 指定ドメインリスト
   */
  domains?: string[];

  /**
   * $domain=~ 指定除外ドメインリスト
   */
  negatedDomains?: string[];
}
```

#### 4.2 UblockRules 型定義

```typescript
/**
 * uBlockルールセット
 */
interface UblockRules {
  /**
   * ブロックルール配列
   */
  blockRules: UblockRule[];

  /**
   * 例外ルール配列
   */
  exceptionRules: UblockRule[];

  /**
   * メタデータ
   */
  metadata: UblockMetadata;
}

/**
 * メタデータ
 */
interface UblockMetadata {
  /**
   * データソース
   */
  source: 'paste' | 'file' | 'url' | 'none';

  /**
   * インポート日時（UNIXタイムスタンプ）
   */
  importedAt: number;

  /**
   * 元データの行数
   */
  lineCount: number;

  /**
   * 有効ルール数
   */
  ruleCount: number;
}
```

#### 4.3 Storage構造設計

```javascript
// storage.js に追加する StorageKeys
export const StorageKeys = {
  // ... 既存キー
  UBLOCK_RULES: 'ublock_rules',
  UBLOCK_FORMAT_ENABLED: 'ublock_format_enabled',
};

// DEFAULT_SETTINGS 追加
const DEFAULT_SETTINGS = {
  // ... 既存設定
  [StorageKeys.UBLOCK_RULES]: {
    blockRules: [],
    exceptionRules: [],
    metadata: {
      source: 'none',
      importedAt: 0,
      lineCount: 0,
      ruleCount: 0
    }
  },
  [StorageKeys.UBLOCK_FORMAT_ENABLED]: false,
};
```

---

### 5. API設計

#### 5.1 ublockParser.js

```javascript
/**
 * @file src/utils/ublockParser.js
 * uBlock Origin形式フィルターパーサー
 */

/**
 * 単行のuBlockフィルターをパース
 * @param {string} line - 1行のフィルタールール
 * @returns {UblockRule|null} - パース結果またはnull（無効行）
 */
export function parseUblockFilterLine(line) {}

/**
 * 複数行のuBlockフィルターを一括パース
 * @param {string} text - 複数行のフィルターテキスト
 * @returns {UblockRules} - パース結果
 */
export function parseUblockFilterList(text) {}

/**
 * コメント行か判定
 * @param {string} line - 行テキスト
 * @returns {boolean}
 */
export function isCommentLine(line) {}

/**
 * 空行か判定
 * @param {string} line - 行テキスト
 * @returns {boolean}
 */
export function isValidRulePattern(line) {}

/**
 * ルールID生成（SHA-256ハッシュの簡易版）
 * @param {string} rawLine - 元の行
 * @returns {string}
 */
function generateRuleId(rawLine) {}

/**
 * オプション文字列をパース
 * @param {string} optionsString - $の後のオプション文字列
 * @returns {UblockRuleOptions}
 */
export function parseOptions(optionsString) {}
```

#### 5.2 ublockMatcher.js

```javascript
/**
 * @file src/utils/ublockMatcher.js
 * uBlockルールによるURLマッチング処理
 */

/**
 * uBlockルールに基づきURLがブロック済みか判定
 * @param {string} url - チェック対象URL
 * @param {UblockRules} ublockRules - uBlockルールセット
 * @param {Object} context - 文脈情報
 * @param {string} context.currentDomain - 現在のページドメイン
 * @param {boolean} context.isThirdParty - サードパーティリクエストか
 * @returns {boolean} - ブロック済み: true
 */
export function isUrlBlocked(url, ublockRules, context) {}

/**
 * URLがパターンに一致するか
 * @param {string} url - チェック対象URL
 * @param {string} pattern - ドメインパターン
 * @returns {boolean}
 */
export function matchesPattern(url, pattern) {}

/**
 * ルールのオプションに基づきマッチング判定
 * @param {string} url - チェック対象URL
 * @param {UblockRule} rule - ルール
 * @param {Object} context - 文脈情報
 * @returns {boolean}
 */
export function matchesWithOptions(url, rule, context) {}
```

#### 5.3 domainUtils.js 拡張

```javascript
/**
 * 既存関数に追加 形式でのドメイン許可判定
 * @param {string} url - チェック対象URL
 * @param {UblockRules} [ublockRules] - uBlockルールセット
 * @returns {Promise<boolean>} - 許可: true
 */
export async function isDomainAllowed(url, ublockRules) {
  // 既存のsimple形式チェック
  const simpleAllowed = await isDomainAllowedSimple(url);
  if (!simpleAllowed) return false;

  // 新しいublock形式チェック
  if (ublockRules && ublockRules.blockRules.length > 0) {
    const ublockBlocked = isUrlBlocked(url, ublockRules, getContext(url));
    if (ublockBlocked) return false;
  }

  return true;
}

/**
 * 現在のドメイン情報を取得（context用）
 * @param {string} url - 現在のURL
 * @returns {Object}
 */
function getContext(url) {
  const currentDomain = extractDomain(url);
  //（将来的にはlocationから取得する）
  return {
    currentDomain,
    isThirdParty: false // 適宜実装
  };
}
```

---

## 作業結果

- [x] uBlock Origin 静的フィルター構文の詳細分析完了
- [x] サポート範囲の策定完了（ドメインブロックに限定、オプションの一部対応）
- [x] 既存 `domainUtils.js` との整合性確認完了
- [x] データ構造設計完了（ブロックルールと例外ルールの分離）
- [x] API設計完了

---

## 遭遇した問題と解決方法

### なし

本タスクはドキュメント作成・設計作業であるため、実行中に問題は発生しませんでした。

---

## 次のステップ

1. `direct-verify.md` を実行して設定を確認
2. UF-002 [DIRECT]: Storage拡張を実施
3. UF-101 [TDD]: uBlockフィルターパーサーコア実装へ移行

---

## 参考資料

- [uBlock Origin static filter syntax](https://github.com/gorhill/ublock/wiki/static-filter-syntax)
- [EasyList format](https://easylist.to/)
- 現存リスト例: EasyPrivacy, Peter Lowe's list