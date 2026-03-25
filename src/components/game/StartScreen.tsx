import { useState } from "react";
import { motion } from "framer-motion";

interface StartScreenProps {
  onStart: (p1: string, p2: string) => void;
}

export default function StartScreen({ onStart }: StartScreenProps) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center max-w-sm mx-4"
      >
        <h1 className="text-5xl font-bold mb-2 text-primary glow-amber-text font-mono">
          CITY CHAIN
        </h1>
        <p className="text-muted-foreground mb-8 text-sm">
          Name cities. Each must start with the last letter of the previous one.
          <br />
          Run out of time and you lose.
        </p>

        <div className="space-y-3 mb-8">
          <input
            type="text"
            placeholder="Player 1 name"
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            className="w-full bg-card/80 backdrop-blur-md border border-primary/30 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
          />
          <input
            type="text"
            placeholder="Player 2 name"
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            className="w-full bg-card/80 backdrop-blur-md border border-secondary/30 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-secondary transition-colors"
          />
        </div>

        <button
          onClick={() => onStart(p1, p2)}
          className="px-10 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-all hover:scale-105 glow-amber"
        >
          Start Game
        </button>
      </motion.div>
    </div>
  );
}
