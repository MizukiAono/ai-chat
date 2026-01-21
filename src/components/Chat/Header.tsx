import Image from 'next/image';

export function Header() {
  return (
    <header className="border-b border-border bg-card px-4 py-3 shadow-sm">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-accent shadow-sm">
          <Image
            src="/avatar.jpg"
            alt="Yumi"
            fill
            className="object-cover"
            sizes="40px"
            priority
          />
        </div>
        <div>
          <h1 className="text-lg font-medium text-foreground">Yumi</h1>
          <p className="text-xs text-foreground/60">
            ガーデニング好きな女子大生
          </p>
        </div>
      </div>
    </header>
  );
}
