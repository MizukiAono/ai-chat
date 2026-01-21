import { test, expect } from '@playwright/test';

test.describe('Yumi Chat E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // APIモック
    if (process.env.E2E_TEST_MOCK_API === 'true') {
      await page.route('**/api/chat', async (route) => {
        const request = route.request();
        const postData = request.postDataJSON();

        // リクエスト内容に応じてレスポンスを切り替える
        let mockResponse = "こんにちは！今日はいい天気だねっ♪";
        if (postData.message.includes('ガーデニング')) {
          mockResponse = "ガーデニングなら、今はパンジーがおすすめだよ！";
        }

        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            response: mockResponse,
            sessionId: postData.sessionId || 'mock-session-id'
          }),
        });
      });
    }
  });

  test.describe('正常系シナリオ', () => {
    test('ページが正しく読み込まれる', async ({ page }) => {
      await page.goto('/');

      // ヘッダーの確認
      await expect(page.getByRole('heading', { name: 'Yumi', exact: true })).toBeVisible();
      await expect(
        page.getByText('ガーデニング好きな女子大生')
      ).toBeVisible();

      // 初期メッセージの確認
      await expect(
        page.getByText('Yumiとおしゃべりしよう！')
      ).toBeVisible();

      // 入力フォームの確認
      await expect(
        page.getByRole('textbox', { name: 'メッセージを入力...', exact: true })
      ).toBeVisible();
      await expect(page.getByRole('button', { name: '送信', exact: true })).toBeDisabled();
    });

    test('メッセージを入力すると送信ボタンが有効になる', async ({ page }) => {
      await page.goto('/');

      const input = page.getByRole('textbox', { name: 'メッセージを入力...', exact: true });
      const sendButton = page.getByRole('button', { name: '送信', exact: true });

      // 初期状態では送信ボタンは無効
      await expect(sendButton).toBeDisabled();

      // メッセージを入力
      await input.fill('こんにちは');

      // 送信ボタンが有効になる
      await expect(sendButton).toBeEnabled();

      // メッセージをクリア
      await input.fill('');

      // 送信ボタンが再び無効になる
      await expect(sendButton).toBeDisabled();
    });

    test('会話の送受信と継続ができる', async ({ page }) => {
      await page.goto('/');

      const input = page.getByRole('textbox', { name: 'メッセージを入力...', exact: true });
      const sendButton = page.getByRole('button', { name: '送信', exact: true });

      // --- 1回目の送信 ---
      await input.fill('こんにちは！');
      await sendButton.click();

      // 1通目の応答を待つ（ここが「応答する」の検証を兼ねる）
      await expect(async () => {
        // header にアバターがあるため、1通目の応答後のアバターの合計は 2個
        const yumiAvatars = page.getByRole('img', { name: 'Yumi', exact: true });
        await expect(yumiAvatars).toHaveCount(2, { timeout: 1000 });

        await expect(page.getByText('こんにちは！今日はいい天気だねっ♪', { exact: true })).toBeVisible();
      }).toPass({ timeout: 30000 });

      // --- 2回目の送信（継続性の確認） ---
      await input.fill('ガーデニングについて教えて');
      await sendButton.click();

      // 2通目の応答を待つ
      await expect(async () => {
        // header にアバターがあるため、2通目の応答後のアバターの合計は 3個
        const yumiAvatars = page.getByRole('img', { name: 'Yumi', exact: true });
        await expect(yumiAvatars).toHaveCount(3, { timeout: 1000 });

        await expect(page.getByText('ガーデニングなら、今はパンジーがおすすめだよ！', { exact: true })).toBeVisible();
      }).toPass({ timeout: 30000 });

      // 最後にユーザーメッセージ履歴が正しく表示されているか確認
      await expect(page.getByText('こんにちは！', { exact: true })).toBeVisible();
      await expect(page.getByText('ガーデニングについて教えて', { exact: true })).toBeVisible();
    });
  });

  test.describe('異常系シナリオ', () => {
    test('APIエラー時にエラーメッセージが表示される', async ({ page }) => {
      await page.goto('/');

      // fetchをモックしてエラーを返す
      await page.evaluate(() => {
        const originalFetch = window.fetch;
        window.fetch = async (url, options) => {
          if (url === '/api/chat') {
            return new Response(
              JSON.stringify({
                error: 'テスト用エラー: サーバーに接続できません',
              }),
              {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }
          return originalFetch(url, options);
        };
      });

      const input = page.getByRole('textbox', { name: 'メッセージを入力...', exact: true });
      const sendButton = page.getByRole('button', { name: '送信', exact: true });

      // メッセージを送信
      await input.fill('エラーテスト');
      await sendButton.click();

      // エラーメッセージが表示される
      await expect(
        page.getByText('テスト用エラー: サーバーに接続できません')
      ).toBeVisible();

      // 閉じるボタンをクリック
      await page.getByRole('button', { name: '閉じる', exact: true }).click();

      // エラーメッセージが消える
      await expect(
        page.getByText('テスト用エラー: サーバーに接続できません')
      ).not.toBeVisible();
    });
  });

  test.describe('レスポンシブ表示', () => {
    test('モバイル表示で正しくレイアウトされる', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/');

      // 主要な要素が表示されている
      await expect(
        page.getByRole('heading', { name: 'Yumi', exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole('textbox', { name: 'メッセージを入力...', exact: true })
      ).toBeVisible();
      await expect(page.getByRole('button', { name: '送信', exact: true })).toBeVisible();

      // スクリーンショットを撮影
      await page.screenshot({ path: 'test-results/mobile-view.png' });
    });

    test('タブレット表示で正しくレイアウトされる', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');

      // 主要な要素が表示されている
      await expect(page.getByRole('heading', { name: 'Yumi', exact: true })).toBeVisible();
      await expect(
        page.getByRole('textbox', { name: 'メッセージを入力...', exact: true })
      ).toBeVisible();
      await expect(page.getByRole('button', { name: '送信', exact: true })).toBeVisible();

      // スクリーンショットを撮影
      await page.screenshot({ path: 'test-results/tablet-view.png' });
    });

    test('デスクトップ表示で正しくレイアウトされる', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/');

      // 主要な要素が表示されている
      await expect(page.getByRole('heading', { name: 'Yumi', exact: true })).toBeVisible();
      await expect(
        page.getByRole('textbox', { name: 'メッセージを入力...', exact: true })
      ).toBeVisible();
      await expect(page.getByRole('button', { name: '送信', exact: true })).toBeVisible();

      // スクリーンショットを撮影
      await page.screenshot({ path: 'test-results/desktop-view.png' });
    });
  });

  test.describe('UIインタラクション', () => {
    test('Shift+Enterで改行できる', async ({ page }) => {
      await page.goto('/');

      const input = page.getByRole('textbox', { name: 'メッセージを入力...', exact: true });

      // テキストを入力
      await input.fill('1行目');
      await input.press('Shift+Enter');
      await input.pressSequentially('2行目');

      // 改行が含まれていることを確認
      const value = await input.inputValue();
      expect(value).toContain('\n');
    });

    test('Enterキーで送信できる', async ({ page }) => {
      await page.goto('/');

      const input = page.getByRole('textbox', { name: 'メッセージを入力...', exact: true });

      // メッセージを入力してEnterで送信
      await input.fill('Enterで送信テスト');
      await input.press('Enter');

      // メッセージが表示される
      await expect(page.getByText('Enterで送信テスト')).toBeVisible();
    });
  });
});
