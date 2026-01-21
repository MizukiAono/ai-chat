# AI チャットボット「Yumi」開発 TODO

## Phase 1: プロジェクト初期設定

- [x] Next.js プロジェクトの作成（App Router、TypeScript）
- [x] Tailwind CSS のセットアップ
- [x] ESLint / Prettier の設定
- [x] 必要なパッケージのインストール
  - [x] hono
  - [x] @hono/node-server
  - [x] prisma / @prisma/client
  - [x] mastra 関連パッケージ
  - [x] @anthropic-ai/sdk
- [x] ディレクトリ構成の作成
- [x] 環境変数ファイル（.env.local）の設定
- [x] .gitignore の更新

## Phase 2: データベース設定

- [x] MongoDB のセットアップ（ローカル or Atlas）
- [x] Prisma スキーマの作成（schema.prisma）
  - [x] Message モデルの定義
  - [x] Session モデルの定義
- [x] Prisma Client の生成
- [x] データベース接続テスト

## Phase 3: Mastra エージェント設定

- [x] Mastra の初期設定
- [x] Claude API との連携設定
- [x] Yumi キャラクター用システムプロンプトの作成
- [x] エージェントの動作確認

## Phase 4: API 実装

- [x] Hono アプリケーションの作成
- [x] Next.js App Router との統合（catch-all route）
- [x] POST /api/chat エンドポイントの実装
  - [x] リクエストのバリデーション
  - [x] セッションID の処理
  - [x] Mastra エージェントの呼び出し
  - [x] レスポンスの返却
- [x] エラーハンドリングの実装
- [x] API 動作テスト

## Phase 5: フロントエンド実装

### 5.1 レイアウト・共通設定

- [x] グローバルスタイル（globals.css）の設定
- [x] ポップなカラーパレットの定義
- [x] フォント設定
- [x] レイアウトコンポーネントの作成

### 5.2 チャットコンポーネント

- [x] ChatContainer コンポーネント
  - [x] 状態管理（メッセージ一覧、入力値、ローディング）
  - [x] セッションID の生成・管理
- [x] MessageList コンポーネント
  - [x] メッセージ一覧の表示
  - [x] 自動スクロール機能
- [x] MessageBubble コンポーネント
  - [x] ユーザーメッセージのスタイル
  - [x] Yumi メッセージのスタイル（アバター付き）
- [x] InputForm コンポーネント
  - [x] テキスト入力フィールド
  - [x] 送信ボタン
  - [x] 送信中の状態表示

### 5.3 その他のUI

- [x] ヘッダーコンポーネント
- [x] エラーメッセージ表示コンポーネント
- [x] ローディングインジケーター

### 5.4 レスポンシブ対応

- [x] モバイル表示の調整
- [x] タブレット表示の調整
- [x] 各ブレイクポイントでの動作確認

## Phase 6: セッション管理

- [x] セッションID の生成ロジック
- [x] ブラウザストレージ（sessionStorage）でのセッション管理
- [x] ブラウザクローズ時のセッション破棄確認
- [x] セッションごとの会話履歴管理

## Phase 7: アセット配置

- [ ] Yumi アバター画像（avatar.jpg）の配置
- [ ] ファビコンの設定（必要に応じて）
- [ ] OGP画像の設定（必要に応じて）

## Phase 8: テスト

- [x] Jest / React Testing Library のセットアップ
- [x] ユニットテスト
  - [x] API エンドポイントのテスト
  - [x] コンポーネントのテスト
  - [x] ユーティリティ関数のテスト
- [x] 統合テスト
  - [x] チャット送受信の E2E テスト（Playwright MCP で実施）
- [x] 手動テスト
  - [x] 正常系シナリオ（メッセージ送受信、会話継続）
  - [x] 異常系シナリオ（APIエラー時のエラーメッセージ表示・閉じる機能）
  - [x] レスポンシブ表示確認（モバイル390x844、タブレット768x1024、PC1280x800）

## Phase 9: デプロイ準備

- [x] Dockerfile の作成
- [x] .dockerignore の作成
- [x] docker-compose.yml の作成（ローカル開発用）
- [x] 本番用環境変数の整理
- [x] ビルドテスト（npm run build / docker build 成功、イメージサイズ: 244MB）

## Phase 10: Google Cloud デプロイ

- [x] Google Cloud プロジェクトの作成（yumi-chat-app-484918）
- [x] Cloud Run サービスの設定
- [x] シークレットマネージャーで環境変数を設定
  - [x] ANTHROPIC_API_KEY
  - [x] DATABASE_URL（MongoDB Atlas）
- [x] コンテナイメージのビルド・プッシュ（Cloud Build 使用）
- [x] Cloud Run へのデプロイ
- [x] 動作確認
  - [x] サービスURL: https://yumi-chat-298052682255.asia-northeast1.run.app
  - [x] Health API: 正常動作確認済み
  - [x] Chat API: 正常動作確認済み
- [ ] カスタムドメインの設定（必要に応じて）

## Phase 11: 運用準備

- [x] README.md の作成
- [x] ログ監視の設定
- [x] エラー監視の設定（必要に応じて）

---

## 残タスク（コードレビューで発見）

### セキュリティ強化（優先度: HIGH）

- [x] 入力バリデーション強化
  - [x] メッセージ長の上限チェック（例: 2000文字）
  - [x] 空白のみのメッセージの拒否（trimmedMessage.length === 0 は実装済み）
- [x] CORS設定の追加（Honoミドルウェア）
- [x] fetchのタイムアウト設定（AbortController使用、30秒推奨）

### エラーハンドリング改善（優先度: HIGH）

- [x] Mastra/Claude API固有のエラー分類
  - [x] 429 Rate Limit エラーの処理
  - [x] 401 認証エラーの処理
  - [x] ネットワークタイムアウトの処理
- [x] JSONパースエラーの処理（クライアント側）
- [x] sessionStorage容量超過時の警告表示

### テストカバレッジ拡充（優先度: HIGH）

- [x] ChatContainer.tsx の統合テスト
- [x] MessageList.tsx のスクロール動作テスト
- [x] Header.tsx のレンダリングテスト
- [x] APIエラーケースのテスト追加
  - [x] タイムアウト
  - [x] ネットワークエラー
  - [x] Mastraエージェントがnullを返した場合

### アクセシビリティ改善（優先度: MEDIUM）

- [x] メッセージバブルにrole="article"とaria-label追加
- [x] ローディングインジケーターにrole="status"とaria-live="polite"追加
- [x] テキストエリアにaria-describedby追加（ヘルプテキスト用）
- [x] 色のみに依存しないエラー表示（アイコン併用）

### データベース永続化（優先度: MEDIUM）

- [x] POST /api/chat でメッセージをDBに保存
- [x] GET /api/chat/{sessionId} エンドポイント追加（会話履歴取得）
- [x] セッション有効期限の管理（例: 24時間）
- [x] データベース永続化のテスト追加
  - [x] POST /api/chat でメッセージがDBに保存されることのテスト
  - [x] GET /api/chat/{sessionId} で会話履歴が取得できることのテスト
  - [x] セッションが存在しない場合に空配列が返ることのテスト
  - [x] セッション有効期限切れ時にデータが削除されることのテスト

### セキュリティ強化（優先度: HIGH）

- [x] セキュリティヘッダーの設定（next.config.ts）
  - [x] X-Content-Type-Options: nosniff
  - [x] X-Frame-Options: DENY
  - [x] X-XSS-Protection: 1; mode=block
  - [x] Referrer-Policy: strict-origin-when-cross-origin
  - [x] Content-Security-Policy（必要に応じて）
- [x] サーバー側レート制限の実装
  - [x] IPベースまたはセッションベースのレート制限
  - [x] Redis または メモリベースのカウンター
  - [x] 制限超過時の 429 レスポンス
- [x] sessionId の形式バリデーション追加（UUID形式チェック）

### セキュリティ強化（優先度: MEDIUM）

- [x] CSRF トークンの実装（Honoの組み込みCSRFミドルウェアを使用）
- [x] 本番環境の ALLOWED_ORIGINS を環境変数から動的に設定
- [x] セッション無効化エンドポイントの実装（DELETE /api/session/:sessionId）

### パフォーマンス改善（優先度: LOW）

- [x] メッセージリストの仮想化（react-window等）
- [ ] 画像のCDN配置検討
- [x] useCallbackの依存配列最適化

### ドキュメント整備（優先度: LOW）

- [x] コード内JSDocコメント追加
- [x] APIリファレンスドキュメント作成
- [x] セットアップガイド（MongoDB、環境変数）
- [x] アーキテクチャ図

---

## 完了基準

- [x] ローカル環境でチャットが正常に動作する
- [x] Yumi がキャラクター設定通りの口調で応答する
- [x] ブラウザを閉じると会話履歴がリセットされる
- [x] モバイル・PC 両方で正常に表示される
- [x] Cloud Run にデプロイされ、外部からアクセス可能
- [x] エラー時に適切なメッセージが表示される
