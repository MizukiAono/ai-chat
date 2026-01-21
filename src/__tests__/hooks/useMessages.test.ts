import { renderHook, act, cleanup } from '@testing-library/react';
import { useMessages } from '@/hooks/useMessages';
import type { Message } from '@/types';

describe('useMessages', () => {
  beforeEach(() => {
    sessionStorage.clear();
    cleanup();
  });

  it('初期状態では空のメッセージ配列を返す', () => {
    const { result } = renderHook(() => useMessages('test-session-1'));

    expect(result.current.messages).toEqual([]);
  });

  it('addMessageでメッセージを追加できる', () => {
    const { result } = renderHook(() => useMessages('test-session-2'));

    const message: Message = {
      id: 'msg-1',
      role: 'user',
      content: 'こんにちは',
      createdAt: new Date('2024-01-01'),
    };

    act(() => {
      result.current.addMessage(message);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('こんにちは');
  });

  it('複数のメッセージを追加できる', () => {
    const { result } = renderHook(() => useMessages('test-session-3'));

    const message1: Message = {
      id: 'msg-1',
      role: 'user',
      content: 'こんにちは',
      createdAt: new Date('2024-01-01'),
    };

    const message2: Message = {
      id: 'msg-2',
      role: 'assistant',
      content: 'こんにちは！',
      createdAt: new Date('2024-01-01'),
    };

    act(() => {
      result.current.addMessage(message1);
    });

    act(() => {
      result.current.addMessage(message2);
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[1].role).toBe('assistant');
  });

  it('clearMessagesでメッセージをクリアできる', () => {
    const { result } = renderHook(() => useMessages('test-session-4'));

    const message: Message = {
      id: 'msg-1',
      role: 'user',
      content: 'こんにちは',
      createdAt: new Date('2024-01-01'),
    };

    act(() => {
      result.current.addMessage(message);
    });

    expect(result.current.messages).toHaveLength(1);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it('メッセージがsessionStorageに保存される', () => {
    const { result } = renderHook(() => useMessages('test-session-5'));

    const message: Message = {
      id: 'msg-1',
      role: 'user',
      content: 'こんにちは',
      createdAt: new Date('2024-01-01'),
    };

    act(() => {
      result.current.addMessage(message);
    });

    const stored = sessionStorage.getItem('yumi-chat-messages-test-session-5');
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].content).toBe('こんにちは');
  });

  it('sessionIdが空の場合はsessionStorageに保存しない', () => {
    const { result } = renderHook(() => useMessages(''));

    const message: Message = {
      id: 'msg-unique-empty-session',
      role: 'user',
      content: 'こんにちは',
      createdAt: new Date('2024-01-01'),
    };

    act(() => {
      result.current.addMessage(message);
    });

    // With empty sessionId, nothing should be saved to sessionStorage
    const stored = sessionStorage.getItem('yumi-chat-messages-');
    expect(stored).toBeNull();
  });
});
