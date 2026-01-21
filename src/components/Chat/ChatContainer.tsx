'use client';

import { useState, useCallback, useRef } from 'react';
import { MessageList } from './MessageList';
import { VirtualizedMessageList } from './VirtualizedMessageList';
import { InputForm } from './InputForm';
import { Header } from './Header';
import { useSession } from '@/hooks/useSession';
import { useMessages, type StorageErrorType } from '@/hooks/useMessages';
import type { Message, ChatResponse, ChatErrorResponse } from '@/types';

// fetchタイムアウト（ミリ秒）
const FETCH_TIMEOUT_MS = 30000;

// ストレージエラーメッセージのマッピング
function getStorageErrorMessage(errorType: StorageErrorType): string | null {
  if (!errorType) return null;
  switch (errorType) {
    case 'QUOTA_EXCEEDED':
      return '会話履歴の保存容量を超えました。古いメッセージは保存されない場合があります。';
    case 'UNKNOWN':
      return '会話履歴の保存中にエラーが発生しました。';
    default:
      return null;
  }
}

export function ChatContainer() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sessionId } = useSession();
  const { messages, addMessage, storageError, clearStorageError } = useMessages(sessionId);

  // isLoadingの最新値を参照するためのref（useCallbackの依存配列から除外するため）
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoadingRef.current) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
        createdAt: new Date(),
      };

      addMessage(userMessage);
      setIsLoading(true);
      setError(null);

      // タイムアウト用のAbortController
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, FETCH_TIMEOUT_MS);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content.trim(),
            sessionId,
          }),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        let data: ChatResponse | ChatErrorResponse;
        try {
          data = await response.json();
        } catch {
          throw new Error('サーバーからの応答を解析できませんでした。');
        }

        if (!response.ok) {
          throw new Error(
            (data as ChatErrorResponse).error ||
              'メッセージの送信に失敗しました。'
          );
        }

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: (data as ChatResponse).response,
          createdAt: new Date(),
        };

        addMessage(assistantMessage);
      } catch (err) {
        clearTimeout(timeoutId);

        let errorMessage: string;
        if (err instanceof DOMException && err.name === 'AbortError') {
          errorMessage =
            '応答がタイムアウトしました。もう一度お試しください。';
        } else if (err instanceof Error) {
          errorMessage = err.message;
        } else {
          errorMessage =
            'メッセージの送信に失敗しました。もう一度お試しください。';
        }
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, addMessage]
  );

  const clearError = useCallback(() => {
    setError(null);
    clearStorageError();
  }, [clearStorageError]);

  // APIエラーとストレージエラーを統合して表示
  const displayError = error || getStorageErrorMessage(storageError);

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* メッセージ数が50件を超えたら仮想化リストを使用 */}
        {messages.length > 50 ? (
          <VirtualizedMessageList messages={messages} isLoading={isLoading} />
        ) : (
          <MessageList messages={messages} isLoading={isLoading} />
        )}
        <InputForm
          onSend={sendMessage}
          isLoading={isLoading}
          error={displayError}
          onClearError={clearError}
        />
      </main>
    </div>
  );
}
