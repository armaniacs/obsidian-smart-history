# フェーズ2: フィルターパーサー実装

## 概要

uBlock Origin形式のフィルターパーサーとマッチャーを実装します。

## タスク一覧

| タスクID | タスク名 | タイプ | 推定時間 | 優先度 | 依存 |
|----------|---------|--------|---------|--------|------|
| UF-101 | uBlockフィルターパーサーコア実装 | TDD | 2時間 | P0 | UF-002 |
| UF-102 | オプション解析実装 | TDD | 1.5時間 | P1 | UF-101 |
| UF-103 | 既存 domainUtils.js との統合 | TDD | 1時間 | P0 | UF-102 |

---

## UF-101: uBlockフィルターパーサーコア実装 [TDD]

### 概要

- **タスク種別**: TDD
- **推定時間**: 2時間
- **ステータス**: 未実装
- **依存**: UF-002

### TDDサイクル

1. **Requirements** - `tdd-requirements.md` 作成
2. **Testcases** - `tdd-testcases.md` 作成（20-25ケース）
3. **Red** - `tdd-red.md` - 失敗テスト実装
4. **Green** - `tdd-green.md` - 最小実装
5. **Refactor** - `tdd-refactor.md` - コード改善
6. **Verify** - `tdd-verify-complete.md` - 品質確認

### 実装ファイル

**新規作成**: `src/utils/ublockParser.js`

### API設計

```javascript
/**
 * 単行のuBlockフィルターをパース
 * @param {string} line - 1行のフィルタールール
 * @returns {UblockRule|null} - パース結果またはnull（無効行）
 */
export function parseUblockFilterLine(line) { }

/**
 * 複数行のuBlockフィルターを一括パース
 * @param {string} text - 複数行のフィルターテキスト
 * @returns {UblockRules} - パース結果
 */
export function parseUblockFilterList(text) { }

/**
 * コメント行か判定
 * @param {string} line - 行テキスト
 * @returns {boolean}
 */
export function isCommentLine(line) { }

/**
 * 空行か判定
 * @param {string} line - 行テキスト
 * @returns {boolean}
 */
export function isEmptyLine(line) { }

/**
 * 有効なルールパターンか判定
 * @param {string} line - 行テキスト
 * @returns {boolean}
 */
export function isValidRulePattern(line) { }

/**
 * ルールID生成（SHA-256ハッシュの簡易版）
 * @param {string} rawLine - 元の行
 * @returns {string}
 */
function generateRuleId(rawLine) { }
```

### パースロジック

```
parseUblockFilterLine(line):
    │
    ▼
┌─────────────────────────────────────┐
│ 空行・空白のみ → return null          │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ コメント行(!で始まる) → return null   │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 例外ルール(@@で始まる)               │
│   @@を除去し、type='exception'       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 通常ルール                           │
│   type='block'                       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ ||hostname^ パターン検証              │
│   ||で始まる必要あり                 │
│   ^で終わる必要あり                  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ $options 部分の分離                  │
│   オプションパース（UF-102）         │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ UblockRuleオブジェクト生成            │
│   return UblockRule                  │
└─────────────────────────────────────┘
```

### テストケース一覧（計画）

**正常系（7ケース）**:

| # | テスト名 | 入力 | 期待出力 |
|---|----------|------|----------|
| 1 | 基本ドメインブロック | `||example.com^` | type='block', domain='example.com' |
| 2 | 例外ルール | `@@||trusted.com^` | type='exception', domain='trusted.com' |
| 3 | ワイルドカード | `||*.ads.net^` | domain='*.ads.net' |
| 4 | サブドメイン | `||sub.example.com^` | domain='sub.example.com' |
| 5 | コメント無視 | `! Comment line` | null |
| 6 | 空行無視 | `` | null |
| 7 | 複数行一括パース | 複数行テキスト | UblockRulesオブジェクト |

**異常系（4ケース）**:

| # | テスト名 | 入力 | 期待出力 |
|---|----------|------|----------|
| 8 | ||なし | `example.com^` | null（エラー） |
| 9 | ^なし | `||example.com` | null（エラー） |
| 10 | 不正文字 | `||example@invalid^` | null（エラー） |
| 11 | 空パターン | `||^` | null（エラー） |

**エッジケース（4-5ケース）**:

| # | テスト名 | 入力 | 期待出力 |
|---|----------|------|----------|
| 12 | 複数ワイルドカード | `||*.*.example.com^` | domain='*.*.example.com' |
| 13 | ドメインオプション付き | `||tracker.com$domain=example.com` | domains配列を確認 |
| 14 | $3p/$1pオプション | `||ad.com$3p` | thirdParty=true |
| 15 | 長いドメイン | `||very-long-subdomain.example.com^` | 正しくパース |

**性能テスト（2ケース）**:

| # | テスト名 | 入力 | 期待出力 |
|---|----------|------|----------|
| 16 | 1,000行パース | 1,000行テキスト | 1秒以内に完了 |
| 17 | 無効行多数 | 有効含まない10,000行 | エラーなしで処理 |

---

## UF-102: オプション解析実装 [TDD]

### 概要

- **タスク種別**: TDD
- **推定時間**: 1.5時間
- **ステータス**: 未実装
- **依存**: UF-101

### 実装場所

**ファイル**: `src/utils/ublockParser.js` に追加

### API設計

```javascript
/**
 * オプション文字列をパース
 * @param {string} optionsString - $の後のオプション文字列
 * @returns {UblockRuleOptions} - パースされたオプション
 */
export function parseOptions(optionsString) {
  // 例: "domain=example.com,3p"
  // → { domains: ['example.com'], thirdParty: true }
}
```

### 対象オプション

| オプション | タイプ | デフォルト | 例 |
|----------|--------|-----------|-----|
| `domain=` | `string[]` | `undefined` | `domain=example.com,test.com` |
| `~domain=` | `string[]` | `undefined` | `domain=~trusted.com` |
| `3p` | `boolean` | `false` | `3p` |
| `1p` | `boolean` | `false` | `1p` |
| `important` | `boolean` | `false` | `important` |

### パースロジック

```javascript
function parseOptions(optionsString) {
  const options = {};

  // オプション文字列をカンマ区切りで分割
  // 例: "domain=example.com,3p"
  const tokens = optionsString.split(',');

  tokens.forEach(token => {
    if (token.startsWith('domain=')) {
      const values = token.substring(7).split('|');  // ドメインは|区切り
      options.domains = values;
    } else if (token.startsWith('~domain=')) {
      const values = token.substring(9).split('|');
      options.negatedDomains = values;
    } else if (token === '3p') {
      options.thirdParty = true;
    } else if (token === '1p') {
      options.firstParty = true;
    } else if (token === 'important') {
      options.important = true;
    } else if (token === '~important') {
      options.important = false;
    }
  });

  return options;
}
```

### テストケース（計画）

| # | テスト名 | 入力 | 期待出力 |
|---|----------|------|----------|
| 1 | domainオプション単独 | `domain=example.com` | `domains: ['example.com']` |
| 2 | 複数domainオプション | `domain=example.com|test.com` | `domains: ['example.com', 'test.com']` |
| 3 | 3pオプション | `3p` | `thirdParty: true` |
| 4 | 1pオプション | `1p` | `firstParty: true` |
| 5 | importantオプション | `important` | `important: true` |
| 6 | 複合オプション | `domain=example.com,3p` | `domains: [...], thirdParty: true` |
| 7 | 否定domainオプション | `domain=~trusted.com` | `negatedDomains: ['trusted.com']` |
| 8 | 既存~important解除 | `~important` | `important: false` |

---

## UF-103: 既存 domainUtils.js との統合 [TDD]

### 概要

- **タスク種別**: TDD
- **推定時間**: 1時間
- **ステータス**: 未実装
- **依存**: UF-102

### 実装ファイル

- **新規作成**: `src/utils/ublockMatcher.js`
- **変更**: `src/utils/domainUtils.js`

### API設計

#### ublockMatcher.js

```javascript
/**
 * uBlockルールに基づきURLがブロック済みか判定
 * @param {string} url - チェック対象URL
 * @param {UblockRules} ublockRules - uBlockルールセット
 * @param {Object} context - 文脈情報
 * @returns {boolean} - ブロック済み: true
 */
export function isUrlBlocked(url, ublockRules, context = {}) { }

/**
 * URLがパターンに一致するか
 * @param {string} url - チェック対象URL
 * @param {string} pattern - ドメインパターン
 * @returns {boolean}
 */
export function matchesPattern(url, pattern) { }

/**
 * ルールのオプションに基づきマッチング判定
 * @param {string} url - チェック対象URL
 * @param {UblockRule} rule - ルール
 * @param {Object} context - 文脈情報
 * @returns {boolean}
 */
export function matchesWithOptions(url, rule, context) { }
```

#### domainUtils.js 拡張

```javascript
/**
 * 既存関数を拡張
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
    const ublockBlocked = isUrlBlocked(url, ublockRules);
    if (ublockBlocked) return false;
  }

  return true;
}
```

### マッチングフロー

```
isUrlBlocked(url, ublockRules, context):
    │
    ▼
┌─────────────────────────────────────────────┐
│ 1. 例外ルールチェック                       │
│    exceptionRulesをループ                  │
│    └─ 一致する例外があれば → return false   │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│ 2. ブロックルールチェック                   │
│    blockRulesをループ                      │
│    └─ ドメインパターン一致？                │
│       └─ Yes → オプション評価へ            │
│       └─ No → 次のルール                   │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│ 3. オプション評価                           │
│    └─ $domain= 制限確認                     │
│    └─ $3p/$1p 確認                         │
│    └─ 全条件を満たせば → return true       │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│ 4. どれにも一致しない                       │
│    → return false（許可）                  │
└─────────────────────────────────────────────┘
```

### テストケース（計画）

| # | テスト名 | 説明 |
|---|----------|------|
| 1 | 基本ドメイン一致 | 正常に一致しブロック |
| 2 | 例外ルール優先 | 例外ルールが一致すれば許可 |
| 3 | ワイルドカード一致 | `*.example.com` に一致 |
| 4 | サブドメイン一致 | `sub.example.com` で一致 |
| 5 | domainオプション一致 | `$domain=` 条件を確認 |
| 6 | domainオプション不一致 | 該当しないので無効 |
| 7 | $3pオプション | サードパーティのみ適用 |
| 8 | $1pオプション | ファーストパーティのみ適用 |
| 9 | $important優先 | 重要ルールが優先 |
| 10 | 複合条件 | 複数オプションの組み合わせ |

---

## マイルストーン M2: パーサー完了

- [ ] UF-101 uBlockフィルターパーサーコア実装
- [ ] UF-102 オプション解析実装
- [ ] UF-103 domainUtils統合

**完了条件**:
- ⏳ `ublockParser.js` 実装完了（テスト通過）
- ⏳ `ublockMatcher.js` 実装完了（テスト通過）
- ⏳ `domainUtils.js` 拡張完了（後方互換性維持）

---

## 次のステップ

フェーズ3（UI実装）へ進みます：

- **UF-201 [TDD]**: インポートUI追加