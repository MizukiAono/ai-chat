/**
 * @fileoverview セッション管理カスタムフック
 * @module hooks/useSession
 * @description
 * ブラウザのsessionStorageを使用してセッションIDを管理する。
 * セッションIDはUUID v4形式で自動生成され、ブラウザを閉じるまで保持される。
 */

'use client';

import { useSyncExternalStore, useCallback } from 'react';

/** sessionStorageに保存するキー */
const SESSION_KEY = 'yumi-chat-session-id';

/**
 * sessionStorageからセッションIDを取得する
 *
 * @description
 * セッションIDが存在しない場合は新規生成してsessionStorageに保存。
 * サーバーサイドでは空文字を返す。
 *
 * @returns {string} セッションID（UUID v4形式）
 * @private
 */
function getSessionId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * ストレージイベントを購読する
 * @param {() => void} callback - ストレージ変更時に呼ばれるコールバック
 * @returns {() => void} 購読解除関数
 * @private
 */
function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

/**
 * サーバーサイドレンダリング用のスナップショット
 * @returns {string} 空文字（SSRでは常に空）
 * @private
 */
function getServerSnapshot(): string {
  return '';
}

/**
 * セッション管理カスタムフック
 *
 * @description
 * - セッションIDの取得・生成
 * - セッションの無効化（サーバーとローカル両方）
 *
 * @returns {Object} セッション管理オブジェクト
 * @returns {string} returns.sessionId - 現在のセッションID
 * @returns {() => Promise<boolean>} returns.invalidateSession - セッション無効化関数
 *
 * @example
 * ```tsx
 * function ChatContainer() {
 *   const { sessionId, invalidateSession } = useSession();
 *
 *   const handleLogout = async () => {
 *     await invalidateSession();
 *   };
 *
 *   return <div>Session: {sessionId}</div>;
 * }
 * ```
 */
export function useSession() {
  const sessionId = useSyncExternalStore(
    subscribe,
    getSessionId,
    getServerSnapshot
  );

  // セッションを無効化する関数
  const invalidateSession = useCallback(async (): Promise<boolean> => {
    if (!sessionId) return false;

    try {
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // ローカルのセッションIDを削除
        sessionStorage.removeItem(SESSION_KEY);
        // ページをリロードして新しいセッションを開始
        window.location.reload();
        return true;
      }
      return false;
    } catch {
      console.error('Failed to invalidate session');
      return false;
    }
  }, [sessionId]);

  return { sessionId, invalidateSession };
}
