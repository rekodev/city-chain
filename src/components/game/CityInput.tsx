import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Flag, Loader2 } from 'lucide-react';
import { type CityData } from '@/types/city';
import { useGetCity } from '@/hooks/useGetCity';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';

type Props = {
  requiredLetter: string | null;
  onSubmit: (city: CityData) => string | null | Promise<string | null>;
  currentPlayer: 0 | 1;
  disabled?: boolean;
  disabledPlaceholder?: string;
  onQuit?: () => void;
  quitLabel?: string;
  quitDisabled?: boolean;
};

export default function CityInput({
  requiredLetter,
  onSubmit,
  currentPlayer,
  disabled = false,
  disabledPlaceholder,
  onQuit,
  quitLabel = 'Give Up',
  quitDisabled = false
}: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedValue = useDebounce(value, 500);
  const { data: cityResult, isFetching } = useGetCity(debouncedValue);
  const isLoading = isFetching || value !== debouncedValue;

  const playerColor =
    currentPlayer === 0 ? 'var(--primary)' : 'var(--secondary)';

  useEffect(() => {
    inputRef.current?.focus();
    setValue('');
    setError(null);
    setIsSubmitting(false);
  }, [currentPlayer]);

  const handleSubmit = async (event: ChangeEvent) => {
    event.preventDefault();
    if (!value.trim() || isLoading || isSubmitting || disabled) return;

    if (!cityResult) {
      setError('Unrecognized city');
      setTimeout(() => setError(null), 2000);
      return;
    }

    setIsSubmitting(true);

    try {
      const err = await onSubmit(cityResult);
      if (err) {
        setError(err);
        setTimeout(() => setError(null), 2000);
      } else {
        setValue('');
        setError(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const placeholder =
    disabled && disabledPlaceholder
      ? disabledPlaceholder
      : requiredLetter
        ? `e.g. ${requiredLetter}...`
        : 'Name any city to start...';

  return (
    <div className="fixed bottom-16 left-1/2 z-20 w-full max-w-xl -translate-x-1/2 px-4">
      <div className="mb-2 flex items-center justify-between pl-1">
        {requiredLetter ? (
          <div className="flex items-center gap-2.5">
            <span className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
              Next city starts with
            </span>
            <span
              aria-label={`Letter ${requiredLetter}`}
              className="grid h-8 w-8 place-items-center rounded-lg text-sm font-extrabold"
              style={{
                color: playerColor,
                background: `color-mix(in oklab, ${playerColor} 22%, transparent)`,
                boxShadow: `inset 0 0 0 1.5px color-mix(in oklab, ${playerColor} 40%, transparent)`
              }}
            >
              {requiredLetter}
            </span>
          </div>
        ) : (
          <div />
        )}

        {onQuit && (
          <Button
            type="button"
            variant="destructive"
            onClick={onQuit}
            disabled={quitDisabled}
          >
            <Flag />
            {quitLabel}
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <div
          className="flex items-center gap-2 rounded-2xl p-2"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow:
              '0 1px 0 0 oklch(1 0 0 / 0.04) inset, 0 12px 30px -16px oklch(0 0 0 / 0.6)'
          }}
        >
          <div className="flex flex-1 items-center gap-3 px-3">
            <ArrowRight
              className="text-muted-foreground h-4 w-4 shrink-0"
              aria-hidden
            />
            <input
              ref={inputRef}
              type="text"
              value={disabled ? '' : value}
              onChange={(e) => {
                if (!disabled) setValue(e.target.value);
              }}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              className="text-foreground placeholder:text-muted-foreground/60 w-full bg-transparent py-2.5 text-base focus:outline-none disabled:cursor-not-allowed"
            />
          </div>
          <Button
            type="submit"
            variant={currentPlayer === 0 ? 'default' : 'secondary'}
            size="lg"
            disabled={disabled || !value.trim() || isLoading || isSubmitting}
            className="min-h-full min-w-20 rounded-xl px-4"
          >
            {isLoading || isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                Go
                <ArrowRight />
              </>
            )}
          </Button>
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

      {requiredLetter && (
        <p className="text-muted-foreground mt-2 pl-1 text-xs">
          Type the full city name, including the{' '}
          <span className="text-foreground font-semibold">
            {requiredLetter}
          </span>
          .
        </p>
      )}
    </div>
  );
}
