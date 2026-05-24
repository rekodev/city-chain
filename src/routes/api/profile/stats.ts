import { createFileRoute } from '@tanstack/react-router';
import { count, eq, max, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { gameHistory } from '@/lib/db/schema';

export const Route = createFileRoute('/api/profile/stats')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        const [aggregate] = await db
          .select({
            total: count(),
            wins: sql<number>`SUM(CASE WHEN ${gameHistory.loserSlot} IS NOT NULL AND ${gameHistory.userSlot} != ${gameHistory.loserSlot} THEN 1 ELSE 0 END)::int`,
            longestChain: max(gameHistory.chainLength)
          })
          .from(gameHistory)
          .where(eq(gameHistory.userId, userId));

        const [favRow] = await db
          .select({
            gameMode: gameHistory.gameMode,
            cnt: count()
          })
          .from(gameHistory)
          .where(eq(gameHistory.userId, userId))
          .groupBy(gameHistory.gameMode)
          .orderBy(sql`count(*) desc`)
          .limit(1);

        const total = aggregate?.total ?? 0;
        const wins = aggregate?.wins ?? 0;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

        return Response.json({
          total,
          wins,
          winRate,
          longestChain: aggregate?.longestChain ?? 0,
          favouriteMode: favRow?.gameMode ?? null
        });
      }
    }
  }
});
