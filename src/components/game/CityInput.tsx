import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { type CityData } from '@/types/city';
import { useGetCity } from '@/hooks/useGetCity';
import { useDebounce } from '@/hooks/useDebounce';

type Props = {
  requiredLetter: string | null;
  onSubmit: (city: CityData) => string | null;
  currentPlayer: 0 | 1;
  playerName: string;
};

export default function CityInput({
  requiredLetter,
  onSubmit,
  currentPlayer,
  playerName
}: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedValue = useDebounce(value, 500);
  const { data: cityResult, isFetching } = useGetCity(debouncedValue);
  const isLoading = isFetching || value !== debouncedValue;

  useEffect(() => {
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue('');
    setError(null);
  }, [currentPlayer]);

  const handleSubmit = (event: ChangeEvent) => {
    event.preventDefault();
    if (!value.trim() || isLoading) return;

    if (!cityResult) {
      setError('Unrecognized city');
      setTimeout(() => setError(null), 2000);
      return;
    }

    const err = onSubmit(cityResult);
    if (err) {
      setError(err);
      setTimeout(() => setError(null), 2000);
    } else {
      setValue('');
      setError(null);
    }
  };

  return (
    <div className="fixed bottom-20 left-1/2 z-20 w-full max-w-lg -translate-x-1/2 px-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className="bg-card/80 border-border flex items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-md">
          {requiredLetter && (
            <div
              className={`font-mono text-3xl font-bold ${currentPlayer === 0 ? 'text-primary glow-amber-text' : 'text-secondary glow-cyan-text'}`}
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
                : 'Name any city to start...'
            }
            className="text-foreground placeholder:text-muted-foreground flex-1 bg-transparent text-lg font-medium outline-none"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={isLoading}
            className={`min-h-9 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 ${
              currentPlayer === 0
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'bg-secondary text-secondary-foreground hover:opacity-90'
            }`}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Go'}
          </button>
        </div>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-destructive bg-card/90 border-destructive/30 absolute -top-10 left-1/2 -translate-x-1/2 rounded-lg border px-4 py-1.5 text-sm font-medium"
          >
            {error}
          </motion.div>
        )}
      </form>
      {playerName !== 'Practice' && (
        <div className="text-muted-foreground mt-2 text-center text-xs">
          {playerName}'s turn
        </div>
      )}
    </div>
  );
}
