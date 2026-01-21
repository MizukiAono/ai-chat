/**
 * @fileoverview メモリベースのレート制限ミドルウェア
 * @module lib/hono/rate-limit
 * @description
 * IPアドレスベースのレート制限を実装するHonoミドルウェア。
 * メモリ内にリクエストカウントを保持し、制限超過時は429を返す。
 *
 * @note
 * - 本実装はシングルインスタンス向け（水平スケール時はRedis等を使用）
 * - 期限切れエントリは5分間隔で自動クリーンアップ
 */

import type { Context, Next } from 'hono';

/**
 * レート制限の設定オプション
 * @interface RateLimitConfig
 */
interface RateLimitConfig {
  /** 時間ウィンドウ（ミリ秒）。この期間内のリクエスト数をカウント */
  windowMs: number;
  /** ウィンドウ内で許可する最大リクエスト数 */
  maxRequests: number;
  /** レート制限キーを生成する関数。デフォルトはIPアドレスベース */
  keyGenerator?: (c: Context) => string;
}

/**
 * レート制限のストアエントリ
 * @interface RateLimitEntry
 */
interface RateLimitEntry {
  /** 現在のリクエストカウント */
  count: number;
  /** カウントがリセットされる時刻（エポックミリ秒） */
  resetTime: number;
}

/** メモリベースのレート制限ストア（キー: IPアドレス等、値: カウント情報） */
const store = new Map<string, RateLimitEntry>();

/** 期限切れエントリのクリーンアップ間隔（5分） */
const CLEANUP_INTERVAL = 5 * 60 * 1000;

/** クリーンアップタイマーの参照 */
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * 期限切れエントリの定期クリーンアップを開始する
 * @private
 */
function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetTime <= now) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
  // Node.js環境でプロセスが終了しないようにunrefする
  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

/**
 * レート制限ストアをクリアする（テスト用）
 *
 * @description テスト間でストアの状態をリセットするために使用
 */
export function clearRateLimitStore(): void {
  store.clear();
}

/**
 * クリーンアップタイマーを停止する（テスト用）
 *
 * @description テスト終了時にタイマーを停止するために使用
 */
export function stopCleanupTimer(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * デフォルトのレート制限キー生成関数
 *
 * @description
 * クライアントのIPアドレスを取得してキーとして使用する。
 * プロキシ経由の場合はX-Forwarded-ForまたはX-Real-IPヘッダーを参照。
 *
 * @param {Context} c - Honoのコンテキスト
 * @returns {string} レート制限のキー（IPアドレス）
 * @private
 */
function defaultKeyGenerator(c: Context): string {
  // X-Forwarded-For ヘッダーをチェック（プロキシ経由の場合）
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    // 最初のIPアドレスを使用
    return forwarded.split(',')[0].trim();
  }
  // X-Real-IP ヘッダーをチェック
  const realIp = c.req.header('x-real-ip');
  if (realIp) {
    return realIp;
  }
  // フォールバック: 不明なクライアント
  return 'unknown';
}

/**
 * レート制限ミドルウェアを作成する
 *
 * @description
 * 指定された設定に基づいてレート制限を適用するHonoミドルウェアを返す。
 * 制限を超えた場合は429 Too Many Requestsを返す。
 *
 * レスポンスヘッダー:
 * - `X-RateLimit-Limit`: 許可される最大リクエスト数
 * - `X-RateLimit-Remaining`: 残りリクエスト数
 * - `X-RateLimit-Reset`: カウントリセットまでの秒数
 * - `Retry-After`: 制限超過時、次にリクエスト可能になるまでの秒数
 *
 * @param {RateLimitConfig} config - レート制限の設定
 * @returns {Function} Honoミドルウェア関数
 *
 * @example
 * ```typescript
 * import { rateLimiter } from '@/lib/hono/rate-limit';
 *
 * app.use('/api/chat', rateLimiter({
 *   windowMs: 60 * 1000,  // 1分間
 *   maxRequests: 20,       // 最大20リクエスト
 * }));
 * ```
 */
export function rateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests, keyGenerator = defaultKeyGenerator } = config;

  // クリーンアップを開始
  startCleanup();

  return async (c: Context, next: Next) => {
    const key = keyGenerator(c);
    const now = Date.now();

    let entry = store.get(key);

    // エントリが存在しないか、期限切れの場合は新規作成
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    // リクエスト数をインクリメント
    entry.count++;
    store.set(key, entry);

    // レート制限ヘッダーを設定
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(resetSeconds));

    // 制限を超えた場合
    if (entry.count > maxRequests) {
      c.header('Retry-After', String(resetSeconds));
      return c.json(
        {
          error: 'リクエスト数が制限を超えました。しばらく待ってから再度お試しください。',
        },
        429
      );
    }

    await next();
  };
}
