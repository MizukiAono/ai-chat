'use client';

import { useState, useCallback, useRef } from 'react';
import { ErrorMessage } from '../ui/ErrorMessage';

interface InputFormProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
}

export function InputForm({
  onSend,
  isLoading,
  error,
  onClearError,
}: InputFormProps) {
  const [input, setInput] = useState('');

  // 最新値を参照するためのref（useCallbackの依存配列から除外するため）
  const inputRef = useRef(input);
  inputRef.current = input;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputRef.current.trim() && !isLoadingRef.current) {
        onSend(inputRef.current);
        setInput('');
      }
    },
    [onSend]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  return (
    <div className="border-t border-border bg-card px-4 py-4">
      <div className="mx-auto max-w-2xl">
        {error && <ErrorMessage message={error} onClose={onClearError} />}
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力..."
              disabled={isLoading}
              rows={1}
              aria-label="メッセージ入力"
              aria-describedby="input-help"
              className="w-full resize-none rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                minHeight: '48px',
                maxHeight: '120px',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-md transition-all hover:bg-accent-dark hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-accent disabled:hover:shadow-md"
            aria-label="送信"
          >
            {isLoading ? (
              <svg
                className="h-5 w-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            )}
          </button>
        </form>
        <p id="input-help" className="mt-2 text-center text-xs text-foreground/40">
          Shift + Enter で改行
        </p>
      </div>
    </div>
  );
}
