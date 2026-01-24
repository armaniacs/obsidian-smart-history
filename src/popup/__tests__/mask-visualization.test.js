/**
 * Masked Information Visualization Test
 * UF-401: マスク情報の可視化機能
 */

import { describe, test, expect } from '@jest/globals';
import * as sanitizePreview from '../sanitizePreview.js';

describe('Masked Information Visualization - プレビュー画面のマスク表示', () => {
  describe('正常系 - マスク件数表示', () => {
    test('TC-MV-001: マスク件数1件が正しく表示される', () => {
      const content = "連絡先は[MASKED:email]example.comです。";
      const maskedItems = [
        { type: "email", original: "test@example.com" }
      ];
      const maskedCount = 1;

      sanitizePreview.showPreview(content, maskedItems, maskedCount);

      const modal = document.getElementById('confirmationModal');
      const statusMessage = document.getElementById('maskStatusMessage');

      expect(statusMessage.textContent).toBe("1件の個人情報をマスクしました");
      expect(modal.style.display).toBe("flex");
    });

    test('TC-MV-002: マスク件数複数が正しく表示される', () => {
      const content = "お支払いは口座[MASKED:bankAccount]で問い合わせ:[MASKED:phoneJp]";
      const maskedItems = [
        { type: "bankAccount", original: "1234567890" },
        { type: "phoneJp", original: "03-1234-5678" }
      ];
      const maskedCount = 2;

      sanitizePreview.showPreview(content, maskedItems, maskedCount);

      const statusMessage = document.getElementById('maskStatusMessage');

      expect(statusMessage.textContent).toBe("2件の個人情報をマスクしました");
    });
  });

  describe('正常系 - ハイライト表示', () => {
    test('TC-MV-003: ハイライト箇所が正しく表示される', () => {
      const content = "メールアドレスは[MASKED:email]test@example.comです";
      const maskedItems = [{ type: "email", original: "test@example.com" }];
      const maskedCount = 1;

      sanitizePreview.showPreview(content, maskedItems, maskedCount);

      const previewContent = document.getElementById('previewContent');

      expect(previewContent.value).toContain("masked-highlight");
    });

    test('TC-MV-004: ツールチップでマスク理由が表示される', () => {
      const content = "連絡先:[MASKED:email]xxx@example.com";
      const maskedItems = [{ type: "email", original: "xxx@example.com" }];
      const maskedCount = 1;

      sanitizePreview.showPreview(content, maskedItems, maskedCount);

      const previewContent = document.getElementById('previewContent');
      const highlighted = previewContent.getAttribute('data-highlighted');

      expect(highlighted).toContain('title="email"');
    });
  });

  describe('正常系 - 互換性', () => {
    test('TC-MV-005: showPreviewの単一引数呼び出し互換性が維持されている', () => {
      const content = "名前: 田中太郎\nメール: [MASKED:email]tanaka@example.com";

      expect(() => {
        sanitizePreview.showPreview(content);
      }).not.toThrow();

      const modal = document.getElementById('confirmationModal');
      expect(modal.style.display).toBe("flex");
    });

    test('TC-MV-006: 複数の異なるPIIタイプが正しく識別される', () => {
      const content = "カード[MASKED:creditCard]、口座[MASKED:bankAccount]";
      const maskedItems = [
        { type: "creditCard", original: "1234-5678-9012-3456" },
        { type: "bankAccount", original: "01234567" }
      ];
      const maskedCount = 2;

      sanitizePreview.showPreview(content, maskedItems, maskedCount);

      const previewContent = document.getElementById('previewContent');
      const processedContent = previewContent.getAttribute('data-highlighted');

      expect(processedContent).toContain('title="creditCard"');
      expect(processedContent).toContain('title="bankAccount"');
    });
  });

  describe('異常系 - エラーハンドリング', () => {
    test('TC-MV-101: maskedItemsがnullの場合の動作', () => {
      const content = "連絡先[MASKED:email]xxx@example.com";
      const maskedCount = 1;

      expect(() => {
        sanitizePreview.showPreview(content, null, maskedCount);
      }).not.toThrow();

      const modal = document.getElementById('confirmationModal');
      expect(modal.style.display).toBe("flex");
    });

    test('TC-MV-102: 不正なmaskedItems形式の場合の動作', () => {
      const content = "連絡先: 090-1234-5678";
      const maskedCount = 1;

      expect(() => {
        sanitizePreview.showPreview(content, "invalid format", maskedCount);
      }).not.toThrow();

      const modal = document.getElementById('confirmationModal');
      expect(modal.style.display).toBe("flex");
    });

    test('TC-MV-103: 正規表現特殊文字を含む場合', () => {
      const content = "価格: ￥[MASKED:price]1,000円 (税込)";
      const maskedItems = [{ type: "price", original: "1,000" }];
      const maskedCount = 1;

      expect(() => {
        sanitizePreview.showPreview(content, maskedItems, maskedCount);
      }).not.toThrow();

      const modal = document.getElementById('confirmationModal');
      expect(modal.style.display).toBe("flex");
    });
  });

  describe('境界値 - 入力検証', () => {
    test('TC-MV-201: マスク件数0件の場合', () => {
      const content = "まったく個人情報が含まれないテキストです。";
      const maskedItems = [];
      const maskedCount = 0;

      sanitizePreview.showPreview(content, maskedItems, maskedCount);

      const modal = document.getElementById('confirmationModal');
      const statusMessage = document.getElementById('maskStatusMessage');

      expect(statusMessage.textContent).toBe("0件の個人情報をマスクしました");
      expect(modal.style.display).toBe("flex");
    });

    test('TC-MV-202: 極端なマスク件数（100件以上）', () => {
      const maskedItems = Array.from({ length: 100 }, (_, i) => ({
        type: "email",
        original: `x${i + 1}@example.com`
      }));

      const startTime = Date.now();
      sanitizePreview.showPreview("[MASKED:email]x1@example.com", maskedItems, 100);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);

      const statusMessage = document.getElementById('maskStatusMessage');
      expect(statusMessage.textContent).toBe("100件の個人情報をマスクしました");
    });

    test('TC-MV-203: 空文字のコンテンツ', () => {
      const content = "";
      const maskedItems = [];
      const maskedCount = 0;

      expect(() => {
        sanitizePreview.showPreview(content, maskedItems, maskedCount);
      }).not.toThrow();

      const modal = document.getElementById('confirmationModal');
      const statusMessage = document.getElementById('maskStatusMessage');

      expect(modal.style.display).toBe("flex");
      expect(statusMessage.textContent).toBe("0件の個人情報をマスクしました");
    });
  });

  describe('境界値 - ステータスメッセージ要素の確認', () => {
    test('maskStatusMessage要素が作成される', () => {
      const content = "テスト";
      sanitizePreview.showPreview(content, [], 0);

      const element = document.getElementById('maskStatusMessage');
      expect(element).toBeTruthy();
    });
  });
});