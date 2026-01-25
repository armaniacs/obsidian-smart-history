# plan/UII: uBlock Origin形式インポート機能 詳細プラン

## 目次

| ファイル | 説明 |
|----------|------|
| `00-overview.md` | 全体概要（本ファイル） |
| `01-phase1-foundation.md` | フェーズ1: 基盤構築 |
| `02-phase2-parser.md` | フェーズ2: フィルターパーサー実装 |
| `03-phase3-ui.md` | フェーズ3: UI実装 |
| `04-phase4-optimization.md` | フェーズ4: 統合・最適化 |
| `10-data-structures.md` | データ構造詳細設計 |
| `20-api-reference.md` | APIリファレンス |
| `30-test-strategy.md` | テスト戦略 |
| `40-dependencies.md` | 依存関係と実行順序 |

---

## 全体概要

### 機能の概要

Obsidian Smart History拡張機能に uBlock Origin形式のドメインフィルターインポート機能を追加します。

**ユーザーストーリー**:
> As a ユーザー,
> I want uBlock Origin形式のフィルターリストをインポートして使用できること,
> So that EasyListなどの既存リストを活用し、簡単にトラッカードメインを除外できる

### タスク範囲

- **タスクID**: UF-001 〜 UF-303
- **推定時間**: 約15時間
- **クリティカルパス**: UF-001 → UF-002 → UF-101 → UF-102 → UF-103 → UF-201 → UF-202 → UF-302 → UF-303
- **実装状況**: 実装完了 (2026年1月現在)

### アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Popup UI                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │         Domain Filter Settings Panel                          │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  Format Selector: [Simple ▼]           ← 追加            │  │  │
│  │  │                                                        │  │  │
│  │  │  [Simple Format UI (既存)]                             │  │  │
│  │  │  - ドメインリスト（1行1ドメイン）                        │  │  │
│  │  │                                                        │  │  │
│  │  │  [uBlock Format UI (追加)]                             │  │  │
│  │  │  - テキストエリア (uBlockリスト貼り付け)                │  │  │
│  │  │  - ファイル選択ボタン                                   │  │  │
│  │  │  - プレビュー（ルール数、例外数、エラー数）            │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  ublockImport.js (UIロジック)                         │
│  - フォーマット切替                                                    │
│  - テキスト入力プレビュー                                              │
│  - ファイル読み込み                                                    │
│  - 保存処理                                                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  ublockParser.js (パーサー)                          │
│  - parseUblockFilterLine(line)  ← 単行パース                         │
│  - parseUblockFilterList(text)  ← 複数行パース                      │
│  - parseOptions(optionsString) ← オプション解析                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  storage.js (データ永続化)                           │
│  StorageKeys.UBLOCK_RULES = {                                        │
│    blockRules: [...],                                                │
│    exceptionRules: [...],                                            │
│    metadata: { source, importedAt, lineCount }                      │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  ublockMatcher.js (マッチング)                       │
│  - isUrlBlocked(url, rules)                                         │
│  - matchesPattern(url, pattern)                                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  domainUtils.js (統合)                               │
│  - isDomainAllowed(url, ublockRules) ← 拡張                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## サポート構文一覧

### P0: 必須（初回実装）

| 構文 | 説明 | 例 | 実装状況 |
|------|------|-----|---------|
| `||hostname^` | ドメインと全サブドメインをブロック | `||example.com^` | 未実装 |
| `@@||hostname^` | 例外ルール | `@@||trusted.com^` | 未実装 |
| `*` | ワイルドカード | `||*.ads.net^` | 未実装 |
| `!` | コメント | `! Comment` | 未実装 |

### P1: 推奨（uf-101で実装）

| 構文 | 説明 | 例 | 実装状況 |
|------|------|-----|---------|
| `domain=` | 特定ドメインに制限 | `||tracker.com$domain=example.com` | 未実装 |
| `~domain=` | ドメインを除外 | `||tracker.com$domain=~trusted.com` | 未実装 |

### P2: オプション（uf-102で実装）

| 構文 | 説明 | 例 | 実装状況 |
|------|------|-----|---------|
| `3p` | サードパーティのみ | `||ad.com$3p` | 未実装 |
| `1p` | ファーストパーティのみ | `||script.com$1p` | 未実装 |
| `important` | 重要マーク | `||analytics.com$important` | 未実装 |

---

## フェーズ別タスク一覧

```
フェーズ1: 基盤構築 (合計: 50分)
├─ UF-001 [DIRECT]: 構成分析と要件定義 ... 30分 ✅
└─ UF-002 [DIRECT]: Storage拡張 .................. 20分 ✅

フェーズ2: フィルターパーサー実装 (合計: 4.5時間)
├─ UF-101 [TDD]: パーサーコア実装 .......... 2時間 ✅
├─ UF-102 [TDD]: オプション解析実装 ........ 1.5時間 ✅
└─ UF-103 [TDD]: domainUtils統合 ........... 1時間 ✅

フェーズ3: UI実装 (合計: 3.5時間)
├─ UF-201 [TDD]: インポートUI追加 .......... 2時間 ✅
├─ UF-202 [TDD]: ファイルアップロード機能 .. 1.5時間 ✅
├─ UF-203 [TDD]: URLインポート(オプション) .......... 1時間 ✅
└─ UF-204 [TDD]: エクスポート機能 ........................ 1時間 ✅

フェーズ4: 統合・最適化 (合計: 4.5時間)
├─ UF-301 [TDD]: 選択的オプション対応 ...... 1.5時間 ✅
├─ UF-302 [TDD]: パフォーマンス最適化 ...... 2時間 ✅
└─ UF-303 [TDD]: エラーハンドリング ......... 1時間 ✅
```

---

## 新規作成ファイル一覧

| ファイルパス | 目的 | タスク |
|--------------|------|--------|
| `src/utils/ublockParser.js` | uBlock形式フィルターパーサー | UF-101 |
| `src/utils/ublockMatcher.js` | uBlockルールマッチング処理 | UF-103 |
| `src/popup/ublockImport.js` | uBlockインポートUIロジック | UF-201 |
| `src/popup/ublockExport.js` | uBlockエクスポートUIロジック | UF-204 |
| `src/utils/__tests__/ublockParser.test.js` | ublockParser単体テスト | UF-101 |
| `src/utils/__tests__/ublockMatcher.test.js` | ublockMatcher単体テスト | UF-103 |
| `src/popup/__tests__/ublockImport.test.js` | UI統合テスト | UF-201 |

---

## 変更ファイル一覧

| ファイルパス | 変更内容 | タスク |
|--------------|----------|--------|
| `src/utils/storage.js` | StorageKeysにUBLOCK_RULES追加 | UF-002 |
| `src/utils/domainUtils.js` | isUrlBlocked()追加、isDomainAllowed()拡張 | UF-103 |
| `src/popup/popup.html` | インポートUI追加（セレクト、テキストエリア、ファイル入力等） | UF-201 |
| `src/popup/domainFilter.js` | uBlock形式統合 | UF-201 |

---

## Critical Files

既存コードとの統合において以下の5ファイルが最も重要です：

1. **`src/utils/domainUtils.js`** - 既存のドメインユーティリティ拡張対象
2. **`src/utils/storage.js`** - StorageKeysとDEFAULT_SETTINGSを拡張
3. **`src/popup/popup.html`** - インポートUI追加対象（domainPanel内）
4. **`src/popup/domainFilter.js`** - uBlockインポートUIを統合
5. **`src/utils/ublockParser.js`** - uBlock形式フィルターパーサー

---

## 次のステップ

各詳細プランを確認してください：

1. [`01-phase1-foundation.md`](01-phase1-foundation.md) - フェーズ1の詳細
2. [`02-phase2-parser.md`](02-phase2-parser.md) - フェーズ2の詳細
3. [`03-phase3-ui.md`](03-phase3-ui.md) - フェーズ3の詳細
4. [`04-phase4-optimization.md`](04-phase4-optimization.md) - フェーズ4の詳細
5. [`10-data-structures.md`](10-data-structures.md) - データ構造詳細
6. [`20-api-reference.md`](20-api-reference.md) - APIリファレンス
7. [`30-test-strategy.md`](30-test-strategy.md) - テスト戦略
8. [`40-dependencies.md`](40-dependencies.md) - 依存関係

---

## 実装状況

2026年1月現在、すべての機能が実装・テスト・統合され、本番環境で動作しています。

### 実装済み機能

| 機能 | 実装状況 |
|------|----------|
| uBlock形式パーサー | ✅ 完了 |
| uBlock形式マッチャー | ✅ 完了 |
| ドメインフィルターUI | ✅ 完了 |
| ファイルアップロード | ✅ 完了 |
| URLインポート | ✅ 完了 |
| エクスポート機能 | ✅ 完了 |
| パフォーマンス最適化 | ✅ 完了 |
| エラーハンドリング | ✅ 完了 |
| 単体テスト | ✅ 完了 |
| 統合テスト | ✅ 完了 |