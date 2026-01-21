/**
 * @fileoverview Prismaクライアントのシングルトンインスタンス
 * @module lib/prisma/client
 * @description
 * Next.jsの開発サーバーではホットリロード時に新しいPrismaClientインスタンスが
 * 作成され、データベース接続が枯渇する問題がある。
 * これを防ぐため、globalThisにインスタンスをキャッシュする。
 *
 * @see https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */

import { PrismaClient } from '@prisma/client';

/**
 * Prismaクライアントをグローバルにキャッシュするための型定義
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prismaクライアントのシングルトンインスタンス
 *
 * @description
 * - 開発環境: globalThisにキャッシュし、ホットリロード時も同一インスタンスを使用
 * - 本番環境: 新規インスタンスを作成（サーバーレス環境対応）
 *
 * @example
 * ```typescript
 * import { prisma } from '@/lib/prisma/client';
 *
 * const messages = await prisma.message.findMany({
 *   where: { sessionId: 'xxx' }
 * });
 * ```
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
