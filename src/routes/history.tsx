import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, ChevronDown, Flag, History, Swords } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { getModeLabel } from '@/constants/gameMode';
import type { ChainEntry } from '@/types/city';

export const Route = createFileRoute('/history')({
  component: GameHistoryPage
});

type GameRecord = {
  id: string;
  gameType: 'friend';
  gameMode: string | null;
  players: Array<{ name: string; slot: number }>;
  chain: ChainEntry[];
  chainLength: number;
  userSlot: number;
  loserSlot: number | null;
  gameOverReason: string | null;
  playedAt: string;
};

function formatGameOverReason(reason: string | null): string {
  switch (reason) {
    case 'timeout':
      return 'Time ran out';
    case 'gave_up':
      return 'Gave up';
    case 'disconnect':
      return 'Disconnected';
    default:
      return '';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function Avatar({ initial, isWinner }: { initial: string; isWinner: boolean }) {
  return (
    <div
      className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-semibold"
      style={
        isWinner
          ? {
              background:
                'radial-gradient(120% 120% at 30% 25%, color-mix(in oklab, var(--primary) 100%, white 15%), var(--primary) 70%)',
              color: 'var(--primary-foreground)',
              boxShadow:
                '0 0 0 1px color-mix(in oklab, var(--primary) 50%, transparent), 0 8px 22px -8px color-mix(in oklab, var(--primary) 60%, transparent)'
            }
          : {
              background: 'var(--secondary)',
              color: 'var(--foreground)',
              boxShadow: 'inset 0 0 0 1px var(--border)'
            }
      }
    >
      {initial}
    </div>
  );
}

function Chip({
  children,
  tone = 'muted',
  icon
}: {
  children: React.ReactNode;
  tone?: 'muted' | 'accent' | 'destructive';
  icon?: React.ReactNode;
}) {
  const styles: Record<string, React.CSSProperties> = {
    muted: { background: 'var(--muted)', color: 'var(--muted-foreground)' },
    accent: {
      background: 'color-mix(in oklab, var(--accent) 18%, transparent)',
      color: 'var(--accent)',
      boxShadow:
        'inset 0 0 0 1px color-mix(in oklab, var(--accent) 30%, transparent)'
    },
    destructive: {
      background: 'color-mix(in oklab, var(--destructive) 14%, transparent)',
      color: 'var(--destructive)',
      boxShadow:
        'inset 0 0 0 1px color-mix(in oklab, var(--destructive) 28%, transparent)'
    }
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase"
      style={styles[tone]}
    >
      {icon}
      {children}
    </span>
  );
}

function GameCard({ record }: { record: GameRecord }) {
  const [expanded, setExpanded] = useState(false);

  const youPlayer = record.players.find((p) => p.slot === record.userSlot);
  const oppPlayer = record.players.find((p) => p.slot !== record.userSlot);

  const isWon =
    record.loserSlot !== null && record.userSlot !== record.loserSlot;
  const isLost =
    record.loserSlot !== null && record.userSlot === record.loserSlot;

  const resultLabel = isWon ? 'Victory' : isLost ? 'Defeat' : 'Draw';
  const resultColor = isWon
    ? 'var(--primary)'
    : isLost
      ? 'var(--destructive)'
      : 'var(--muted-foreground)';

  const youInitial = (youPlayer?.name ?? '?')[0].toUpperCase();
  const oppInitial = (oppPlayer?.name ?? '?')[0].toUpperCase();

  const userCities = record.chain.filter(
    (e) => e.player === record.userSlot
  ).length;
  const oppCities = record.chain.filter(
    (e) => e.player !== record.userSlot
  ).length;

  const youStatus = isLost ? formatGameOverReason(record.gameOverReason) : '';
  const oppStatus = isWon ? formatGameOverReason(record.gameOverReason) : '';
  const winnerCities = Math.max(userCities, oppCities);
  const endedBy = formatGameOverReason(record.gameOverReason);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border transition-transform duration-300 hover:-translate-y-px"
      style={{
        background: 'linear-gradient(180deg, var(--card), var(--card))',
        boxShadow:
          '0 1px 3px 0 rgba(0,0,0,.18), 0 1px 2px -1px rgba(0,0,0,.18)',
        borderColor: 'var(--border)'
      }}
    >
      {/* Result side-bar */}
      <div
        aria-hidden
        className="absolute top-0 left-0 h-full w-0.75"
        style={{ background: resultColor }}
      />

      <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-4 px-6 py-5 md:gap-6 md:px-8">
        {/* YOU */}
        <div className="flex min-w-0 items-center gap-3">
          <Avatar initial={youInitial} isWinner={isWon} />
          <div className="min-w-0">
            <p className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
              You
            </p>
            <p className="text-foreground truncate text-base font-semibold">
              {youPlayer?.name ?? '—'}
            </p>
            {youStatus && (
              <p className="text-muted-foreground mt-0.5 text-xs">
                {youStatus}
              </p>
            )}
          </div>
        </div>

        {/* VS / SCORE */}
        <div className="flex flex-col items-center gap-1.5 px-2">
          <div className="flex items-baseline gap-3 font-mono tabular-nums">
            <span className="text-muted-foreground text-3xl font-bold">
              {userCities}
            </span>
            <span
              className="text-xs font-semibold tracking-[0.2em]"
              style={{ color: resultColor }}
            >
              VS
            </span>
            <span className="text-foreground text-3xl font-bold">
              {oppCities}
            </span>
          </div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] tracking-[0.16em] uppercase">
            <Swords className="h-3 w-3" />
            <span>cities</span>
          </div>
        </div>

        {/* OPPONENT */}
        <div className="flex min-w-0 items-center justify-end gap-3">
          <div className="min-w-0 text-right">
            <p className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
              Opponent
            </p>
            <p className="text-foreground truncate text-base font-semibold">
              {oppPlayer?.name ?? '—'}
            </p>
            {oppStatus && (
              <p className="mt-0.5 text-xs" style={{ color: resultColor }}>
                {oppStatus}
              </p>
            )}
          </div>
          <Avatar initial={oppInitial} isWinner={!isWon && isLost} />
        </div>

        {/* META */}
        <div className="border-border/60 flex h-full flex-col items-end justify-between gap-2 border-l pl-4 md:pl-6">
          <span
            className="text-[11px] font-bold tracking-[0.18em] uppercase"
            style={{ color: resultColor }}
          >
            {resultLabel}
          </span>
          {record.gameMode && (
            <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              {getModeLabel(
                record.gameMode as Parameters<typeof getModeLabel>[0]
              )}
            </span>
          )}
          <p className="text-muted-foreground text-[11px]">
            {formatDate(record.playedAt)}
          </p>
        </div>
      </div>

      {/* Footer chips + expand */}
      <div
        className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-6 py-3 md:px-8"
        style={{
          background: 'color-mix(in oklab, var(--background) 40%, transparent)'
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="accent" icon={<Building2 className="h-3 w-3" />}>
            {winnerCities} cities
          </Chip>
          {endedBy && (
            <Chip tone="destructive" icon={<Flag className="h-3 w-3" />}>
              {endedBy}
            </Chip>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors"
        >
          Match details
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-border/30 border-t px-6 pt-4 pb-5 md:px-8">
              {record.chain.length > 0 ? (
                <>
                  <div className="mb-3 flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-primary h-2 w-2 rounded-full" />
                      <span className="text-muted-foreground text-xs">
                        {youPlayer?.name ?? 'You'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-secondary h-2 w-2 rounded-full" />
                      <span className="text-muted-foreground text-xs">
                        {oppPlayer?.name ?? 'Opponent'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {record.chain.map((entry, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                          entry.player === record.userSlot
                            ? 'bg-primary/10 text-primary'
                            : 'bg-secondary/10 text-secondary'
                        }`}
                      >
                        <span className="opacity-50">{i + 1}.</span>
                        {entry.city.name}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-center text-sm">
                  No cities played in this game.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function GameHistoryPage() {
  const { data: session } = authClient.useSession();
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const fetchHistory = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/game-history?page=${pageNum}`);
      const data = (await res.json()) as {
        records: GameRecord[];
        pageSize: number;
      };
      if (pageNum === 1) {
        setRecords(data.records);
      } else {
        setRecords((prev) => [...prev, ...data.records]);
      }
      setHasMore(data.records.length === data.pageSize);
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchHistory(1);
    }
  }, [session?.user, fetchHistory]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchHistory(next);
  };

  if (!session?.user && session !== undefined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <History size={40} className="text-muted-foreground" />
        <h1 className="text-2xl font-bold">Game History</h1>
        <p className="text-muted-foreground">
          Sign in to view your game history.
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 py-10 pt-20">
      <div className="mb-8 flex items-start gap-4">
        <div className="bg-primary/10 ring-primary/20 mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ring-2">
          <History size={18} className="text-primary" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Game History</h1>
          <p className="text-muted-foreground text-sm">
            Your past online games
          </p>
        </div>
      </div>

      {!initialLoaded || (loading && records.length === 0) ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border-border/30 bg-card/40 h-24 animate-pulse rounded-2xl border"
            />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="border-border/30 bg-card/40 mx-auto flex flex-col items-center gap-3 rounded-2xl border px-8 py-16 text-center">
          <Swords size={36} className="text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">
            No games yet. Play against someone to see history here.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {records.map((record) => (
              <GameCard key={record.id} record={record} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="border-border/50 bg-card/60 text-muted-foreground hover:border-border hover:text-foreground rounded-xl border px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
