import app from '@/lib/hono/app';
import { clearRateLimitStore } from '@/lib/hono/rate-limit';

// Mock the yumiAgent
jest.mock('@/lib/mastra', () => ({
  yumiAgent: {
    generate: jest.fn(),
  },
}));

// Mock Prisma client
jest.mock('@/lib/prisma/client', () => ({
  prisma: {
    session: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

import { yumiAgent } from '@/lib/mastra';
import { prisma } from '@/lib/prisma/client';

const mockedYumiAgent = yumiAgent as jest.Mocked<typeof yumiAgent>;
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

// テスト用の有効なUUID v4
const TEST_SESSION_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_SESSION_ID_2 = '6ba7b810-9dad-41d4-80b4-00c04fd430c8';
const EXPIRED_SESSION_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const NON_EXISTENT_SESSION_ID = '8f14e45f-ceea-467f-a3e4-ba1c38f02b9d';

describe('POST /api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRateLimitStore(); // レート制限のストアをクリア
    // Default mock implementations for Prisma
    (mockedPrisma.session.upsert as jest.Mock).mockResolvedValue({
      id: 'session-db-id',
      sessionId: TEST_SESSION_ID,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (mockedPrisma.message.create as jest.Mock).mockResolvedValue({
      id: 'message-db-id',
      sessionId: TEST_SESSION_ID,
      role: 'user',
      content: 'test message',
      createdAt: new Date(),
    });
  });

  it('正常なメッセージとsessionIdでレスポンスを返す', async () => {
    mockedYumiAgent.generate.mockResolvedValue({
      text: 'こんにちは！今日はいい天気だねっ♪',
    } as never);

    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'こんにちは',
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      response: 'こんにちは！今日はいい天気だねっ♪',
      sessionId: TEST_SESSION_ID,
    });
    expect(mockedYumiAgent.generate).toHaveBeenCalledWith('こんにちは');
  });

  it('メッセージが空の場合は400エラーを返す', async () => {
    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({
      error: 'メッセージを入力してください。',
    });
  });

  it('sessionIdが空の場合は400エラーを返す', async () => {
    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'こんにちは',
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({
      error: 'セッションIDが必要です。',
    });
  });

  it('メッセージが空白のみの場合は400エラーを返す', async () => {
    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '   ',
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({
      error: 'メッセージを入力してください。',
    });
  });

  it('不正なJSONの場合は400エラーを返す', async () => {
    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({
      error: 'リクエストの形式が正しくありません。',
    });
  });

  it('エージェントがエラーを投げた場合は500エラーを返す', async () => {
    mockedYumiAgent.generate.mockRejectedValue(new Error('API error'));

    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'こんにちは',
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({
      error: 'メッセージの送信に失敗しました。もう一度お試しください。',
    });
  });

  it('メッセージの前後の空白をトリムしてエージェントに送信する', async () => {
    mockedYumiAgent.generate.mockResolvedValue({
      text: 'こんにちは！',
    } as never);

    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '  こんにちは  ',
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(200);
    expect(mockedYumiAgent.generate).toHaveBeenCalledWith('こんにちは');
  });

  it('sessionIdがUUID v4形式でない場合は400エラーを返す', async () => {
    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'こんにちは',
        sessionId: 'invalid-session-id',
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({
      error: 'セッションIDの形式が正しくありません。',
    });
  });
});

describe('GET /api/health', () => {
  it('okステータスを返す', async () => {
    const response = await app.request('/api/health', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ status: 'ok' });
  });
});

describe('POST /api/chat - エラーケース', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRateLimitStore(); // レート制限のストアをクリア
    // Default mock implementations for Prisma
    (mockedPrisma.session.upsert as jest.Mock).mockResolvedValue({
      id: 'session-db-id',
      sessionId: TEST_SESSION_ID,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (mockedPrisma.message.create as jest.Mock).mockResolvedValue({
      id: 'message-db-id',
      sessionId: TEST_SESSION_ID,
      role: 'user',
      content: 'test message',
      createdAt: new Date(),
    });
  });

  it('Rate Limit (429) エラーの場合、適切なメッセージとステータスを返す', async () => {
    const rateLimitError = {
      status: 429,
      message: 'Rate limit exceeded',
      headers: {
        'retry-after': '60',
      },
    };
    mockedYumiAgent.generate.mockRejectedValue(rateLimitError);

    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'こんにちは',
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data).toEqual({
      error: 'リクエストが多すぎます。しばらく待ってからもう一度お試しください。',
    });
    expect(response.headers.get('Retry-After')).toBe('60');
  });

  it('認証エラー (401) の場合、適切なメッセージとステータスを返す', async () => {
    const authError = {
      status: 401,
      message: 'Unauthorized',
    };
    mockedYumiAgent.generate.mockRejectedValue(authError);

    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'こんにちは',
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toEqual({
      error: 'サービスの認証に問題が発生しました。管理者にお問い合わせください。',
    });
  });

  it('ネットワークタイムアウトの場合、適切なメッセージを返す', async () => {
    const timeoutError = {
      code: 'ETIMEDOUT',
      message: 'Connection timed out',
    };
    mockedYumiAgent.generate.mockRejectedValue(timeoutError);

    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'こんにちは',
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data).toEqual({
      error: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
    });
  });

  it('ネットワーク接続エラー (ECONNREFUSED) の場合、適切なメッセージを返す', async () => {
    const networkError = {
      code: 'ECONNREFUSED',
      message: 'Connection refused',
    };
    mockedYumiAgent.generate.mockRejectedValue(networkError);

    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'こんにちは',
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data).toEqual({
      error: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
    });
  });

  it('サーバーエラー (500) の場合、適切なメッセージを返す', async () => {
    const serverError = {
      status: 500,
      message: 'Internal server error',
    };
    mockedYumiAgent.generate.mockRejectedValue(serverError);

    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'こんにちは',
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({
      error: 'サーバーエラーが発生しました。しばらく待ってからもう一度お試しください。',
    });
  });

  it('エージェントがnull/undefinedを返した場合、空レスポンスとして処理される', async () => {
    mockedYumiAgent.generate.mockResolvedValue({
      text: undefined,
    } as never);

    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'こんにちは',
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    // result.text が undefined の場合、そのまま返される
    expect(data.sessionId).toBe(TEST_SESSION_ID);
  });

  it('メッセージが文字数上限を超えている場合、400エラーを返す', async () => {
    const longMessage = 'あ'.repeat(2001);

    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: longMessage,
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({
      error: 'メッセージは2000文字以内で入力してください。',
    });
  });

  it('fetch failed エラーの場合、ネットワークエラーとして処理される', async () => {
    mockedYumiAgent.generate.mockRejectedValue(new TypeError('fetch failed'));

    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'こんにちは',
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data).toEqual({
      error: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
    });
  });

  it('Forbidden (403) エラーの場合、適切なメッセージを返す', async () => {
    const forbiddenError = {
      status: 403,
      message: 'Forbidden',
    };
    mockedYumiAgent.generate.mockRejectedValue(forbiddenError);

    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'こんにちは',
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data).toEqual({
      error: 'このサービスへのアクセスが拒否されました。',
    });
  });

  it('API Key関連のエラーの場合、認証エラーとして処理される', async () => {
    const apiKeyError = new Error('Invalid API key');
    mockedYumiAgent.generate.mockRejectedValue(apiKeyError);

    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'こんにちは',
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toEqual({
      error: 'サービスの認証に問題が発生しました。管理者にお問い合わせください。',
    });
  });
});

describe('POST /api/chat - データベース永続化', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRateLimitStore(); // レート制限のストアをクリア
    // Default mock implementations for Prisma
    (mockedPrisma.session.upsert as jest.Mock).mockResolvedValue({
      id: 'session-db-id',
      sessionId: TEST_SESSION_ID,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (mockedPrisma.message.create as jest.Mock).mockResolvedValue({
      id: 'message-db-id',
      sessionId: TEST_SESSION_ID,
      role: 'user',
      content: 'test message',
      createdAt: new Date(),
    });
  });

  it('正常なメッセージ送信時にセッションがDBに保存される', async () => {
    mockedYumiAgent.generate.mockResolvedValue({
      text: 'こんにちは！',
    } as never);

    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'こんにちは',
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(200);
    expect(mockedPrisma.session.upsert).toHaveBeenCalledWith({
      where: { sessionId: TEST_SESSION_ID },
      update: expect.objectContaining({
        updatedAt: expect.any(Date),
        expiresAt: expect.any(Date),
      }),
      create: expect.objectContaining({
        sessionId: TEST_SESSION_ID,
        expiresAt: expect.any(Date),
      }),
    });
  });

  it('正常なメッセージ送信時にユーザーメッセージがDBに保存される', async () => {
    mockedYumiAgent.generate.mockResolvedValue({
      text: 'こんにちは！',
    } as never);

    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'こんにちは',
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(200);
    expect(mockedPrisma.message.create).toHaveBeenCalledWith({
      data: {
        sessionId: TEST_SESSION_ID,
        role: 'user',
        content: 'こんにちは',
      },
    });
  });

  it('正常なメッセージ送信時にアシスタントの応答がDBに保存される', async () => {
    mockedYumiAgent.generate.mockResolvedValue({
      text: 'こんにちは！今日はいい天気だねっ♪',
    } as never);

    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'こんにちは',
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(200);
    // message.createは2回呼ばれる（ユーザーメッセージとアシスタント応答）
    expect(mockedPrisma.message.create).toHaveBeenCalledTimes(2);
    expect(mockedPrisma.message.create).toHaveBeenLastCalledWith({
      data: {
        sessionId: TEST_SESSION_ID,
        role: 'assistant',
        content: 'こんにちは！今日はいい天気だねっ♪',
      },
    });
  });

  it('セッションの有効期限が24時間後に設定される', async () => {
    mockedYumiAgent.generate.mockResolvedValue({
      text: 'こんにちは！',
    } as never);

    const beforeRequest = Date.now();

    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'こんにちは',
        sessionId: TEST_SESSION_ID,
      }),
    });

    expect(response.status).toBe(200);

    const upsertCall = (mockedPrisma.session.upsert as jest.Mock).mock
      .calls[0][0];
    const expiresAt = upsertCall.create.expiresAt.getTime();
    const expectedMinExpiry = beforeRequest + 24 * 60 * 60 * 1000;
    const expectedMaxExpiry = Date.now() + 24 * 60 * 60 * 1000;

    expect(expiresAt).toBeGreaterThanOrEqual(expectedMinExpiry);
    expect(expiresAt).toBeLessThanOrEqual(expectedMaxExpiry);
  });
});

describe('GET /api/chat/:sessionId - 会話履歴取得', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('存在するセッションの会話履歴を取得できる', async () => {
    const mockMessages = [
      {
        id: 'msg-1',
        sessionId: TEST_SESSION_ID,
        role: 'user',
        content: 'こんにちは',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      },
      {
        id: 'msg-2',
        sessionId: TEST_SESSION_ID,
        role: 'assistant',
        content: 'こんにちは！今日はいい天気だねっ♪',
        createdAt: new Date('2024-01-01T10:00:01Z'),
      },
    ];

    (mockedPrisma.session.findUnique as jest.Mock).mockResolvedValue({
      id: 'session-db-id',
      sessionId: TEST_SESSION_ID,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 有効期限内
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (mockedPrisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

    const response = await app.request(`/api/chat/${TEST_SESSION_ID}`, {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sessionId).toBe(TEST_SESSION_ID);
    expect(data.messages).toHaveLength(2);
    expect(data.messages[0].role).toBe('user');
    expect(data.messages[0].content).toBe('こんにちは');
    expect(data.messages[1].role).toBe('assistant');
    expect(data.messages[1].content).toBe('こんにちは！今日はいい天気だねっ♪');
  });

  it('セッションが存在しない場合は空配列を返す', async () => {
    (mockedPrisma.session.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await app.request(`/api/chat/${NON_EXISTENT_SESSION_ID}`, {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sessionId).toBe(NON_EXISTENT_SESSION_ID);
    expect(data.messages).toEqual([]);
  });

  it('セッション有効期限切れの場合はデータを削除して空配列を返す', async () => {
    (mockedPrisma.session.findUnique as jest.Mock).mockResolvedValue({
      id: 'session-db-id',
      sessionId: EXPIRED_SESSION_ID,
      expiresAt: new Date(Date.now() - 1000), // 過去の日時（期限切れ）
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (mockedPrisma.message.deleteMany as jest.Mock).mockResolvedValue({
      count: 2,
    });
    (mockedPrisma.session.delete as jest.Mock).mockResolvedValue({
      id: 'session-db-id',
      sessionId: EXPIRED_SESSION_ID,
    });

    const response = await app.request(`/api/chat/${EXPIRED_SESSION_ID}`, {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sessionId).toBe(EXPIRED_SESSION_ID);
    expect(data.messages).toEqual([]);

    // 期限切れデータが削除されることを確認
    expect(mockedPrisma.message.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: EXPIRED_SESSION_ID },
    });
    expect(mockedPrisma.session.delete).toHaveBeenCalledWith({
      where: { sessionId: EXPIRED_SESSION_ID },
    });
  });

  it('メッセージが作成日時の昇順で取得される', async () => {
    (mockedPrisma.session.findUnique as jest.Mock).mockResolvedValue({
      id: 'session-db-id',
      sessionId: TEST_SESSION_ID_2,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (mockedPrisma.message.findMany as jest.Mock).mockResolvedValue([]);

    await app.request(`/api/chat/${TEST_SESSION_ID_2}`, {
      method: 'GET',
    });

    expect(mockedPrisma.message.findMany).toHaveBeenCalledWith({
      where: { sessionId: TEST_SESSION_ID_2 },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('DBエラー時は500エラーを返す', async () => {
    (mockedPrisma.session.findUnique as jest.Mock).mockRejectedValue(
      new Error('Database connection error')
    );

    const response = await app.request(`/api/chat/${TEST_SESSION_ID}`, {
      method: 'GET',
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('会話履歴の取得に失敗しました。');
  });

  it('sessionIdがUUID v4形式でない場合は400エラーを返す', async () => {
    const response = await app.request('/api/chat/invalid-session-id', {
      method: 'GET',
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({
      error: 'セッションIDの形式が正しくありません。',
    });
  });
});

describe('DELETE /api/session/:sessionId - セッション無効化', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('存在するセッションを無効化できる', async () => {
    (mockedPrisma.session.findUnique as jest.Mock).mockResolvedValue({
      id: 'session-db-id',
      sessionId: TEST_SESSION_ID,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (mockedPrisma.message.deleteMany as jest.Mock).mockResolvedValue({
      count: 5,
    });
    (mockedPrisma.session.delete as jest.Mock).mockResolvedValue({
      id: 'session-db-id',
      sessionId: TEST_SESSION_ID,
    });

    const response = await app.request(`/api/session/${TEST_SESSION_ID}`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      message: 'セッションが無効化されました。',
    });

    // メッセージとセッションが削除されることを確認
    expect(mockedPrisma.message.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: TEST_SESSION_ID },
    });
    expect(mockedPrisma.session.delete).toHaveBeenCalledWith({
      where: { sessionId: TEST_SESSION_ID },
    });
  });

  it('存在しないセッションでも成功として扱う（冪等性）', async () => {
    (mockedPrisma.session.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await app.request(`/api/session/${NON_EXISTENT_SESSION_ID}`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      message: 'セッションが無効化されました。',
    });

    // 存在しないセッションの場合、削除は呼ばれない
    expect(mockedPrisma.message.deleteMany).not.toHaveBeenCalled();
    expect(mockedPrisma.session.delete).not.toHaveBeenCalled();
  });

  it('sessionIdがUUID v4形式でない場合は400エラーを返す', async () => {
    const response = await app.request('/api/session/invalid-session-id', {
      method: 'DELETE',
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({
      error: 'セッションIDの形式が正しくありません。',
    });
  });

  it('DBエラー時は500エラーを返す', async () => {
    (mockedPrisma.session.findUnique as jest.Mock).mockRejectedValue(
      new Error('Database connection error')
    );

    const response = await app.request(`/api/session/${TEST_SESSION_ID}`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({
      error: 'セッションの無効化に失敗しました。',
    });
  });

  it('セッション削除中のDBエラーは500エラーを返す', async () => {
    (mockedPrisma.session.findUnique as jest.Mock).mockResolvedValue({
      id: 'session-db-id',
      sessionId: TEST_SESSION_ID,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (mockedPrisma.message.deleteMany as jest.Mock).mockResolvedValue({
      count: 0,
    });
    (mockedPrisma.session.delete as jest.Mock).mockRejectedValue(
      new Error('Delete failed')
    );

    const response = await app.request(`/api/session/${TEST_SESSION_ID}`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({
      error: 'セッションの無効化に失敗しました。',
    });
  });
});
