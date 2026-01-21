/**
 * @fileoverview メッセージ管理カスタムフック
 * @module hooks/useMessages
 * @description
 * チャットメッセージの状態管理とsessionStorageへの永続化を行う。
 * useSyncExternalStoreを使用してストレージとReactの状態を同期。
 */

'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { Message } from '@/types';

/** sessionStorageのメッセージキーのプレフィックス */
const MESSAGES_KEY_PREFIX = 'yumi-chat-messages-';

/**
 * sessionStorageのエラータイプ
 *
 * - `QUOTA_EXCEEDED` - ストレージ容量超過
 * - `UNKNOWN` - その他のエラー
 * - `null` - エラーなし
 */
export type StorageErrorType = 'QUOTA_EXCEEDED' | 'UNKNOWN' | null;

// ============================================================================
// ストレージエラー管理
// ============================================================================

/** 現在のストレージエラー状態 */
let storageError: StorageErrorType = null;

/** ストレージエラーのリスナー一覧 */
const storageErrorListeners = new Set<() => void>();

/**
 * ストレージエラーを設定し、リスナーに通知する
 * @param {StorageErrorType} error - 設定するエラー
 * @private
 */
function setStorageError(error: StorageErrorType): void {
  storageError = error;
  storageErrorListeners.forEach((listener) => listener());
}

/**
 * 現在のストレージエラーを取得
 * @returns {StorageErrorType} 現在のエラー状態
 * @private
 */
function getStorageError(): StorageErrorType {
  return storageError;
}

/**
 * ストレージエラーの変更を購読する
 * @param {() => void} callback - エラー変更時のコールバック
 * @returns {() => void} 購読解除関数
 * @private
 */
function subscribeStorageError(callback: () => void): () => void {
  storageErrorListeners.add(callback);
  return () => storageErrorListeners.delete(callback);
}

/**
 * SSR用のストレージエラースナップショット
 * @returns {StorageErrorType} 常にnull
 * @private
 */
function getServerStorageError(): StorageErrorType {
  return null;
}

// ============================================================================
// メッセージストレージ操作
// ============================================================================

/**
 * セッションIDからsessionStorageのキーを生成
 * @param {string} sessionId - セッションID
 * @returns {string} ストレージキー
 * @private
 */
function getMessagesKey(sessionId: string): string {
  return `${MESSAGES_KEY_PREFIX}${sessionId}`;
}

/**
 * sessionStorageからメッセージを取得
 *
 * @param {string} sessionId - セッションID
 * @returns {Message[]} メッセージ配列（取得失敗時は空配列）
 * @private
 */
function getMessagesFromStorage(sessionId: string): Message[] {
  if (typeof window === 'undefined' || !sessionId) {
    return [];
  }
  try {
    const stored = sessionStorage.getItem(getMessagesKey(sessionId));
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      createdAt: string;
    }>;
    return parsed.map((msg) => ({
      ...msg,
      createdAt: new Date(msg.createdAt),
    }));
  } catch {
    return [];
  }
}

/**
 * メッセージをsessionStorageに保存する
 *
 * @description
 * ストレージ容量超過時はQUOTA_EXCEEDEDエラーを設定。
 * 保存成功時はストレージイベントを発火して他タブと同期。
 *
 * @param {string} sessionId - セッションID
 * @param {Message[]} messages - 保存するメッセージ配列
 * @private
 */
function saveMessagesToStorage(sessionId: string, messages: Message[]): void {
  if (typeof window === 'undefined' || !sessionId) {
    return;
  }
  try {
    sessionStorage.setItem(getMessagesKey(sessionId), JSON.stringify(messages));
    window.dispatchEvent(new StorageEvent('storage', { key: getMessagesKey(sessionId) }));
    // 保存成功時はエラーをクリア
    if (storageError) {
      setStorageError(null);
    }
  } catch (error) {
    // QuotaExceededError を検出
    if (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      setStorageError('QUOTA_EXCEEDED');
    } else {
      setStorageError('UNKNOWN');
    }
  }
}

// ============================================================================
// メッセージストア
// ============================================================================

/**
 * メッセージストアの型定義
 * @interface MessageStore
 */
type MessageStore = {
  /** 現在のメッセージ配列 */
  messages: Message[];
  /** 現在のセッションID */
  sessionId: string;
  /** 変更リスナーのセット */
  listeners: Set<() => void>;
};

/** グローバルメッセージストア */
const store: MessageStore = {
  messages: [],
  sessionId: '',
  listeners: new Set(),
};

/**
 * ストアを指定セッションで初期化する
 * @param {string} sessionId - 初期化するセッションID
 * @private
 */
function initializeStore(sessionId: string): void {
  if (sessionId && sessionId !== store.sessionId) {
    store.sessionId = sessionId;
    store.messages = getMessagesFromStorage(sessionId);
    notifyListeners();
  }
}

/**
 * ストアの変更を購読する
 *
 * @description ストレージイベントも監視し、他タブでの変更を検知する
 * @param {() => void} callback - 変更時のコールバック
 * @returns {() => void} 購読解除関数
 * @private
 */
function subscribe(callback: () => void): () => void {
  store.listeners.add(callback);

  const handleStorage = (event: StorageEvent) => {
    if (event.key?.startsWith(MESSAGES_KEY_PREFIX)) {
      store.messages = getMessagesFromStorage(store.sessionId);
      callback();
    }
  };

  window.addEventListener('storage', handleStorage);

  return () => {
    store.listeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}

/**
 * 全リスナーに変更を通知する
 * @private
 */
function notifyListeners(): void {
  store.listeners.forEach((listener) => listener());
}

/**
 * 現在のメッセージスナップショットを取得
 * @returns {Message[]} 現在のメッセージ配列
 * @private
 */
function getSnapshot(): Message[] {
  return store.messages;
}

/** SSR用の空メッセージ配列（参照を固定するため定数として定義） */
const EMPTY_MESSAGES: Message[] = [];

/**
 * SSR用のメッセージスナップショット
 * @returns {Message[]} 空配列
 * @private
 */
function getServerSnapshot(): Message[] {
  return EMPTY_MESSAGES;
}

/**
 * メッセージ管理カスタムフック
 *
 * @description
 * セッションに紐づくメッセージの取得、追加、削除を行う。
 * sessionStorageと同期し、ブラウザを閉じるまでメッセージを保持。
 *
 * @param {string} sessionId - セッションID
 * @returns {Object} メッセージ管理オブジェクト
 * @returns {Message[]} returns.messages - メッセージ配列
 * @returns {(message: Message) => void} returns.addMessage - メッセージ追加関数
 * @returns {() => void} returns.clearMessages - メッセージ全削除関数
 * @returns {StorageErrorType} returns.storageError - ストレージエラー状態
 * @returns {() => void} returns.clearStorageError - エラークリア関数
 *
 * @example
 * ```tsx
 * function Chat() {
 *   const { messages, addMessage, storageError } = useMessages(sessionId);
 *
 *   const sendMessage = (text: string) => {
 *     addMessage({
 *       id: crypto.randomUUID(),
 *       role: 'user',
 *       content: text,
 *       createdAt: new Date(),
 *     });
 *   };
 *
 *   return (
 *     <div>
 *       {storageError && <div>Storage error: {storageError}</div>}
 *       {messages.map(m => <p key={m.id}>{m.content}</p>)}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMessages(sessionId: string) {
  const isInitialized = useRef(false);

  // Initialize store when sessionId changes using useEffect
  useEffect(() => {
    if (sessionId) {
      initializeStore(sessionId);
      isInitialized.current = true;
    }
  }, [sessionId]);

  const messages = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  // ストレージエラーの状態を購読
  const storageErrorState = useSyncExternalStore(
    subscribeStorageError,
    getStorageError,
    getServerStorageError
  );

  const addMessage = useCallback(
    (message: Message) => {
      if (!sessionId) return;
      store.messages = [...store.messages, message];
      saveMessagesToStorage(sessionId, store.messages);
      notifyListeners();
    },
    [sessionId]
  );

  const clearMessages = useCallback(() => {
    if (!sessionId) return;
    store.messages = [];
    saveMessagesToStorage(sessionId, store.messages);
    notifyListeners();
  }, [sessionId]);

  const clearStorageError = useCallback(() => {
    setStorageError(null);
  }, []);

  return {
    messages,
    addMessage,
    clearMessages,
    storageError: storageErrorState,
    clearStorageError,
  };
}
