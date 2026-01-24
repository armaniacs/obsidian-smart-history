# UF-101: uBlockフィルターパーコーコア実装 - TDD要件定義

## 概要

**【機能名】**: uBlockフィルターパーコーコア実装

**TDDタスクID**: UF-101

**作成日**: 2026-01-24

**現在のフェーズ**: Requirements

---

## 1. 機能の概要

### 信頼性レベル: 🟡 黄信号

- EARS要件定義書: 存在しない
- 設計文書: `plan/UII/02-phase2-parser.md`, `plan/UII/10-data-structures.md` に基づき妥当な推測
- 既存実装: `src/utils/storage.js` (UF-002拡張済み), `src/utils/domainUtils.js`

### ユーザーストーリー

> As a ユーザー,
> I want uBlock Origin形式のフィルターリストを貼り付けてインポートできること,
> So that EasyListなどの既存フィルターを活用し、トラッキングサイトを簡単に除外できる

### 何をする機能か

uBlock Origin形式の静的フィルターをパースし、内部データ構造に変換する機能です。

**主要機能**:
- 単行のuBlockフィルターをパース（`parseUblockFilterLine`）
- 複数行のuBlockフィルターを一括パース（`parseUblockFilterList`）
- コメント行・空行の自動スキップ
- ブロックルールと例外ルールの分離
- ワイルドカード対応（`*`）

### どのような問題を解決するか

**問題**: 現在のドメインフィルターでは「1行1ドメイン」のシンプル形式のみサポートしており、EasyListなどの既存リストをそのままインポートできない。

**解決**:
- uBlock Origin形式のフィルターをパースして内部形式に変換
- EasyList上の広告ブロックリストを活用可能にする
- ユーザーが自分でドメインリストを作成する手間を削減する

### 想定されるユーザー

- uBlock Originを使用しており、既存のフィルターリストを持っているユーザー
- トラッキング対策に関心があり、広告ドメインを一括で除外したいユーザー
- プライバシー保護を重視するユーザー

### システム内での位置づけ

```
┌─────────────────────────────────────────────────────────────┐
│                         Popup UI                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  フィルター入力エリア（uBlock形式テキストエリア）      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  ublockImport.js                         │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  previewUblockFilter(text)                           │  │
│  │    │                                                 │  │
│  │    ▼                                                 │  │
│  │  parseUblockFilterList(text) ────────────────────→ │  │
│  │    │                                                 │  │
│  │    ▼                                                 │  │
│  │  PreviewInfo { blockCount, exceptionCount, errors }  │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  ublockParser.js                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  parseUblockFilterLine(line)                         │  │
│  │    ├─ 空行・コメント行 → null                           │  │
│  │    ├─ ||hostname^ パターン検証                         │  │
│  │    ├─ 例外ルール(@@) → type='exception'                │  │
│  │    ├─ $options 分離                                   │  │
│  │    └─ UblockRule オブジェクト生成                     │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  storage.js (UF-002拡張済み)                 │
│  StorageKeys.UBLOCK_RULES = {                           │
│    blockRules: [],                                    │
│    exceptionRules: [],                                │
│    metadata: { source, importedAt, lineCount }          │
│  }                                                      │
└─────────────────────────────────────────────────────────────┘
```

### 参照した設計文書

| 種類 | パス | 信頼性レベル |
|------|------|-------------|
| フェーズ2計画 | `plan/UII/02-phase2-parser.md` | 🟢 |
| データ構造 | `plan/UII/10-data-structures.md` | 🟢 |
| タスク定義 | `plan/TODO.md` | 🟢 |
| 既存実装 | `src/utils/storage.js` | 🟢 |
| 既存実装 | `src/utils/domainUtils.js` | 🟢 |

### 参照したEARS要件

🔴 EARS要件定義書は存在しない

---

## 2. 入力・出力の仕様

### 信頼性レベル: 🟢 青信号

### 入力パラメータ

#### parseUblockFilterLine(line)

| パラメータ名 | 型 | 必須 | 説明 | デフォルト | 制約 |
|-------------|-----|------|------|---------|------|
| `line` | `string` | はい | 1行のフィルタールール | - | なし |

#### parseUblockFilterList(text)

| パラメータ名 | 型 | 必須 | 説明 | デフォルト | 制約 |
|-------------|-----|------|------|---------|------|
| `text` | `string` | はい | 複数行のフィルターテキスト | - | なし |

### 出力値

#### UblockRule

```typescript
interface UblockRule {
  id: string;              // 一意ID（ハッシュ）
  rawLine: string;         // 元の行（エクスポート用）
  type: 'block' | 'exception';
  domain: string | null;   // ドメインパターン
  pattern: string;         // マッチング用パターン
  options: UblockRuleOptions;
  lineNumber?: number;     // 行番号（デバッグ用）
}

interface UblockRuleOptions {
  thirdParty?: boolean;
  firstParty?: boolean;
  important?: boolean;
  domains?: string[];
  negatedDomains?: string[];
}
```

#### UblockRules

```typescript
interface UblockRules {
  blockRules: UblockRule[];
  exceptionRules: UblockRule[];
  metadata: UblockMetadata;
}

interface UblockMetadata {
  source: 'paste' | 'file' | 'url' | 'none';
  importedAt: number;
  lineCount: number;
  ruleCount: number;
}
```

### 入出力の関係性

```
入力: "||example.com^\n@@||trusted.com^\n! Comment"
    │
    ▼
parseUblockFilterList()
    │
    ▼
出力: UblockRules {
  blockRules: [
    { id: "...", rawLine: "||example.com^", type: "block",
      domain: "example.com", pattern: "^example\\.com$", options: {} }
  ],
  exceptionRules: [
    { id: "...", rawLine: "@@||trusted.com^", type: "exception",
      domain: "trusted.com", pattern: "^trusted\\.com$", options: {} }
  ],
  metadata: { source: "paste", importedAt: ..., lineCount: 3, ruleCount: 2 }
}
```

### データフロー

```
┌─────────────────────────────────────────────────────┐
│              貼り付け/ファイル読み込み                     │
│  "||example.com^\n@@||trusted.com^\n! Comment"        │
└────────────────────────┬────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────┐
│         行分割（\nで分割）                           │
│  ["||example.com^", "@@||trusted.com^", "! Comment"]   │
└────────────────────────┬────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────┐
│     各行に対して parseUblockFilterLine()               │
│  ┌─────────────────────────────────────────────┐    │
│  │ 空行・コメント → スキップ                       │    │
│  │ ||hostname^ パターン検証                     │    │
│  │ type と domain の抽出                        │    │
│  │ $options の分離                             │    │
│  └─────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────┐
│              UblockRules オブジェクト               │
│  { blockRules: [...], exceptionRules: [...] }         │
└────────────────────────┬────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────┐
│         chrome.storage.local に保存                    │
│         (StorageKeys.UBLOCK_RULES)                    │
└─────────────────────────────────────────────────────┘
```

### パースロジック

```
parseUblockFilterLine(line):
    │
    ▼
┌─────────────────────────────────────┐
│ 空行・空白のみ → return null          │
└─────────────────────────────────────┘
    │ (isEmptyLine)
    ▼
┌─────────────────────────────────────┐
│ コメント行(!で始まる) → return null   │
└─────────────────────────────────────┘
    │ (isCommentLine)
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
│ UblockRuleオブジェクト生成            │
│   - ID生成（ハッシュ）                  │
│   - pattern 変換（正規表現）              │
│   return UblockRule                    │
└─────────────────────────────────────┘
```

---

## 3. 制約条件

### 信頼性レベル: 🟢 青信号

### パフォーマンス要件

| 要件 | 値 | 説明 |
|------|----|------|
| 単行パース時間 | < 1ms | 単一フィルターのパース速度 |
| 1,000行パース | < 1秒 | 大量データの一括パース |
| 10,000行パース | < 5秒 | 非常に大きなリスト対応 |

### セキュリティ要件

| 要件 | 説明 |
|------|------|
| XSS対策 | HTMLテキストとして扱う（DOM操作はUI層で行う） |
| データ検証 | 無効な文字列・SQLインジェクション対策 |

### 互換性要件

| 要件 | 内容 |
|------|------|
| 既存形式の互換性 | StorageKeys は変更しない（追加のみ） |
| 後方互換性 | 既存の getSettings() 関数は変更なし |
| 既存テスト維持 | domainUtils などの既存テストに影響を与えない |

### アーキテクチャ制約

| 制約 | 内容 |
|------|------|
| ファイル構造 | `src/utils/` 配下に新規モジュール |
| 命名規則 | `ublockParser.js` とする |
| エクスポート形式 | CommonJS ES Modules (`export function`) |

### データ制約

| 制約 | 内容 |
|------|------|
| 最大行数 | 10,000行（UXの観点） |
| 最長行 | 512文字 |
| ID重複排除 | rawLine のハッシュにより一意性を保証 |

---

## 4. 想定される使用例

### 信頼性レベル: 🟡 黄信号

### 基本的な使用パターン

#### 使用例1: 基本ドメインブロック

```
入力:
||example.com^

期待出力:
{
  blockRules: [{
    id: "hash('||example.com^')",
    rawLine: "||example.com^",
    type: "block",
    domain: "example.com",
    pattern: "^example\\.com$",
    options: {}
  }],
  exceptionRules: [],
  metadata: { source: "paste", importedAt: ..., lineCount: 1, ruleCount: 1 }
}
```

#### 使用例2: 例外ルール

```
入力:
@@||trusted.com^

期待出力:
{
  blockRules: [],
  exceptionRules: [{
    id: "hash('@@||trusted.com^')",
    rawLine: "@@||trusted.com^",
    type: "exception",
    domain: "trusted.com",
    pattern: "^trusted\\.com$",
    options: {}
  }],
  metadata: { ... }
}
```

#### 使用例3: 複数行一括パース

```
入力:
! コメント行
||example.com^
@@||trusted.com^
||*.ads.net^
! 別のコメント

期待出力:
{
  blockRules: [
    { ... ||example.com^ ... },
    { ... ||*.ads.net^ ... }
  ],
  exceptionRules: [
    { ... @@||trusted.com^ ... }
  ],
  metadata: {
    source: "paste",
    lineCount: 5,
    ruleCount: 3
  }
}
```

### エッジケース

#### エッジケース1: コメント・空行のスキップ

```
入力:
! これはコメント行
@@||trusted.com^

   (空行)
||example.com^

期待挙動:
- コメント行は null として扱われる
- 空行はスキップされる
- 2件の有効ルールが正しくパースされる
```

#### エッジケース2: ワイルドカード対応

```
入力:
||*.ads.net^
||*.doubleclick.net^

期待挙動:
- domain に "*.ads.net" が設定される
- pattern に正規表現 "^.*\\.ads\\.net$" が変換される
```

#### エッジケース3: ドメインオプション付き（UF-102）

```
入力:
||tracker.com$domain=example.com

期待挙動:
- options.domains に ['example.com'] が設定される
- 基本的なパースのみ実装、オプション解析はUF-102で実装
```

#### エッジケース4: 大量データ処理

```
入力: 10,000行の tth

期待挙動:
- 5秒以内にパース完了
- 無効行が含まれていてもエラーなしで処理
- blockRules/exceptionRules に正しく振り分け
```

### エラーケース

#### エラーケース1: 不正なパターン

```
状況: ||example.com（^なし）

挙動:
- isValidRulePattern() が false を返す
- parseUblockFilterLine() は null を返す
- エラーはスローしない（静的に検証）
```

#### エラーケース2: 無効な文字

```
状況: ||example@invalid^

挙動:
- isValidDomain() が false を返す
- parseUblockFilterLine() は null を返す
```

#### エラーケース3: null/undefined 入力

```
状況: parseUblockFilterLine(null)

挙動:
- 静かにエラーをスローし、呼び出し元でハンドリング可能
```

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

```markdown
> As a ユーザー,
> I want uBlock Origin形式のフィルターを簡単にインポートできること,
> So that トラッキングサイトを一括で除外できる
```

### 参照した設計文書

| 種類 | パス | 信頼性レベル |
|------|------|-------------|
| フェーズ2計画 | `plan/UII/02-phase2-parser.md` | 🟢 |
| データ構造 | `plan/UII/10-data-structures.md` | 🟢 |
| タスク定義 | `plan/TODO.md` | 🟢 |
| 既存実装 | `src/utils/storage.js` | 🟢 |
| 既存実装 | `src/utils/domainUtils.js` | 🟢 |

### 要件カバレッジ表

| 要件ID | 終了 | 内容 |
|--------|-----|------|
| UF-101-1 | 未 | parseUblockFilterLine() 実装 |
| UF-101-2 | 未 | parseUblockFilterList() 実装 |
| UF-101-3 | 未 | isCommentLine() 実装 |
| UF-101-4 | 未 | isEmptyLine() 実装 |
| UF-101-5 | 未 | isValidRulePattern() 実装 |
| UF-101-6 | 未 | generateRuleId() 実装 |

---

## 6. 実装優先度と判断基準

### 必須実装（P0）

1. **基本パース機能**
   - parseUblockFilterLine() の実装
   - parseUblockFilterList() の実装
   - 基本構文: `||hostname^`, `@@`, `*`, `!` の対応

2. **検証・判定関数**
   - isCommentLine()
   - isEmptyLine()
   - isValidRulePattern()

### 推奨実装（P1）

3. **ID生成**
   - generateRuleId() の実装
   - rawLine から一意IDを生成

4. **基本エラーハンドリング**
   - null/undefined 入力の対応
   - 無効パターンの静的検証

### オプション（P2）

5. **オプション解析** → UF-102 で実装予定

---

## 7. 未決定事項・懸念点

| 項目 | 内容 | 判断基準 |
|------|------|----------|
| パフォーマンス要件検証 | 10,000行の配列処理 | 実装後にベンチマーク実施 |
| ID生成アルゴリズム | 簡易版 v.s. 正式SHA-256 | 簡易版で十分（重複排除できればOK） |
| 正規表現パターン | ワイルドカードの複雑さ matchesPattern利用 | 既存関数再利用で対応 |

---

## 8. テスト戦略

### テスト可能な単位

1. **単体テスト（Jest）**
   - parseUblockFilterLine() のテスト
   - parseUblockFilterList() のテスト
   - 各判定関数のテスト

2. **パフォーマンステスト**
   - 大量行パースの実行時間

### テスト不可・検証困難な項目

- 解析ミスによるルールの挙動 → 既存のdomainUtilsと統合後に検証

---

## 品質判定結果

### ✅ 高品質

- **要件の曖昧さ**: なし（計画ドキュメントが詳細）
- **入出力定義**: 完全（型定義あり）
- **制約条件**: 明確
- **実装可能性**: 確実（既存コード拡張のみ）

### 判定理由

- `plan/UII/02-phase2-parser.md` に詳細なAPI設計が記載されている
- `plan/UII/10-data-structures.md` に完全な型定義が記載されている
- 既存の `domainUtils.js` と整合性のある設計である

---

## 次のステップ

**推奨コマンド**: `/tsumiki:tdd-testcases` でテストケースの洗い出しを行います。

テストケースでは以下を網羅します：
1. 正常系: 基本ドメイン、例外ルール、ワイルドカード
2. 異常系: ||なし、^なし、不正文字
3. エッジケース: 複数ワイルドカード、オプション付き
4. 性能テスト: 1,000行、10,000行パース