/**
 * @fileoverview HonoベースのAPIルーター
 * @module lib/hono/app
 * @description
 * チャットボット「Yumi」のバックエンドAPIを定義。
 * CORS、CSRF、レート制限などのセキュリティミドルウェアを含む。
 *
 * @endpoints
 * - POST /api/chat - チャットメッセージを送信しYumiの応答を取得
 * - GET /api/chat/:sessionId - セッションの会話履歴を取得
 * - DELETE /api/session/:sessionId - セッションを無効化
 * - GET /api/health - ヘルスチェック
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { yumiAgent } from '@/lib/mastra';
import { classifyError } from '@/lib/errors';
import { prisma } from '@/lib/prisma/client';
import { rateLimiter } from '@/lib/hono/rate-limit';
import type {
  ChatRequest,
  ChatResponse,
  ChatErrorResponse,
  ChatHistoryResponse,
} from '@/types';

// ============================================================================
// 定数定義
// ============================================================================

/** メッセージの最大文字数 */
const MAX_MESSAGE_LENGTH = 2000;

/** セッションの有効期限（時間） */
const SESSION_EXPIRY_HOURS = 24;

/** CORS許可オリジン（環境変数またはデフォルト） */
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

/** レート制限: 時間ウィンドウ（1分） */
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/** レート制限: ウィンドウ内の最大リクエスト数 */
const RATE_LIMIT_MAX_REQUESTS = 20;

/** UUID v4形式の正規表現パターン */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const app = new Hono().basePath('/api');

// CORS設定
app.use(
  '*',
  cors({
    origin: (origin) => {
      // 開発環境ではすべてのオリジンを許可（originがnullの場合も含む）
      if (process.env.NODE_ENV !== 'production') {
        return origin || '*';
      }
      // 本番環境では許可リストをチェック
      if (origin && ALLOWED_ORIGINS.includes(origin)) {
        return origin;
      }
      return null;
    },
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 86400,
  })
);

// CSRF保護（本番環境のみ）
// HonoのCSRFミドルウェアはOriginヘッダーとSec-Fetch-Siteヘッダーを検証する
if (process.env.NODE_ENV === 'production') {
  app.use(
    '*',
    csrf({
      origin: ALLOWED_ORIGINS,
    })
  );
}

// レート制限ミドルウェア（/api/chat エンドポイントのみ）
app.use(
  '/chat',
  rateLimiter({
    windowMs: RATE_LIMIT_WINDOW_MS,
    maxRequests: RATE_LIMIT_MAX_REQUESTS,
  })
);

app.post('/chat', async (c) => {
  try {
    const body = await c.req.json<ChatRequest>();

    // リクエストのバリデーション
    if (!body.message || typeof body.message !== 'string') {
      return c.json<ChatErrorResponse>(
        { error: 'メッセージを入力してください。' },
        400
      );
    }

    if (!body.sessionId || typeof body.sessionId !== 'string') {
      return c.json<ChatErrorResponse>(
        { error: 'セッションIDが必要です。' },
        400
      );
    }

    // sessionId の UUID v4 形式チェック
    if (!UUID_V4_REGEX.test(body.sessionId)) {
      return c.json<ChatErrorResponse>(
        { error: 'セッションIDの形式が正しくありません。' },
        400
      );
    }

    const trimmedMessage = body.message.trim();
    if (trimmedMessage.length === 0) {
      return c.json<ChatErrorResponse>(
        { error: 'メッセージを入力してください。' },
        400
      );
    }

    // メッセージ長の上限チェック
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return c.json<ChatErrorResponse>(
        {
          error: `メッセージは${MAX_MESSAGE_LENGTH}文字以内で入力してください。`,
        },
        400
      );
    }

    // セッションの有効期限を設定（24時間後）
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

    // セッションを作成または更新
    await prisma.session.upsert({
      where: { sessionId: body.sessionId },
      update: { updatedAt: new Date(), expiresAt },
      create: { sessionId: body.sessionId, expiresAt },
    });

    // ユーザーメッセージをDBに保存
    await prisma.message.create({
      data: {
        sessionId: body.sessionId,
        role: 'user',
        content: trimmedMessage,
      },
    });

    // Mastra エージェントを呼び出し
    const result = await yumiAgent.generate(trimmedMessage);

    // アシスタントの応答をDBに保存
    await prisma.message.create({
      data: {
        sessionId: body.sessionId,
        role: 'assistant',
        content: result.text,
      },
    });

    // レスポンスを返却
    return c.json<ChatResponse>({
      response: result.text,
      sessionId: body.sessionId,
    });
  } catch (error) {
    console.error('Chat API error:', error);

    // JSONパースエラー
    if (error instanceof SyntaxError) {
      return c.json<ChatErrorResponse>(
        { error: 'リクエストの形式が正しくありません。' },
        400
      );
    }

    // Mastra/Claude API エラーの分類
    const apiError = classifyError(error);

    // Rate Limit の場合はRetry-Afterヘッダーを設定
    if (apiError.type === 'RATE_LIMIT' && apiError.retryAfter) {
      return c.json<ChatErrorResponse>(
        { error: apiError.message },
        429,
        { 'Retry-After': String(apiError.retryAfter) }
      );
    }

    return c.json<ChatErrorResponse>(
      { error: apiError.message },
      apiError.statusCode as 400 | 401 | 403 | 429 | 500 | 503
    );
  }
});

// 会話履歴取得エンドポイント
app.get('/chat/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');

    if (!sessionId) {
      return c.json<ChatErrorResponse>(
        { error: 'セッションIDが必要です。' },
        400
      );
    }

    // sessionId の UUID v4 形式チェック
    if (!UUID_V4_REGEX.test(sessionId)) {
      return c.json<ChatErrorResponse>(
        { error: 'セッションIDの形式が正しくありません。' },
        400
      );
    }

    // セッションの有効期限を確認
    const session = await prisma.session.findUnique({
      where: { sessionId },
    });

    if (!session) {
      return c.json<ChatHistoryResponse>({
        messages: [],
        sessionId,
      });
    }

    // セッションが期限切れの場合
    if (session.expiresAt < new Date()) {
      // 期限切れのセッションとメッセージを削除
      await prisma.message.deleteMany({
        where: { sessionId },
      });
      await prisma.session.delete({
        where: { sessionId },
      });

      return c.json<ChatHistoryResponse>({
        messages: [],
        sessionId,
      });
    }

    // メッセージを取得
    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    return c.json<ChatHistoryResponse>({
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        createdAt: m.createdAt,
      })),
      sessionId,
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    return c.json<ChatErrorResponse>(
      { error: '会話履歴の取得に失敗しました。' },
      500
    );
  }
});

// セッション無効化エンドポイント
app.delete('/session/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');

    if (!sessionId) {
      return c.json<ChatErrorResponse>(
        { error: 'セッションIDが必要です。' },
        400
      );
    }

    // sessionId の UUID v4 形式チェック
    if (!UUID_V4_REGEX.test(sessionId)) {
      return c.json<ChatErrorResponse>(
        { error: 'セッションIDの形式が正しくありません。' },
        400
      );
    }

    // セッションの存在確認
    const session = await prisma.session.findUnique({
      where: { sessionId },
    });

    if (!session) {
      // セッションが存在しなくても成功として扱う（冪等性）
      return c.json({ success: true, message: 'セッションが無効化されました。' });
    }

    // セッションに関連するメッセージを削除
    await prisma.message.deleteMany({
      where: { sessionId },
    });

    // セッションを削除
    await prisma.session.delete({
      where: { sessionId },
    });

    return c.json({ success: true, message: 'セッションが無効化されました。' });
  } catch (error) {
    console.error('Session invalidation error:', error);
    return c.json<ChatErrorResponse>(
      { error: 'セッションの無効化に失敗しました。' },
      500
    );
  }
});

// ヘルスチェック用エンドポイント
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

export default app;
