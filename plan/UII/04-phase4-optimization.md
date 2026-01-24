# フェーズ4: 統合・最適化

## 概要

パフォーマンス最適化、エラーハンドリング、高度なオプション対応を実装します。

## タスク一覧

| タスクID | タスク名 | タイプ | 推定時間 | 優先度 | 依存 |
|----------|---------|--------|---------|--------|------|
| UF-301 | 選択的オプション対応 | TDD | 1.5時間 | P1 | UF-102 |
| UF-302 | パフォーマンス最適化 | TDD | 2時間 | P0 | UF-204 |
| UF-303 | エラーハンドリング | TDD | 1時間 | P0 | UF-302 |

---

## UF-301: 選択的オプション対応 [TDD]

### 概要

- **タスク種別**: TDD
- **推定時間**: 1.5時間
- **ステータス**: 未実装
- **依存**: UF-102

### 対象オプション

| オプション | 説明 | 重要度 | 実装状況 |
|----------|------|--------|---------|
| `domain=` | 特定ドメインでのみ有効 | 高 | UF-102で一部実装 |
| `~domain=` | 特定ドメインで無効 | 高 | UF-102で一部実装 |
| `~important` | 重要フラグの解除 | 中 | 未実装 |
| `match-case` | 大文字小文字を区別 | 低 | 未実装 |
| `~match-case` | 大文字小文字を区別しない | 低 | 未実装 |

### 実装内容

#### 1. domain= の詳細実装

```javascript
/**
 * $domain= オプションの評価
 * @param {UblockRule} rule - ルール
 * @param {Object} context - 文脈情報
 * @returns {boolean}
 */
function evaluateDomainOption(rule, context) {
  const { currentDomain } = context;

  // 重要ルール以外でdomain= 未指定なら許可リスト全体に適用
  if (!rule.options.domains && !rule.options.negatedDomains) {
    return true;
  }

  // domain= で指定されたドメインに一致するか
  if (rule.options.domains && rule.options.domains.length > 0) {
    const match = rule.options.domains.some(d => matchesDomain(currentDomain, d));
    if (!match) return false;
  }

  // ~domain= で指定されたドメインに一致するなら除外
  if (rule.options.negatedDomains && rule.options.negatedDomains.length > 0) {
    const exclude = rule.options.negatedDomains.some(d => matchesDomain(currentDomain, d));
    if (exclude) return false;
  }

  return true;
}

/**
 * ドメインがパターンに一致するか
 * @param {string} currentDomain - 現在のドメイン
 * @param {string} pattern - ドメインパターン
 * @returns {boolean}
 */
function matchesDomain(currentDomain, pattern) {
  // 正確一致
  if (pattern === currentDomain) return true;

  // ワイルドカード対応
  if (pattern.startsWith('*.') && pattern.endsWith('*')) {
    // *.example.com
    const suffix = pattern.slice(2);
    return currentDomain.endsWith(suffix);
  }

  return false;
}
```

#### 2. ~important の実装

```javascript
/**
 * ~important オプションの処理
 * @param {UblockRule} rule - ルール
 * @returns {boolean}
 */
function evaluateImportantOption(rule) {
  // ~important は important=false として扱う
  return rule.options.important === true;
}
```

---

## UF-302: パフォーマンス最適化 [TDD]

### 概要

- **タスク種別**: TDD
- **推定時間**: 2時間
- **ステータス**: 未実装
- **依存**: UF-204

### 目標

| 項目 | 目標値 |
|------|--------|
| 10,000行パース | < 1秒 |
| 1,000回マッチング | < 100ms |
| メモリ使用量 | < 10MB |

### 最適化戦略

#### 1. パース速度最適化

```javascript
/**
 * @file src/utils/ublockParser.js
 */

// キャッシュ
const PARSER_CACHE = new Map();

/**
 * キャッシュ利用のパース
 * @param {string} text - フィルターテキスト
 * @returns {UblockRules}
 */
export function parseUblockFilterList(text) {
  // キャッシュキー生成（最初の100文字で判定）
  const cacheKey = text.substring(0, 100) + '_' + text.length;

  if (PARSER_CACHE.has(cacheKey)) {
    return { ...PARSER_CACHE.get(cacheKey) };
  }

  // パース処理
  const result = parseUblockFilterListImpl(text);

  // キャッシュ（最大100件）
  if (PARSER_CACHE.size >= 100) {
    const firstKey = PARSER_CACHE.keys().next().value;
    PARSER_CACHE.delete(firstKey);
  }
  PARSER_CACHE.set(cacheKey, result);

  return result;
}

/**
 * ストリーミングパース（大量行対応）
 * @param {string} text - フィルターテキスト
 * @returns {UblockRules}
 */
function parseUblockFilterListImpl(text) {
  const lines = text.split('\n');
  const blockRules = [];
  const exceptionRules = [];

  // 事前配列確保（メモリ削減）
  const estimatedSize = Math.floor(lines.length * 0.8);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 高速判定を使う判定順序
    if (line === '' || line === '!') continue;
    if (line.startsWith('!')) continue;

    const rule = parseUblockFilterLine(line);
    if (rule) {
      if (rule.type === 'block') {
        blockRules.push(rule);
      } else {
        exceptionRules.push(rule);
      }
    }
  }

  return {
    blockRules,
    exceptionRules,
    metadata: {
      source: 'paste',
      importedAt: Date.now(),
      lineCount: lines.length,
      ruleCount: blockRules.length + exceptionRules.length
    }
  };
}
```

#### 2. マッチング速度最適化

```javascript
/**
 * @file src/utils/ublockMatcher.js
 */

/**
 * ルールインデックス（高速検索用）
 */
class RuleIndex {
  constructor(ublockRules) {
    this.domainIndex = new Map();  // ドメイン -> ルール群
    this.wildcardRules = [];       // ワイルドカードルール
    this.exceptionIndex = new Map();

    this.buildIndex(ublockRules);
  }

  /**
   * インデックス構築
   * @param {UblockRules} ublockRules
   */
  buildIndex(ublockRules) {
    // ブロックルールのインデックス化
    ublockRules.blockRules.forEach(rule => {
      if (rule.domain && rule.domain.includes('*')) {
        // ワイルドカードは別リスト
        this.wildcardRules.push(rule);
      } else if (rule.domain) {
        // 正確一致はMapに
        if (!this.domainIndex.has(rule.domain)) {
          this.domainIndex.set(rule.domain, []);
        }
        this.domainIndex.get(rule.domain).push(rule);
      }
    });

    // 例外ルールのインデックス化
    ublockRules.exceptionRules.forEach(rule => {
      if (rule.domain && !rule.domain.includes('*')) {
        if (!this.exceptionIndex.has(rule.domain)) {
          this.exceptionIndex.set(rule.domain, []);
        }
        this.exceptionIndex.get(rule.domain).push(rule);
      }
    });
  }

  /**
   * ドメインに対するルールを取得
   * @param {string} domain
   * @returns {UblockRule[]}
   */
  getRulesForDomain(domain) {
    // 正確一致
    const exactRules = this.domainIndex.get(domain) || [];

    // ワイルドカード一致
    const wildcardRules = this.wildcardRules.filter(rule =>
      matchesWildcard(domain, rule.domain)
    );

    return [...exactRules, ...wildcardRules];
  }

  /**
   * 例外ルールを取得
   * @param {string} domain
   * @returns {UblockRule[]}
   */
  getExceptionsForDomain(domain) {
    return this.exceptionIndex.get(domain) || [];
  }
}

/**
 * ワイルドカード一致判定
 * @param {string} domain
 * @param {string} pattern
 * @returns {boolean}
 */
function matchesWildcard(domain, pattern) {
  if (!pattern) return false;

  // *.example.com 形式
  if (pattern.startsWith('*.') && pattern.endsWith('*')) {
    const midPattern = pattern.slice(2, -1);
    return domain.includes(midPattern);
  }

  // *.example.com 形式
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2);
    return domain.endsWith(suffix);
  }

  return false;
}

// グローバルインデックスキャッシュ
const RULE_INDEX_CACHE = new WeakMap();

/**
 * 高速マッチング
 * @param {string} url
 * @param {UblockRules} ublockRules
 * @returns {boolean}
 */
export function isUrlBlocked(url, ublockRules, context) {
  // インデックス取得/生成
  let index = RULE_INDEX_CACHE.get(ublockRules);
  if (!index) {
    index = new RuleIndex(ublockRules);
    RULE_INDEX_CACHE.set(ublockRules, index);
  }

  const domain = extractDomain(url);

  // 例外ルールチェック
  const exceptions = index.getExceptionsForDomain(domain);
  for (const exception of exceptions) {
    if (matchesWithOptions(url, exception, context)) {
      return false;  // 例外により許可
    }
  }

  // ブロックルールチェック
  const rules = index.getRulesForDomain(domain);
  for (const rule of rules) {
    if (matchesWithOptions(url, rule, context)) {
      return true;  // ブロック
    }
  }

  return false;  // 許可
}
```

### テストケース（計画）

| # | テスト名 | 説明 |
|---|----------|------|
| 1 | 1,000行パース性能 | 500ms以内 |
| 2 | 10,000行パース性能 | 1秒以内 |
| 3 | 100回マッチング | 10ms以内 |
| 4 | 1,000回マッチング | 100ms以内 |
| 5 | メモリ使用量 | 10MB以内 |
| 6 | インデックス構築性能 | 100ms以内 |
| 7 | キャッシュの効果 | 2回目以降が高速 |

---

## UF-303: エラーハンドリング [TDD]

### 概要

- **タスク種別**: TDD
- **推定時間**: 1時間
- **ステータス**: 未実装
- **依存**: UF-302

### エラーハンドリング方針

| エラー種類 | ユーザー表示 | ログレベル | 対応 |
|-----------|-------------|-----------|------|
| 構文エラー | 行番号付きメッセージ | WARN | プレビューに表示 |
| パース失敗 | エラー概要 | ERROR | プレビューに表示 |
| 保存失敗 | 具体的なエラー | ERROR | アラート表示 |
| 読み込み失敗 | 原因を説明 | ERROR | アラート表示 |
| UIエラー | 友好的なメッセージ | ERROR | ステータス表示 |

### 実装内容

#### 1. パースエラーハンドリング

```javascript
/**
 * @file src/utils/ublockParser.js
 */

/**
 * パースエラー情報
 * @typedef {Object} ParseError
 * @property {number} lineNumber - 行番号
 * @property {string} line - エラー行の内容
 * @property {string} message - エラーメッセージ
 */

/**
 * パース結果（エラー情報含む）
 * @typedef {Object} ParseResult
 * @property {UblockRules} rules - パース結果
 * @property {ParseError[]} errors - エラー一覧
 */

/**
 * エラー情報を含むパース
 * @param {string} text - フィルターテキスト
 * @returns {ParseResult}
 */
export function parseUblockFilterListWithErrors(text) {
  const lines = text.split('\n');
  const blockRules = [];
  const exceptionRules = [];
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1;

    // スキップ対象
    if (line === '' || line === '!') continue;
    if (line.startsWith('!')) continue;

    // パース試行
    try {
      const rule = parseUblockFilterLine(line);
      if (rule) {
        if (rule.type === 'block') {
          blockRules.push(rule);
        } else {
          exceptionRules.push(rule);
        }
      }
    } catch (error) {
      errors.push({
        lineNumber,
        line,
        message: error.message
      });
      console.warn(`Parse error at line ${lineNumber}: ${error.message}`);
    }
  }

  return {
    rules: {
      blockRules,
      exceptionRules,
      metadata: {
        source: 'paste',
        importedAt: Date.now(),
        lineCount: lines.length,
        ruleCount: blockRules.length + exceptionRules.length
      }
    },
    errors
  };
}
```

#### 2. UIエラーハンドリング

```javascript
/**
 * @file src/popup/ublockImport.js
 */

/**
 * エラー表示
 * @param {ParseError[]} errors
 */
function showErrors(errors) {
  const preview = document.getElementById('uBlockPreview');
  const errorCount = document.getElementById('uBlockErrorCount');
  const errorDetails = document.getElementById('uBlockErrorDetails');

  if (errors.length > 0) {
    preview.style.display = 'block';
    errorCount.textContent = errors.length;

    // エラー詳細を展開
    const errorTexts = errors.map(e =>
      `${e.lineNumber}行: ${e.message}`
    );
    errorDetails.textContent = errorTexts.join('\n');
  }
}

/**
 * ステータス表示
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showStatus(message, type) {
  const statusDiv = document.getElementById('domainStatus');
  if (!statusDiv) return;

  statusDiv.textContent = message;
  statusDiv.className = type;

  // 自動消去
  const timeout = type === 'error' ? 5000 : 3000;
  setTimeout(() => {
    if (statusDiv.textContent === message) {
      statusDiv.textContent = '';
      statusDiv.className = '';
    }
  }, timeout);
}

/**
 * 保存時のエラーハンドリング
 */
export async function safeSaveUblockSettings() {
  try {
    const text = document.getElementById('uBlockFilterInput').value;

    if (!text || text.trim() === '') {
      showStatus('フィルターが入力されていません', 'error');
      return;
    }

    const result = parseUblockFilterListWithErrors(text);

    if (result.errors.length > 0) {
      showErrors(result.errors);
      showStatus('構文エラーがあります。修正してください', 'error');
      return;
    }

    if (result.rules.ruleCount === 0) {
      showStatus('有効なルールが見つかりませんでした', 'error');
      return;
    }

    // 保存
    await saveSettings({
      [StorageKeys.UBLOCK_RULES]: result.rules,
      [StorageKeys.UBLOCK_FORMAT_ENABLED]: true
    });

    showStatus(
      `${result.rules.ruleCount}件のルールを保存しました`,
      'success'
    );

  } catch (error) {
    console.error('Save error:', error);
    showStatus(`保存エラー: ${error.message}`, 'error');
  }
}
```

### テストケース（計画）

| # | テスト名 | 説明 |
|---|----------|------|
| 1 | 構文エラー行番号 | 正しい行番号が表示 |
| 2 | 複数エラー表示 | 全てが表示される |
| 3 | 空入力 | 適切なエラーメッセージ |
| 4 | 保存失敗捕捉 | 例外が適切に処理 |
| 5 | ファイル読み込み失敗 | エラーメッセージ表示 |
| 6 | ストレージ容量超過 | 適切なエラー表示 |

---

## マイルストーン M4: 全機能完了

- [ ] UF-301 選択的オプション対応
- [ ] UF-302 パフォーマンス最適化
- [ ] UF-303 エラーハンドリング

**完了条件**:
- ⏳ 10,000ルールで動作
- ⏳ エラーが適切に表示
- ⏳ 高度なオプション対応

---

## 全体完了確認

### 全マイルストーン

| マイルストーン | 完了タスク | 状態 |
|--------------|-----------|------|
| M1: 基盤準備完了 | UF-001, UF-002 | ⏳ 進行中 |
| M2: パーサー完了 | UF-101, UF-102, UF-103 | 未実装 |
| M3: UI基本機能完了 | UF-201, UF-202, UF-204 | 未実装 |
| M4: 全機能完了 | UF-301, UF-302, UF-303 | 未実装 |

### 最終検証項目

| # | 検証項目 | 状態 |
|---|----------|------|
| 1 | uBlock構文解析 | ⏳ 未検証 |
| 2 | インポート/エクスポート | ⏳ 未検証 |
| 3 | simple形式共存 | ⏳ 未検証 |
| 4 | パフォーマンス要件 | ⏳ 未検証 |
| 5 | エラーハンドリング | ⏳ 未検証 |
| 6 | 単体テスト | ⏳ 未実装 |
| 7 | 統合テスト | ⏳ 未実装 |
| 8 | E2Eテスト | ⏳ 未実装 |

---

## 全計画ファイル一覧

本 `plan/UII/` ディレクトリの全ファイル:

1. `00-overview.md` - 全体概要
2. `01-phase1-foundation.md` - フェーズ1: 基盤構築
3. `02-phase2-parser.md` - フェーズ2: フィルターパーサー実装
4. `03-phase3-ui.md` - フェーズ3: UI実装
5. `04-phase4-optimization.md` - フェーズ4: 統合・最適化
6. `10-data-structures.md` - データ構造詳細設計
7. `20-api-reference.md` - APIリファレンス
8. `30-test-strategy.md` - テスト戦略
9. `40-dependencies.md` - 依存関係