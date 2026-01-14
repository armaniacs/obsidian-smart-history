# プライバシーポリシー / Privacy Policy

**最終更新日: 2025年12月27日 / Last Updated: December 27, 2025**

[日本語](#日本語) | [English](#english)

---

## 日本語

### 概要
Obsidian Smart History（以下「本拡張機能」）は、ユーザーのプライバシー保護に努めています。本ポリシーでは、収集されるデータ、その使用方法、およびユーザーの権利について説明します。

### データの収集
本拡張機能は、以下のデータを**ユーザーのデバイス上のみ（ローカル）**で収集します。

1. **閲覧履歴データ**:
   - 訪問したページのURL
   - ページのタイトル
   - 滞在時間
   - スクロール深度
   - ページ内容（AI要約生成用）

2. **構成データ**:
   - Obsidian API キー
   - Obsidian サーバー設定（プロトコル、ポート、パス）
   - Google Gemini API キー
   - 設定情報（最小滞在時間、スクロール深度など）

### データの保存場所
- すべての設定データは、デバイス上の **Chrome ローカルストレージ** に保存されます。
- 閲覧履歴は、ユーザー自身の **ローカル Obsidian Vault** に保存されます。
- **いかなるデータも開発者のサーバーには保存されません。** 開発者はサーバーを運営していません。

### データの使用方法
1. **ページ内容**: 要約を作成するために Google Gemini API に送信されます。
2. **閲覧履歴**: Local REST API を通じて Obsidian Vault に保存されます。
3. **設定**: Obsidian および Gemini API への接続に使用されます。

### 第三者サービス
本拡張機能は、以下の第三者サービスと通信します：

1. **Google Gemini API**: ページ内容の要約を生成するため。データはGoogleのプライバシーポリシーに従って処理されます。
2. **ユーザーのローカル Obsidian**: デイリーノートに履歴を保存するため。これはユーザー自身のローカルサーバーです。

---

## English

### Overview
Obsidian Smart History ("the Extension") is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights.

### Data Collection
The Extension collects the following data **locally on your device**:
- Browsing history data (URLs, titles, duration, scroll depth, content)
- Configuration data (API keys, connection settings)

### Storage
- All configuration data is stored in **Chrome's local storage** on your device.
- Browsing history entries are saved to **your local Obsidian vault**.
- **No data is stored on our servers.**

### Third-Party Services
1. **Google Gemini API**: Used to generate summaries. Data is sent according to Google's privacy policy.
2. **Your Local Obsidian Instance**: Used to save history. This is your own local server.

---

## 権利 / Rights
すべてのデータはローカルに保存されており、拡張機能のアンインストールやObsidian内のノート削除によっていつでも破棄できます。

All data is stored locally and can be deleted by uninstalling the extension or manually deleting notes in Obsidian.
