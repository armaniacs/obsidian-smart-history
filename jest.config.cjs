/**
 * Jest設定ファイル
 * ES Modules対応のChrome拡張機能テスト設定
 */

module.exports = {
  // テスト環境: jsdom（ブラウザAPIを必要とするテスト用）
  testEnvironment: 'jsdom',

  // ES Modulesを有効化
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.cjs' }]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(jest|@jest)/)'
  ],

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
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // セットアップファイル
  setupFilesAfterEnv: ['./jest.setup.js'],

  // 冗長モード
  verbose: true
};
