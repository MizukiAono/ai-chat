import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InputForm } from '@/components/Chat/InputForm';

describe('InputForm', () => {
  const defaultProps = {
    onSend: jest.fn(),
    isLoading: false,
    error: null,
    onClearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('テキスト入力フィールドが表示される', () => {
    render(<InputForm {...defaultProps} />);

    expect(
      screen.getByPlaceholderText('メッセージを入力...')
    ).toBeInTheDocument();
  });

  it('送信ボタンが表示される', () => {
    render(<InputForm {...defaultProps} />);

    expect(screen.getByRole('button', { name: '送信' })).toBeInTheDocument();
  });

  it('入力がない場合、送信ボタンが無効化される', () => {
    render(<InputForm {...defaultProps} />);

    expect(screen.getByRole('button', { name: '送信' })).toBeDisabled();
  });

  it('入力がある場合、送信ボタンが有効化される', async () => {
    const user = userEvent.setup();
    render(<InputForm {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    await user.type(textarea, 'こんにちは');

    expect(screen.getByRole('button', { name: '送信' })).not.toBeDisabled();
  });

  it('フォーム送信時にonSendが呼び出される', async () => {
    const user = userEvent.setup();
    const onSend = jest.fn();
    render(<InputForm {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    await user.type(textarea, 'こんにちは');
    await user.click(screen.getByRole('button', { name: '送信' }));

    expect(onSend).toHaveBeenCalledWith('こんにちは');
  });

  it('送信後に入力がクリアされる', async () => {
    const user = userEvent.setup();
    render(<InputForm {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      'メッセージを入力...'
    ) as HTMLTextAreaElement;
    await user.type(textarea, 'こんにちは');
    await user.click(screen.getByRole('button', { name: '送信' }));

    expect(textarea.value).toBe('');
  });

  it('Enterキーでフォームが送信される', async () => {
    const user = userEvent.setup();
    const onSend = jest.fn();
    render(<InputForm {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    await user.type(textarea, 'こんにちは');
    await user.keyboard('{Enter}');

    expect(onSend).toHaveBeenCalledWith('こんにちは');
  });

  it('Shift+Enterでは送信されない（改行される）', async () => {
    const user = userEvent.setup();
    const onSend = jest.fn();
    render(<InputForm {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByPlaceholderText('メッセージを入力...');
    await user.type(textarea, 'こんにちは');
    await user.keyboard('{Shift>}{Enter}{/Shift}');

    expect(onSend).not.toHaveBeenCalled();
  });

  it('isLoading中はテキストエリアが無効化される', () => {
    render(<InputForm {...defaultProps} isLoading={true} />);

    expect(screen.getByPlaceholderText('メッセージを入力...')).toBeDisabled();
  });

  it('isLoading中は送信ボタンが無効化される', () => {
    render(<InputForm {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('button', { name: '送信' })).toBeDisabled();
  });

  it('エラーメッセージが表示される', () => {
    render(<InputForm {...defaultProps} error="テストエラー" />);

    expect(screen.getByText('テストエラー')).toBeInTheDocument();
  });

  it('エラーの閉じるボタンをクリックするとonClearErrorが呼ばれる', async () => {
    const user = userEvent.setup();
    const onClearError = jest.fn();
    render(
      <InputForm {...defaultProps} error="テストエラー" onClearError={onClearError} />
    );

    await user.click(screen.getByRole('button', { name: '閉じる' }));

    expect(onClearError).toHaveBeenCalled();
  });
});
