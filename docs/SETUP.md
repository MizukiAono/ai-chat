# セットアップガイド

AI チャットボット「Yumi」の開発環境・本番環境のセットアップ手順。

## 目次

- [必要条件](#必要条件)
- [クイックスタート](#クイックスタート)
- [環境変数の設定](#環境変数の設定)
- [MongoDB のセットアップ](#mongodb-のセットアップ)
- [開発サーバーの起動](#開発サーバーの起動)
- [Docker での起動](#docker-での起動)
- [本番環境へのデプロイ](#本番環境へのデプロイ)
- [トラブルシューティング](#トラブルシューティング)

---

## 必要条件

### ソフトウェア

| ソフトウェア | バージョン | 用途 |
|-------------|-----------|------|
| Node.js | 20.x 以上 | ランタイム |
| npm | 10.x 以上 | パッケージ管理 |
| MongoDB | 7.x 以上 | データベース |
| Docker (任意) | 24.x 以上 | コンテナ実行 |

### APIキー

| サービス | 取得先 |
|---------|--------|
| Anthropic API | https://console.anthropic.com/ |

---

## クイックスタート

```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd ai-chat

# 2. 依存パッケージをインストール
npm install

# 3. 環境変数ファイルを作成
cp .env.example .env.local

# 4. .env.local を編集して API キーを設定
# ANTHROPIC_API_KEY=your-actual-api-key

# 5. Prisma クライアントを生成
npx prisma generate

# 6. 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 を開くとチャット画面が表示されます。

---

## 環境変数の設定

### .env.local ファイル

`.env.example` をコピーして `.env.local` を作成し、以下の変数を設定します。

```bash
cp .env.example .env.local
```

### 必須変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `ANTHROPIC_API_KEY` | Anthropic API キー | `sk-ant-api03-xxxxx` |
| `DATABASE_URL` | MongoDB 接続文字列 | `mongodb://localhost:27017/yumi-chat` |

### オプション変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `PORT` | サーバーポート | `3000` |
| `NODE_ENV` | 環境名 | `development` |
| `ALLOWED_ORIGINS` | CORS許可オリジン（カンマ区切り） | `http://localhost:3000` |
| `E2E_TEST_MOCK_API` | E2Eテスト時にAPIをモック | `false` |

### 環境変数の例

#### ローカル開発

```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
DATABASE_URL=mongodb://localhost:27017/yumi-chat
```

#### Docker Compose

```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
DATABASE_URL=mongodb://mongodb:27017/yumi-chat
```

#### MongoDB Atlas

```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/yumi-chat?retryWrites=true&w=majority
```

#### 本番環境

```env
NODE_ENV=production
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/yumi-chat
ALLOWED_ORIGINS=https://yumi-chat.example.com
```

---

## MongoDB のセットアップ

### オプション 1: ローカル MongoDB

#### macOS (Homebrew)

```bash
# MongoDB をインストール
brew tap mongodb/brew
brew install mongodb-community@7.0

# MongoDB を起動
brew services start mongodb-community@7.0

# 接続確認
mongosh
```

#### Windows

1. [MongoDB Community Server](https://www.mongodb.com/try/download/community) からインストーラをダウンロード
2. インストーラを実行（「Install MongoDB as a Service」にチェック）
3. MongoDB Compass も一緒にインストール推奨

#### Linux (Ubuntu/Debian)

```bash
# GPG キーをインポート
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# リポジトリを追加
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# インストール
sudo apt-get update
sudo apt-get install -y mongodb-org

# 起動
sudo systemctl start mongod
sudo systemctl enable mongod
```

### オプション 2: Docker

```bash
# MongoDB コンテナを起動
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:7

# 停止
docker stop mongodb

# 再開
docker start mongodb
```

### オプション 3: MongoDB Atlas（クラウド）

1. [MongoDB Atlas](https://www.mongodb.com/atlas/database) でアカウント作成
2. 新しいクラスターを作成（無料枠あり）
3. Database Access でユーザーを作成
4. Network Access で IP アドレスを許可（`0.0.0.0/0` で全許可）
5. Connect → Drivers → Node.js を選択して接続文字列を取得

接続文字列の例：
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/yumi-chat?retryWrites=true&w=majority
```

### データベースの初期化

Prisma を使用してスキーマを MongoDB に適用します：

```bash
# Prisma クライアントを生成
npx prisma generate

# データベースにスキーマを同期（MongoDB は自動でコレクションを作成）
npx prisma db push
```

---

## 開発サーバーの起動

```bash
# 依存パッケージをインストール（初回のみ）
npm install

# Prisma クライアントを生成（初回または schema.prisma 変更時）
npx prisma generate

# 開発サーバーを起動
npm run dev
```

http://localhost:3000 でアプリケーションにアクセスできます。

### 利用可能なコマンド

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバーを起動（ホットリロード有効） |
| `npm run build` | 本番用ビルド |
| `npm run start` | 本番サーバーを起動 |
| `npm run lint` | ESLint でコードチェック |
| `npm run test` | Jest でユニットテスト実行 |
| `npm run test:e2e` | Playwright で E2E テスト実行 |

---

## Docker での起動

### docker-compose を使用（推奨）

```bash
# .env ファイルを作成（ANTHROPIC_API_KEY を設定）
echo "ANTHROPIC_API_KEY=your-api-key" > .env
echo "DATABASE_URL=mongodb://mongodb:27017/yumi-chat" >> .env

# ビルドして起動
docker-compose up -d

# ログを確認
docker-compose logs -f app

# 停止
docker-compose down

# データも含めて削除
docker-compose down -v
```

### 単独の Docker コンテナ

```bash
# イメージをビルド
docker build -t yumi-chat .

# コンテナを起動
docker run -d \
  --name yumi-chat \
  -p 3000:3000 \
  -e ANTHROPIC_API_KEY=your-api-key \
  -e DATABASE_URL=mongodb://host.docker.internal:27017/yumi-chat \
  yumi-chat
```

---

## 本番環境へのデプロイ

### Google Cloud Run

1. **Google Cloud プロジェクトを作成**

```bash
# gcloud CLI をインストール・認証
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

2. **Artifact Registry にイメージをプッシュ**

```bash
# Artifact Registry を有効化
gcloud services enable artifactregistry.googleapis.com

# リポジトリを作成
gcloud artifacts repositories create yumi-chat \
  --repository-format=docker \
  --location=asia-northeast1

# イメージをビルド・プッシュ
gcloud builds submit --tag asia-northeast1-docker.pkg.dev/YOUR_PROJECT_ID/yumi-chat/app
```

3. **Secret Manager で環境変数を設定**

```bash
# Secret Manager を有効化
gcloud services enable secretmanager.googleapis.com

# シークレットを作成
echo -n "your-anthropic-api-key" | gcloud secrets create ANTHROPIC_API_KEY --data-file=-
echo -n "mongodb+srv://..." | gcloud secrets create DATABASE_URL --data-file=-
```

4. **Cloud Run にデプロイ**

```bash
gcloud run deploy yumi-chat \
  --image asia-northeast1-docker.pkg.dev/YOUR_PROJECT_ID/yumi-chat/app \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-secrets ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,DATABASE_URL=DATABASE_URL:latest \
  --set-env-vars NODE_ENV=production,ALLOWED_ORIGINS=https://your-domain.com
```

---

## トラブルシューティング

### MongoDB に接続できない

**症状**: `MongoNetworkError` または `ECONNREFUSED`

**対処法**:
1. MongoDB サービスが起動しているか確認
   ```bash
   # macOS
   brew services list
   # Linux
   sudo systemctl status mongod
   ```
2. 接続文字列が正しいか確認
3. ファイアウォールで 27017 ポートが開いているか確認

### Anthropic API エラー

**症状**: `401 Unauthorized` または `Invalid API Key`

**対処法**:
1. `.env.local` の `ANTHROPIC_API_KEY` が正しいか確認
2. API キーの先頭に余分なスペースがないか確認
3. [Anthropic Console](https://console.anthropic.com/) でキーが有効か確認

### Prisma エラー

**症状**: `Cannot find module '.prisma/client'`

**対処法**:
```bash
npx prisma generate
```

**症状**: `Error: Schema file not found`

**対処法**:
プロジェクトルートから実行しているか確認

### ポートが使用中

**症状**: `Error: listen EADDRINUSE :::3000`

**対処法**:
```bash
# macOS/Linux: ポート 3000 を使用しているプロセスを確認
lsof -i :3000

# プロセスを終了
kill -9 <PID>

# または別のポートで起動
PORT=3001 npm run dev
```

### Docker ビルドエラー

**症状**: `npm ERR! code ENOENT` (Docker ビルド中)

**対処法**:
1. `.dockerignore` に `node_modules` が含まれているか確認
2. `package-lock.json` がコミットされているか確認

---

## 関連ドキュメント

- [API リファレンス](./API.md)
- [アーキテクチャ](./ARCHITECTURE.md)
