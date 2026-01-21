'use client';

import { useEffect, useRef, useCallback, useState, CSSProperties } from 'react';
import {
  List,
  useDynamicRowHeight,
  useListRef,
  type RowComponentProps,
} from 'react-window';
import { MessageBubble } from './MessageBubble';
import { LoadingIndicator } from '../ui/LoadingIndicator';
import type { Message } from '@/types';

interface VirtualizedMessageListProps {
  messages: Message[];
  isLoading: boolean;
}

// デフォルトの行の高さ（動的に計測される）
const DEFAULT_ROW_HEIGHT = 80;

// 行コンポーネントのprops型
interface RowProps {
  messages: Message[];
  isLoading: boolean;
  observeRowElements: (elements: Element[] | NodeListOf<Element>) => () => void;
}

// 仮想化された行コンポーネント
function VirtualizedRow({
  index,
  style,
  messages,
  isLoading,
  observeRowElements,
}: RowComponentProps<RowProps>) {
  const rowRef = useRef<HTMLDivElement>(null);

  // 行の高さを動的に計測
  useEffect(() => {
    if (rowRef.current) {
      const cleanup = observeRowElements([rowRef.current]);
      return cleanup;
    }
  }, [observeRowElements]);

  // ローディングインジケーター（最後のアイテム）
  if (index === messages.length && isLoading) {
    return (
      <div
        ref={rowRef}
        style={{
          ...style,
          paddingLeft: '1rem',
          paddingRight: '1rem',
        }}
        data-index={index}
      >
        <div className="mx-auto max-w-2xl py-2">
          <LoadingIndicator />
        </div>
      </div>
    );
  }

  const message = messages[index];
  if (!message) return null;

  return (
    <div
      ref={rowRef}
      style={{
        ...style,
        paddingLeft: '1rem',
        paddingRight: '1rem',
      }}
      data-index={index}
    >
      <div className="mx-auto max-w-2xl py-2">
        <MessageBubble message={message} />
      </div>
    </div>
  );
}

export function VirtualizedMessageList({
  messages,
  isLoading,
}: VirtualizedMessageListProps) {
  const listRef = useListRef(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  // 動的な行の高さを管理するフック
  const dynamicRowHeight = useDynamicRowHeight({
    defaultRowHeight: DEFAULT_ROW_HEIGHT,
  });

  // コンテナの高さを監視
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // メッセージが追加されたら最下部にスクロール
  const scrollToBottom = useCallback(() => {
    if (listRef.current && messages.length > 0) {
      const targetIndex = isLoading ? messages.length : messages.length - 1;
      listRef.current.scrollToRow({
        index: targetIndex,
        align: 'end',
        behavior: 'smooth',
      });
    }
  }, [listRef, messages.length, isLoading]);

  useEffect(() => {
    // 少し遅延を入れて、行の高さが計測された後にスクロール
    const timeoutId = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timeoutId);
  }, [scrollToBottom]);

  // メッセージがない場合の空状態表示
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 text-6xl">🌸</div>
            <h2 className="mb-2 text-xl font-medium text-foreground">
              Yumiとおしゃべりしよう！
            </h2>
            <p className="text-sm text-foreground/60">
              メッセージを送ってみてね♪
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 仮想化のアイテム数（ローディング中は+1）
  const itemCount = messages.length + (isLoading ? 1 : 0);

  // コンテナスタイル
  const containerStyle: CSSProperties = {
    height: '100%',
    paddingTop: '1.5rem',
    paddingBottom: '1.5rem',
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden">
      {containerHeight > 0 && (
        <List<RowProps>
          listRef={listRef}
          rowComponent={VirtualizedRow}
          rowCount={itemCount}
          rowHeight={dynamicRowHeight}
          rowProps={{
            messages,
            isLoading,
            observeRowElements: dynamicRowHeight.observeRowElements,
          }}
          style={containerStyle}
          overscanCount={3}
        />
      )}
    </div>
  );
}
