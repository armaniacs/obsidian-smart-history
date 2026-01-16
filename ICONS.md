# アイコンファイルについて / About Icon Files

## 日本語

Chrome拡張機能には、以下のサイズのアイコンファイルが必要です：

- 16x16px - 拡張機能ツールバー内の小さなアイコン
- 48x48px - 拡張機能管理ページのアイコン
- 128x128px - Chromeウェブストアとインストール時のアイコン

### アイコンの配置場所
これらのアイコンファイルは、プロジェクトルートの `icons/` フォルダに配置する必要があります：

```
obsidian-smart-history/
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
```

### アイコンのデザイン提案
- テーマ：Obsidianとブラウザ履歴の組み合わせ
- 色：Obsidianの紫色 (#7b3cad) を基調
- 要素：
  - 本や書類のアイコン（知識を表現）
  - 時計や矢印（履歴を表現）
  - 簡単なAIロゴ（要約機能を表現）

### 簡単なアイコン作成方法
1. Figma、Canvaなどの無料デザインツールを使用
2. 128x128pxでデザインを作成
3. 拡大縮小して他のサイズをエクスポート
4. PNG形式で保存

---

## English

Chrome extensions require icon files in the following sizes:

- 16x16px - Small icon in the extension toolbar
- 48x48px - Icon on the extensions management page
- 128x128px - Icon for Chrome Web Store and installation

### Icon Location
These icon files should be placed in an `icons/` folder in the project root:

```
obsidian-smart-history/
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
```

### Icon Design Suggestions
- Theme: Combination of Obsidian and browser history
- Colors: Obsidian purple (#7b3cad) as the base color
- Elements:
  - Book or document icon (representing knowledge)
  - Clock or arrow (representing history)
  - Simple AI logo (representing summarization)

### Easy Icon Creation Methods
1. Use free design tools like Figma or Canva
2. Create design at 128x128px
3. Export other sizes by scaling
4. Save as PNG format

### Current Status
Currently, the extension uses inline data URIs for notifications and empty strings for favicons. Adding proper icon files will improve the visual appearance of the extension.