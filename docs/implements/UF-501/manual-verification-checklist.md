# UF-501: Manual Verification Checklist

## Overview

This document provides step-by-step instructions for manually verifying the simultaneous use of Simple and uBlock Origin filter formats.

## Prerequisites

- Chrome browser with Developer Mode enabled
- Obsidian Smart History extension loaded
- Obsidian with Local REST API plugin installed (optional, for full testing)

## Verification Steps

### MAN-001: Checkbox visibility

**目的**: チェックボックスが表示されていることを確認

**手順**:
1. Chrome拡張機能の設定を開く
2. Obsidian Smart Historyのポップアップを開く
3. 設定画面（Settings）に移動
4. 「ドメインフィルター」タブをクリック

**期待結果**:
- ✅ 「シンプル (1行1ドメイン)」チェックボックスが表示されている
- ✅ 「uBlock Origin 形式」チェックボックスが表示されている
- ✅ 「シンプル」チェックボックスはデフォルトでチェックされている
- ✅ 「uBlock」チェックボックスはデフォルトでチェックされていない

---

### MAN-002: Simple UI appears

**目的**: SimpleチェックボックスをチェックするとSimple UIが表示されることを確認

**手順**:
1. 「ドメインフィルター」タブを開く
2. 「シンプル (1行1ドメイン)」チェックボックスをクリックしてチェックする

**期待結果**:
- ✅ Simple形式のUIが表示される
- ✅ 「ドメインリスト (1行に1ドメイン)」テキストエリアが表示される
- ✅ 「現在のページドメインを追加」ボタンが表示される

---

### MAN-003: uBlock UI appears

**目的**: uBlockチェックボックスをチェックするとuBlock UIが表示されることを確認

**手順**:
1. 「ドメインフィルター」タブを開く
2. 「uBlock Origin 形式」チェックボックスをクリックしてチェックする

**期待結果**:
- ✅ uBlock形式のUIが表示される
- ✅ 「uBlockフィルター」テキストエリアが表示される
- ✅ 「ファイルを選択」ボタンが表示される
- ✅ 「URLからインポート」ボタンが表示される
- ✅ 「エクスポート」ボタンが表示される
- ✅ 「クリップボードにコピー」ボタンが表示される

---

### MAN-004: Both UIs visible

**目的**: 両方のチェックボックスをチェックすると両方のUIが同時に表示されることを確認

**手順**:
1. 「ドメインフィルター」タブを開く
2. 「シンプル (1行1ドメイン)」チェックボックスをチェックする
3. 「uBlock Origin 形式」チェックボックスをチェックする

**期待結果**:
- ✅ Simple形式のUIが表示されている
- ✅ uBlock形式のUIが表示されている
- ✅ 両方のUIが同時に表示されている

---

### MAN-005: Add to Simple blacklist

**目的**: Simpleブラックリストにドメインを追加できることを確認

**手順**:
1. 「ドメインフィルター」タブを開く
2. 「ドメインフィルターモード」で「ブラックリスト (指定ドメインを除外)」を選択
3. 「シンプル (1行1ドメイン)」チェックボックスをチェックする
4. 「ドメインリスト」テキストエリアに `domain-a.com` と入力
5. 「保存」ボタンをクリック

**期待結果**:
- ✅ 「ドメインフィルター設定を保存しました」という成功メッセージが表示される
- ✅ 設定が保存される

---

### MAN-006: Add to uBlock rules

**目的**: uBlockルールを追加できることを確認

**手順**:
1. 「ドメインフィルター」タブを開く
2. 「uBlock Origin 形式」チェックボックスをチェックする
3. 「uBlockフィルター」テキストエリアに `||domain-b.com^` と入力
4. 「保存」ボタンをクリック

**期待結果**:
- ✅ 「uBlockフィルターを保存しました」という成功メッセージが表示される
- ✅ 設定が保存される

---

### MAN-007: Save settings

**目的**: 両方の形式の設定を同時に保存できることを確認

**手順**:
1. 「ドメインフィルター」タブを開く
2. 「ドメインフィルターモード」で「ブラックリスト (指定ドメインを除外)」を選択
3. 「シンプル (1行1ドメイン)」チェックボックスをチェックする
4. 「ドメインリスト」テキストエリアに `domain-a.com` と入力
5. 「uBlock Origin 形式」チェックボックスをチェックする
6. 「uBlockフィルター」テキストエリアに `||domain-b.com^` と入力
7. 「保存」ボタンをクリック

**期待結果**:
- ✅ 「ドメインフィルター設定を保存しました」という成功メッセージが表示される
- ✅ 「uBlockフィルターを保存しました」という成功メッセージが表示される
- ✅ 両方の設定が保存される

---

### MAN-008: Navigate to blocked-simple

**目的**: Simpleブラックリストに登録されたドメインがブロックされることを確認

**手順**:
1. MAN-007の手順で設定を保存する
2. 新しいタブを開く
3. `https://domain-a.com` に移動する（または実際のドメインを使用）

**期待結果**:
- ✅ ページが記録されない（またはブロックされる）
- ✅ ドメインフィルターが正しく動作している

**注意**: 実際のドメインを使用する場合は、テスト用のドメインを使用してください。

---

### MAN-009: Navigate to blocked-ublock

**目的**: uBlockルールに一致するドメインがブロックされることを確認

**手順**:
1. MAN-007の手順で設定を保存する
2. 新しいタブを開く
3. `https://domain-b.com` に移動する（または実際のドメインを使用）

**期待結果**:
- ✅ ページが記録されない（またはブロックされる）
- ✅ uBlockフィルターが正しく動作している

**注意**: 実際のドメインを使用する場合は、テスト用のドメインを使用してください。

---

### MAN-010: Uncheck Simple

**目的**: SimpleチェックボックスをオフにするとSimple UIが非表示になることを確認

**手順**:
1. 「ドメインフィルター」タブを開く
2. 「シンプル (1行1ドメイン)」チェックボックスのチェックを外す

**期待結果**:
- ✅ Simple形式のUIが非表示になる
- ✅ uBlock形式のUIは表示されたまま（チェックされている場合）

---

### MAN-011: Save after uncheck

**目的**: Simpleをオフにして保存すると、Simpleフィルターが無効になることを確認

**手順**:
1. 「ドメインフィルター」タブを開く
2. 「シンプル (1行1ドメイン)」チェックボックスのチェックを外す
3. 「uBlock Origin 形式」チェックボックスがチェックされていることを確認
4. 「保存」ボタンをクリック

**期待結果**:
- ✅ 「ドメインフィルター設定を保存しました」という成功メッセージが表示される
- ✅ Simpleフィルターが無効になる

---

### MAN-012: Navigate to allowed-simple

**目的**: Simpleをオフにした後、Simpleブラックリストに登録されたドメインが許可されることを確認

**手順**:
1. MAN-011の手順で設定を保存する
2. 新しいタブを開く
3. `https://domain-a.com` に移動する（または実際のドメインを使用）

**期待結果**:
- ✅ ページが記録される（またはブロックされない）
- ✅ Simpleフィルターが無効になっている

**注意**: 実際のドメインを使用する場合は、テスト用のドメインを使用してください。

---

### MAN-013: Navigate to blocked-ublock

**目的**: Simpleをオフにした後、uBlockルールはまだ有効であることを確認

**手順**:
1. MAN-011の手順で設定を保存する
2. 新しいタブを開く
3. `https://domain-b.com` に移動する（または実際のドメインを使用）

**期待結果**:
- ✅ ページが記録されない（またはブロックされる）
- ✅ uBlockフィルターがまだ有効である

**注意**: 実際のドメインを使用する場合は、テスト用のドメインを使用してください。

---

## Additional Verification Steps

### Test with whitelist mode

**手順**:
1. 「ドメインフィルターモード」で「ホワイトリスト (指定ドメインのみ記録)」を選択
2. 「シンプル (1行1ドメイン)」チェックボックスをチェックする
3. 「ドメインリスト」テキストエリアに `allowed.com` と入力
4. 「uBlock Origin 形式」チェックボックスをチェックする
5. 「uBlockフィルター」テキストエリアに `||blocked.com^` と入力
6. 「保存」ボタンをクリック
7. `https://allowed.com` に移動 → 許可されることを確認
8. `https://other.com` に移動 → ブロックされることを確認
9. `https://blocked.com` に移動 → ブロックされることを確認

### Test with wildcard patterns

**手順**:
1. 「ドメインフィルターモード」で「ブラックリスト (指定ドメインを除外)」を選択
2. 「シンプル (1行1ドメイン)」チェックボックスをチェックする
3. 「ドメインリスト」テキストエリアに `*.example.com` と入力
4. 「保存」ボタンをクリック
5. `https://sub.example.com` に移動 → ブロックされることを確認
6. `https://another.example.com` に移動 → ブロックされることを確認
7. `https://other.com` に移動 → 許可されることを確認

### Test with uBlock exception rules

**手順**:
1. 「uBlock Origin 形式」チェックボックスをチェックする
2. 「uBlockフィルター」テキストエリアに以下を入力:
   ```
   ||example.com^
   @@||trusted.example.com^
   ```
3. 「保存」ボタンをクリック
4. `https://example.com` に移動 → ブロックされることを確認
5. `https://trusted.example.com` に移動 → 許可されることを確認

### Test settings persistence

**手順**:
1. 両方のチェックボックスをチェックして設定を保存
2. ポップアップを閉じる
3. ポップアップを再度開く
4. 「ドメインフィルター」タブを確認

**期待結果**:
- ✅ 「シンプル (1行1ドメイン)」チェックボックスがチェックされている
- ✅ 「uBlock Origin 形式」チェックボックスがチェックされている
- ✅ 両方のUIが表示されている
- ✅ 入力したドメインとルールが保持されている

---

## Test Results

| Test ID | Test Case | Status | Notes |
|---------|-----------|--------|-------|
| MAN-001 | Checkbox visibility | ⬜ | |
| MAN-002 | Simple UI appears | ⬜ | |
| MAN-003 | uBlock UI appears | ⬜ | |
| MAN-004 | Both UIs visible | ⬜ | |
| MAN-005 | Add to Simple blacklist | ⬜ | |
| MAN-006 | Add to uBlock rules | ⬜ | |
| MAN-007 | Save settings | ⬜ | |
| MAN-008 | Navigate to blocked-simple | ⬜ | |
| MAN-009 | Navigate to blocked-ublock | ⬜ | |
| MAN-010 | Uncheck Simple | ⬜ | |
| MAN-011 | Save after uncheck | ⬜ | |
| MAN-012 | Navigate to allowed-simple | ⬜ | |
| MAN-013 | Navigate to blocked-ublock | ⬜ | |

**Legend**:
- ✅ Pass
- ❌ Fail
- ⬜ Not tested
- ⚠️ Partial pass

---

## Notes

- 実際のドメインを使用する場合は、テスト用のドメインを使用してください
- 拡張機能の動作を確認するには、Chrome DevToolsのコンソールを確認してください
- 問題が発生した場合は、ブラウザの拡張機能エラーログを確認してください
- Service Workerのログを確認するには、`chrome://extensions` → 「Service Worker」 → 「inspect」をクリックしてください