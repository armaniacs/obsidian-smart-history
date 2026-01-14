# 完全セットアップガイド / Complete Setup Guide - Obsidian Smart History

[日本語](#日本語) | [English](#english)

---

## 日本語

### 📋 目次
1. [必要なもの](#必要なもの)
2. [ステップ1: Obsidianのセットアップ](#ステップ1-obsidianのセットアップ)
3. [ステップ2: AI APIキーの取得](#ステップ2-ai-apiキーの取得)
4. [ステップ3: Chrome拡張機能のインストール](#ステップ3-chrome拡張機能のインストール)
5. [ステップ4: 拡張機能の設定](#ステップ4-拡張機能の設定)

### 必要なもの
- **Obsidian**: https://obsidian.md/
- **Google Chrome** ブラウザ
- **AIプロバイダー** (以下のいずれか、または複数)
    - Google アカウント (Gemini API用)
    - OpenAI互換のAPIキー (Groq, OpenAI, Together AIなど)
    - ローカルLLM (Ollama, LM Studioなど)

### ステップ1: Obsidianのセットアップ
1. **Local REST APIプラグインのインストール**
   - 設定 → コミュニティプラグイン → 閲覧 → 「Local REST API」を検索してインストール・有効化。
2. **APIキーをコピー**
   - 設定 → Local REST API → 「API Key」をコピーして控えておきます。

### ステップ2: AI APIキーの取得
使用したいAIに合わせてAPIキーを取得してください。

*   **Google Gemini**: https://aistudio.google.com/ から取得。
*   **Groq (OpenAI互換)**: https://console.groq.com/keys から取得。
*   **OpenAI**: https://platform.openai.com/api-keys から取得。
*   **ローカルLLM**: キー不要の場合が多いですが、サーバーを起動しておく必要があります（例: `ollama serve`）。

### ステップ3: Chrome拡張機能のインストール
1. `chrome://extensions` を開きます。
2. 右上の「デベロッパーモード」をオンにします。
3. 「パッケージ化されていない拡張機能を読み込む」からフォルダを選択します。

### ステップ4: 拡張機能の設定
拡張機能のアイコンをクリックして設定画面を開きます。

#### 1. Obsidian設定
*   **Obsidian API Key**: ステップ1でコピーしたキーを入力。
*   **Protocol/Port**: デフォルト (`http`, `27123`) のままで通常はOKです。
*   **Daily Note Path**: デイリーノートが保存されているフォルダパスを指定します（例: `092.Daily` や `Journal`）。日付ファイル（`YYYY-MM-DD.md`）がこのフォルダ直下に作成/追記されます。

#### 2. AIプロバイダー設定
「AI Provider」のプルダウンから使用するサービスを選択します。

**A. Google Gemini (デフォルト)**
*   **API Key**: GeminiのAPIキーを入力。
*   **Model Name**: `gemini-1.5-flash` (推奨) など。

**B. OpenAI Compatible (Groq, OpenAIなど)**
*   **Base URL**: APIのエンドポイントURL。
    *   Groq: `https://api.groq.com/openai/v1`
    *   OpenAI: `https://api.openai.com/v1`
*   **API Key**: 各サービスのAPIキー。
*   **Model Name**: 使用するモデル名（例: `openai/gpt-oss-20b`, `gpt-3.5-turbo`）。

**C. OpenAI Compatible 2 (サブ設定)**
*   ローカルLLMなどを2つ目の設定として保存できます。
*   **Base URL**: 例 `http://127.0.0.1:11434/v1` (Ollama)
*   **Model Name**: 例 `llama3`

設定を入力したら、**「Save & Test Connection」**をクリックして接続を確認してください。

---

## English

### 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Step 1: Obsidian Setup](#step-1-obsidian-setup)
3. [Step 2: Get AI API Key](#step-2-get-ai-api-key)
4. [Step 3: Install Chrome Extension](#step-3-install-chrome-extension)
5. [Step 4: Configure Settings](#step-4-configure-settings)

### Prerequisites
- **Obsidian**: https://obsidian.md/
- **Google Chrome** Browser
- **AI Provider** (Any of the following)
    - Google Account (for Gemini)
    - OpenAI Compatible Provider (Groq, OpenAI, etc.)
    - Local LLM (Ollama, etc.)

### Step 1: Obsidian Setup
1. **Install Local REST API Plugin**
   - Settings → Community Plugins → Browse → Search "Local REST API", install and enable.
2. **Copy API Key**
   - Settings → Local REST API → Copy the "API Key".

### Step 2: Get AI API Key
*   **Google Gemini**: https://aistudio.google.com/
*   **Groq**: https://console.groq.com/keys
*   **OpenAI**: https://platform.openai.com/api-keys

### Step 3: Install Chrome Extension
1. Open `chrome://extensions`.
2. Enable "Developer mode" (top right).
3. Click "Load unpacked" and select the extension folder.

### Step 4: Configure Settings
Click the extension icon to open settings.

#### 1. Obsidian Settings
*   **Obsidian API Key**: Paste the key from Step 1.
*   **Daily Note Path**: Enter the folder path where your daily notes are stored (e.g., `092.Daily`).

#### 2. AI Provider Settings
Select your preferred provider from the dropdown.

*   **Google Gemini**: Enter API Key and Model (e.g., `gemini-1.5-flash`).
*   **OpenAI Compatible**:
    *   **Base URL**: e.g., `https://api.groq.com/openai/v1`
    *   **API Key**: Your provider's key.
    *   **Model Name**: e.g., `openai/gpt-oss-20b`.
*   **OpenAI Compatible 2**: Use this for a secondary provider like a local LLM (`http://localhost:11434/v1`).

Click **"Save & Test Connection"** to verify.
