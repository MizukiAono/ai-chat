import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

describe('ErrorMessage', () => {
  it('エラーメッセージを表示する', () => {
    render(<ErrorMessage message="エラーが発生しました" onClose={jest.fn()} />);

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
  });

  it('閉じるボタンをクリックするとonCloseが呼ばれる', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<ErrorMessage message="エラー" onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: '閉じる' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('アイコンが表示される', () => {
    const { container } = render(
      <ErrorMessage message="エラー" onClose={jest.fn()} />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
