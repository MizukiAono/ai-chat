import { render, screen } from '@testing-library/react';
import { Header } from '@/components/Chat/Header';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: {
    alt: string;
    src: string;
    priority?: boolean;
    sizes?: string;
    className?: string;
    fill?: boolean;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={props.alt}
      src={props.src}
      className={props.className}
      data-priority={props.priority}
      data-sizes={props.sizes}
    />
  ),
}));

describe('Header', () => {
  it('Yumiの名前が表示される', () => {
    render(<Header />);

    expect(screen.getByRole('heading', { name: 'Yumi' })).toBeInTheDocument();
  });

  it('Yumiの説明が表示される', () => {
    render(<Header />);

    expect(screen.getByText('ガーデニング好きな女子大生')).toBeInTheDocument();
  });

  it('Yumiのアバター画像が表示される', () => {
    render(<Header />);

    const avatar = screen.getByAltText('Yumi');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', '/avatar.jpg');
  });

  it('headerタグでレンダリングされる', () => {
    render(<Header />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('アバター画像にpriorityが設定されている', () => {
    render(<Header />);

    const avatar = screen.getByAltText('Yumi');
    expect(avatar).toHaveAttribute('data-priority', 'true');
  });

  it('アバター画像に適切なsizesが設定されている', () => {
    render(<Header />);

    const avatar = screen.getByAltText('Yumi');
    expect(avatar).toHaveAttribute('data-sizes', '40px');
  });

  it('見出しが正しい階層構造になっている', () => {
    render(<Header />);

    // h1タグとして表示されることを確認
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Yumi');
  });
});
