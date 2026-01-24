/**
 * ublockParser.js
 * uBlock Origin形式フィルターパーサー
 *
 * 【機能概要】: uBlock Origin形式のドメインフィルターをパースし、内部データ構造に変換
 * 【実装方針】: 入力値検証とパターンマッチングによる安全なパース処理
 * 【テスト対応】: ソース `src/utils/__tests__/ublockParser.test.js` の29テストケースに対応
 * 🟢 信頼性レベル: plan/UII/02-phase2-parser.md および plan/UII/10-data-structures.md に基づく実装
 */

// ============================================================================
// 定数定義
// ============================================================================

/** 【正規表現定数】: uBlock形式の基本パターンマッチング 🟢 */
const PATTERNS = {
  /** `||` プレフィックス検出 */
  RULE_PREFIX: /^\|\|/,
  /** `^` サフィックス検出（行末） */
  RULE_SUFFIX: /\^$/,
  /** 空行検出（空白のみ含む） */
  EMPTY_LINE: /^\s*$/,
  /** `!` コメントプレフィックス検出 */
  COMMENT_PREFIX: /^!/,
  /** ドメイン形式検証 */
  DOMAIN_VALIDATION: /^[a-z0-9.*-]+(\.[a-z0-9.*-]+)*$/i,
};

/** 【ルールタイプ定数】: ルールの種類を表す文字列定数 🟢 */
const RULE_TYPES = {
  /** ドメインをブロックするルール */
  BLOCK: 'block',
  /** ブロックの例外として許可するルール */
  EXCEPTION: 'exception',
};

/** 【オプション種別定数】: uBlock形式のオプション識別子 🟢 */
const OPTION_TYPES = {
  /** ドメイン指定プレフィックス `domain=` */
  DOMAIN_PREFIX: 'domain=',
  /** サードパーティフラグ `3p` */
  THIRD_PARTY: '3p',
  /** ファーストパーティフラグ `1p` */
  FIRST_PARTY: '1p',
  /** 重要フラグ `important` */
  IMPORTANT: 'important',
  /** 重要フラグ解除 `~important` */
  NOT_IMPORTANT: '~important',
  /** 除外ドメインプレフィックス */
  EXCLUDE_DOMAIN_PREFIX: '~',
  /** ドメイン区切り記号 */
  DOMAIN_SEPARATOR: '|',
  /** オプション区切り記号 */
  OPTION_SEPARATOR: ',',
};

/** 【プレフィックス定数】: uBlock形式のプレフィックス 🟢 */
const PREFIXES = {
  /** ルールプレフィックス */
  RULE: '||',
  /** 例外ルールプレフィックス */
  EXCEPTION: '@@||',
  /** サフィックス */
  SUFFIX: '^',
  /** オプション開始 */
  OPTION: '$',
};

/** 【メタデータ定数】: デフォルトのメタデータ値 🟢 */
const DEFAULT_METADATA = {
  /** デフォルトデータソース */
  SOURCE: 'paste',
};

/** 【ルールID定数】: null/undefined入力時に返す固定ID 🟡 */
const NULL_RULE_ID = '00000000-0000-0000-0000-000000000000';

// ============================================================================
// 入力値検証ユーティリティ
// ============================================================================

/**
 * 【ヘルパー関数】: 文字列型の入力値を検証
 * 【再利用性】: すべてのpublic関数で使用する共通の入力検証
 * 【単一責任】: 文字列型妥当性の確認
 * 🟢 信頼性レベル: 基本的な型安全パターン
 * @param {unknown} value - 検証対象の値
 * @returns {boolean} - 有効な文字列ならtrue
 */
function isValidString(value) {
  return value != null && typeof value === 'string';
}

// ============================================================================
// ルール解析ヘルパー関数
// ============================================================================

/**
 * 【ヘルパー関数】: トリムされた行からルールタイプと作業用行を抽出
 * 【設計方針】: プレフィックス解析とタイプ判定を分離して可読性向上
 * 【処理効率化】: 単一のif-else連鎖で効率的に判定
 * 【可読性向上】: 各ケースの意図が明確な条件分岐
 * 🟢 信頼性レベル: plan/UII/02-phase2-parser.md に記載される構文解析
 * @param {string} trimmedLine - トリムされた行
 * @returns {{ type: string; workLine: string } | null} - タイプと作業用行、無効ならnull
 */
function extractRuleTypeAndWorkLine(trimmedLine) {
  // 【例外ルール判定】: `@@||` プレフィックスで例外ルールと判定
  if (trimmedLine.startsWith(PREFIXES.EXCEPTION)) {
    return {
      type: RULE_TYPES.EXCEPTION,
      workLine: trimmedLine.substring(PREFIXES.EXCEPTION.length)
    };
  }

  // 【ブロックルール判定】: `||` プレフィックスでブロックルールと判定
  if (trimmedLine.startsWith(PREFIXES.RULE)) {
    return {
      type: RULE_TYPES.BLOCK,
      workLine: trimmedLine.substring(PREFIXES.RULE.length)
    };
  }

  // 【不正形式判定】: どちらのプレフィックスもない場合は無効
  return null;
}

/**
 * 【ヘルパー関数】: 作業用行からドメインを抽出
 * 【設計方針】: サフィックス除去と空白削除を分離して処理を明確化
 * 【処理効率化】: 簡潔な文字列操作で効率的にドメイン抽出
 * 【可読性向上】: 各処理ステップが明確
 * 🟢 信頼性レベル: plan/UII/02-phase2-parser.md に記載される構文解析
 * @param {string} workLine - プレフィックスを除去した行
 * @returns {string | null} - 抽出されたドメイン、無効ならnull
 */
function extractDomain(workLine) {
  // 【オプションセパレータ検索】: オプションセパレータ($)の位置を検索
  const optionSeparatorIndex = workLine.indexOf(PREFIXES.OPTION);
  
  // 【ドメイン部分抽出】: オプションセパレータより前の部分をドメイン部分とする
  let domainPart;
  if (optionSeparatorIndex !== -1) {
    domainPart = workLine.substring(0, optionSeparatorIndex);
  } else {
    domainPart = workLine;
  }
  
  // 【サフィックス検証】: 末尾に `^` があるか確認
  if (!domainPart.endsWith(PREFIXES.SUFFIX)) {
    return null;
  }
  
  // 【ドメイン抽出】: `^` サフィックスを除去
  let domain = domainPart.substring(0, domainPart.length - PREFIXES.SUFFIX.length);
  
  // 【空白除去】: ドメイン内の空白も削除して正規化
  domain = domain.replace(/\s+/g, '');
  
  return domain;
}

/**
 * 【ヘルパー関数】: ドメインの妥当性を検証
 * 【設計方針】: 空ドメインチェックと形式チェックを分離して明確化
 * 【処理効率化】: 短絡評価で不要なチェックをスキップ
 * 【可読性向上】: 各検証が独立したif文で明確
 * 🟢 信頼性レベル: plan/UII/10-data-structures.md に記載されるドメイン制約
 * @param {string} domain - 検証対象のドメイン
 * @returns {boolean} - 有効なドメインならtrue
 */
function validateDomain(domain) {
  // 【空ドメイン検証】: ドメインが空の場合は無効
  if (!domain) {
    return false;
  }

  // 【不正文字検証】: ドメインとして不適切な文字を含む場合は無効
  // 【セキュリティ】: 正規表現によるXSSリスク低減 🟢
  return PATTERNS.DOMAIN_VALIDATION.test(domain);
}

/**
 * 【ヘルパー関数】: ルールオブジェクトを構築
 * 【設計方針】: オブジェクト構築ロジックを分離して可読性向上
 * 【処理効率化】: 一度のオブジェクト生成で効率的
 * 【可読性向上】: プロパティごとの役割が明確
 * 🟢 信頼性レベル: plan/UII/10-data-structures.md に記載されるデータ構造
 * @param {string} trimmedLine - トリムされた元の行
 * @param {string} type - ルールタイプ
 * @param {string} domain - ドメイン
 * @returns {Object} - UblockRuleオブジェクト
 */
function buildRuleObject(trimmedLine, type, domain) {
  // 【パターン生成】: マッチング用パターンを作成
  // 【注記】: Greenフェーズではドメインをそのまま使用、UF-103で正規表現処理予定 🟡
  const pattern = domain;

  // 【ルール構造】: UblockRuleオブジェクトを構築
  return {
    id: generateRuleId(trimmedLine),    // 【ID生成】: ルールの一意識別子
    rawLine: trimmedLine,               // 【元の行】: エクスポート用に保持
    type,                               // 【ルール種類】: block または exception
    domain,                             // 【ドメインパターン】: 抽出されたドメイン
    pattern,                            // 【マッチングパターン】: 内部処理用
    options: parseRuleOptions(trimmedLine) // 【オプション】: パースされたオプション
  };
}

/**
 * 【ヘルパー関数】: 空のルールセットを生成
 * 【設計方針】: 空ルールセット生成を共通化してDRY原則適用
 * 【処理効率化】: 関数呼び出しのオーバーヘッドは最小限
 * 【再利用性】: parseUblockFilterListの初期化とエラー時の返却で使用
 * 🟢 信頼性レベル: plan/UII/10-data-structures.md に記載されるデータ構造
 * @returns {Object} - 空のUblockRulesオブジェクト
 */
function createEmptyRuleset() {
  return {
    blockRules: [],
    exceptionRules: [],
    metadata: {
      source: DEFAULT_METADATA.SOURCE,
      importedAt: Date.now(),
      lineCount: 0,
      ruleCount: 0
    }
  };
}

/**
 * 【ヘルパー関数】: ドメインオプションのドメインリストをパース
 * 【改善内容】: parseOptionsからドメイン処理ロジックを分離して単一責任原則適用
 * 【設計方針】: | 区切りのドメインリストを配列に変換し、空文字をフィルタ
 * 【処理効率化】: filterによる空文字排除で確実な配列生成
 * 【可読性向上】: ドメイン処理ロジックが独立して明確
 * 🟢 信頼性レベル: plan/UII/02-phase2-parser.md に記載されるドメイン構文
 * @param {string} domainValue - `example.com|test.com` 形式のドメイン値
 * @returns {string[]} - クリーンなドメイン配列（空文字は除外）
 */
function parseDomainList(domainValue) {
  // 【ドメイン分割】: | 区切りでドメイン配列に分割 🟢
  // 【フィルタリング】: 空文字を除外して有効なドメインのみ 🟢
  // 【処理効率化】: filterで確実な配列構築 🟢
  return domainValue.split(OPTION_TYPES.DOMAIN_SEPARATOR).filter(d => d !== '');
}

/**
 * 【ヘルパー関数】: ルール行からオプション部分を抽出してパース
 * 【設計方針】: buildRuleObjectからオプション処理を分離して単一責任原則適用
 * 【処理効率化】: indexOfとsubstringで効率的にオプション部分を抽出
 * 【可読性向上】: オプション処理ロジックが独立して明確
 * 🟢 信頼性レベル: plan/UII/02-phase2-parser.md に記載されるオプション構文
 * @param {string} line - トリムされたルール行
 * @returns {Object} - パースされたオプションオブジェクト
 */
function parseRuleOptions(line) {
 const optionIndex = line.indexOf(PREFIXES.OPTION);
 if (optionIndex === -1) {
   return {}; // オプションなし
 }
 
 const optionsString = line.substring(optionIndex + 1); // $以降を抽出
 return parseOptions(optionsString);
}

// Export parseRuleOptions for testing
export { parseRuleOptions };

// ============================================================================
// Public API
// ============================================================================

/**
 * 指定された行がuBlock形式のコメント行か判定
 *
 * 【改善内容】: 入力検証にisValidStringユーティリティを使用
 * 【設計方針】: シンプルなプレフィックス判定で確実性を確保
 * 【パフォーマンス】: 正規表現キャッシュによる高速判定
 * 【保守性】: isValidStringの変更があれば一箇所で適用
 * 🟢 信頼性レベル: plan/UII/00-overview.md に記載される基本構文
 * @param {string} line - 判定対象の行
 * @returns {boolean} - コメント行ならtrue
 */
export function isCommentLine(line) {
  // 【入力値検証】: null/undefinedの場合はfalseを返してエラーを防ぐ 🟢
  if (!isValidString(line)) {
    return false;
  }
  // 【パターンマッチング】: `!` で始まる行をコメント行と判定
  return PATTERNS.COMMENT_PREFIX.test(line);
}

/**
 * 指定された行が空行か判定
 *
 * 【改善内容】: 入力検証にisValidStringユーティリティを使用
 * 【設計方針】: trim後の空白行チェックで柔軟な判定
 * 【パフォーマンス】: trimと空文字列比較は最効率的
 * 【保守性]: isValidStringの変更があれば一箇所で適用
 * 🟢 信頼性レベル: 基本的な文字列判定機能
 * @param {string} line - 判定対象の行
 * @returns {boolean} - 空行ならtrue
 */
export function isEmptyLine(line) {
  // 【入力値検証】: null/undefinedの場合はtrueを返して処理をスキップ 🟢
  if (!isValidString(line)) {
    return true;
  }
  // 【空白判定】: trimした後に空文字列になるかチェック
  return line.trim() === '';
}

/**
 * 指定された行が有効なuBlockルールパターンか判定
 *
 * 【改善内容】: 入力検証にisValidStringユーティリティを使用
 * 【設計方針】: `||` プレフィックスと `^` サフィックスの両方をチェック
 * 【パフォーマンス】: 正規表現キャッシュによる高速判定
 * 【保守性】: isValidStringの変更があれば一箇所で適用
 * 🟢 信頼性レベル: plan/UII/00-overview.md に記載される基本構文
 * @param {string} line - 判定対象の行
 * @returns {boolean} - 有効なパターンならtrue
 */
export function isValidRulePattern(line) {
  // 【入力値検証】: null/undefinedの場合はinvalid 🟢
  if (!isValidString(line)) {
    return false;
  }
  // 【パターン検証】: `||` プレフィックスと `^` サフィックスの両方を検出
  const hasPrefix = PATTERNS.RULE_PREFIX.test(line);
  const hasSuffix = PATTERNS.RULE_SUFFIX.test(line);
  return hasPrefix && hasSuffix;
}

/**
 * ルールの一意IDを生成
 *
 * 【改善内容】: 空文字列検証をisValidStringに統合
 *【設計方針】: FNV-1aハッシュの簡易版で一意性を確保
 * 【パフォーマンス】: O(n)の単純なハッシュ関数、十分な速度
 * 【保守性】: 注記で将来のSHA-256移行可能性を明記
 * 🟡 信頼性レベル: 一般的なID生成機能から妥当な推測
 * @param {string} rawLine - 元のルール行
 * @returns {string} - 一意ID
 */
export function generateRuleId(rawLine) {
  // 【入力値検証】: null/undefinedの場合は固定値を返す 🟡
  if (!isValidString(rawLine)) {
    return NULL_RULE_ID;
  }

  // 【簡易ハッシュ】: FNV-1aハッシュの簡易版を使用 🟡
  // 【セキュリティ】: セキュアなハッシュではなく、識別用のみ 🟡
  // 【注記】: 将来的にはSHA-256への移行を推奨（Web Crypto API等）
  let hash = 0;
  for (let i = 0; i < rawLine.length; i++) {
    const char = rawLine.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit整数に変換
  }

  // 【IDフォーマット】: ハッシュ値をハイフン区切りのUUID形式に変換
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex.substring(0, 8)}-${hex.substring(8, 12) || '0000'}-${hex.substring(12, 16) || '0000'}-${hex.substring(16, 20) || '0000'}-${hex.substring(20, 32) || '000000000000'}`.substring(0, 36);
}

/**
 * ルールのオプション部分をパース
 *
 * 【機能概要】: uBlock Origin形式のオプション文字列をパースし、内部データ構造に変換
 * 【改善内容】:
 *   - ヘルパー関数parseDomainListでドメイン処理を分離
 *   - 定数OPTION_TYPESでハードコードを削除
 *   - シンプルなif-elseチェーンで可読性向上
 * 【設計方針】: カンマ区切りのオプションを分割し、各オプションタイプごとに適切に処理
 * 【パフォーマンス】: O(n)のループ処理、各オプションに対する定数時間処理
 * 【保守性】: 定数とヘルパー関数の変更が一箇所で適用
 * 🟢 信頼性レベル: plan/UII/02-phase2-parser.md および uBlock Origin標準構文に基づく実装
 * @param {string} optionsString - オプション文字列（`domain=example.com,3p,important` 等）
 * @returns {Object} - パースされたオプションオブジェクト
 */
export function parseOptions(optionsString) {
  // 【入力値検証】: null/undefined/空文字の場合は空オブジェクトを返す 🟢
  if (!isValidString(optionsString) || optionsString.trim() === '') {
    return {};
  }

  // 【オプション解析】: カンマ区切りでオプションを分割して個別にパース 🟢
  const result = {};
  const trimmed = optionsString.trim();
  const optionTokens = trimmed.split(OPTION_TYPES.OPTION_SEPARATOR);

  // 【オプション処理ループ】: 各トークンを処理して必要なプロパティを設定 🟢
  for (const token of optionTokens) {
    const processed = token.trim();

    // 【空白トークンスキップ】: トークンが空の場合はスキップ 🟢
    if (processed === '') {
      continue;
    }

    // 【domainオプション処理】: `domain=` または `~domain=` 形式のパース 🟢
    if (processed.startsWith(OPTION_TYPES.DOMAIN_PREFIX)) {
      const domainValue = processed.substring(OPTION_TYPES.DOMAIN_PREFIX.length); // `domain=` 以降を抽出
      
      // 【空ドメインスキップ】: 値がない場合はスキップ 🟢
      if (domainValue === '') {
        continue;
      }
      
      // 【除外ドメイン判定】: `~` プレフィックスで除外ドメインとして処理 🟢
      if (domainValue.startsWith(OPTION_TYPES.EXCLUDE_DOMAIN_PREFIX)) {
        const negatedList = domainValue.substring(1); // `~` 以降を抽出
        const negatedDomains = parseDomainList(negatedList);
        if (negatedDomains.length > 0) {
          result.negatedDomains = negatedDomains;
        }
      } else {
        // 【許可ドメイン処理】: ヘルパー関数でドメインリストをパース 🟢
        const domains = parseDomainList(domainValue);
        if (domains.length > 0) {
          result.domains = domains;
        }
      }
    }
    
    // 【~domainオプション処理】: `~domain=` 形式のパース 🟢
    else if (processed.startsWith(OPTION_TYPES.EXCLUDE_DOMAIN_PREFIX + OPTION_TYPES.DOMAIN_PREFIX)) {
      const domainValue = processed.substring((OPTION_TYPES.EXCLUDE_DOMAIN_PREFIX + OPTION_TYPES.DOMAIN_PREFIX).length); // `~domain=` 以降を抽出
      
      // 【空ドメインスキップ】: 値がない場合はスキップ 🟢
      if (domainValue === '') {
        continue;
      }
      
      // 【除外ドメイン処理】: ヘルパー関数でドメインリストをパース 🟢
      const negatedDomains = parseDomainList(domainValue);
      if (negatedDomains.length > 0) {
        result.negatedDomains = negatedDomains;
      }
    }

    // 【3pオプション処理】: サードパーティフラグを設定 🟢
    else if (processed === OPTION_TYPES.THIRD_PARTY) {
      result.thirdParty = true;
    }

    // 【1pオプション処理】: ファーストパーティフラグを設定 🟢
    else if (processed === OPTION_TYPES.FIRST_PARTY) {
      result.firstParty = true;
    }

    // 【importantオプション処理】: 重要フラグを設定 🟢
    else if (processed === OPTION_TYPES.IMPORTANT) {
      result.important = true;
    }

    // 【~importantオプション処理】: 重要フラグを解除 🟡
    else if (processed === OPTION_TYPES.NOT_IMPORTANT) {
      result.important = false;
    }

    // 【不明オプションスキップ】: 上記以外は安全にスキップ 🟢
    // 【注記】: エラーログや警告は出さず、静かに処理継続
  }

  return result;
}

/**
 * uBlock形式の単一フィルタールールをパース
 *
 * 【改善内容】:
 *   - ヘルパー関数への分割で可読性向上
 *   - isValidStringによる一貫した入力検証
 *   - 定数使用によるハードコード削除
 * 【設計方針】: ||hostname^ @@||hostname^ 形式のドメインブロックルールをパース
 * 【パフォーマンス】: 各ヘルパー関数が単一責任を持つため効率的
 * 【保守性】: 各処理が独立しているため変更が容易
 * 🟢 信頼性レベル: plan/UII/02-phase2-parser.md に記載される基本機能
 * @param {string} line - フィルタールールの1行
 * @returns {Object|null} - パースされたルール（無効ならnull）
 */
export function parseUblockFilterLine(line) {
  // 【入力値検証】: null/undefinedの場合はnullを返す 🟢
  if (!isValidString(line)) {
    return null;
  }

  // 【トリム処理】: 前後空白を除去してパース 🟢
  // 【テスト対応】: テスト13「前後空白を含む行はトリムしてパース」
  const trimmedLine = line.trim();

  // 【コメント行スキップ】: `!` で始まる行は無効（nullを返す）🟢
  // 【テスト対応】: テスト4「コメント行はスキップされる」
  if (isCommentLine(trimmedLine)) {
    return null;
  }

  // 【空行スキップ】: 空行は無効（nullを返す）🟢
  // 【テスト対応】: テスト5「空行はスキップされる」
  if (isEmptyLine(trimmedLine)) {
    return null;
  }

  // 【ルールタイプ判定】: プレフィックス解析 🟢
  // 【テスト対応】: テスト1（ブロックルール）、テスト2（例外ルール）
  const typeResult = extractRuleTypeAndWorkLine(trimmedLine);
  if (!typeResult) {
    return null; // 【不正形式】: 有効なプレフィックスがない場合
  }

  // 【ドメイン抽出】: サフィックス除去と空白削除 🟢
  // 【テスト対応】: テスト1,3,6（正常系テスト）、テスト8,9（異常系テスト）
  const domain = extractDomain(typeResult.workLine);
  if (domain === null) {
    return null; // 【サフィックスなし】: `^` がない場合
  }

  // 【ドメイン検証】: 空ドメインと不正文字をチェック 🟡
  // 【セキュリティ】: 不正なドメイン形式による問題を防止 🟢
  // 【テスト対応】: テスト9,10（異常系テスト）
  if (!validateDomain(domain)) {
    return null; // 【不正なドメイン】: 形式が不正
  }

  // 【ルール構築】: UblockRuleオブジェクトを生成して返却 🟢
  return buildRuleObject(trimmedLine, typeResult.type, domain);
}

/**
 * 複数行のuBlockフィルターテキストを一括パース
 *
 * 【改善内容】:
 *   - createEmptyRulesetヘルパー関数でDRY原則適用
 *   - isValidStringによる一貫した入力検証
 *   - 定数DEFAULT_METADATAの使用
 * 【設計方針】: 各行をparseUblockFilterLineでパースし、ブロック/例外ルールに分類
 * 【パフォーマンス】: O(n)のループ処理、1行あたり一定の処理時間
 * 【保守性】: ルールセット構造が変更された場合も保守しやすい
 * 🟢 信頼性レベル: plan/UII/02-phase2-parser.md に記載される機能
 * @param {string} text - 複数行のフィルターテキスト
 * @returns {Object} - パースされたUblockRulesオブジェクト
 */
export function parseUblockFilterList(text) {
  // 【入力値検証】: null/undefinedの場合は空のルールセットを返す 🟢
  if (!isValidString(text)) {
    return createEmptyRuleset();
  }

  // 【行分割】: 改行区切りのテキストを配列に変換 🟢
  const lines = text.split('\n');

  // 【配列初期化】: ルール格納用配列 🟢
  const blockRules = [];
  const exceptionRules = [];

  // 【行パース】: 各行をパースしてルールに分類 🟢
  // 【パフォーマンス】: linearループで効率的、1,000行<1秒が達成可能 🟢
  for (const line of lines) {
    const rule = parseUblockFilterLine(line); // 【単行パース】: 1行ずつ処理

    // 【ルール分類】: nullでない場合にタイプごとに追加 🟢
    if (rule) {
      if (rule.type === RULE_TYPES.BLOCK) {
        blockRules.push(rule);
      } else if (rule.type === RULE_TYPES.EXCEPTION) {
        exceptionRules.push(rule);
      }
    }
  }

  // 【メタデータ構築】: パース結果の集計情報 🟢
  const result = {
    blockRules,                         // 【ブロックルール配列】
    exceptionRules,                     // 【例外ルール配列】
    metadata: {
      source: DEFAULT_METADATA.SOURCE,  // 【データソース】: テキストエリア貼り付け
      importedAt: Date.now(),           // 【インポート日時】: UNIXタイムスタンプ
      lineCount: lines.length,          // 【入力行数】: コメント・空行を含む
      ruleCount: blockRules.length + exceptionRules.length // 【有効ルール数】
    }
  };

  return result;
}