import { render, screen } from '@testing-library/react';
import { MessageList } from '@/components/Chat/MessageList';
import type { Message } from '@/types';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} />
  ),
}));

// scrollIntoViewのモックを取得（jest.setup.tsで設定済み）
const mockScrollIntoView = window.HTMLElement.prototype
  .scrollIntoView as jest.Mock;

describe('MessageList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('メッセージが空の場合、空の状態のメッセージが表示される', () => {
    render(<MessageList messages={[]} isLoading={false} />);

    expect(screen.getByText('Yumiとおしゃべりしよう！')).toBeInTheDocument();
    expect(screen.getByText('メッセージを送ってみてね♪')).toBeInTheDocument();
    expect(screen.getByText('🌸')).toBeInTheDocument();
  });

  it('ローディング中は空の状態のメッセージが表示されない', () => {
    render(<MessageList messages={[]} isLoading={true} />);

    expect(
      screen.queryByText('Yumiとおしゃべりしよう！')
    ).not.toBeInTheDocument();
  });

  it('メッセージが存在する場合、空の状態のメッセージが表示されない', () => {
    const messages: Message[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'こんにちは',
        createdAt: new Date(),
      },
    ];

    render(<MessageList messages={messages} isLoading={false} />);

    expect(
      screen.queryByText('Yumiとおしゃべりしよう！')
    ).not.toBeInTheDocument();
    expect(screen.getByText('こんにちは')).toBeInTheDocument();
  });

  it('複数のメッセージが正しい順序で表示される', () => {
    const messages: Message[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: '1番目のメッセージ',
        createdAt: new Date('2024-01-01T10:00:00'),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: '2番目のメッセージ',
        createdAt: new Date('2024-01-01T10:00:01'),
      },
      {
        id: 'msg-3',
        role: 'user',
        content: '3番目のメッセージ',
        createdAt: new Date('2024-01-01T10:00:02'),
      },
    ];

    render(<MessageList messages={messages} isLoading={false} />);

    const firstMsg = screen.getByText('1番目のメッセージ');
    const secondMsg = screen.getByText('2番目のメッセージ');
    const thirdMsg = screen.getByText('3番目のメッセージ');

    // 全てのメッセージが表示されている
    expect(firstMsg).toBeInTheDocument();
    expect(secondMsg).toBeInTheDocument();
    expect(thirdMsg).toBeInTheDocument();

    // メッセージの順序を確認（DOM上の位置で比較）
    const allMessages = screen.getAllByText(/番目のメッセージ/);
    expect(allMessages).toHaveLength(3);
    expect(allMessages[0]).toHaveTextContent('1番目のメッセージ');
    expect(allMessages[1]).toHaveTextContent('2番目のメッセージ');
    expect(allMessages[2]).toHaveTextContent('3番目のメッセージ');
  });

  it('ローディング中はローディングインジケーターが表示される', () => {
    render(<MessageList messages={[]} isLoading={true} />);

    // LoadingIndicatorにはYumiのアバターが含まれる
    expect(screen.getByAltText('Yumi')).toBeInTheDocument();
  });

  it('ローディング中でない場合はローディングインジケーターが表示されない', () => {
    const messages: Message[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'テスト',
        createdAt: new Date(),
      },
    ];

    render(<MessageList messages={messages} isLoading={false} />);

    // ユーザーメッセージにはYumiのアバターは表示されない
    expect(screen.queryByAltText('Yumi')).not.toBeInTheDocument();
  });

  it('メッセージ追加時に自動スクロールが呼ばれる', () => {
    const messages: Message[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'テスト',
        createdAt: new Date(),
      },
    ];

    render(<MessageList messages={messages} isLoading={false} />);

    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('ローディング状態変更時に自動スクロールが呼ばれる', () => {
    const { rerender } = render(
      <MessageList messages={[]} isLoading={false} />
    );

    mockScrollIntoView.mockClear();

    rerender(<MessageList messages={[]} isLoading={true} />);

    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('メッセージ追加後にスクロールが呼ばれる', () => {
    const initialMessages: Message[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: '最初のメッセージ',
        createdAt: new Date(),
      },
    ];

    const { rerender } = render(
      <MessageList messages={initialMessages} isLoading={false} />
    );

    mockScrollIntoView.mockClear();

    const updatedMessages: Message[] = [
      ...initialMessages,
      {
        id: 'msg-2',
        role: 'assistant',
        content: '返信メッセージ',
        createdAt: new Date(),
      },
    ];

    rerender(<MessageList messages={updatedMessages} isLoading={false} />);

    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('ユーザーメッセージとアシスタントメッセージが正しく表示される', () => {
    const messages: Message[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'ユーザーからの質問',
        createdAt: new Date(),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Yumiからの返答',
        createdAt: new Date(),
      },
    ];

    render(<MessageList messages={messages} isLoading={false} />);

    expect(screen.getByText('ユーザーからの質問')).toBeInTheDocument();
    expect(screen.getByText('Yumiからの返答')).toBeInTheDocument();

    // アシスタントメッセージにはYumiのアバターが表示される
    expect(screen.getByAltText('Yumi')).toBeInTheDocument();
  });

  it('長いメッセージリストでも全てのメッセージが表示される', () => {
    const messages: Message[] = Array.from({ length: 20 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `メッセージ${i + 1}`,
      createdAt: new Date(),
    })) as Message[];

    render(<MessageList messages={messages} isLoading={false} />);

    // 全20メッセージが表示されていることを確認
    for (let i = 1; i <= 20; i++) {
      expect(screen.getByText(`メッセージ${i}`)).toBeInTheDocument();
    }
  });
});
