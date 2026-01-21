# Yumi - AI チャットボット

ガーデニングが趣味の元気な女子大生「Yumi」と会話を楽しめる AI チャットボットアプリケーション。

## 特徴

- キャラクター設定に基づいた自然な会話
- レスポンシブデザイン（PC・モバイル対応）
- セッションベースの会話管理
- ブラウザを閉じると会話履歴リセット

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS |
| API | Hono |
| ORM | Prisma |
| AI | Mastra + Claude API |
| データベース | MongoDB |
| インフラ | Docker, Google Cloud Run |

## クイックスタート

### 必要条件

- Node.js 20.x 以上
- npm 10.x 以上
- MongoDB 7.x 以上
- Anthropic API キー

### インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd ai-chat

# 依存パッケージをインストール
npm install

# 環境変数ファイルを作成
cp .env.example .env.local

# .env.local を編集して API キーを設定
# ANTHROPIC_API_KEY=your-api-key
# DATABASE_URL=mongodb://localhost:27017/yumi-chat

# Prisma クライアントを生成
npx prisma generate

# 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 を開くとチャット画面が表示されます。

## 開発コマンド

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | 本番用ビルド |
| `npm run start` | 本番サーバーを起動 |
| `npm run lint` | ESLint でコードチェック |
| `npm run format` | Prettier でフォーマット |
| `npm run test` | Jest でユニットテスト実行 |
| `npm run test:e2e` | Playwright で E2E テスト実行 |

## Docker での起動

```bash
# 環境変数を設定
echo "ANTHROPIC_API_KEY=your-api-key" > .env
echo "DATABASE_URL=mongodb://mongodb:27017/yumi-chat" >> .env

# ビルドして起動
docker-compose up -d

# ログを確認
docker-compose logs -f app
```

## プロジェクト構成

```
src/
├── app/                 # Next.js App Router
│   ├── api/             # API ルート (Hono)
│   ├── globals.css      # グローバルスタイル
│   ├── layout.tsx       # ルートレイアウト
│   └── page.tsx         # メインページ
├── components/          # React コンポーネント
│   ├── Chat/            # チャット関連
│   └── ui/              # 共通 UI
├── hooks/               # カスタムフック
├── lib/                 # ライブラリ・ユーティリティ
│   ├── hono/            # Hono 設定
│   ├── mastra/          # Mastra エージェント
│   └── prisma/          # Prisma クライアント
└── types/               # 型定義
```

## API エンドポイント

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| POST | `/api/chat` | メッセージ送信 |
| GET | `/api/chat/:sessionId` | 会話履歴取得 |
| DELETE | `/api/session/:sessionId` | セッション無効化 |
| GET | `/api/health` | ヘルスチェック |

詳細は [API リファレンス](docs/API.md) を参照してください。

## ドキュメント

- [セットアップガイド](docs/SETUP.md) - 環境構築の詳細手順
- [API リファレンス](docs/API.md) - API の詳細仕様
- [アーキテクチャ](docs/ARCHITECTURE.md) - システム構成と設計

## デプロイ

本アプリケーションは Google Cloud Run にデプロイされています。

```bash
# Cloud Build でビルド・プッシュ
gcloud builds submit --tag asia-northeast1-docker.pkg.dev/PROJECT_ID/yumi-chat/app

# Cloud Run にデプロイ
gcloud run deploy yumi-chat \
  --image asia-northeast1-docker.pkg.dev/PROJECT_ID/yumi-chat/app \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated
```

詳細は [セットアップガイド](docs/SETUP.md#本番環境へのデプロイ) を参照してください。

## 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API キー |
| `DATABASE_URL` | Yes | MongoDB 接続文字列 |
| `ALLOWED_ORIGINS` | No | CORS 許可オリジン（カンマ区切り） |
| `NODE_ENV` | No | 環境名（production / development） |

## ライセンス

Private - All rights reserved
