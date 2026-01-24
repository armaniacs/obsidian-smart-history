# uBlock Origin形式インポート機能 実装計画

## 概要

- **機能名**: uBlock Origin形式インポート機能
- **タスク範囲**: UF-001 から UF-303
- **推定時間**: 約15時間（並列実行時は約13時間）
- **クリティカルパス**: UF-001 → UF-002 → UF-101 → UF-102 → UF-103 → UF-201 → UF-202 → UF-302 → UF-303

---

## 1. 全体アーキテクチャ設計

### 1.1 ファイル構成

#### 新規作成ファイル
| ファイルパス | 目的 |
|--------------|------|
| `src/utils/ublockParser.js` | uBlock Origin形式フィルターパーサー |
| `src/utils/ublockMatcher.js` | uBlockルールによるURLマッチング処理 |
| `src/popup/ublockImport.js` | uBlockインポートUIロジック |
| `src/popup/ublockExport.js` | uBlockエクスポートUIロジック |
| `src/utils/__tests__/ublockParser.test.js` | 単体テスト |
| `src/utils/__tests__/ublockMatcher.test.js` | 単体テスト |
| `src/popup/__tests__/ublockImport.test.js` | UI統合テスト |
| `docs/implements/UF-001/direct-setup.md` | DIRECTタスク設定ドキュメント |
| `docs/implements/UF-001/direct-verify.md` | DIRECTタスク確認ドキュメント |
| `docs/implements/UF-xxx/tdd-*.md` | 各TDDタスクドキュメント |

#### 変更ファイル
| ファイルパス | 変更内容 |
|--------------|----------|
| `src/utils/storage.js` | `StorageKeys`に`UBLOCK_RULES`追加 |
| `src/utils/domainUtils.js` | `isUrlBlocked()`関数追加、`isDomainAllowed()`拡張 |
| `src/popup/popup.html` | インポートUI追加 |
| `src/popup/domainFilter.js` | uBlock形式統合 |

---

## 2. サポート範囲（uBlock Origin構文）

| 構文 | サポート | 実装優先度 |
|------|---------|-----------|
| `||hostname^` | ✅ | P0 (必須) |
| `@@||hostname^` | ✅ | P0 (必須) |
| `*` (ワイルドカード) | ✅ | P0 (必須) |
| `!` (コメント) | ✅ | P0 (必須) |
| `domain=` | ✅ | P1 (推奨) |
| `3p` / `1p` | ✅ | P2 (オプション) |
| `$important` | ✅ | P2 (オプション) |

**非サポート**:
- `##` (要素隠しルール) - 本プロジェクトの用途外
- `/$/` (正規表現ルール) - パフォーマンス懸念により除外

---

## 3. データ構造設計

```javascript
// 単一ルール構造
{
  id: string;              // 一意ID（ハッシュ生成）
  rawLine: string;         // 元の行
  type: 'block' | 'exception';
  domain: string | null;   // ドメインパターン
  pattern: string;         // マッチングパターン
  options: {
    thirdParty?: boolean;
    firstParty?: boolean;
    important?: boolean;
    domains?: string[];
  }
}

// ルールセット構造
{
  blockRules: UblockRule[];
  exceptionRules: UblockRule[];
  metadata: {
    source: 'paste' | 'file' | 'url';
    importedAt: number;
    lineCount: number;
  }
}
```

---

## 4. 各フェーズの実装順序

```
UF-001 [DIRECT]: 構成分析と要件定義 (30分)
    ↓
UF-002 [DIRECT]: Storage拡張 (20分)
    ↓
UF-101 [TDD]: パーサーコア実装 (2時間)
    ↓
UF-102 [TDD]: オプション解析実装 (1.5時間)
    ↓
UF-103 [TDD]: domainUtils統合 (1時間)
    ↓
UF-201 [TDD]: インポートUI追加 (2時間)
    ↓
UF-202 [TDD]: ファイルアップロード機能 (1.5時間)
    ├─────────────┬──────────────────┐
    ↓             ↓                  ↓
UF-204 [TDD]   UF-301 [TDD]        UF-302 [TDD]
エクスポート     オプション対応      パフォーマンス最適化
(1時間)        (1.5時間)           (2時間)
    ↓                              ↓
                         UF-303 [TDD]
                         エラーハンドリング
                         (1時間)
```

---

## 5. Critical Files

以下の5ファイルが最も重要です：

1. **`src/utils/domainUtils.js`** - 既存のドメインユーティリティ拡張対象
2. **`src/utils/storage.js`** - StorageKeysとDEFAULT_SETTINGSを拡張
3. **`src/popup/popup.html`** - インポートUI追加対象（domainPanel内）
4. **`src/popup/domainFilter.js`** - uBlockインポートUIを統合
5. **`plan/TODO.md`** - タスク定義書

---

## 6. API/関数設計

### ublockParser.js
```javascript
export function parseUblockFilterLine(line): UblockRule | null;
export function parseUblockFilterList(text): UblockRules;
export function isCommentLine(line): boolean;
export function isEmptyLine(line): boolean;
```

### ublockMatcher.js
```javascript
export function isUrlBlocked(url, rules, context?): boolean;
export function matchesPattern(url, pattern): boolean;
```

### storage.js 拡張
```javascript
StorageKeys.UBLOCK_RULES = 'ublock_rules';
StorageKeys.UBLOCK_FORMAT_ENABLED = 'ublock_format_enabled';
```

---

## 7. 検証計画

### 単体テスト目標カバレッジ
| モジュール | 行カバレッジ目標 |
|-----------|-----------------|
| ublockParser.js | 95% |
| ublockMatcher.js | 90% |
| domainUtils.js (拡張) | 80% |

### 推定テストケース数
- ublockParser.test.js: 20-25ケース
- ublockMatcher.test.js: 15-20ケース
- ublockImport.test.js: 10-15ケース

---

## 8. DIRECTとTDDタスクの実行方法

### DIRECTタスク (UF-001, UF-002)
1. `direct-setup.md` 作成 - 設定作業の実行
2. 設定作業実施
3. `direct-verify.md` 作成 - 設定確認

### TDDタスク (UF-101〜UF-303)
1. `tdd-requirements.md` - 要件定義
2. `tdd-testcases.md` - テストケース作成
3. `tdd-red.md` - 失敗テスト実装
4. `tdd-green.md` - 最小実装
5. `tdd-refactor.md` - リファクタリング
6. `tdd-verify-complete.md` - 品質確認

---

## 9. マイルストーン

| マイルストーン | 完了タスク | 推定時間 |
|--------------|-----------|---------|
| M1: 基盤準備完了 | UF-001, UF-002 | 50分 |
| M2: パーサー完了 | UF-101, UF-102, UF-103 | 4.5時間 |
| M3: UI基本機能完了 | UF-201, UF-202 | 3.5時間 |
| M4: 全機能完了 | UF-204, UF-301, UF-302, UF-303 | 5.5時間 |