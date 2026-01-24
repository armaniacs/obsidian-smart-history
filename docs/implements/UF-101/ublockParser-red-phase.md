# UF-101 Redフェーズ（失敗するテスト作成）

## 作成日時

2026-01-24

## 対象機能

uBlockフィルターパーサーコア実装

## 作成したテストファイル

- **テストファイル**: `src/utils/__tests__/ublockParser.test.js`
- **テストケース数**: 22テストケース（主テスト18 + ヘルパー関数4）

## テストケース一覧

### 1. parseUblockFilterLine - 正常系（7テスト）

| ID | テスト名 | 日本語コメント | 信頼性 |
|----|----------|----------------|--------|
| 1 | 基本ドメインブロック | 基本的な||example.com^パターンのパースを確認 | 🟢 |
| 2 | 例外ルールのパース | @@||trusted.com^の例外ルール認識を確認 | 🟢 |
| 3 | ワイルドカードドメインのパース | ||*.ads.net^のワイルドカード対応を確認 | 🟢 |
| 4 | コメント行はスキップされる | !で始まる行のスキップを確認 | 🟢 |
| 5 | 空行はスキップされる | 空文字列のスキップを確認 | 🟢 |
| 6 | サブドメインを含むパース | ||sub.example.com^のサブドメイン対応を確認 | 🟢 |

### 2. parseUblockFilterLine - 異常系（5テスト）

| ID | テスト名 | 日本語コメント | 信頼性 |
|----|----------|----------------|--------|
| 7 | || プレフィックスがない場合は無効 | 必須プレフィックスの検証を確認 | 🟢 |
| 8 | ^ サフィックスがない場合は無効 | 必須サフィックスの検証を確認 | 🟢 |
| 9 | 不正文字を含むドメインは無効 | @等の不正文字の検証を確認 | 🟡 |
| 10 | 空パターン（||^ のみ）は無効 | 空パターンの検証を確認 | 🟡 |
| 11 | null 入力は無効 | nullセーフェンスを確認 | 🟢 |

### 3. parseUblockFilterLine - エッジケース（2テスト）

| ID | テスト名 | 日本語コメント | 信頼性 |
|----|----------|----------------|--------|
| 12 | 複数連続ワイルドカードのパース | 複数の*を含むパターンの処理を確認 | 🟡 |
| 13 | 前後空白を含む行はトリムしてパース | 空白トリムの柔軟性を確認 | 🟢 |

### 4. parseUblockFilterList（2テスト）

| ID | テスト名 | 日本語コメント | 信頼性 |
|----|----------|----------------|--------|
| 14 | 複数行の一括パース（正常系） | 複数行のパースとルール分類を確認 | 🟢 |
| 15 | 大量データ正常系（1,000行） | スケーラビリティを確認 | 🟢 |

### 5. パフォーマンステスト（2テスト）

| ID | テスト名 | 日本語コメント | 信頼性 |
|----|----------|----------------|--------|
| 16 | 1,000行パースは1秒以内に完了する | パフォーマンス要件の確認（1秒以内） | 🟢 |
| 17 | 無効行多数を含む10,000行のパース | 最大サイズでの処理確認（5秒以内） | 🟢 |

### 6. ヘルパー関数 - isCommentLine（2テスト）

| ID | テスト名 | 日本語コメント | 信頼性 |
|----|----------|----------------|--------|
| 18 | !で始まる行はコメント行と判定される | コメント行判定を確認 | 🟢 |
| 19 | !で始まらない行はコメント行と判定されない | 誤判定の確認 | 🟢 |

### 7. ヘルパー関数 - isEmptyLine（3テスト）

| ID | テスト名 | 日本語コメント | 信頼性 |
|----|----------|----------------|--------|
| 20 | 空文字列は空行と判定される | 空文字列判定を確認 | 🟢 |
| 21 | 空白のみの文字列は空行と判定される | 空白のみの行判定を確認 | 🟡 |
| 22 | 文字を含む行は空行と判定されない | 誤判定の確認 | 🟢 |

### 8. ヘルパー関数 - isValidRulePattern（3テスト）

| ID | テスト名 | 日本語コメント | 信頼性 |
|----|----------|----------------|--------|
| 23 | 有効なルールパターンはtrueを返す | 有効パターン判定を確認 | 🟢 |
| 24 | ||プレフィックスがないパターンはfalseを返す | プレフィックス検証を確認 | 🟢 |
| 25 | ^サフィックスがないパターンはfalseを返す | サフィックス検証を確認 | 🟢 |

### 9. ヘルパー関数 - generateRuleId（2テスト）

| ID | テスト名 | 日本語コメント | 信頼性 |
|----|----------|----------------|--------|
| 26 | 同じ入力からは同じIDが生成される | 一貫性を確認 | 🟡 |
| 27 | 異なる入力からは異なるIDが生成される | 一意性を確認 | 🟡 |

### 10. ヘルパー関数 - parseOptions（2テスト）

| ID | テスト名 | 日本語コメント | 信頼性 |
|----|----------|----------------|--------|
| 28 | オプションなしのルールは空オブジェクトを返す | 基本挙動を確認 | 🟡 |
| 29 | domainオプションをパースできる | domainオプション解析のプレビューを確認 | 🟡 |

## 期待される失敗内容

以下の関数はまだ実装されていないため、テスト実行時に以下のエラーが発生することが予想されます：

```
TypeError: Cannot destructure property 'parseUblockFilterLine' of '../ublockParser.js' as it is undefined.

ReferenceError: parseUblockFilterLine is not defined.
```

## 実装予定の関数

### メイン関数
- `parseUblockFilterLine(line: string): UblockRule | null` - 単行パース
- `parseUblockFilterList(text: string): UblockRules` - 複数行一括パース

### ヘルパー関数
- `isCommentLine(line: string): boolean` - コメント判定
- `isEmptyLine(line: string): boolean` - 空行判定
- `isValidRulePattern(line: string): boolean` - 有効パターン判定
- `generateRuleId(rawLine: string): string` - ルールID生成
- `parseOptions(optionsString: string): object` - オプション解析

## データ構造（plan/UII/10-data-structures.md参照）

```javascript
// 単一ルール構造
{
  id: string;              // 一意ID
  rawLine: string;         // 元の行
  type: 'block' | 'exception';
  domain: string | null;
  pattern: string;
  options: object;
}

// ルールセット構造
{
  blockRules: UblockRule[];
  exceptionRules: UblockRule[];
  metadata: {
    source: string;
    importedAt: number;
    lineCount: number;
    ruleCount: number;
  }
}
```

## 日本語コメントガイドライン

各テストには以下のコメントを含めています：

1. **【テスト目的】**: このテストで何を確認するか
2. **【テスト内容】**: 具体的にどのような処理をテストするか
3. **【期待される動作】**: 正常に動作した場合の結果
4. **信頼性レベル**: 🟢（資料参照）🟡（推測）🔴（推測なし）
5. **【確認内容】**: 各expectステートメントの意図

## 次のフェーズ（Green）への引き渡し事項

### Greenフェーズで実装すべき内容

1. **ファイル作成**: `src/utils/ublockParser.js` を新規作成

2. **関数実装**:
   - `parseUblockFilterLine()` - 単行パース（22テストを通す）
   - `parseUblockFilterList()` - 複数行一括パース（2テストを通す）
   - `isCommentLine()` - コメント判定（2テストを通す）
   - `isEmptyLine()` - 空行判定（3テストを通す）
   - `isValidRulePattern()` - 有効パターン判定（3テストを通す）
   - `generateRuleId()` - ルールID生成（2テストを通す）
   - `parseOptions()` - オプション解析（2テストを通す）

3. **実装順序推奨**:
   1. ヘルパー関数（isCommentLine, isEmptyLine, isValidRulePattern, generateRuleId, parseOptions）
   2. parseUblockFilterLine（正常系 → 異常系 → エッジケース）
   3. parseUblockFilterList
   4. パフォーマンス最適化

### 品質目標

- **テストカバレッジ**: 行カバレッジ95%以上
- **パフォーマンス**: 1,000行パース < 1秒、10,000行パース < 5秒
- **コードスタイル**: 既存コード（domainUtils.js）に従う

---

## 参照した設計文書

| 種類 | 信頼性レベル |
|------|-------------|
| `plan/UII/00-overview.md` | 🟢 |
| `plan/UII/02-phase2-parser.md` | 🟢 |
| `plan/UII/10-data-structures.md` | 🟢 |
| `plan/UII/30-test-strategy.md` | 🟢 |
| `docs/implements/UF-101/tdd-testcases.md` | 🟢 |
| `docs/implements/UF-101/tdd-requirements.md` | 🟢 |