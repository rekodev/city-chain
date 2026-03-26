import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PlayerCardProps {
  name: string;
  time: number;
  isActive: boolean;
  player: 0 | 1;
}

export default function PlayerCard({
  name,
  time,
  isActive,
  player
}: PlayerCardProps) {
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  const isLow = time < 10;

  return (
    <motion.div
      animate={isActive ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={
        isActive ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : {}
      }
      className={cn(
        'rounded-xl border px-5 py-3 backdrop-blur-md',
        isActive ? 'border-ring bg-card/80' : 'border-border/50 bg-card/50'
      )}
    >
      <div
        className={cn(
          'mb-1 text-xs font-medium tracking-wider uppercase',
          player === 0
            ? 'text-primary glow-amber-text'
            : 'text-secondary glow-cyan-text'
        )}
      >
        {name}
      </div>
      <div
        className={cn(
          'font-mono text-2xl font-bold tabular-nums',
          isLow ? 'text-destructive animate-pulse' : 'text-foreground'
        )}
      >
        {timeStr}
      </div>
    </motion.div>
  );
}
