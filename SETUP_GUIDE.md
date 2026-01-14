# 完全セットアップガイド / Complete Setup Guide - Obsidian Smart History

[日本語](#日本語) | [English](#english)

---

## 日本語

### 📋 目次
1. [必要なもの](#必要なもの)
2. [ステップ1: Obsidianのセットアップ](#ステップ1-obsidianのセットアップ)
3. [ステップ2: Google Gemini APIキーの取得](#ステップ2-google-gemini-apiキーの取得)
4. [ステップ3: Chrome拡張機能のインストール](#ステップ3-chrome拡張機能のインストール)
5. [ステップ4: 拡張機能の設定](#ステップ4-拡張機能の設定)

### 必要なもの
- **Obsidian**: https://obsidian.md/
- **Google アカウント** (Gemini API用)
- **Google Chrome** ブラウザ

### ステップ1: Obsidianのセットアップ
1. **Local REST APIプラグインのインストール**
   - 設定 → コミュニティプラグイン → 閲覧 → 「Local REST API」を検索してインストール・有効化。
2. **APIキーをコピー**
   - 設定 → Local REST API → 「API Key」をコピーして控えておきます。

### ステップ2: Google Gemini APIキーの取得
1. https://aistudio.google.com/ にアクセス。
2. 「Get API key」から新しいAPIキーを作成し、コピーして控えておきます。

### ステップ3: Chrome拡張機能のインストール
1. `chrome://extensions` を開きます。
2. 右上の「デベロッパーモード」をオンにします。
3. 「パッケージ化されていない拡張機能を読み込む」からフォルダを選択します。

---

## English

### 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Step 1: Obsidian Setup](#step-1-obsidian-setup)
3. [Step 2: Get Google Gemini API Key](#step-2-get-google-gemini-api-key)
4. [Step 3: Install Chrome Extension](#step-3-install-chrome-extension)
5. [Step 4: Configure Settings](#step-4-configure-settings)

### Prerequisites
- **Obsidian**: https://obsidian.md/
- **Google Account** (for Gemini API)
- **Google Chrome** Browser

### Step 1: Obsidian Setup
1. **Install Local REST API Plugin**
   - Settings → Community Plugins → Browse → Search "Local REST API", install and enable.
2. **Copy API Key**
   - Settings → Local REST API → Copy the "API Key".

### Step 2: Get Google Gemini API Key
1. Visit https://aistudio.google.com/.
2. Create a new API key via "Get API key" and copy it.

### Step 3: Install Chrome Extension
1. Open `chrome://extensions`.
2. Enable "Developer mode" (top right).
3. Click "Load unpacked" and select the extension folder.

### Step 4: Configure Settings
1. Click the extension icon.
2. Paste your Obsidian API Key and Gemini API Key.
3. Set your **Daily Notes Path** (e.g., `092.Daily` or `daily/YYYY/MM`).
4. Click "Save Settings" and "Test Connection" to verify connectivity.
