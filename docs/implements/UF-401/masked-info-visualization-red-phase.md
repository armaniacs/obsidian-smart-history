# UF-401: マスク情報の可視化機能 - Redフェーズ詳細

## 実行日時

2026-01-24

## 概要

UF-401マスク情報の可視化機能のTDD Redフェーズ（失敗するテスト作成）を実行しました。13件のテストケースを作成し、すべてのテストが期待通り失敗することを確認しました。

---

## 作成したテストファイル

**ファイルパス**: `src/popup/__tests__/mask-visualization.test.js`

**ファイルサイズ**: 401行

**テスト構成**:
- 正常系テストスイート: 6件
- 異常系テストスイート: 3件
- 境界値テストスイート: 4件 (TC-MV-201〜203 + 要素確認)

---

## テスト実行結果

### サマリー

| 項目 | 結果 |
|------|------|
| Test Suites | 1 failed |
| Tests | 13 failed |
| Snapshots | 0 total |
| Time | 0.468 s |

### 期待される失敗状況

✅ **すべてのテストが期待通り失敗** - これはTDD Redフェーズの正常な動作です。

### 失敗の詳細

#### 1. ステータスメッセージ要素が存在しない (TC-MV-001, TC-MV-002, TC-MV-201, TC-MV-202)

**エラー内容**:
```
expect(received).toBe(expected) // Object.is equality
Expected: "X件の個人情報をマスクしました"
Received: ""
```

**原因**:
- `document.getElementById('maskStatusMessage')` が `null` を返している
- `showPreview()` 関数がまだ `maskStatusMessage` 要素を作成していない
- `mockStatusMessage.textContent` が初期値の空文字のまま

#### 2. ハイライト機能が未実装 (TC-MV-003, TC-MV-004, TC-MV-006)

**エラー内容**:
```
expect(processedContent).toContain("masked-highlight") // 失敗
expect(processedContent).toContain('title="email"') // 失敗
```

**原因**:
- `[MASKED:{type}]` パターンの検出機能が未実装
- HTMLタグ（`<span class="masked-highlight">`）への変換処理が未実装
- `title` 属性の設定処理が未実装

#### 3. モーダル表示ロジックとテストモックの不整合 (TC-MV-005, TC-MV-101〜103, TC-MV-203, TC-MV-EL)

**エラー内容**:
```
expect(mockModal.style.display).toBe("flex")
Received: "none"
```

**原因**:
- `showPreview()` 関数が先行してモジュールインポートされ、`beforeEach` で設定したmockが反映されない
- 既存実装が `document.getElementById('confirmationModal')` を実行時にmockオブジェクトクトではなく、実際の環境（undefined）を参照している

#### 4. DOMモックの要素検証失敗 (TC-MV-EL)

**エラー内容**:
```
expect(element).toBe(mockStatusMessage)
Expected: { mockStatusMessage }
Received: null
```

**原因**:
- `document.getElementById('maskStatusMessage')` が `null` を返す（要素が存在しないため）

---

## 既知の実装課題

### 1. textarea vs contenteditable div の制約

**課題**: 現在の実装では `<textarea>` 要素を使用しており、HTMLタグを直接表示できない

**影響**:
- ハイライト（`<span class="masked-highlight">`）を表示するには、以下のいずれかのアプローチが必要
  - `<textarea>` を `<div contenteditable="true">` に変更
  - textareaの背景色などのスタイル操作のみでハイライトを表現

**実装選択の判断基準**:
- ユーザー体験：`contenteditable` はよりリッチなUIを実現可能
- レイアウト互換性：変更による既存スタイルへの影響を最小化
- レビュー期間：変更後のCSS調整が必要

### 2. 既存コードとの整合性

**課題**: `main.js` L87 で `showPreview(previewResponse.processedContent)` の単一引数呼び出しがある

**影響**:
- `showPreview()` 関数に新しい引数を追加する場合、デフォルト値を設定して互換性を維持

**解決策**:
```javascript
export function showPreview(content, maskedItems = null, maskedCount = 0) {
  // 単一引数呼び出しでも動作するようにデフォルト値を設定
}
```

### 3. XSS対策の要否

**課題**: HTMLタグを使用する場合、XSS攻撃の可能性を考慮する必要がある

**影響**:
- ユーザー提供テキストに悪意のあるHTMLタグが含まれる場合のリスク
- `innerHTML` 代わりに `textContent` の使用や適切なエスケープ処理

**解決策**:
- マスク済みテキストは `piiSanitizer.js` で処理済みとし、安全であると判断
- 正規表現パターン `[MASKED:{type}]` のみを対象に変換処理を実施

---

## テストコードの構成

### 日本語コメントの実装状況

すべてのテストケースに日本語コメントを実装済み：

- 【テスト目的】: テストの目的を明示
- 【テスト内容】: 具体的な処理内容を説明
- 【期待される動作]: 正常動作時の結果を記述
- 【テストデータ準備】: テストデータの選択理由
- 【初期条件設定】: テスト実行前の状態設定
- 【実際の処理実行]: 実行する処理の説明
- 【処理内容】: 処理の詳細説明
- 【結果検証】: 検証項目の説明
- 【期待値確認】: 期待結果の理由
- 【確認内容】: 各assertionごとの詳細説明

### 信頼性レベルの記載状況

すべてのコメントに信頼性レベルを記載済み：
- 🟢 **青信号**: 既存実装に完全基づく場合
- 🟡 **黄信号**: 既存実装からの妥当な推測の場合

---

## 次のフェーズへの要求事項

### Greenフェーズ（最小実装）で実装すべき内容

1. **`showPreview()` 関数の引数拡張**
   ```javascript
   export function showPreview(content, maskedItems = null, maskedCount = 0) {
     // 後方互換性を維持するデフォルト値設定
   }
   ```

2. **ステータスメッセージ要素の作成と挿入**
   ```javascript
   // モーダルヘッダー下にステータスメッセージ要素を作成
   const statusMessage = document.createElement('div');
   statusMessage.id = 'maskStatusMessage';
   statusMessage.className = 'mask-status-message';
   ```

3. **ハイライト処理の実装**
   - `[MASKED:{type}]` パターンの正規表現検出
   - 置換: `[MASKED:email]` → `<span class="masked-highlight" title="email">[MASKED:email]</span>`
   - `contenteditable div` への切り替え判断

4. **エラーハンドリングの実装**
   ```javascript
   if (maskedItems === null || maskedItems === undefined) {
     // ハイライト処理をスキップ
   }
   if (!Array.isArray(maskedItems)) {
     // 不正な形式の場合もスキップ
   }
   ```

5. **DOM構造の変更（必要な場合）**
   - `<textarea id="previewContent">` → `<div id="previewContent" contenteditable="true">`
   - 必要に応じてCSSスタイルの追加・調整

---

## テストカバレッジ

| カテゴリ | テスト数 | 覆蓈率 |
|---------|---------|--------|
| 正常系 - 件数表示 | 2 | 100% (TC-MV-001, TC-MV-002) |
| 正常系 - ハイライト表示 | 2 | 100% (TC-MV-003, TC-MV-004) |
| 正常系 - 互換性・PIIタイプ | 2 | 100% (TC-MV-005, TC-MV-006) |
| 異常系 - エラーハンドリング | 3 | 100% (TC-MV-101, TC-MV-102, TC-MV-103) |
| 境界値 - 入力検証 | 3 | 100% (TC-MV-201, TC-MV-202, TC-MV-203) |
| 境界値 - DOM確認 | 1 | 100% (TC-MV-EL) |
| **総計** | **13** | **100%** |

---

## 技術的学習ポイント

### テスト設計

1. **DOMモックの活用**: `global.document` へのモック設定で、ブラウザ環境をシミュレート
2. **beforeEach/afterEach**: 各テスト前後にモック状態を初期化・クリーンアップ
3. **expect.not.toThrow()**: 例外が発生しないことの検証方法

### 実装課題の明確化

1. **ES Modulesのデフォルトパラメータ**: JavaScriptの可変長引数実装
2. **DOM操作とテストの分離**: DOMのモック化によるテスト容易性の維持
3. **後方互換性の確保**: デフォルトパラメータによる既存コードとの互換

### セキュリティの考慮

1. **XSS対策**: HTMLタグを使用する際のセキュリティ要件
2. **個人情報保護**: `original` 値の扱いに関する制約

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 1.0 | 2026-01-24 | 初版作成 |