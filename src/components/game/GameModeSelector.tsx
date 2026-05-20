import { cn } from '@/lib/utils';
import { type GameMode, GAME_MODES } from '@/constants/gameMode';
import { Infinity as InfinityIcon, Timer } from 'lucide-react';

interface GameModeSelectorProps {
  value: GameMode;
  onChange: (mode: GameMode) => void;
  disabled?: boolean;
  className?: string;
}

export default function GameModeSelector({
  value,
  onChange,
  disabled = false,
  className
}: GameModeSelectorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-[0.14em] uppercase">
        <Timer size={12} />
        <span>Time per turn</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {GAME_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(mode.id)}
            className={cn(
              'flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-all',
              value === mode.id
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border/40 bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {mode.id === 'unlimited' ? <InfinityIcon size={13} /> : mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}
