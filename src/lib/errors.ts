/**
 * @fileoverview APIエラーの分類と処理を行うユーティリティ
 * @module lib/errors
 * @description Claude API / Mastra からのエラーを分類し、
 *              ユーザーフレンドリーなエラーメッセージに変換する
 */

/**
 * APIエラーの種別
 *
 * - `RATE_LIMIT` - レート制限エラー（429）
 * - `AUTHENTICATION` - 認証エラー（401, 403）
 * - `NETWORK` - ネットワークエラー（接続失敗、タイムアウト）
 * - `VALIDATION` - バリデーションエラー（400）
 * - `SERVER` - サーバーエラー（5xx）
 * - `UNKNOWN` - 不明なエラー
 */
export type ApiErrorType =
  | 'RATE_LIMIT'
  | 'AUTHENTICATION'
  | 'NETWORK'
  | 'VALIDATION'
  | 'SERVER'
  | 'UNKNOWN';

/**
 * 分類されたAPIエラー情報
 * @interface ApiError
 */
export interface ApiError {
  /** エラーの種別 */
  type: ApiErrorType;
  /** ユーザー向けエラーメッセージ（日本語） */
  message: string;
  /** HTTPステータスコード */
  statusCode: number;
  /** Rate Limit時のリトライ待機時間（秒）。Rate Limitエラー時のみ設定 */
  retryAfter?: number;
}

/**
 * エラーオブジェクトを分類し、適切なApiErrorを返す
 *
 * @description
 * Claude API / Mastra からのエラーを分析し、エラータイプを特定する。
 * HTTPステータスコード、エラーメッセージ、エラーコードなどから
 * エラーの種類を判定し、ユーザーフレンドリーなメッセージを生成する。
 *
 * @param {unknown} error - 分類対象のエラーオブジェクト
 * @returns {ApiError} 分類されたエラー情報
 *
 * @example
 * ```typescript
 * try {
 *   await yumiAgent.generate(message);
 * } catch (error) {
 *   const apiError = classifyError(error);
 *   console.log(apiError.type); // 'RATE_LIMIT', 'AUTHENTICATION', etc.
 *   return c.json({ error: apiError.message }, apiError.statusCode);
 * }
 * ```
 */
export function classifyError(error: unknown): ApiError {
  // Anthropic SDK のエラー形式をチェック
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;

    // status プロパティがある場合（HTTPエラー）
    if ('status' in err && typeof err.status === 'number') {
      const status = err.status;

      // Rate Limit (429)
      if (status === 429) {
        const retryAfter = extractRetryAfter(err);
        return {
          type: 'RATE_LIMIT',
          message:
            'リクエストが多すぎます。しばらく待ってからもう一度お試しください。',
          statusCode: 429,
          retryAfter,
        };
      }

      // Authentication (401)
      if (status === 401) {
        return {
          type: 'AUTHENTICATION',
          message: 'サービスの認証に問題が発生しました。管理者にお問い合わせください。',
          statusCode: 401,
        };
      }

      // Forbidden (403)
      if (status === 403) {
        return {
          type: 'AUTHENTICATION',
          message: 'このサービスへのアクセスが拒否されました。',
          statusCode: 403,
        };
      }

      // Bad Request (400)
      if (status === 400) {
        return {
          type: 'VALIDATION',
          message: 'リクエストの形式が正しくありません。',
          statusCode: 400,
        };
      }

      // Server Errors (5xx)
      if (status >= 500) {
        return {
          type: 'SERVER',
          message: 'サーバーエラーが発生しました。しばらく待ってからもう一度お試しください。',
          statusCode: status,
        };
      }
    }

    // メッセージからエラータイプを推測
    const message = extractErrorMessage(err);
    if (message) {
      if (message.toLowerCase().includes('rate limit')) {
        return {
          type: 'RATE_LIMIT',
          message:
            'リクエストが多すぎます。しばらく待ってからもう一度お試しください。',
          statusCode: 429,
        };
      }
      if (
        message.toLowerCase().includes('api key') ||
        message.toLowerCase().includes('authentication') ||
        message.toLowerCase().includes('unauthorized')
      ) {
        return {
          type: 'AUTHENTICATION',
          message: 'サービスの認証に問題が発生しました。管理者にお問い合わせください。',
          statusCode: 401,
        };
      }
    }

    // ネットワークエラーのチェック
    if ('code' in err) {
      const code = err.code;
      if (
        code === 'ECONNREFUSED' ||
        code === 'ENOTFOUND' ||
        code === 'ETIMEDOUT' ||
        code === 'ECONNRESET'
      ) {
        return {
          type: 'NETWORK',
          message: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
          statusCode: 503,
        };
      }
    }
  }

  // TypeError: fetch failed などのネットワークエラー
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'NETWORK',
      message: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
      statusCode: 503,
    };
  }

  // その他のエラー
  return {
    type: 'UNKNOWN',
    message: 'メッセージの送信に失敗しました。もう一度お試しください。',
    statusCode: 500,
  };
}

/**
 * エラーオブジェクトからエラーメッセージを抽出する
 *
 * @param {Record<string, unknown>} err - エラーオブジェクト
 * @returns {string | null} 抽出されたメッセージ、または見つからない場合はnull
 * @private
 */
function extractErrorMessage(err: Record<string, unknown>): string | null {
  if ('message' in err && typeof err.message === 'string') {
    return err.message;
  }
  if (
    'error' in err &&
    typeof err.error === 'object' &&
    err.error !== null
  ) {
    const errorObj = err.error as Record<string, unknown>;
    if ('message' in errorObj && typeof errorObj.message === 'string') {
      return errorObj.message;
    }
  }
  return null;
}

/**
 * Rate Limitエラーからretry-after値を抽出する
 *
 * @param {Record<string, unknown>} err - エラーオブジェクト
 * @returns {number | undefined} リトライまでの待機秒数（デフォルト: 60秒）
 * @private
 */
function extractRetryAfter(err: Record<string, unknown>): number | undefined {
  // headers から取得を試みる
  if ('headers' in err && typeof err.headers === 'object' && err.headers !== null) {
    const headers = err.headers as Record<string, unknown>;
    if ('retry-after' in headers) {
      const value = headers['retry-after'];
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        if (!isNaN(parsed)) return parsed;
      }
    }
  }
  // デフォルトで60秒を返す
  return 60;
}
