/**
 * localAiClient.js
 * ローカルAI（Prompt API）を使用した要約クライアント
 * Edge: Phi-4-mini, Chrome: Gemini Nano を利用
 * 
 * Note: Service Worker では window が存在しないため、globalThis.ai を使用
 */

// Service Worker / Window の両方で動作するよう globalThis を使用
const getAI = () => globalThis.ai || (typeof self !== 'undefined' ? self.ai : null);

export class LocalAIClient {
    constructor() {
        this.session = null;
    }

    /**
     * Prompt API が利用可能かチェック
     * @returns {Promise<'readily'|'after-download'|'no'|'unsupported'>}
     */
    async getAvailability() {
        const ai = getAI();
        if (!ai?.languageModel) {
            return 'unsupported';
        }

        try {
            const capabilities = await ai.languageModel.capabilities();
            return capabilities?.available || 'no';
        } catch (error) {
            console.error('LocalAIClient: Failed to check capabilities', error);
            return 'unsupported';
        }
    }

    /**
     * ローカルAIが即時利用可能かどうか
     * @returns {Promise<boolean>}
     */
    async isAvailable() {
        const status = await this.getAvailability();
        return status === 'readily';
    }

    /**
     * 要約用セッションを作成
     * @returns {Promise<object|null>}
     */
    async createSession() {
        const status = await this.getAvailability();
        if (status !== 'readily' && status !== 'after-download') {
            console.warn(`LocalAIClient: AI status is '${status}', cannot create session.`);
            return null;
        }

        try {
            const ai = getAI();
            this.session = await ai.languageModel.create({
                systemPrompt: `あなたはWebページ要約のエキスパートです。
与えられたテキストを日本語で1文または2文に要約してください。
重要なポイントのみを抽出し、個人情報や機密情報は含めないでください。
改行しないでください。`
            });
            return this.session;
        } catch (error) {
            console.error('LocalAIClient: Failed to create session', error);
            return null;
        }
    }

    /**
     * テキストを要約
     * @param {string} content - 要約するテキスト
     * @returns {Promise<string|null>} 要約結果。失敗時はnull
     */
    async summarize(content) {
        if (!content || typeof content !== 'string') {
            return null;
        }

        // セッションがなければ作成
        if (!this.session) {
            // isAvailableチェックは削除し、createSessionに任せる
            const session = await this.createSession();
            if (!session) {
                console.warn('LocalAIClient: AI not available, returning null');
                return null;
            }
        }

        try {
            // トークン上限を考慮して10000文字に制限
            const truncatedContent = content.substring(0, 10000);
            const result = await this.session.prompt(truncatedContent);
            return result;
        } catch (error) {
            console.error('LocalAIClient: Summarization failed', error);
            // セッションエラーの場合はリセット
            this.destroySession();
            return null;
        }
    }

    /**
     * セッションを破棄
     */
    destroySession() {
        if (this.session) {
            try {
                this.session.destroy();
            } catch (e) {
                // ignore
            }
            this.session = null;
        }
    }
}
