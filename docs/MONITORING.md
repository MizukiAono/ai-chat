# モニタリングガイド

AI チャットボット「Yumi」のログ監視・エラー監視の設定手順。

## 目次

- [概要](#概要)
- [ログ監視（Cloud Logging）](#ログ監視cloud-logging)
- [エラー監視（Cloud Error Reporting）](#エラー監視cloud-error-reporting)
- [アラート設定](#アラート設定)
- [ダッシュボード作成](#ダッシュボード作成)
- [ローカル開発時のログ](#ローカル開発時のログ)

---

## 概要

本アプリケーションは Google Cloud Run にデプロイされており、以下の Google Cloud サービスでモニタリングを行います。

| サービス | 用途 |
|---------|------|
| Cloud Logging | ログの収集・検索・分析 |
| Cloud Error Reporting | エラーの自動検出・グルーピング |
| Cloud Monitoring | メトリクス監視・アラート |

---

## ログ監視（Cloud Logging）

Cloud Run にデプロイされたアプリケーションのログは自動的に Cloud Logging に送信されます。

### ログの確認方法

#### Google Cloud Console

1. [Cloud Console](https://console.cloud.google.com/) にアクセス
2. **Logging** > **ログ エクスプローラ** を選択
3. リソースで **Cloud Run リビジョン** > **yumi-chat** を選択

#### gcloud CLI

```bash
# 最新のログを表示
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=yumi-chat" \
  --limit=50 \
  --format="table(timestamp,textPayload)"

# エラーログのみ表示
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=yumi-chat AND severity>=ERROR" \
  --limit=50

# リアルタイムでログを監視
gcloud beta run services logs tail yumi-chat --region=asia-northeast1
```

### ログフィルタの例

```
# チャット API のログのみ
resource.type="cloud_run_revision"
resource.labels.service_name="yumi-chat"
httpRequest.requestUrl="/api/chat"

# 500 エラーのみ
resource.type="cloud_run_revision"
resource.labels.service_name="yumi-chat"
httpRequest.status>=500

# 特定のセッション ID のログ
resource.type="cloud_run_revision"
resource.labels.service_name="yumi-chat"
jsonPayload.sessionId="550e8400-e29b-41d4-a716-446655440000"
```

### ログの構造

アプリケーションは以下の形式でログを出力します。

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Chat request received",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "requestId": "abc123"
}
```

---

## エラー監視（Cloud Error Reporting）

Cloud Error Reporting は、アプリケーションのエラーを自動的に検出・グルーピングします。

### 有効化

Cloud Error Reporting は Cloud Logging と連携して自動的に動作します。追加の設定は不要です。

### エラーの確認方法

1. [Cloud Console](https://console.cloud.google.com/) にアクセス
2. **Error Reporting** を選択
3. サービス一覧から **yumi-chat** を選択

### エラー通知の設定

1. **Error Reporting** > **設定** を開く
2. **通知** タブを選択
3. **通知チャンネルを追加** をクリック
4. 以下から選択:
   - メール
   - Slack
   - PagerDuty
   - Webhook

#### Slack 通知の設定例

```bash
# Slack Incoming Webhook を Cloud Console で設定
# 1. Error Reporting > 設定 > 通知
# 2. Slack チャンネルを追加
# 3. Webhook URL を入力
```

---

## アラート設定

Cloud Monitoring でアラートポリシーを設定し、問題が発生した際に通知を受け取ります。

### 推奨アラート

#### 1. 高エラー率アラート

```yaml
# 5分間でエラー率が10%を超えた場合に通知
displayName: "Yumi Chat - High Error Rate"
conditions:
  - displayName: "Error rate > 10%"
    conditionThreshold:
      filter: >
        resource.type="cloud_run_revision"
        AND resource.labels.service_name="yumi-chat"
        AND metric.type="run.googleapis.com/request_count"
        AND metric.labels.response_code_class="5xx"
      aggregations:
        - alignmentPeriod: 300s
          perSeriesAligner: ALIGN_RATE
      comparison: COMPARISON_GT
      thresholdValue: 0.1
      duration: 300s
notificationChannels:
  - projects/PROJECT_ID/notificationChannels/CHANNEL_ID
```

#### 2. レイテンシアラート

```yaml
# 95%タイルのレイテンシが5秒を超えた場合に通知
displayName: "Yumi Chat - High Latency"
conditions:
  - displayName: "P95 latency > 5s"
    conditionThreshold:
      filter: >
        resource.type="cloud_run_revision"
        AND resource.labels.service_name="yumi-chat"
        AND metric.type="run.googleapis.com/request_latencies"
      aggregations:
        - alignmentPeriod: 300s
          perSeriesAligner: ALIGN_PERCENTILE_95
      comparison: COMPARISON_GT
      thresholdValue: 5000
      duration: 300s
```

#### 3. インスタンス数アラート

```yaml
# インスタンス数が上限に近づいた場合に通知
displayName: "Yumi Chat - Instance Count Warning"
conditions:
  - displayName: "Instance count > 80% of max"
    conditionThreshold:
      filter: >
        resource.type="cloud_run_revision"
        AND resource.labels.service_name="yumi-chat"
        AND metric.type="run.googleapis.com/container/instance_count"
      comparison: COMPARISON_GT
      thresholdValue: 8  # 最大10インスタンスの場合
```

### gcloud CLI でのアラート作成

```bash
# アラートポリシーを作成
gcloud alpha monitoring policies create --policy-from-file=alert-policy.yaml

# 既存のアラートポリシーを一覧表示
gcloud alpha monitoring policies list
```

---

## ダッシュボード作成

### 推奨メトリクス

| メトリクス | 説明 |
|-----------|------|
| Request count | リクエスト数（ステータスコード別） |
| Request latencies | レスポンス時間（P50, P95, P99） |
| Container instance count | 実行中のインスタンス数 |
| Container CPU utilization | CPU 使用率 |
| Container memory utilization | メモリ使用率 |
| Billable instance time | 課金対象のインスタンス時間 |

### ダッシュボードの作成

```bash
# ダッシュボードを作成
gcloud monitoring dashboards create --config-from-file=dashboard.json
```

#### dashboard.json の例

```json
{
  "displayName": "Yumi Chat Dashboard",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Count",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"yumi-chat\" AND metric.type=\"run.googleapis.com/request_count\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Latency (P95)",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"yumi-chat\" AND metric.type=\"run.googleapis.com/request_latencies\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_PERCENTILE_95"
                  }
                }
              }
            }]
          }
        }
      }
    ]
  }
}
```

---

## ローカル開発時のログ

### 開発サーバーのログ

```bash
# 開発サーバーを起動（ログは標準出力に表示）
npm run dev

# ログレベルを設定（オプション）
DEBUG=* npm run dev
```

### Docker 環境のログ

```bash
# docker-compose のログを確認
docker-compose logs -f app

# 特定のコンテナのログ
docker logs -f yumi-chat-app-1

# ログを JSON 形式で出力
docker-compose logs --no-color | jq -R 'fromjson?'
```

### ログ出力のベストプラクティス

1. **構造化ログを使用**: JSON 形式でログを出力
2. **ログレベルを適切に設定**: error, warn, info, debug を使い分け
3. **リクエスト ID を付与**: トレーサビリティのため
4. **機密情報を出力しない**: API キー、パスワードなど

```typescript
// 推奨されるログ出力例
console.log(JSON.stringify({
  level: 'info',
  message: 'Chat request processed',
  sessionId: sessionId,
  responseTime: Date.now() - startTime,
  timestamp: new Date().toISOString()
}));
```

---

## 関連ドキュメント

- [セットアップガイド](./SETUP.md)
- [API リファレンス](./API.md)
- [Google Cloud Logging ドキュメント](https://cloud.google.com/logging/docs)
- [Cloud Error Reporting ドキュメント](https://cloud.google.com/error-reporting/docs)
- [Cloud Monitoring ドキュメント](https://cloud.google.com/monitoring/docs)
