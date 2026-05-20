import { useState } from 'react';
import { motion } from 'framer-motion';
import { type GameMode, DEFAULT_GAME_MODE } from '@/constants/gameMode';
import GameModeSelector from './GameModeSelector';

interface StartScreenProps {
  onStart: (p1: string, p2: string, mode: GameMode) => void;
}

export default function StartScreen({ onStart }: StartScreenProps) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [mode, setMode] = useState<GameMode>(DEFAULT_GAME_MODE);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mx-4 max-w-sm text-center"
      >
        <h1 className="text-primary glow-amber-text mb-2 font-mono text-5xl font-bold">
          CITY CHAIN
        </h1>
        <p className="text-muted-foreground mb-8 text-sm">
          Name cities. Each must start with the last letter of the previous one.
          <br />
          Run out of time and you lose.
        </p>

        <div className="mb-6 space-y-3">
          <input
            type="text"
            placeholder="Player 1 name"
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            className="bg-card/80 border-primary/30 text-foreground placeholder:text-muted-foreground focus:border-primary w-full rounded-xl border px-4 py-3 backdrop-blur-md transition-colors outline-none"
          />
          <input
            type="text"
            placeholder="Player 2 name"
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            className="bg-card/80 border-secondary/30 text-foreground placeholder:text-muted-foreground focus:border-secondary w-full rounded-xl border px-4 py-3 backdrop-blur-md transition-colors outline-none"
          />
        </div>

        <div className="bg-card/80 border-border/30 mb-8 rounded-xl border px-4 py-3 text-left backdrop-blur-md">
          <GameModeSelector value={mode} onChange={setMode} />
        </div>

        <button
          onClick={() => onStart(p1, p2, mode)}
          className="bg-primary text-primary-foreground glow-amber rounded-xl px-10 py-3 text-lg font-bold transition-all hover:scale-105 hover:opacity-90"
        >
          Start Game
        </button>
      </motion.div>
    </div>
  );
}
