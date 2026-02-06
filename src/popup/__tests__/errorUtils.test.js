/**
 * errorUtils.test.js
 * エラーハンドリング共通モジュールのテスト
 */

import {
  ErrorMessages,
  ErrorType,
  isConnectionError,
  isDomainBlockedError,
  getErrorType,
  getUserErrorMessage,
  showError,
  showSuccess,
  handleError
} from '../errorUtils.js';

describe('ErrorMessages', () => {
  test('必要なメッセージが定義されている', () => {
    expect(ErrorMessages.CONNECTION_ERROR).toBe('ページを再読み込みしてから再度お試しください');
    expect(ErrorMessages.DOMAIN_BLOCKED).toBe('このドメインは記録が許可されていませんが特別に記録しますか？');
    expect(ErrorMessages.ERROR_PREFIX).toBe('✗ エラー:');
    expect(ErrorMessages.SUCCESS).toBe('✓ Obsidianに保存しました');
    expect(ErrorMessages.CANCELLED).toBe('キャンセルしました');
  });
});

describe('ErrorType', () => {
  test('必要なエラータイプが定義されている', () => {
    expect(ErrorType.CONNECTION).toBe('CONNECTION');
    expect(ErrorType.DOMAIN_BLOCKED).toBe('DOMAIN_BLOCKED');
    expect(ErrorType.GENERAL).toBe('GENERAL');
  });
});

describe('isConnectionError', () => {
  test('Receiving end does not existエラーを判定できる', () => {
    const error = new Error('Receiving end does not exist');
    expect(isConnectionError(error)).toBe(true);
  });

  test('他のエラーは判定しない', () => {
    const error = new Error('Some other error');
    expect(isConnectionError(error)).toBe(false);
  });

  test('null/undefinedエラーを安全に処理', () => {
    expect(isConnectionError(null)).toBe(false);
    expect(isConnectionError(undefined)).toBe(false);
  });

  test('messageプロパティがないオブジェクトを安全に処理', () => {
    expect(isConnectionError({})).toBe(false);
  });
});

describe('isDomainBlockedError', () => {
  test('ドメインブロックエラーを判定できる', () => {
    const error = new Error('このドメインは記録が許可されていません');
    expect(isDomainBlockedError(error)).toBe(true);
  });

  test('他のエラーは判定しない', () => {
    const error = new Error('Some other error');
    expect(isDomainBlockedError(error)).toBe(false);
  });

  test('null/undefinedエラーを安全に処理', () => {
    expect(isDomainBlockedError(null)).toBe(false);
    expect(isDomainBlockedError(undefined)).toBe(false);
  });
});

describe('getErrorType', () => {
  test('コネクションエラーを正しく判定', () => {
    const error = new Error('Receiving end does not exist');
    expect(getErrorType(error)).toBe(ErrorType.CONNECTION);
  });

  test('ドメインブロックエラーを正しく判定', () => {
    const error = new Error('このドメインは記録が許可されていません');
    expect(getErrorType(error)).toBe(ErrorType.DOMAIN_BLOCKED);
  });

  test('一般エラーを正しく判定', () => {
    const error = new Error('Some other error');
    expect(getErrorType(error)).toBe(ErrorType.GENERAL);
  });
});

describe('getUserErrorMessage', () => {
  test('コネクションエラーメッセージを取得', () => {
    const error = new Error('Receiving end does not exist');
    expect(getUserErrorMessage(error)).toBe('✗ エラー: ページを再読み込みしてから再度お試しください');
  });

  test('ドメインブロックエラーメッセージを取得', () => {
    const error = new Error('このドメインは記録が許可されていません');
    expect(getUserErrorMessage(error)).toBe('このドメインは記録が許可されていませんが特別に記録しますか？');
  });

  test('一般エラーメッセージを取得', () => {
    const error = new Error('Some other error');
    expect(getUserErrorMessage(error)).toBe('✗ エラー: Some other error');
  });

  test('messageがないエラーの場合', () => {
    const error = {};
    expect(getUserErrorMessage(error)).toBe('✗ エラー: 不明なエラーが発生しました');
  });
});

describe('showError', () => {
  let statusElement;
  let mockForceRecordCallback;
  let createElementSpy;
  let mockButton;

  beforeEach(() => {
    statusElement = {
      className: '',
      textContent: '',
      appendChild: jest.fn()
    };
    mockForceRecordCallback = jest.fn();
    mockButton = {
      disabled: false,
      textContent: '強制記録',
      style: {},
      onclick: null
    };

    // jsdom環境でdocument.createElementをspy
    if (typeof document !== 'undefined') {
      createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockButton);
    } else {
      // documentが存在しない場合はダミーを設定
      global.document = {
        createElement: jest.fn().mockReturnValue(mockButton)
      };
      createElementSpy = global.document.createElement;
    }
  });

  afterEach(() => {
    if (typeof document !== 'undefined') {
      createElementSpy?.mockRestore();
    }
    jest.restoreAllMocks();
    global.document = undefined;
  });

  test('一般エラーを表示', () => {
    const error = new Error('Some error');
    showError(statusElement, error);

    expect(statusElement.className).toBe('error');
    expect(statusElement.textContent).toContain('エラー:');
  });

  test('ドメインブロックエラーで強制記録ボタンを表示', () => {
    const error = new Error('このドメインは記録が許可されていません');

    showError(statusElement, error, mockForceRecordCallback);

    expect(statusElement.textContent).toBe(ErrorMessages.DOMAIN_BLOCKED);
    expect(createElementSpy).toHaveBeenCalledWith('button');
    expect(statusElement.appendChild).toHaveBeenCalled();
  });

  test('強制記録ボタンのクリックハンドラーが設定される', () => {
    const error = new Error('このドメインは記録が許可されていません');

    showError(statusElement, error, mockForceRecordCallback);

    // ボタンが作成されたことを確認
    expect(createElementSpy).toHaveBeenCalledWith('button');

    // appendChildが呼び出されたことを確認
    expect(statusElement.appendChild).toHaveBeenCalled();
  });
});

describe('showSuccess', () => {
  let statusElement;

  beforeEach(() => {
    statusElement = {
      className: '',
      textContent: ''
    };
  });

  test('デフォルトの成功メッセージを表示', () => {
    showSuccess(statusElement);

    expect(statusElement.className).toBe('success');
    expect(statusElement.textContent).toBe(ErrorMessages.SUCCESS);
  });

  test('カスタムメッセージを表示', () => {
    showSuccess(statusElement, 'カスタム成功メッセージ');

    expect(statusElement.className).toBe('success');
    expect(statusElement.textContent).toBe('カスタム成功メッセージ');
  });
});

describe('handleError', () => {
  test('コネクションエラーハンドラーを呼び出す', () => {
    const error = new Error('Receiving end does not exist');
    const handlers = {
      onConnectionError: jest.fn()
    };

    handleError(error, handlers);

    expect(handlers.onConnectionError).toHaveBeenCalledWith(error);
  });

  test('ドメインブロックエラーハンドラーを呼び出す', () => {
    const error = new Error('このドメインは記録が許可されていません');
    const handlers = {
      onDomainBlocked: jest.fn()
    };

    handleError(error, handlers);

    expect(handlers.onDomainBlocked).toHaveBeenCalledWith(error);
  });

  test('一般エラーハンドラーを呼び出す', () => {
    const error = new Error('Some other error');
    const handlers = {
      onGeneralError: jest.fn()
    };

    handleError(error, handlers);

    expect(handlers.onGeneralError).toHaveBeenCalledWith(error);
  });

  test('対応するハンドラーがない場合は何もしない', () => {
    const error = new Error('Some error');
    const handlers = {};

    expect(() => handleError(error, handlers)).not.toThrow();
  });
});