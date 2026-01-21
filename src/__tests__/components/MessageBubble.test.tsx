import { render, screen } from '@testing-library/react';
import { MessageBubble } from '@/components/Chat/MessageBubble';
import type { Message } from '@/types';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} />
  ),
}));

describe('MessageBubble', () => {
  it('ユーザーメッセージを正しく表示する', () => {
    const userMessage: Message = {
      id: 'test-id-1',
      role: 'user',
      content: 'こんにちは！',
      createdAt: new Date(),
    };

    render(<MessageBubble message={userMessage} />);

    expect(screen.getByText('こんにちは！')).toBeInTheDocument();
    // ユーザーメッセージにはアバターが表示されない
    expect(screen.queryByAltText('Yumi')).not.toBeInTheDocument();
  });

  it('アシスタントメッセージを正しく表示する', () => {
    const assistantMessage: Message = {
      id: 'test-id-2',
      role: 'assistant',
      content: '今日はいい天気だねっ♪',
      createdAt: new Date(),
    };

    render(<MessageBubble message={assistantMessage} />);

    expect(screen.getByText('今日はいい天気だねっ♪')).toBeInTheDocument();
    // アシスタントメッセージにはYumiのアバターが表示される
    expect(screen.getByAltText('Yumi')).toBeInTheDocument();
  });

  it('複数行のメッセージを正しく表示する', () => {
    const message: Message = {
      id: 'test-id-3',
      role: 'user',
      content: '1行目\n2行目\n3行目',
      createdAt: new Date(),
    };

    render(<MessageBubble message={message} />);

    // Check that the p element contains the multiline text
    const paragraph = screen.getByRole('paragraph', { hidden: true });
    expect(paragraph).toHaveTextContent('1行目');
    expect(paragraph).toHaveTextContent('2行目');
    expect(paragraph).toHaveTextContent('3行目');
  });

  it('ユーザーメッセージに適切なaria-labelが設定される', () => {
    const userMessage: Message = {
      id: 'test-id-4',
      role: 'user',
      content: 'テストメッセージ',
      createdAt: new Date(),
    };

    render(<MessageBubble message={userMessage} />);

    const article = screen.getByRole('article');
    expect(article).toHaveAttribute(
      'aria-label',
      'あなたのメッセージ: テストメッセージ'
    );
  });

  it('アシスタントメッセージに適切なaria-labelが設定される', () => {
    const assistantMessage: Message = {
      id: 'test-id-5',
      role: 'assistant',
      content: 'Yumiからの返答',
      createdAt: new Date(),
    };

    render(<MessageBubble message={assistantMessage} />);

    const article = screen.getByRole('article');
    expect(article).toHaveAttribute(
      'aria-label',
      'Yumiのメッセージ: Yumiからの返答'
    );
  });
});
