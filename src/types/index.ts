/**
 * @fileoverview AI チャットボット「Yumi」の型定義
 * @module types
 */

// ============================================================================
// Chat API Types
// ============================================================================

/**
 * チャットAPIへのリクエストボディ
 * @interface ChatRequest
 */
export interface ChatRequest {
  /** ユーザーが送信するメッセージ（最大2000文字） */
  message: string;
  /** セッション識別子（UUID v4形式） */
  sessionId: string;
}

/**
 * チャットAPIからの成功レスポンス
 * @interface ChatResponse
 */
export interface ChatResponse {
  /** Yumiからの応答メッセージ */
  response: string;
  /** セッション識別子 */
  sessionId: string;
}

/**
 * チャットAPIからのエラーレスポンス
 * @interface ChatErrorResponse
 */
export interface ChatErrorResponse {
  /** ユーザー向けエラーメッセージ */
  error: string;
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * チャットメッセージの型定義
 * @interface Message
 */
export interface Message {
  /** メッセージの一意識別子 */
  id: string;
  /** メッセージの送信者（'user': ユーザー, 'assistant': Yumi） */
  role: 'user' | 'assistant';
  /** メッセージ本文 */
  content: string;
  /** メッセージ作成日時 */
  createdAt: Date;
}

// ============================================================================
// Chat History Types
// ============================================================================

/**
 * 会話履歴取得APIのレスポンス
 * @interface ChatHistoryResponse
 */
export interface ChatHistoryResponse {
  /** セッション内のメッセージ一覧（時系列順） */
  messages: Message[];
  /** セッション識別子 */
  sessionId: string;
}

// ============================================================================
// Session Types
// ============================================================================

/**
 * セッション無効化APIのレスポンス
 * @interface SessionInvalidateResponse
 */
export interface SessionInvalidateResponse {
  /** 無効化成功フラグ */
  success: boolean;
  /** 処理結果メッセージ */
  message: string;
}
