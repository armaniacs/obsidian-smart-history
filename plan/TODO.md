# TODO: Obsidian Smart History 改善候補

## PBI-001: 手動記録機能 - 実装完了後の改善候補

### UI/UX改善

- [ ] **CSS外部ファイル化**
  - 現状: インラインCSS約130行
  - 改善: `src/popup/popup.css` として分離
  - メリット: 保守性向上、スタイル再利用
  - タイミング: インラインCSSが150行を超えた場合

- [ ] **ローディングスピナー追加**
  - 現状: テキストのみの「記録中...」表示
  - 改善: スピナーアニメーションを追加
  - 実装: CSSアニメーション or SVGスピナー
  - 配置: 記録ボタンの隣、またはステータスメッセージエリア

- [ ] **記録成功後のポップアップ自動クローズ**
  - 現状: ポップアップは手動で閉じる必要がある
  - 改善: 記録成功後2秒でポップアップを自動クローズ
  - 実装: `setTimeout(() => window.close(), 2000);`
  - 注意: ユーザーが設定画面に遷移中の場合は閉じない

### 操作性改善

- [ ] **キーボードショートカット対応**
  - ショートカット: `Ctrl+S` (または `Cmd+S`)
  - 動作: 現在のタブを即座に記録
  - 実装場所: Content Scriptでキーボードイベントをリスン
  - 参考: `manifest.json` の `commands` セクション

### 将来的な機能拡張候補

- [ ] **閲覧履歴一覧表示**
  - メイン画面に最近保存した5件を表示
  - クリックでObsidianのノートを開く

- [ ] **記録前のプレビュー**
  - AI要約を事前生成して確認
  - 編集してから保存する機能

- [ ] **バッチ記録機能**
  - 複数のタブを一括記録
  - タブリストで選択して記録

- [ ] **記録フィルター設定**
  - 特定ドメインを自動記録から除外
  - ホワイトリスト/ブラックリスト機能

---

# 次のステップ 2026-01-23 4:33

🚀 次のお勧めステップ

今回の実装はリグレッションテストのため、Greenフェーズ（最小実装）はスキップされました。

次のステップとして、以下を推奨します:

1. テストカバレッジレポート取得:
   npm run test:coverage

2. 追加テストケースの検討:
   - エッジケースの追加
   - 統合テストの検討

3. 次回の新機能開発時:
   - /tdd-testcases → /tdd-red → /tdd-green → /tdd-refactor の完全なTDDサイクルを実施

一つ前のcommitからの変更点をまとめます:                    
                                                             
  📋 変更点サマリー                                          
                            W   w                            
  🆕 新規追加ファイル                                        
                                                             
  1. テスト環境設定ファイル                                  
                                                             
  - package.json - プロジェクト依存関係定義（Jest            
  29.7.0追加）                                               
  - jest.config.js - Jestテスト設定（ES Modules対応）        
  - jest.setup.js - Chrome Extensions APIモック設定          
                                                             
  2. テストファイル                                          
                                                             
  - src/utils/__tests__/domainUtils.test.js -                
  domainUtilsの18テストケース                                
  - src/utils/__tests__/piiSanitizer.test.js -               
  piiSanitizerの13テストケース                               
                                                             
  3. ドキュメント                                            
                                                             
  - docs/implements/utils-testing/utils-testcases.md -       
  テストケース定義書（28ケース詳細）                         
  - docs/implements/utils-testing/utils-tdd-memo.md -        
  TDD開発メモ                                                
                                                             
  4. その他                                                  
                                                             
  - package-lock.json - npm依存関係ロックファイル            
  - node_modules/ - npmパッケージ（.gitignoreに追加推奨）

