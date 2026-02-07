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

// テスト用のi18nモック文字列
const MOCK_CONNECTION_ERROR = 'Please refresh the page and try again';
const MOCK_DOMAIN_BLOCKED = 'This domain is not allowed to be recorded. Do you want to record it anyway?';
const MOCK_ERROR_PREFIX = '✗ Error:';
const MOCK_SUCCESS = '✓ Saved to Obsidian';
const MOCK_CANCELLED = 'Cancelled';

describe('ErrorMessages', () => {
  test('必要なメッセージが定義されている', () => {
    expect(ErrorMessages.CONNECTION_ERROR).toBe(MOCK_CONNECTION_ERROR);
    expect(ErrorMessages.DOMAIN_BLOCKED).toBe(MOCK_DOMAIN_BLOCKED);
    expect(ErrorMessages.ERROR_PREFIX).toBe(MOCK_ERROR_PREFIX);
    expect(ErrorMessages.SUCCESS).toBe(MOCK_SUCCESS);
    expect(ErrorMessages.CANCELLED).toBe(MOCK_CANCELLED);
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
    const error = new Error(MOCK_DOMAIN_BLOCKED);
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
    const error = new Error(MOCK_DOMAIN_BLOCKED);
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
    expect(getUserErrorMessage(error)).toBe(`${MOCK_ERROR_PREFIX} ${MOCK_CONNECTION_ERROR}`);
  });

  test('ドメインブロックエラーメッセージを取得', () => {
    const error = new Error(MOCK_DOMAIN_BLOCKED);
    expect(getUserErrorMessage(error)).toBe(MOCK_DOMAIN_BLOCKED);
  });

  test('一般エラーメッセージを取得', () => {
    const error = new Error('Some other error');
    expect(getUserErrorMessage(error)).toContain('Error:');
    expect(getUserErrorMessage(error)).toContain('Some other error');
  });

  test('messageがないエラーの場合', () => {
    const error = {};
    expect(getUserErrorMessage(error)).toContain('Error:');
    expect(getUserErrorMessage(error)).toContain('Unknown error');
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
      textContent: 'Force Record',
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
    expect(statusElement.textContent).toContain('Error:');
  });

  test('ドメインブロックエラーで強制記録ボタンを表示', () => {
    const error = new Error(MOCK_DOMAIN_BLOCKED);

    showError(statusElement, error, mockForceRecordCallback);

    expect(statusElement.textContent).toBe(MOCK_DOMAIN_BLOCKED);
    expect(createElementSpy).toHaveBeenCalledWith('button');
    expect(statusElement.appendChild).toHaveBeenCalled();
  });

  test('強制記録ボタンのクリックハンドラーが設定される', () => {
    const error = new Error(MOCK_DOMAIN_BLOCKED);

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
    expect(statusElement.textContent).toBe(MOCK_SUCCESS);
  });

  test('カスタムメッセージを表示', () => {
    showSuccess(statusElement, 'Custom success message');

    expect(statusElement.className).toBe('success');
    expect(statusElement.textContent).toBe('Custom success message');
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
    const error = new Error(MOCK_DOMAIN_BLOCKED);
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