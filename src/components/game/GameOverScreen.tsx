import { motion } from "framer-motion";
import { type ChainEntry } from "@/hooks/useGameState";

interface GameOverScreenProps {
  loser: 0 | 1;
  players: [string, string];
  chain: ChainEntry[];
  onRematch: () => void;
}

export default function GameOverScreen({
  loser,
  players,
  chain,
  onRematch,
}: GameOverScreenProps) {
  const winner = loser === 0 ? 1 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="text-center max-w-md mx-4"
      >
        <div className="text-6xl mb-4">🏆</div>
        <h2
          className={`text-3xl font-bold mb-2 ${winner === 0 ? "text-primary glow-amber-text" : "text-secondary glow-cyan-text"}`}
        >
          {players[winner]} Wins!
        </h2>
        <p className="text-muted-foreground mb-1">
          {players[loser]} ran out of time
        </p>
        <p className="text-foreground font-mono text-lg mb-8">
          Chain length:{" "}
          <span className="text-primary font-bold">{chain.length}</span> cities
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-8 max-h-32 overflow-y-auto">
          {chain.map((entry, i) => (
            <span
              key={i}
              className={`text-xs px-2 py-1 rounded-full ${
                entry.player === 0
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary/20 text-secondary"
              }`}
            >
              {entry.city.name}
            </span>
          ))}
        </div>

        <button
          onClick={onRematch}
          className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-all hover:scale-105"
        >
          Rematch
        </button>
      </motion.div>
    </motion.div>
  );
}
