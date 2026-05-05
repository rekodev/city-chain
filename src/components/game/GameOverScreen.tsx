import { motion } from 'framer-motion';
import { type GameOverReason } from '@/hooks/useGameState';
import { type ChainEntry } from '#/types/city';

interface GameOverScreenProps {
  loser: 0 | 1;
  players: [string, string];
  chain: ChainEntry[];
  gameOverReason: GameOverReason | null;
  onRematch: () => void;
  onExit: () => void;
  showRematch?: boolean;
  rematchLabel?: string;
  rematchPending?: boolean;
}

export default function GameOverScreen({
  loser,
  players,
  chain,
  gameOverReason,
  onRematch,
  onExit,
  showRematch = true,
  rematchLabel = 'Rematch',
  rematchPending = false
}: GameOverScreenProps) {
  const winner = loser === 0 ? 1 : 0;
  const gaveUp = gameOverReason === 'gaveUp';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="mx-4 w-full max-w-md text-center"
      >
        <div className="mb-4 text-6xl">{gaveUp ? '🏳️' : '🏆'}</div>
        <h2
          className={`mb-2 text-3xl font-bold ${winner === 0 ? 'text-primary glow-amber-text' : 'text-secondary glow-cyan-text'}`}
        >
          {players[winner]} Wins!
        </h2>
        <p className="text-muted-foreground mb-1">
          {gaveUp
            ? `${players[loser]} gave up`
            : `${players[loser]} ran out of time`}
        </p>
        <p className="text-foreground mb-8 font-mono text-lg">
          Chain length:{' '}
          <span className="text-primary font-bold">{chain.length}</span> cities
        </p>

        <div className="mb-8 flex max-h-32 flex-wrap justify-center gap-2 overflow-y-auto">
          {chain.map((entry, i) => (
            <span
              key={i}
              className={`rounded-full px-2 py-1 text-xs ${
                entry.player === 0
                  ? 'bg-primary/20 text-primary'
                  : 'bg-secondary/20 text-secondary'
              }`}
            >
              {entry.city.name}
            </span>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {showRematch ? (
            <button
              onClick={rematchPending ? undefined : onRematch}
              disabled={rematchPending}
              className={`w-full rounded-xl px-8 py-3 text-lg font-bold transition-all sm:w-auto ${
                rematchPending
                  ? 'bg-primary/50 text-primary-foreground cursor-default opacity-70'
                  : 'bg-primary text-primary-foreground hover:scale-105 hover:opacity-90'
              }`}
            >
              {rematchLabel}
            </button>
          ) : null}
          <button
            onClick={onExit}
            className="border-border/50 bg-card/60 text-muted-foreground hover:border-border hover:text-foreground w-full rounded-xl border px-8 py-3 text-lg font-semibold backdrop-blur-sm transition-all sm:w-auto"
          >
            Main Menu
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
