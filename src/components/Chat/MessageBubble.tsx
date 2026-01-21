import Image from 'next/image';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const ariaLabel = isUser
    ? `あなたのメッセージ: ${message.content}`
    : `Yumiのメッセージ: ${message.content}`;

  return (
    <article
      role="article"
      aria-label={ariaLabel}
      className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {!isUser && (
        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border-2 border-accent shadow-sm">
          <Image
            src="/avatar.jpg"
            alt="Yumi"
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? 'rounded-br-sm bg-secondary text-white'
            : 'rounded-bl-sm border border-border bg-card text-foreground'
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </p>
      </div>
    </article>
  );
}
