/**
 * piiSanitizer.js
 * 正規表現による個人情報（PII）の検出とマスキング
 */

const PII_PATTERNS = {
    // クレジットカード（Luhnアルゴリズム検証は行わず、形式のみチェック）
    // 14-16桁の数字、ハイフン・スペース区切り可
    creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{4}[-\s]?\d{6}[-\s]?\d{5}\b/g,

    // マイナンバー（12桁の数字）
    myNumber: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,

    // 銀行口座番号（7桁の数字）
    // 文脈によっては誤検知の可能性があるが、安全側に倒してマスク
    bankAccount: /\b\d{7}\b/g,

    // メールアドレス
    // 一般的なメールアドレス形式
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

    // 電話番号（日本形式）
    // 固定電話(0x-xxxx-xxxx), 携帯電話(090-xxxx-xxxx), フリーダイヤル(0120-xxx-xxx)
    phoneJp: /\b(?:0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{4})\b/g,
};

/**
 * テキストからPIIを検出してマスクする
 * @param {string} text - 対象テキスト
 * @returns {object} { text: string, maskedItems: Array<{type: string, original: string}> }
 */
export function sanitizeRegex(text) {
    if (!text || typeof text !== 'string') {
        return { text: '', maskedItems: [] };
    }

    let result = text;
    const maskedItems = [];

    // 各パターンで置換
    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
        result = result.replace(pattern, (match) => {
            maskedItems.push({ type, original: match });
            return `[MASKED:${type}]`; // デバッグ用にタイプを含める（本番は[MASKED]のみでも可）
        });
    }

    return { text: result, maskedItems };
}
