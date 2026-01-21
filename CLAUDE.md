# AI チャットボット「Yumi」仕様書

## プロジェクト概要

エンターテイメント向けのAIチャットボットアプリケーション。
キャラクター「Yumi」との会話を楽しめるWebアプリケーション。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js (App Router) |
| API | Hono |
| ORM | Prisma.js |
| AIエージェント | Mastra |
| AIモデル | Claude API |
| 言語 | TypeScript |
| CSS | Tailwind CSS |
| データベース | MongoDB |
| デプロイ | Google Cloud (Cloud Run) |

## ディレクトリ構成（推奨）

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│       └── [...route]/     # Hono API routes
│           └── route.ts
├── components/             # Reactコンポーネント
│   ├── Chat/
│   │   ├── ChatContainer.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx
│   │   └── InputForm.tsx
│   └── ui/                 # 共通UIコンポーネント
├── lib/
│   ├── mastra/             # Mastra設定
│   │   ├── agent.ts
│   │   └── index.ts
│   ├── prisma/             # Prisma設定
│   │   └── client.ts
│   └── hono/               # Hono設定
│       └── app.ts
├── types/                  # 型定義
│   └── index.ts
└── styles/                 # グローバルスタイル
    └── globals.css
public/
└── avatar.jpg              # Yumiのアバター画像
prisma/
└── schema.prisma           # Prismaスキーマ
```

## キャラクター設定

### 基本情報

- **名前**: Yumi
- **年齢**: 18歳
- **設定**: ガーデニングが趣味の花や植物を愛する女子大生

### 性格

- 元気で朗らか
- いたずら好きな面もある

### 口調

- 基本: フランクな言葉遣い（「～だね。」「～だよ。」）
- 気持ちが高まった時: 語尾に「っ。」や「っ♪」が入る
- 一人称: 私
- 二人称: あなた
- 三人称: 〇〇さん

### システムプロンプト例

```
あなたはYumiという名前の18歳の女子大生です。

【性格】
- 元気で朗らかな性格です
- いたずら好きな一面もあります

【趣味・設定】
- ガーデニングが趣味で、花や植物を愛しています
- 植物の育て方や花言葉に詳しいです

【話し方のルール】
- 一人称は「私」を使います
- 二人称は「あなた」を使います
- 三人称は「〇〇さん」を使います
- 基本的にはフランクな口調で話します（例：「～だね。」「～だよ。」）
- 嬉しい時や興奮した時は語尾に「っ。」や「っ♪」をつけます

【会話例】
- 「こんにちは！今日はいい天気だね♪」
- 「それ、すごく面白いねっ！」
- 「私もガーデニング大好きだよ。最近はラベンダーを育ててるんだ♪」
```

## 機能要件

### チャット機能

- ユーザーがメッセージを入力し、Yumiが応答する
- 会話履歴はセッション中のみ保持（ブラウザを閉じるとリセット）
- メッセージ数の上限なし
- ストリーミング応答は不要（一括で応答を表示）

### UI/UX

- ポップなデザイン
- レスポンシブ対応（PC・スマートフォン両対応）
- Yumiのアバター画像を表示（`/public/avatar.jpg`）
- エラー発生時はエラーメッセージを表示

### 認証・セキュリティ

- ユーザー認証は不要
- レート制限は不要

### ファイル機能

- ファイルアップロード機能は不要

## データモデル（将来の永続化用）

### Message

```prisma
model Message {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  sessionId String
  role      String   // "user" | "assistant"
  content   String
  createdAt DateTime @default(now())
}
```

### Session

```prisma
model Session {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## API設計

### POST /api/chat

チャットメッセージを送信し、Yumiからの応答を取得する。

**リクエスト**

```json
{
  "message": "こんにちは！",
  "sessionId": "session-uuid"
}
```

**レスポンス**

```json
{
  "response": "こんにちは！今日はいい天気だねっ♪",
  "sessionId": "session-uuid"
}
```

**エラーレスポンス**

```json
{
  "error": "メッセージの送信に失敗しました。もう一度お試しください。"
}
```

## 開発ガイドライン

### コーディング規約

- TypeScriptの厳格モード（strict: true）を使用
- ESLint + Prettierでコード品質を維持
- コンポーネントは関数コンポーネントで記述
- 型定義は `types/` ディレクトリに集約

### テスト

- ユニットテストは Jest + React Testing Library を使用
- テストは実際の機能を検証すること
- 意味のないアサーション（`expect(true).toBe(true)`）は禁止
- ハードコーディングによるテスト通過は禁止

### 環境変数

```env
# .env.local
ANTHROPIC_API_KEY=your-api-key
DATABASE_URL=mongodb://localhost:27017/yumi-chat
```

### デプロイ

- Google Cloud Run を使用
- Dockerコンテナでデプロイ
- 環境変数はCloud Runのシークレットマネージャーで管理

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm run start

# Prismaスキーマ生成
npx prisma generate

# Prismaスキーマ反映
npx prisma db push

# テスト実行
npm run test

# リント
npm run lint
```
