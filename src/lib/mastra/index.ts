/**
 * @fileoverview Mastraフレームワークの初期化とエクスポート
 * @module lib/mastra
 * @description
 * Mastraインスタンスを初期化し、Yumiエージェントを登録する。
 * アプリケーション全体で使用するMastraのエントリーポイント。
 */

import { Mastra } from '@mastra/core';
import { yumiAgent } from './agent';

/**
 * Mastraフレームワークのインスタンス
 *
 * @description
 * 登録されたエージェント:
 * - `yumi`: AIチャットボット「Yumi」
 *
 * @example
 * ```typescript
 * import { mastra } from '@/lib/mastra';
 *
 * const agent = mastra.getAgent('yumi');
 * const result = await agent.generate('こんにちは');
 * ```
 */
export const mastra = new Mastra({
  agents: {
    yumi: yumiAgent,
  },
});

export { yumiAgent };
