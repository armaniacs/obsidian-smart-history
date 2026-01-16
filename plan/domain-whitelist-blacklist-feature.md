# ドメインホワイトリスト/ブラックリスト機能実装計画

## 概要

記録するドメインをホワイトリストとして承認する機能および、ブラックリストとして記録を制限する機能を実装する。

### ユースケース

- **ホワイトリスト**: 社内で利用しているいくつかのドメインのみを対象にする
- **ブラックリスト**: 遊びで見るようなドメイン(amazon.co.jp, yahoo.co.jp, facebookなど)を記録対象から除外する

## 実装方針

### 1. データ構造

#### ストレージキー (storage.js)
```javascript
DOMAIN_WHITELIST: 'domain_whitelist',  // ホワイトリストドメイン配列
DOMAIN_BLACKLIST: 'domain_blacklist',  // ブラックリストドメイン配列
DOMAIN_FILTER_MODE: 'domain_filter_mode' // 'whitelist', 'blacklist', 'disabled'
```

#### データ形式
- ドメインリスト: 文字列配列 `['example.com', 'company.org']`
- フィルターモード: 文字列 `'whitelist' | 'blacklist' | 'disabled'`

### 2. UI設計

#### 設定画面 (popup.html)
- ドメインフィルターモード選択 (ラジオボタン)
  - 無効 (すべて記録)
  - ホワイトリスト (リスト内のドメインのみ記録)
  - ブラックリスト (リスト外のドメインのみ記録)
- ドメインリスト管理
  - テキストエリア (1行1ドメイン)
  - 追加/削除ボタン
  - 現在のページドメインを追加するクイックボタン

### 3. バックエンド処理

#### サービスワーカー (service-worker.js)
- `VALID_VISIT` メッセージ処理前にドメインフィルターチェックを追加
- ドメイン抽出とフィルタリングロジック実装
- 手動記録 (`MANUAL_RECORD`) にも同じフィルタリングを適用

#### コンテンツスクリプト (extractor.js)
- 変更不要 (バックエンドでフィルタリング)

### 4. ドメイン抽出ロジック

#### ユーティリティ関数 (新規作成: src/utils/domainUtils.js)
```javascript
// URLからドメインを抽出
function extractDomain(url) { ... }

// ドメインがフィルタ条件に合致するかチェック
async function isDomainAllowed(url) { ... }
```

## 実装手順

### Phase 1: 基盤実装
1. `storage.js` に新しいストレージキーを追加
2. `domainUtils.js` ユーティリティモジュールを作成
3. サービスワーカーにドメインフィルタリングロジックを追加

### Phase 2: UI実装
1. 設定画面にドメインフィルターUIを追加
2. ポップアップJSに設定保存/読み込み処理を追加
3. 現在のページドメインを追加するクイックボタンを実装

### Phase 3: テストと調整
1. 各フィルターモードの動作テスト
2. UI/UXの改善
3. エラーハンドリングの強化

## 技術的詳細

### ドメイン抽出アルゴリズム
```javascript
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname; // www.example.com → example.com (サブドメイン含む)
  } catch (e) {
    return null;
  }
}
```

### フィルタリングロジック
```javascript
async function isDomainAllowed(url) {
  const settings = await getSettings();
  const mode = settings[StorageKeys.DOMAIN_FILTER_MODE];
  
  if (mode === 'disabled') return true;
  
  const domain = extractDomain(url);
  if (!domain) return false;
  
  const whitelist = settings[StorageKeys.DOMAIN_WHITELIST] || [];
  const blacklist = settings[StorageKeys.DOMAIN_BLACKLIST] || [];
  
  if (mode === 'whitelist') {
    return whitelist.some(allowed => domain.includes(allowed));
  } else if (mode === 'blacklist') {
    return !blacklist.some(blocked => domain.includes(blocked));
  }
  
  return true;
}
```

### UIコンポーネント構造
```html
<div class="form-group">
  <label>ドメインフィルター</label>
  <div>
    <input type="radio" name="domainFilter" value="disabled" checked>
    <label>無効 (すべて記録)</label>
  </div>
  <div>
    <input type="radio" name="domainFilter" value="whitelist">
    <label>ホワイトリスト (指定ドメインのみ記録)</label>
  </div>
  <div>
    <input type="radio" name="domainFilter" value="blacklist">
    <label>ブラックリスト (指定ドメインを除外)</label>
  </div>
</div>

<div id="domainListSection" style="display: none;">
  <div class="form-group">
    <label>ドメインリスト (1行に1ドメイン)</label>
    <textarea id="domainList" rows="5" placeholder="example.com&#10;company.org"></textarea>
  </div>
  <button id="addCurrentDomain">現在のページドメインを追加</button>
</div>
```

## 考慮事項

### セキュリティ
- ドメインリストのバリデーション
- 不正なドメイン形式の拒否

### パフォーマンス
- ドメイン抽出の効率化
- フィルタリング処理の最適化

### ユーザビリティ
- 直感的なUI設計
- エラーメッセージの分かりやすさ
- 現在のページから簡単にドメインを追加できる機能

### 将来の拡張性
- サブドメインの正確なマッチングオプション
- ワイルドカードパターン対応 (*.example.com)
- ドメインリストのインポート/エクスポート機能