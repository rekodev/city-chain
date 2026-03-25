import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface CityInputProps {
  requiredLetter: string | null;
  onSubmit: (city: string) => string | null;
  currentPlayer: 0 | 1;
  playerName: string;
}

export default function CityInput({
  requiredLetter,
  onSubmit,
  currentPlayer,
  playerName,
}: CityInputProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    setValue("");
    setError(null);
  }, [currentPlayer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = onSubmit(value);
    if (err) {
      setError(err);
      setTimeout(() => setError(null), 2000);
    } else {
      setValue("");
      setError(null);
    }
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg px-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-3 bg-card/80 backdrop-blur-md border border-border rounded-2xl px-4 py-3">
          {requiredLetter && (
            <div
              className={`text-3xl font-mono font-bold ${currentPlayer === 0 ? "text-primary glow-amber-text" : "text-secondary glow-cyan-text"}`}
            >
              →&nbsp;{requiredLetter}
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              requiredLetter
                ? `City starting with ${requiredLetter}...`
                : "Name any city to start..."
            }
            className="flex-1 bg-transparent text-foreground text-lg font-medium outline-none placeholder:text-muted-foreground"
            autoComplete="off"
          />
          <button
            type="submit"
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              currentPlayer === 0
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-secondary text-secondary-foreground hover:opacity-90"
            }`}
          >
            Go
          </button>
        </div>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 text-destructive text-sm font-medium bg-card/90 px-4 py-1.5 rounded-lg border border-destructive/30"
          >
            {error}
          </motion.div>
        )}
      </form>
      <div className="text-center mt-2 text-xs text-muted-foreground">
        {playerName}'s turn
      </div>
    </div>
  );
}
