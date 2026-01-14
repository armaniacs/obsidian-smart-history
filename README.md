# スマートな履歴管理 / Obsidian Smart History

[日本語](#日本語) | [English](#english)

---

## 日本語

### 概要
ブラウザの閲覧履歴を、AIによる要約付きでObsidianのデイリーノートに自動保存するChrome拡張機能です。

### 特徴
- 🤖 **AIによる要約**: Google Gemini APIを使用して、ウェブページの内容を簡潔に要約します。
- 📝 **Obsidian連携**: 閲覧履歴を直接Obsidianのデイリーノートに保存します。
- 🎯 **スマート検出**: 実際に読んだページのみを保存します（滞在時間とスクロール深度に基づきます）。
- 📂 **整理された保存**: デイリーノート内に専用の「ブラウザ閲覧履歴」セクションを自動作成し、管理します。
- ⚙️ **カスタマイズ可能**: 最小滞在時間、スクロール深度、API設定などを自由に構成できます。

### 必要なもの
- [Obsidian](https://obsidian.md/) と [Local REST API プラグイン](https://github.com/coddingtonbear/obsidian-local-rest-api)
- [Google Gemini API キー](https://aistudio.google.com/app/apikey)（無料枠あり）

### インストール方法
1. このリポジトリをダウンロードまたはクローンします。
2. Chromeを開き、`chrome://extensions` にアクセスします。
3. 右上の「デベロッパーモード」を有効にします。
4. 「パッケージ化されていない拡張機能を読み込む」をクリックし、解凍したフォルダを選択します。

### 設定
1. ツールバーの拡張機能アイコンをクリックします。
2. 以下の設定を入力してください：
   - **Obsidian API Key**: ObsidianのLocal REST API設定で取得したキー
   - **Daily Notes Path**: デイリーノートの保存先フォルダ。`YYYY`, `MM`, `DD` プレースホルダーを使用して動的にフォルダを指定できます（例: `daily/YYYY/MM`）。
   - **Gemini API Key**: Google AI Studioで取得したAPIキー
3. 「Save Settings」をクリックし、「Test Connection」で接続を確認してください。

---

## English

### Overview
A Chrome extension that automatically saves your browsing history to Obsidian with AI-generated summaries.

### Features
- 🤖 **AI-Powered Summaries**: Automatically generates concise summaries of web pages using Google's Gemini API
- 📝 **Obsidian Integration**: Saves browsing history directly to your Obsidian daily notes
- 🎯 **Smart Detection**: Only saves pages you actually read (based on scroll depth and time spent)
- 📂 **Organized Storage**: Automatically creates and maintains a dedicated "Browser History" section in your daily notes
- ⚙️ **Customizable**: Configure minimum visit duration, scroll depth, and API settings

### Requirements
- [Obsidian](https://obsidian.md/) with [Local REST API plugin](https://github.com/coddingtonbear/obsidian-local-rest-api)
- [Google Gemini API key](https://aistudio.google.com/app/apikey) (free tier available)

### Installation
1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

### Setup
1. Click the extension icon in your toolbar
2. Configure settings (Obsidian API Key, Daily Notes Path, Gemini API Key)
3. Click "Save Settings" and "Test Connection" to verify connectivity.

---

## Privacy / プライバシー
データはすべてローカルに保存されます。詳細は [PRIVACY.md](PRIVACY.md) を参照してください。

All data is stored locally. See [PRIVACY.md](PRIVACY.md) for details.

## License / ライセンス
MIT License
