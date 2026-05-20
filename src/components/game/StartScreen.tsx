import { useState } from 'react';
import { motion } from 'framer-motion';
import { Swords } from 'lucide-react';
import { type GameMode, DEFAULT_GAME_MODE } from '@/constants/gameMode';
import GameModeSelector from './GameModeSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface StartScreenProps {
  onStart: (p1: string, p2: string, mode: GameMode) => void;
}

export default function StartScreen({ onStart }: StartScreenProps) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [mode, setMode] = useState<GameMode>(DEFAULT_GAME_MODE);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-background/50 w-full max-w-md rounded-2xl border border-white/10 px-8 py-10 shadow-2xl backdrop-blur-md"
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="bg-primary/10 ring-primary/20 flex size-12 items-center justify-center rounded-2xl ring-2">
            <Swords size={22} className="text-primary" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Local Multiplayer</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Take turns naming cities. Each must start where the last one
              ended.
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="p1">Player 1</Label>
            <Input
              id="p1"
              type="text"
              placeholder="Player 1 name"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p2">Player 2</Label>
            <Input
              id="p2"
              type="text"
              placeholder="Player 2 name"
              value={p2}
              onChange={(e) => setP2(e.target.value)}
            />
          </div>
          <div className="grid gap-3">
            <Label>Time per turn</Label>
            <GameModeSelector value={mode} onChange={setMode} />
          </div>
          <Button
            onClick={() => onStart(p1, p2, mode)}
            size="lg"
            className="w-full"
          >
            Start Game
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
