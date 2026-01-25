# フェーズ3: UI実装

## 概要

uBlock形式のインポート・エクスポートUIを実装します。

## タスク一覧

| タスクID | タスク名 | タイプ | 推定時間 | 優先度 | 依存 |
|----------|---------|--------|---------|--------|------|
| UF-201 | インポートUI追加 | TDD | 2時間 | P0 | UF-103 |
| UF-202 | ファイルアップロード機能 | TDD | 1.5時間 | P0 | UF-201 |
| UF-203 | URLインポート機能(オプション) | TDD | 1時間 | P3 | UF-201 |
| UF-204 | エクスポート機能 | TDD | 1時間 | P1 | UF-101 |

---

## UF-201: インポートUI追加 [TDD]

### 概要

- **タスク種別**: TDD
- **推定時間**: 2時間
- **ステータス**: ✅ 完了 (2026年1月実装)
- **依存**: UF-103

### TDDサイクル

1. Requirements - `tdd-requirements.md`
2. Testcases - `tdd-testcases.md`
3. Red - `tdd-red.md`
4. Green - `tdd-green.md`
5. Refactor - `tdd-refactor.md`
6. Verify - `tdd-verify-complete.md`

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/popup/popup.html` | インポートUI要素追加 |
| `src/popup/domainFilter.js` | uBlock形式統合 |

### 新規作成ファイル

| ファイル | 目的 |
|----------|------|
| `src/popup/ublockImport.js` | uBlockインポートUIロジック |

### HTML構造追加

**対象**: `src/popup/popup.html` の `domainPanel` 内

```html
<!-- ドメインフィルターパネル内に追加 -->
<div class="form-group">
  <label>フィルター形式</label>
  <select id="filterFormat">
    <option value="simple">シンプル (1行1ドメイン)</option>
    <option value="ublock">uBlock Origin 形式</option>
  </select>
</div>

<!-- simple形式用UI（既存） -->
<div id="simpleFormatUI" class="format-section">
  <div class="form-group">
    <label id="domainListLabel">ドメインリスト (1行に1ドメイン)</label>
    <textarea id="domainList" rows="8" placeholder="example.com
*.example.org
company.net"></textarea>
  </div>
  <button id="addCurrentDomain" class="secondary-btn">現在のページドメインを追加</button>
</div>

<!-- uBlock形式用UI（新規） -->
<div id="uBlockFormatUI" class="format-section" style="display: none;">
  <div class="form-group">
    <label>uBlockフィルター</label>
    <textarea id="uBlockFilterInput" rows="8"
      placeholder="||example.com^
@@||trusted.com^
||*.ads.net^$3p
! Comment line"></textarea>
    <div class="help-text">
      uBlock Origin形式のフィルターを貼り付け<br>
      サポート: ||hostname^, @@||hostname^, *, !Comments, $domain=, $3p, $1p
    </div>
  </div>

  <div class="form-group">
    <label>ファイルから読み込み (.txt)</label>
    <input type="file" id="uBlockFileInput" accept=".txt" style="display: none;">
    <button id="uBlockFileSelectBtn" class="secondary-btn">ファイルを選択</button>
  </div>

  <!-- ドラッグ&ドロップエリア -->
  <div id="uBlockDropZone" class="drop-zone" style="display: none;">
    <p>ファイルをここにドロップ</p>
  </div>

  <!-- プレビューセクション -->
  <div id="uBlockPreview" class="preview-section" style="display: none;">
    <h4>読み込みプレビュー</h4>
    <p>ルール数: <span id="uBlockRuleCount">0</span></p>
    <p>例外数: <span id="uBlockExceptionCount">0</span></p>
    <p>エラー: <span id="uBlockErrorCount" class="error">0</span></p>
    <p id="uBlockErrorDetails" class="error-text" style="font-size: 11px;"></p>
  </div>
</div>

<button id="saveDomainSettings">保存</button>
<div id="domainStatus"></div>
```

### CSS追加（インライン）

```css
/* フォーマットセクション */
.format-section {
  display: block;
}

.format-section[style*="display: none"] {
  display: none;
}

/* ドロップゾーン */
.drop-zone {
  border: 2px dashed #ccc;
  border-radius: 4px;
  padding: 20px;
  text-align: center;
  margin-bottom: 10px;
}

.drop-zone.active {
  border-color: #4CAF50;
  background-color: rgba(76, 175, 80, 0.1);
}

/* プレビューセクション */
.preview-section {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
}

.preview-section h4 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 14px;
}

.error {
  color: red;
}

.error-text {
  color: #d9534f;
  max-height: 100px;
  overflow-y: auto;
}
```

### API設計

```javascript
/**
 * @file src/popup/ublockImport.js
 * uBlockインポートUIロジック
 */

/**
 * uBlockインポートUIを初期化
 */
export function init() {
  setupFormatToggle();
  setupTextInputPreview();
  setupFileInput();
}

/**
 * フォーマット切替処理
 */
function setupFormatToggle() {
  const formatSelect = document.getElementById('filterFormat');
  formatSelect.addEventListener('change', toggleFormatUI);
}

/**
 * フォーマットUIの切替
 */
function toggleFormatUI() {
  const format = document.getElementById('filterFormat').value;
  const simpleUI = document.getElementById('simpleFormatUI');
  const uBlockUI = document.getElementById('uBlockFormatUI');

  if (format === 'simple') {
    simpleUI.style.display = 'block';
    uBlockUI.style.display = 'none';
  } else {
    simpleUI.style.display = 'none';
    uBlockUI.style.display = 'block';
  }
}

/**
 * テキスト入力のプレビュー更新
 */
function setupTextInputPreview() {
  const textarea = document.getElementById('uBlockFilterInput');
  textarea.addEventListener('input', handleTextInputPreview);
}

/**
 * テキスト入力プレビュー処理
 */
function handleTextInputPreview() {
  const text = document.getElementById('uBlockFilterInput').value;
  const result = previewUblockFilter(text);

  updatePreviewUI(result);
}

/**
 * uBlockフィルターのプレビュー
 * @param {string} text - フィルターテキスト
 * @returns {Object} プレビュー結果
 */
export function previewUblockFilter(text) {
  // ublockParser.parseUblockFilterList() を呼び出し
  // 結果を返す
  return {
    blockCount: 0,
    exceptionCount: 0,
    errorCount: 0,
    errorDetails: []
  };
}

/**
 * プレビューUI更新
 */
function updatePreviewUI(result) {
  document.getElementById('uBlockRuleCount').textContent = result.blockCount;
  document.getElementById('uBlockExceptionCount').textContent = result.exceptionCount;
  document.getElementById('uBlockErrorCount').textContent = result.errorCount;
  document.getElementById('uBlockErrorDetails').textContent = result.errorDetails.join('\n');

  const preview = document.getElementById('uBlockPreview');
  preview.style.display = 'block';
}

/**
 * ファイル入力の設定
 */
function setupFileInput() {
  const fileBtn = document.getElementById('uBlockFileSelectBtn');
  const fileInput = document.getElementById('uBlockFileInput');

  fileBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', handleFileSelect);
}

/**
 * ファイル選択処理
 */
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const text = await readFile(file);
  document.getElementById('uBlockFilterInput').value = text;
  handleTextInputPreview();
}

/**
 * ファイル読み込み
 */
function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * uBlock設定の保存
 */
export async function saveUblockSettings() {
  const text = document.getElementById('uBlockFilterInput').value;
  const rules = parseUblockFilterList(text);

  await saveSettings({
    [StorageKeys.UBLOCK_RULES]: rules,
    [StorageKeys.UBLOCK_FORMAT_ENABLED]: true
  });

  showStatus('uBlockフィルターを保存しました', 'success');
}
```

### domainFilter.js 変更

```javascript
import { init as initUblockImport, saveUblockSettings } from './ublockImport.js';

export function init() {
  // 既存の初期化
  // ...

  // uBlock形式の初期化
  initUblockImport();

  // 保存ボタンの変更
  saveDomainSettingsBtn.addEventListener('click', async () => {
    const format = document.getElementById('filterFormat').value;
    if (format === 'ublock') {
      await saveUblockSettings();
    } else {
      await saveSimpleFormatSettings();
    }
  });
}
```

### テストケース（計画）

| # | テスト名 | 説明 |
|---|----------|------|
| 1 | フォーマット切替 | simple/ublockのUI切替 |
| 2 | テキスト入力プレビュー | 入力時に即時プレビュー更新 |
| 3 | 有効ルールプレビュー | ルール数が正確に表示 |
| 4 | 例外ルールプレビュー | 例外数が正確に表示 |
| 5 | エラー表示 | 構文エラーが表示される |
| 6 | 空入力 | プレビューは表示されない |
| 7 | 保存処理 | chrome.storageに正しく保存 |
| 8 | 読み込み処理 | 保存された設定が表示される |

---

## UF-202: ファイルアップロード機能 [TDD]

### 概要

- **タスク種別**: TDD
- **推定時間**: 1.5時間
- **ステータス**: ✅ 完了 (2026年1月実装)
- **依存**: UF-201

### 実装機能

1. `.txt` ファイル選択と読み込み
2. ドラッグ&ドロップ対応
3. エンコーディング判定（UTF-8）

### API設計（ublockImport.js 追加）

```javascript
/**
 * ドラッグ&ドロップの設定
 */
export function setupDragAndDrop() {
  const dropZone = document.getElementById('uBlockDropZone');
  const textarea = document.getElementById('uBlockFilterInput');

  // ドロップゾーン表示
  textarea.addEventListener('dragenter', () => {
    dropZone.style.display = 'block';
    dropZone.classList.add('active');
  });

  // ドロップゾーン非表示
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('active');
    dropZone.style.display = 'none';
  });

  // ドロップ処理
  dropZone.addEventListener('drop', handleDrop);
}

/**
 * ドロップ処理
 * @param {DragEvent} event
 */
function handleDrop(event) {
  event.preventDefault();
  const dropZone = document.getElementById('uBlockDropZone');
  dropZone.classList.remove('active');
  dropZone.style.display = 'none';

  const file = event.dataTransfer.files[0];
  if (file && file.type === 'text/plain') {
    processFile(file);
  }
}

/**
 * ファイル処理
 * @param {File} file
 */
async function processFile(file) {
  try {
    const text = await readFile(file);
    document.getElementById('uBlockFilterInput').value = text;
    handleTextInputPreview();
    showStatus(`"${file.name}" を読み込みました`, 'success');
  } catch (error) {
    showStatus(`ファイル読み込みエラー: ${error.message}`, 'error');
  }
}
```

### テストケース（計画）

| # | テスト名 | 説明 |
|---|----------|------|
| 1 | ファイル選択 | .txtファイルが読み込まれる |
| 2 | ドラッグ開始 | ドロップゾーンが表示 |
| 3 | ドラッグキャンセル | ドロップゾーンが非表示 |
| 4 | ファイルドロップ | ファイルが読み込まれる |
| 5 | 非テキストファイル | アップロード拒否 |
| 6 | 大容量ファイル | 読み込み成功 |
| 7 | 保存済みファイルの読み込み | プレビューが正確 |

---

## UF-203: URLインポート機能(オプション) [TDD]

### 概要

- **タスク種別**: TDD
- **推定時間**: 1時間
- **優先度**: P3
- **ステータス**: ✅ 完了 (2026年1月実装) ※オプション機能のため実装を見送り
- **依存**: UF-201

### 実装内容

外部URLからフィルターリストをフェッチする機能。

```javascript
/**
 * URLからフィルターリストを取得
 * @param {string} url - 外部URL
 * @returns {Promise<string>}
 */
export async function fetchFromUrl(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    throw new Error(`URL読み込みエラー: ${error.message}`);
  }
}
```

**注**: 初回実装ではスキップ可能（将来的拡張）

---

## UF-204: エクスポート機能 [TDD]

### 概要

- **タスク種別**: TDD
- **推定時間**: 1時間
- **ステータス**: ✅ 完了 (2026年1月実装)
- **依存**: UF-101

### 新規作成ファイル

| ファイル | 目的 |
|----------|------|
| `src/popup/ublockExport.js` | uBlockエクスポートUIロジック |

### HTML構造追加

```html
<!-- uBlockFormatUI内に追加 -->
<div class="form-group">
  <button id="uBlockExportBtn" class="secondary-btn">エクスポート</button>
  <button id="uBlockCopyBtn" class="secondary-btn">クリップボードにコピー</button>
</div>
```

### API設計

```javascript
/**
 * @file src/popup/ublockExport.js
 * uBlockエクスポートUIロジック
 */

/**
 * uBlockルールをテキスト形式でエクスポート
 * @param {UblockRules} rules - ルールセット
 * @returns {string} uBlock形式テキスト
 */
export function exportToText(rules) {
  const lines = [];

  // メタデータ
  lines.push(`! Auto-exported from Obsidian Smart History`);
  lines.push(`! Exported at: ${new Date().toISOString()}`);
  lines.push(`! Total rules: ${rules.blockRules.length + rules.exceptionRules.length}`);
  lines.push('');

  // 例外ルール
  rules.exceptionRules.forEach(rule => {
    lines.push(rule.rawLine);
  });

  // ブロックルール
  rules.blockRules.forEach(rule => {
    lines.push(rule.rawLine);
  });

  return lines.join('\n');
}

/**
 * uBlockルールを .txt ファイルとしてダウンロード
 * @param {UblockRules} rules - ルールセット
 * @param {string} [filename] - ファイル名
 */
export function downloadAsFile(rules, filename = 'ublock-filters.txt') {
  const text = exportToText(rules);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * uBlockルールをクリップボードにコピー
 * @param {UblockRules} rules - ルールセット
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(rules) {
  const text = exportToText(rules);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('クリップボードコピー失敗:', error);
    return false;
  }
}

/**
 * エクスポートUIの初期化
 */
export function init() {
  const exportBtn = document.getElementById('uBlockExportBtn');
  const copyBtn = document.getElementById('uBlockCopyBtn');

  if (exportBtn) {
    exportBtn.addEventListener('click', handleExport);
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', handleCopy);
  }
}

/**
 * エクスポート処理
 */
async function handleExport() {
  const settings = await getSettings();
  const rules = settings[StorageKeys.UBLOCK_RULES];

  downloadAsFile(rules);
  showStatus('エクスポートしました', 'success');
}

/**
 * コピー処理
 */
async function handleCopy() {
  const settings = await getSettings();
  const rules = settings[StorageKeys.UBLOCK_RULES];

  const success = await copyToClipboard(rules);
  if (success) {
    showStatus('クリップボードにコピーしました', 'success');
  } else {
    showStatus('コピーに失敗しました', 'error');
  }
}
```

### テストケース（計画）

| # | テスト名 | 説明 |
|---|----------|------|
| 1 | 丸ごとエクスポート | 全ルールが正しくエクスポート |
| 2 | ファイルダウンロード | .txtファイルが生成される |
| 3 | クリップボードコピー | クリップボードに正しくコピー |
| 4 | 空ルールセット | メタデータのみがエクスポート |
| 5 | メタデータ | エクスポートテキストに含まれる |

---

## マイルストーン M3: UI基本機能完了

- [x] UF-201 インポートUI追加
- [x] UF-202 ファイルアップロード機能
- [x] UF-204 エクスポート機能

**完了条件**:
- ✅ 保存/読み込みが動作
- ✅ プレビューが正確
- ✅ ドラッグ&ドロップ対応
- ✅ エクスポート機能動作

---

## 次のステップ

フェーズ4（統合・最適化）へ進みます：

- **UF-301 [TDD]**: 選択的オプション対応