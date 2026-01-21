# API リファレンス

AI チャットボット「Yumi」のバックエンド API ドキュメント。

## 目次

- [概要](#概要)
- [認証](#認証)
- [レート制限](#レート制限)
- [エンドポイント](#エンドポイント)
  - [POST /api/chat](#post-apichat)
  - [GET /api/chat/:sessionId](#get-apichatsessionid)
  - [DELETE /api/session/:sessionId](#delete-apisessionsessionid)
  - [GET /api/health](#get-apihealth)
- [エラーレスポンス](#エラーレスポンス)
- [型定義](#型定義)

---

## 概要

| 項目 | 値 |
|------|-----|
| ベースURL | `/api` |
| コンテンツタイプ | `application/json` |
| 文字エンコーディング | UTF-8 |

## 認証

本APIは認証不要です。セッション管理はUUID v4形式の`sessionId`で行います。

## レート制限

チャットエンドポイント（`/api/chat`）には以下のレート制限が適用されます：

| 項目 | 値 |
|------|-----|
| 時間ウィンドウ | 1分 |
| 最大リクエスト数 | 20 |

### レート制限ヘッダー

| ヘッダー | 説明 |
|---------|------|
| `X-RateLimit-Limit` | 許可される最大リクエスト数 |
| `X-RateLimit-Remaining` | 残りリクエスト数 |
| `X-RateLimit-Reset` | カウントリセットまでの秒数 |
| `Retry-After` | 制限超過時、次にリクエスト可能になるまでの秒数 |

---

## エンドポイント

### POST /api/chat

チャットメッセージを送信し、Yumiからの応答を取得します。

#### リクエスト

```http
POST /api/chat
Content-Type: application/json
```

##### リクエストボディ

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `message` | string | Yes | ユーザーメッセージ（1〜2000文字） |
| `sessionId` | string | Yes | セッションID（UUID v4形式） |

##### リクエスト例

```json
{
  "message": "こんにちは！",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### レスポンス

##### 成功時 (200 OK)

```json
{
  "response": "こんにちは！今日はいい天気だねっ♪",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `response` | string | Yumiからの応答メッセージ |
| `sessionId` | string | セッションID |

##### エラー時

| ステータス | 説明 |
|-----------|------|
| 400 | バリデーションエラー（メッセージ未入力、長さ超過、セッションID形式不正） |
| 429 | レート制限超過 |
| 500 | サーバーエラー |

---

### GET /api/chat/:sessionId

指定されたセッションの会話履歴を取得します。

#### リクエスト

```http
GET /api/chat/{sessionId}
```

##### パスパラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `sessionId` | string | Yes | セッションID（UUID v4形式） |

#### レスポンス

##### 成功時 (200 OK)

```json
{
  "messages": [
    {
      "id": "507f1f77bcf86cd799439011",
      "role": "user",
      "content": "こんにちは！",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "role": "assistant",
      "content": "こんにちは！今日はいい天気だねっ♪",
      "createdAt": "2024-01-15T10:30:01.000Z"
    }
  ],
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `messages` | Message[] | メッセージ配列（時系列順） |
| `sessionId` | string | セッションID |

##### Message オブジェクト

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `id` | string | メッセージID（MongoDB ObjectId） |
| `role` | "user" \| "assistant" | 送信者（user: ユーザー, assistant: Yumi） |
| `content` | string | メッセージ本文 |
| `createdAt` | string (ISO 8601) | 作成日時 |

##### エラー時

| ステータス | 説明 |
|-----------|------|
| 400 | セッションID形式不正 |
| 500 | サーバーエラー |

##### 備考

- セッションが存在しない場合は空の`messages`配列を返します
- セッションが有効期限切れ（24時間）の場合、データは自動削除され空配列を返します

---

### DELETE /api/session/:sessionId

セッションを無効化し、関連するメッセージをすべて削除します。

#### リクエスト

```http
DELETE /api/session/{sessionId}
```

##### パスパラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `sessionId` | string | Yes | セッションID（UUID v4形式） |

#### レスポンス

##### 成功時 (200 OK)

```json
{
  "success": true,
  "message": "セッションが無効化されました。"
}
```

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `success` | boolean | 処理成功フラグ |
| `message` | string | 処理結果メッセージ |

##### エラー時

| ステータス | 説明 |
|-----------|------|
| 400 | セッションID形式不正 |
| 500 | サーバーエラー |

##### 備考

- 存在しないセッションIDを指定した場合も成功として扱います（冪等性）

---

### GET /api/health

ヘルスチェック用エンドポイント。

#### リクエスト

```http
GET /api/health
```

#### レスポンス

##### 成功時 (200 OK)

```json
{
  "status": "ok"
}
```

---

## エラーレスポンス

### 共通エラーフォーマット

```json
{
  "error": "エラーメッセージ"
}
```

### エラーメッセージ一覧

| ステータス | メッセージ | 説明 |
|-----------|-----------|------|
| 400 | メッセージを入力してください。 | メッセージが空または未送信 |
| 400 | セッションIDが必要です。 | セッションIDが未送信 |
| 400 | セッションIDの形式が正しくありません。 | UUID v4形式でない |
| 400 | メッセージは2000文字以内で入力してください。 | メッセージが長すぎる |
| 400 | リクエストの形式が正しくありません。 | JSONパースエラー |
| 429 | リクエストが多すぎます。しばらく待ってからもう一度お試しください。 | レート制限超過 |
| 429 | リクエスト数が制限を超えました。しばらく待ってから再度お試しください。 | サーバー側レート制限超過 |
| 401 | サービスの認証に問題が発生しました。管理者にお問い合わせください。 | API認証エラー |
| 500 | メッセージの送信に失敗しました。もう一度お試しください。 | 一般的なサーバーエラー |
| 503 | ネットワークエラーが発生しました。インターネット接続を確認してください。 | ネットワークエラー |

---

## 型定義

### TypeScript 型定義

```typescript
// チャットリクエスト
interface ChatRequest {
  message: string;   // 1〜2000文字
  sessionId: string; // UUID v4形式
}

// チャットレスポンス
interface ChatResponse {
  response: string;
  sessionId: string;
}

// エラーレスポンス
interface ChatErrorResponse {
  error: string;
}

// メッセージ
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

// 会話履歴レスポンス
interface ChatHistoryResponse {
  messages: Message[];
  sessionId: string;
}

// セッション無効化レスポンス
interface SessionInvalidateResponse {
  success: boolean;
  message: string;
}
```

---

## 使用例

### cURL

```bash
# メッセージ送信
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"こんにちは！","sessionId":"550e8400-e29b-41d4-a716-446655440000"}'

# 会話履歴取得
curl http://localhost:3000/api/chat/550e8400-e29b-41d4-a716-446655440000

# セッション無効化
curl -X DELETE http://localhost:3000/api/session/550e8400-e29b-41d4-a716-446655440000

# ヘルスチェック
curl http://localhost:3000/api/health
```

### JavaScript (fetch)

```javascript
// メッセージ送信
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'こんにちは！',
    sessionId: crypto.randomUUID(),
  }),
});
const data = await response.json();
console.log(data.response);

// 会話履歴取得
const history = await fetch(`/api/chat/${sessionId}`).then(r => r.json());
console.log(history.messages);
```
