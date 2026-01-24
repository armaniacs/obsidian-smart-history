# UF-103:domainUtils統合 - TDD要件定義

## 作成情報

- **機能名**: domainUtils統合
- **TDDタスクID**: UF-103
- **作成日**: 2026-01-24
- **現在のフェーズ**: Requirements

---

## 1. 機能の概要

### 信頼性レベル: 🟢 青信号

- **設計文書**: `plan/UII/02-phase2-parser.md`, `plan/UII/10-data-structures.md` に基づいて把握可能
- **既存実装**: `src/utils/domainUtils.js` に既存関数が実装済み
- **関連タスク**: UF-101（パーサーコア）→ UF-102（オプション解析）→ UF-103（統合）

### ユーザーストーリー

> As a ユーザー,
> I want uBlock Origin形式のフィルタールールをURLのブロック判定に使用できること,
> So that EasyListなどの既存フィルターリストをインポートして有効活用できる

### 何をする機能か

既存の `domainUtils.js` にuBlock Origin形式のルールマッチング機能を統合し、URLがブロックされているかどうかを判定する機能です。

**主要機能**:
1. **isUrlBlocked(url, ublockRules, context?)**: uBlockルールセットに基づいてURLがブロックされているか判定
2. **isDomainAllowed(url, ublockRules?)**の拡張: 既存のsimple形式チェックにuBlock形式チェックを追加
3. **例外ルール優先**: 例外ルールが一致した場合はブロックルールに関わらず許可
4. **オプション評価**: domain=, ~domain=, 3p, 1pオプションに基づき適用可否を判定
5. **ワイルドカード対応**: `*.example.com` 形式のドメインパターンに対応
6. **後方互換性**: 既存のisDomainAllowed関数のシグネチャと挙動を維持（ublockRulesはオプション）

### どのような問題を解決するか

**問題**: UF-101とUF-102で実装したuBlockパーサーとオプション解析機能がありますが、これらを実際にURLのブロック判定に使用する機能がありません。

**解決**:
- 既存のdomainUtils.jsにuBlockマッチング機能を統合
- isDomainAllowedを拡張してuBlock形式でもチェック可能に
- 例外ルール/ブロックルール/オプションを考慮した完全な判定ロジックを実装

### 想定されるユーザー

- EasyListなどの有名なフィルターリストをインポートしたいユーザー
- 既存のsimple形式（ドメインリスト）からuBlock形式への移行を検討しているユーザー
- 高度なブロック制御が必要なユーザー

### システム内での位置づけ

```
┌─────────────────────────────────────────────────────────────┐
│               domainUtils.js (拡張後)                        │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  isDomainAllowed(url, ublockRules?) {               │  │
│  │    ├─ 既存: simple形式チェック                      │  │
│  │    └─ 新規: uBlock形式チェック                    │  │
│  │           isUrlBlocked(url, ublockRules, context)   │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  isUrlBlocked(url, rules, context)           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  1. 例外ルール優先チェック                          │  │
│  │  2. ドメインパターンマッチング                        │  │
│  │  3. オプション評価（domain=, 3p, 1p, important）       │  │
│  │  4. 結果を返却                                     │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 参照した設計文書

| 種類 | パス | 信頼性レベル |
|------|------|-------------|
| フェーズ2計画 | `plan/UII/02-phase2-parser.md` | 🟢 |
| データ構造 | `plan/UII/10-data-structures.md` | 🟢 |
| タスク定義 | `plan/TODO.md` | 🟢 |
| 既存実装 | `src/utils/domainUtils.js` | 🟢 |
| パーサー実装 | `src/utils/ublockParser.js` | 🟢 |

### 参照したEARS要件

🔴 EARS要件定義書は存在しない

---

## 2. 入力・出力の仕様

### 信頼性レベル: 🟢 青信号

### 入力パラメータ

#### isUrlBlocked関数

| パラメータ名 | 型 | 必須 | 説明 | デフォルト | 制約 |
|-------------|-----|------|------|---------|------|
| `url` | `string` | はい | チェック対象URL | - | 有効なURL文字列 |
| `ublockRules` | `UblockRules` | はい | uBlockルールセット | - | blockRules/exceptionRulesを含む |
| `context` | `object` | いいえ | マッチング時の文脈情報 | `undefined` | currentDomain, isThirdParty |

#### isDomainAllowed関数（拡張）

| パラメータ名 | 型 | 必須 | 説明 | デフォルト | 制約 |
|-------------|-----|------|------|---------|------|
| `url` | `string` | はい | チェック対象URL | - | 有効なURL文字列 |
| `ublockRules` | `UblockRules` | いいえ | uBlockルールセット | `undefined` | blockRules/exceptionRulesを含む（オプション） |

### 出力値

#### isUrlBlocked関数

- **型**: `boolean`
- **説明**: `true` = ブロックされている、`false` = 許可されている
- **例**: `isUrlBlocked('https://ads.google.com/tracker', ublockRules, context)` → `true`

#### isDomainAllowed関数（拡張）

- **型**: `Promise<boolean>`
- **説明**: `true` = 許可されている、`false` = ブロックされている
- **例**: `await isDomainAllowed('https://example.com', ublockRules)` → `true`

### 入出力の関係性

```
入力: "https://ads.google.com/tracker", ublockRules, context
    │
    ▼
isUrlBlocked()
    │
    ├─ URLからドメイン抽出 → "ads.google.com"
    │
    ├─ 例外ルールチェック → 一致なし
    │
    ├─ ブロックルールチェック
    │   ├─ ルール: ||ads.google.com^
    │   ├─ ドメイン一致: "ads.google.com"
    │   └─ パターン一致: true
    │
    ├─ オプション評価 → なし
    │
    ▼
出力: true（ブロック済み）
```

---

## 3. 制約条件

### 信頼性レベル: 🟢 青信号

### パフォーマンス要件

- **単一URL判定**: < 10µs（ページナビゲーションに影響を与えない）
- **ルールセット100件**: < 1ms
- **ルールセット1,000件**: < 10ms
- **計算量**: O(n) で n = ブロックルール数 + 例外ルール数

### セキュリティ要件

- **URL検証**: 不正なURLは安全にfalse（許可）を返す
- **パターン注入**: ドメインパターンの正規表現変換時にReDoS対策
- **DOM参照**: ユーザー入力に基づくDOM操作なし

### 互換性要件

- **既存isDomainAllowedとの後方互換性**:
  - `isDomainAllowed(url)` （ublockRulesなし）= 既存のsimple形式のみチェック
  - `isDomainAllowed(url, undefined)` = 既存のsimple形式のみチェック
  - `isDomainAllowed(url, ublockRules)` = simple + uBlock形式の両方チェック
- **既存ワイルドカードを受け入れる**: `matchesPattern(domain, pattern)` を再利用

### アーキテクチャ制約

- **依存**: `domainUtils.js` は既存実装を拡張
- **新規ファイル**: `src/utils/ublockMatcher.js` を新規作成
- **既存関数の変更禁止**: 既存の`extractDomain`, `matchesPattern`, `isValidDomain`は変更せず再利用

---

## 4. 想定される使用例

### 信頼性レベル: 🟢 青信号

### 基本使用パターン

#### 例1: 広告ドメインのブロック判定

```javascript
import { isUrlBlocked } from './ublockMatcher.js';
import { parseUblockFilterList } from './ublockParser.js';

const filterText = `||ads.google.com^
||*.doubleclick.net^$3p`;

const ublockRules = parseUblockFilterList(filterText);

const url1 = 'https://ads.google.com/tracker.js';
const url2 = 'https://doubleclick.net/ad.js';

console.log(isUrlBlocked(url1, ublockRules));  // true
console.log(isUrlBlocked(url2, ublockRules, { isThirdParty: true }));  // true
```

#### 例2: 例外ルールによる許可判定

```javascript
const filterText = `||ads.google.com^
@@||ads.google.com^$domain=example.com`;

const ublockRules = parseUblockFilterList(filterText);

// 例外ルール優先のため許可
const url = 'https://ads.google.com/asset.js';
console.log(isUrlBlocked(url, ublockRules, {
  currentDomain: 'example.com'
}));  // false (許可)
```

#### 例3: isDomainAllowed拡張（後方互換性）

```javascript
// 既存コードはそのまま動作する
import { isDomainAllowed } from './domainUtils.js';

await isDomainAllowed('https://example.com');  // 既存のsimple形式のみ

// uBlock形式も受け入れる
await isDomainAllowed('https://ads.google.com', ublockRules);  // simple + uBlock
```

### エッジケース

#### エッジケース1: ワイルドカードドメイン

```javascript
const filterText = `||*.ads.net^`;

const ublockRules = parseUblockFilterList(filterText);

const url = 'https://sub.ads.net/image.gif';
console.log(isUrlBlocked(url, ublockRules));  // true
```

#### エッジケース2: サブドメイン一致

```javascript
const filterText = `||sub.example.com^`;

const ublockRules = parseUblockFilterList(filterText);

const url = 'https://sub.example.com/page';
console.log(isUrlBlocked(url, ublockRules));  // true

const url2 = 'https://example.com/page';
console.log(isUrlBlocked(url2, ublockRules));  // false
```

#### エッジケース3: オプション条件不一致

```javascript
const filterText = `||tracker.com^$domain=example.com`;

const ublockRules = parseUblockFilterList(filterText);

const url = 'https://tracker.com/track';
console.log(isUrlBlocked(url, ublockRules, {
  currentDomain: 'other.com'  // domain一致しない
}));  // false (許可)
```

#### エッジケース4: 3pオプション判定

```javascript
const filterText = `||adnetwork.com^$3p`;

const ublockRules = parseUblockFilterList(filterText);

// 3pルール、1pコンテキストではオプション適用
const url = 'https://adnetwork.com/ad.js';
console.log(isUrlBlocked(url, ublockRules, {
  isThirdParty: true  // 3pオプション適用
}));  // true

console.log(isUrlBlocked(url, ublockRules, {
  isThirdParty: false  // 3pオプション適用されない
}));  // false
```

#### エッジケース5: 重要フラグ優先

```javascript
const filterText = `||ads.com^$domain=example.com
||*.ads.com^$important`;

const ublockRules = parseUblockFilterList(filterText);

// importantルールはdomain条件を上書き
const url = 'https://sub.ads.com/ad.js';
console.log(isUrlBlocked(url, ublockRules, {
  currentDomain: 'other.com', important検証: true
}));  // true（important優先）
```

### エラーケース

#### エラーケース1: 不正URL入力

```javascript
const ublockRules = parseUblockFilterList('||example.com^');

console.log(isUrlBlocked('not-a-url', ublockRules));  // false (安全なフォールバック)
```

#### エラーケース2: 空ルールセット

```javascript
const emptyRules = parseUblockFilterList('');

console.log(isUrlBlocked('https://example.com', emptyRules));  // false (許可)
```

#### エラーケース3: null/undefined引数

```javascript
console.log(isUrlBlocked(null, ublockRules));  // false (安全なフォールバック)
console.log(isUrlBlocked('https://example.com', null));  // false (安全なフォールバック)
```

#### エラーケース4: 文脈情報省略

```javascript
const ublockRules = parseUblockFilterList('||example.com^$3p');

// context省略時のデフォルト挙動
console.log(isUrlBlocked('https://example.com', ublockRules));  // context使用なし
```

---

## 5. EARS要件・設計文書との対応関係

**ユーザースーリー**: uBlock形式フィルターリストをURLブロック判定に活用したい

**参照した設計文書**:
- **アーキテクチャ**: `plan/UII/02-phase2-parser.md` (マッチングフロー、API設計)
- **データ構造**: `plan/UII/10-data-structures.md` (UblockRule, UblockRuleOptions, UblockRules, UblockMatcherContext)
- **既存実装**: `src/utils/domainUtils.js` (extractDomain, matchesPattern, isValidDomainを再利用)
- **パーサー実装**: `src/utils/ublockParser.js` (parseUblockFilterList, parseOptions)

---

## まとめ

本要件定義書は、UF-103タスク（domainUtils統合）の機能仕様を定義しました。

- [x] 機能概要の定義
- [x] 入出力仕様の定義（isUrlBlocked, 拡張isDomainAllowed）
- [x] 制約条件の定義（パフォーマンス、セキュリティ、互換性）
- [x] 使用例（基本パターン、エッジケース、エラーケース）
- [x] 既存実装との統合方針