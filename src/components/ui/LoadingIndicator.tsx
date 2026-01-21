import Image from 'next/image';

export function LoadingIndicator() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Yumiが入力中です"
      className="flex items-end gap-2"
    >
      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border-2 border-accent shadow-sm">
        <Image
          src="/avatar.jpg"
          alt="Yumi"
          fill
          className="object-cover"
          sizes="40px"
        />
      </div>
      <div className="rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1" aria-hidden="true">
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-accent"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-accent"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-accent"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}
