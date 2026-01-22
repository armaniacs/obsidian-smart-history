/**
 * Jest設定ファイル
 * ES Modules対応のChrome拡張機能テスト設定
 */

export default {
  // テスト環境: Node.js環境でjsdomを使用
  testEnvironment: 'jsdom',

  // ES Modulesを有効化
  transform: {},

  // テストファイルのパターン
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],

  // カバレッジ収集対象
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],

  // カバレッジしきい値（将来的に設定）
  // coverageThreshold: {
  //   global: {
  //     branches: 80,
  //     functions: 80,
  //     lines: 80,
  //     statements: 80
  //   }
  // },

  // モジュール解決
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

  // セットアップファイル
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // 冗長モード
  verbose: true
};
