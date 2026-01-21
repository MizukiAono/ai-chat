import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatContainer } from '@/components/Chat/ChatContainer';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} />
  ),
}));

// Mock useSession hook
jest.mock('@/hooks/useSession', () => ({
  useSession: () => ({ sessionId: 'test-session-id' }),
}));

// Mock useMessages hook
const mockAddMessage = jest.fn();
const mockClearStorageError = jest.fn();
let mockMessages: Array<{
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}> = [];
let mockStorageError: 'QUOTA_EXCEEDED' | 'UNKNOWN' | null = null;

jest.mock('@/hooks/useMessages', () => ({
  useMessages: () => ({
    messages: mockMessages,
    addMessage: mockAddMessage,
    storageError: mockStorageError,
    clearStorageError: mockClearStorageError,
  }),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ChatContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMessages = [];
    mockStorageError = null;
    mockFetch.mockReset();
  });

  it('初期状態で空のチャット画面が表示される', () => {
    render(<ChatContainer />);

    // ヘッダーが表示されていることを確認
    expect(screen.getByText('Yumi')).toBeInTheDocument();
    expect(screen.getByText('ガーデニング好きな女子大生')).toBeInTheDocument();

    // 空の状態のメッセージが表示される
    expect(screen.getByText('Yumiとおしゃべりしよう！')).toBeInTheDocument();
    expect(screen.getByText('メッセージを送ってみてね♪')).toBeInTheDocument();

    // 入力フィールドが表示される
    expect(
      screen.getByPlaceholderText('メッセージを入力...')
    ).toBeInTheDocument();
  });

  it('メッセージ送信時にfetchが呼ばれる', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'こんにちは！今日はいい天気だねっ♪',
        sessionId: 'test-session-id',
      }),
    });

    render(<ChatContainer />);

    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    await user.type(textarea, 'こんにちは');
    await user.click(screen.getByRole('button', { name: '送信' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'こんにちは',
            sessionId: 'test-session-id',
          }),
        })
      );
    });
  });

  it('メッセージ送信時にaddMessageが呼ばれる', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'こんにちは！',
        sessionId: 'test-session-id',
      }),
    });

    render(<ChatContainer />);

    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    await user.type(textarea, 'テストメッセージ');
    await user.click(screen.getByRole('button', { name: '送信' }));

    // ユーザーメッセージが追加される
    await waitFor(() => {
      expect(mockAddMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: 'テストメッセージ',
        })
      );
    });

    // アシスタントメッセージが追加される
    await waitFor(() => {
      expect(mockAddMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'assistant',
          content: 'こんにちは！',
        })
      );
    });
  });

  it('APIエラー時にエラーメッセージが表示される', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'サーバーエラーが発生しました。',
      }),
    });

    render(<ChatContainer />);

    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    await user.type(textarea, 'テスト');
    await user.click(screen.getByRole('button', { name: '送信' }));

    await waitFor(() => {
      expect(
        screen.getByText('サーバーエラーが発生しました。')
      ).toBeInTheDocument();
    });
  });

  it('タイムアウト時にエラーメッセージが表示される', async () => {
    const user = userEvent.setup();

    // AbortErrorをシミュレート
    const abortError = new DOMException('Aborted', 'AbortError');
    mockFetch.mockRejectedValueOnce(abortError);

    render(<ChatContainer />);

    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    await user.type(textarea, 'テスト');
    await user.click(screen.getByRole('button', { name: '送信' }));

    await waitFor(() => {
      expect(
        screen.getByText('応答がタイムアウトしました。もう一度お試しください。')
      ).toBeInTheDocument();
    });
  });

  it('ネットワークエラー時にエラーメッセージが表示される', async () => {
    const user = userEvent.setup();
    mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

    render(<ChatContainer />);

    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    await user.type(textarea, 'テスト');
    await user.click(screen.getByRole('button', { name: '送信' }));

    await waitFor(() => {
      expect(screen.getByText('fetch failed')).toBeInTheDocument();
    });
  });

  it('JSONパースエラー時にエラーメッセージが表示される', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });

    render(<ChatContainer />);

    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    await user.type(textarea, 'テスト');
    await user.click(screen.getByRole('button', { name: '送信' }));

    await waitFor(() => {
      expect(
        screen.getByText('サーバーからの応答を解析できませんでした。')
      ).toBeInTheDocument();
    });
  });

  it('ストレージ容量超過エラーが表示される', () => {
    mockStorageError = 'QUOTA_EXCEEDED';

    render(<ChatContainer />);

    expect(
      screen.getByText(
        '会話履歴の保存容量を超えました。古いメッセージは保存されない場合があります。'
      )
    ).toBeInTheDocument();
  });

  it('ストレージエラー（不明）が表示される', () => {
    mockStorageError = 'UNKNOWN';

    render(<ChatContainer />);

    expect(
      screen.getByText('会話履歴の保存中にエラーが発生しました。')
    ).toBeInTheDocument();
  });

  it('エラーを閉じることができる', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'テストエラー',
      }),
    });

    render(<ChatContainer />);

    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    await user.type(textarea, 'テスト');
    await user.click(screen.getByRole('button', { name: '送信' }));

    await waitFor(() => {
      expect(screen.getByText('テストエラー')).toBeInTheDocument();
    });

    // エラーを閉じる
    await user.click(screen.getByRole('button', { name: '閉じる' }));

    await waitFor(() => {
      expect(screen.queryByText('テストエラー')).not.toBeInTheDocument();
    });
  });

  it('空白のみのメッセージは送信されない', async () => {
    const user = userEvent.setup();

    render(<ChatContainer />);

    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    await user.type(textarea, '   ');

    // 送信ボタンは無効化されているはず
    expect(screen.getByRole('button', { name: '送信' })).toBeDisabled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('送信中は再送信できない', async () => {
    const user = userEvent.setup();

    // 遅延するfetchをモック
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  response: 'OK',
                  sessionId: 'test-session-id',
                }),
              }),
            100
          )
        )
    );

    render(<ChatContainer />);

    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    await user.type(textarea, 'テスト');
    await user.click(screen.getByRole('button', { name: '送信' }));

    // ローディング中はテキストエリアと送信ボタンが無効化される
    await waitFor(() => {
      expect(screen.getByPlaceholderText('メッセージを入力...')).toBeDisabled();
    });
  });

  it('メッセージ一覧が正しく表示される', () => {
    mockMessages = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'こんにちは！',
        createdAt: new Date(),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'こんにちは！今日はいい天気だねっ♪',
        createdAt: new Date(),
      },
    ];

    render(<ChatContainer />);

    expect(screen.getByText('こんにちは！')).toBeInTheDocument();
    expect(
      screen.getByText('こんにちは！今日はいい天気だねっ♪')
    ).toBeInTheDocument();
  });
});
