# フェーズ1: 基盤構築

## 概要

uBlock Origin形式インポート機能の基盤を構築します。構文分析、要件定義、Storage準備を実施します。

## タスク一覧

| タスクID | タスク名 | タイプ | 推定時間 | 優先度 | 依存 |
|----------|---------|--------|---------|--------|------|
| UF-001 | 構成分析と要件定義 | DIRECT | 30分 | P0 | なし |
| UF-002 | Storage拡張 | DIRECT | 20分 | P0 | UF-001 |

---

## UF-001: 構成分析と要件定義 [DIRECT]

### 概要

- **タスク種別**: DIRECT（ドキュメント・設計作業）
- **推定時間**: 30分
- **ステータス**: ✅ 完了 (2026年1月実装)

### 作業内容

#### 1. uBlock Origin 静的フィルター構文の詳細分析

| 構文 | カテゴリ | 採用決定 | 文書化状況 |
|------|---------|---------|-----------|
| `||hostname^` | ドメインブロック | ✅ 採用 | ✅ 完了 |
| `@@||hostname^` | 例外ルール | ✅ 採用 | ✅ 完了 |
| `*` | ワイルドカード | ✅ 採用 | ✅ 完了 |
| `!` | コメント | ✅ 採用 | ✅ 完了 |
| `domain=` | ドメイン制限 | ✅ 採用 | ✅ 完了 |
| `~domain=` | ドメイン除外 | ✅ 採用 | ✅ 完了 |
| `3p`/`1p` | パーティ指定 | ✅ 採用 | ✅ 完了 |
| `important` | 重要マーク | ✅ 採用 | ✅ 完了 |
| `##` | 要素隠し | ❌ 非サポート | ✅ 完了 |
| `/$/` | 正規表現 | ❌ 非サポート | ✅ 完了 |

#### 2. サポート範囲の策定

**採用原則**:
- ドメインブロック関連のみ実装
- 要素隠し（`##`）は除外（本プロジェクトの用途外）
- 正規表現（`/$/`）は除外（パフォーマンス懸念）

**マッチング優先順位**:
```
1. 例外ルール（@@）
   └─ $important 付きの例外が最優先
   └─ 一致すれば許可

2. 通常ブロックルール
   └─ $important 付きが優先
   └─ ドメイン一致
   └─ ワイルドカード一致

3. オプション評価
   └─ $domain= 制限
   └─ $3p/$1p
   └─ 最終判定
```

#### 3. 既存 domainUtils.js との整合性確認

| 既存関数 | 再利用可否 | 適用箇所 |
|----------|-----------|----------|
| `extractDomain(url)` | ✅ 可能 | isUrlBlocked() |
| `matchesPattern(domain, pattern)` | ✅ 可能 | isUrlBlocked() |
| `isDomainInList(domain, list)` | ✅ 可能 | 単純マッチ用 |
| `isValidDomain(domain)` | ✅ 可能 | パース時検証 |

**統合方針**:
- 既存の `isDomainAllowed()` はそのまま保持
- 新しい `isUrlBlocked(url, ublockRules)` を追加
- simple形式とuBlock形式の共存

#### 4. データ構造設計

```typescript
// 単一ルール
interface UblockRule {
  id: string;
  rawLine: string;
  type: 'block' | 'exception';
  domain: string | null;
  pattern: string;
  options: UblockRuleOptions;
}

// ルールセット
interface UblockRules {
  blockRules: UblockRule[];
  exceptionRules: UblockRule[];
  metadata: UblockMetadata;
}
```

### 生成ドキュメント

| ドキュメント | パス | 内容 |
|-------------|------|------|
| `direct-setup.md` | `/docs/implements/UF-001/direct-setup.md` | 設定作業記録 |
| `direct-verify.md` | `/docs/implements/UF-001/direct-verify.md` | 設定確認 |

### 結果

- ✅ 構文分析完了
- ✅ サポート範囲策定完了
- ✅ 既存コード整合性確認完了
- ✅ データ構造設計完了

---

## UF-002: Storage拡張 [DIRECT]

### 概要

- **タスク種別**: DIRECT（コード設定作業）
- **推定時間**: 20分
- **ステータス**: ✅ 完了 (2026年1月実装)
- **依存**: UF-001

### 作業内容

#### 1. StorageKeys 追加

**対象ファイル**: `src/utils/storage.js`

**追加コード**:
```javascript
export const StorageKeys = {
  // ... 既存キー
  // uBlock形式用
  UBLOCK_RULES: 'ublock_rules',
  UBLOCK_FORMAT_ENABLED: 'ublock_format_enabled',
};
```

#### 2. DEFAULT_SETTINGS 追加

**対象ファイル**: `src/utils/storage.js`

**追加コード**:
```javascript
const DEFAULT_SETTINGS = {
  // ... 既存設定
  // uBlock形式ルール（空）
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
  // uBlock形式有効化フラグ（デフォルト無効）
  [StorageKeys.UBLOCK_FORMAT_ENABLED]: false,
};
```

#### 3. 既存ドメインリスト形式との互換性

**対応策**:
- 既存の `DOMAIN_WHITELIST` / `DOMAIN_BLACKLIST` は変更しない
- uBlock形式は新規キーとして追加
- 両形式の共存を許可

### 更新ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/utils/storage.js` | StorageKeys に UBLOCK_RULES, UBLOCK_FORMAT_ENABLED を追加 |
| `src/utils/storage.js` | DEFAULT_SETTINGS に uBlock用設定を追加 |

### 検証方法

```javascript
// テストコードで検証
import { getSettings } from '../utils/storage.js';

test('StorageKeysにUBLOCKルールキーが含まれる', () => {
  expect(StorageKeys.UBLOCK_RULES).toBe('ublock_rules');
  expect(StorageKeys.UBLOCK_FORMAT_ENABLED).toBe('ublock_format_enabled');
});

test('DEFAULT_SETTINGSにuBlockルールが含まれる', async () => {
  const settings = await getSettings();
  expect(settings.ublock_rules).toBeDefined();
  expect(settings.ublock_rules.blockRules).toEqual([]);
  expect(settings.ublock_rules.exceptionRules).toEqual([]);
});
```

### 出力ドキュメント

| ドキュメント | パス |
|-------------|------|
| `direct-setup.md` | `/docs/implements/UF-002/direct-setup.md` |
| `direct-verify.md` | `/docs/implements/UF-002/direct-verify.md` |

---

## マイルストーン M1: 基盤準備完了

- [x] UF-001 構成分析と要件定義
- [ ] UF-002 Storage拡張

**完了条件**:
- ✅ uBlock構文の分析完了
- ✅ uBlock構文の分析完了
- ✅ StorageKeys 追加
- ✅ DEFAULT_SETTINGS 追加
- ✅ ユニットテスト作成・通過

---

## 次のステップ

UF-002完了後、フェーズ2（フィルターパーサー実装）へ進みます：

- **UF-101 [TDD]**: uBlockフィルターパーサーコア実装