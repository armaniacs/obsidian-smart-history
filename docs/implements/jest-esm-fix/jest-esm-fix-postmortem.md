# Jest + ESM テスト基盤修正 ポストモーテム

## 作業概要

- **作業内容**: domainFilter.test.js の修正を契機とした、Jest テスト基盤全体の構成修正
- **実行日時**: 2026-02-03
- **影響範囲**: jest.config, package.json, jest.setup.js, 全テストスイート

## 発見された問題

### 1. babel-jest と jest のメジャーバージョン不整合

`babel-jest@30` が `jest@29` と組み合わされていた。babel-jest のメジャーバージョンは jest のメジャーバージョンと一致させる必要がある。不整合があると、変換パイプラインが正しく動作せず全テストが `ReferenceError: require is not defined` で失敗する。

**修正**: `babel-jest` を `^29.7.0` にダウングレード。

**教訓**: Jest エコシステムのパッケージ（jest, babel-jest, jest-environment-jsdom 等）はメジャーバージョンを揃える。`npm install` 時に `^` 範囲指定で意図せず次のメジャーが入ることがあるため、`package.json` に追加後は `npm ls babel-jest jest` でバージョンを確認する。

### 2. `--experimental-vm-modules` と babel-jest の競合

`package.json` の test スクリプトに `node --experimental-vm-modules` が指定されていた。このフラグを使うと Jest は ESM ネイティブモードで動作し、babel-jest による CommonJS 変換がバイパスされる。

一方、`package.json` の `"type": "module"` により Node.js はすべての `.js` ファイルを ESM として解釈する。babel-jest が CJS に変換するべきところ、`--experimental-vm-modules` がそれを無効化していた。

**修正**:
- test スクリプトから `--experimental-vm-modules` を除去し、単純に `jest` コマンドに変更
- `jest.config.js`（ESM形式）を `jest.config.cjs`（CJS形式）にリネーム

**教訓**: `"type": "module"` のプロジェクトで Jest を使う場合、2つの選択肢がある。

| 方式 | 設定 | テストコード |
|---|---|---|
| babel-jest 変換（採用） | `jest.config.cjs` + babel-jest | ESM の import 文を書くが、babel が CJS に変換して実行 |
| ESM ネイティブ | `--experimental-vm-modules` | `jest.unstable_mockModule` + top-level await が必要 |

両方を混ぜてはならない。このプロジェクトではbabel-jest変換方式を採用した。

### 3. jest.setup.js が setupFilesAfterEnv に登録されていなかった

`jest.setup.js` にグローバルな `document` モック、`chrome` API モック、`jest.spyOn(document, 'getElementById')` の設定が記述されていたが、`jest.config` の `setupFilesAfterEnv` が空配列で、実際には読み込まれていなかった。

以前の `--experimental-vm-modules` モードでは、テストファイル自体の先頭で `global.document` や `global.jest` を手動定義していたため表面的には動いていたが、正しいJestのモック機能（`jest.fn()`, `jest.spyOn()`）が使えない状態だった。

**修正**: `setupFilesAfterEnv: ['./jest.setup.js']` に設定。

**教訓**: `jest.setup.js` のようなセットアップファイルは、必ず `jest.config` で明示的に参照する。ファイルが存在するだけでは読み込まれない。

### 4. モジュールトップレベルの DOM アクセスとテストの相性問題

`domainFilter.js` はファイルの先頭（モジュールスコープ）で `document.getElementById(...)` を呼び出し、結果を変数にキャッシュしている。

```js
// domainFilter.js:22-36
const filterDisabledRadio = document.getElementById('filterDisabled');
const ublockFormatEnabledCheckbox = document.getElementById('ublockFormatEnabled');
// ... 以下同様
```

この設計では、モジュールが `require()` された瞬間にすべての DOM 参照が確定する。テスト内で後から `document.getElementById` の戻り値を変更しても、モジュール内部の変数には影響しない。

**修正**: `jest.setup.js` に `global.__mockElementCache` を導入し、同じ ID の `getElementById` 呼び出しに対して常に同一のオブジェクトを返すようにした。テスト側からは `global.__mockElementCache['domainList']` 経由でモジュール内部と同じオブジェクトにアクセスできる。

**教訓**:
- テスト容易性の観点では、モジュールトップレベルでの DOM アクセスは避け、`init()` 関数内で取得するのが望ましい
- 既存コードを変えずにテストする場合は、`getElementById` が返すオブジェクトをキャッシュし、テストとモジュールで同一参照を共有するパターンが必要
- `jest.setup.js` 内の `createMockElement()` が毎回新しいオブジェクトを返す場合、モジュールロード時とテスト時で別オブジェクトになる罠がある

### 5. テストファイル内での `global.jest` 上書き

旧テストファイルの先頭で `global.jest = { fn: function() { return function() {}; } }` のように jest オブジェクトを上書きしていた。これにより `jest.fn()` が本物のモック関数を返さなくなり、`mockImplementation`, `mockReturnValue`, `mockResolvedValue` 等のメソッドが使えなくなっていた。

**教訓**: `global.jest` を上書きしてはならない。Jest のモック機能を手動で再実装するのではなく、正しいセットアップを通じて Jest 本来の機能を使う。

### 6. `document.querySelector` のモック不足

`jest.setup.js` の `global.document` に `querySelector` メソッドが定義されていなかった。`domainFilter.js` の `saveSimpleFormatSettings()` 内で `document.querySelector('input[name="domainFilter"]:checked')` が呼ばれるため、`TypeError: document.querySelector is not a function` が発生した。

**修正**: `global.document` に `querySelector` と `querySelectorAll` を追加。テスト内で `document.querySelector = jest.fn(() => ({ value: 'disabled' }))` のように差し替えてテストケースごとに制御。

**教訓**: `testEnvironment: 'node'` では DOM API が一切存在しない。手動モックで `document` を作る場合、使われる可能性のあるメソッド（`getElementById`, `querySelector`, `querySelectorAll`, `createElement` 等）をすべて定義する必要がある。不足していると実行時に `is not a function` エラーになる。

## 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `jest.config.js` → `jest.config.cjs` | リネーム + `export default` → `module.exports`、`setupFilesAfterEnv` に jest.setup.js を追加 |
| `package.json` | test スクリプトから `--experimental-vm-modules` を除去、`babel-jest` を `^29.7.0` に |
| `jest.setup.js` | `querySelector`/`querySelectorAll` 追加、domainFilter.js 用 DOM 要素のキャッシュ付きモック追加、`domainStatus` のキャッシュ化 |
| `src/popup/__tests__/domainFilter.test.js` | 全面書き直し。`jest.mock` による依存モック、fakeTimers、querySelector テスト内差し替え |

## テスト結果

修正前: 全12スイートが `ReferenceError: require is not defined` で全滅
修正後: domainFilter.test.js 含む7スイートがパス（残り4スイートの失敗は今回のスコープ外の既存問題）

## 残存する技術的負債

1. **`testEnvironment: 'node'` + 手動 DOM モック**: `jest-environment-jsdom` に切り替えれば DOM モックの大半が不要になる。ただし jsdom は Chrome 拡張 API をモックしないため、`chrome.*` のモックは引き続き必要
2. **autoClose.test.js, navigation.test.js 等の失敗**: `window` 未定義や依存モジュールのモック不足で失敗中。個別に修正が必要
3. **モジュールトップレベル DOM アクセス**: `domainFilter.js` 等がファイル先頭で `document.getElementById` を呼ぶ設計は、テスト時のモックセットアップ順序に強く依存する。将来的には `init()` 内での取得に移行するのが望ましい
4. **`global.__mockElementCache` の肥大化**: テスト対象モジュールが増えるたびにキャッシュ対象 ID を追加する必要がある。jsdom 環境への移行で解消可能
