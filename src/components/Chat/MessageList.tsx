'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { LoadingIndicator } from '../ui/LoadingIndicator';
import type { Message } from '@/types';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 text-6xl">🌸</div>
            <h2 className="mb-2 text-xl font-medium text-foreground">
              Yumiとおしゃべりしよう！
            </h2>
            <p className="text-sm text-foreground/60">
              メッセージを送ってみてね♪
            </p>
          </div>
        )}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isLoading && <LoadingIndicator />}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
