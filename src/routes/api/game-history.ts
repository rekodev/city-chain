import { createFileRoute } from '@tanstack/react-router';
import { desc, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { gameHistory } from '@/lib/db/schema';

const PAGE_SIZE = 20;

export const Route = createFileRoute('/api/game-history')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const page = Math.max(
          1,
          parseInt(url.searchParams.get('page') ?? '1', 10)
        );
        const offset = (page - 1) * PAGE_SIZE;

        const records = await db
          .select()
          .from(gameHistory)
          .where(eq(gameHistory.userId, session.user.id))
          .orderBy(desc(gameHistory.playedAt))
          .limit(PAGE_SIZE)
          .offset(offset);

        return Response.json({ records, page, pageSize: PAGE_SIZE });
      }
    }
  }
});
