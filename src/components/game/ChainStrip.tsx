import { type CSSProperties, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { type ChainEntry } from '@/types/city';
import { cn } from '@/lib/utils';

interface ChainStripProps {
  chain: ChainEntry[];
  onCityClick: (index: number) => void;
}

const fadeMaskStyle: CSSProperties = {
  maskImage:
    'linear-gradient(to right, transparent 0, black 2.75rem, black 100%)',
  WebkitMaskImage:
    'linear-gradient(to right, transparent 0, black 2.75rem, black 100%)'
};

const stripTransition = {
  type: 'spring',
  stiffness: 160,
  damping: 24,
  mass: 0.9
} as const;

const chipTransition = {
  duration: 0.2,
  ease: 'easeOut'
} as const;

const instantTransition = {
  duration: 0
} as const;

export default function ChainStrip({ chain, onCityClick }: ChainStripProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackX, setTrackX] = useState<number | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useLayoutEffect(() => {
    if (chain.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTrackX(null);
      setHasOverflow(false);
      return;
    }

    let frame = 0;

    const updateLayout = () => {
      const viewport = viewportRef.current;
      const track = trackRef.current;
      const activeChip = track?.querySelector<HTMLButtonElement>(
        '[data-latest="true"]'
      );

      if (!viewport || !track || !activeChip) return;

      const viewportWidth = viewport.clientWidth;
      const trackWidth = track.scrollWidth;
      const activeCenter = activeChip.offsetLeft + activeChip.offsetWidth / 2;
      const activeRight = activeChip.offsetLeft + activeChip.offsetWidth;
      const centeredX = viewportWidth / 2 - activeCenter;
      const maxX = viewportWidth - activeRight;
      const nextTrackX = Math.min(centeredX, maxX);

      setTrackX(nextTrackX);
      setHasOverflow(
        nextTrackX < -1 || trackWidth + nextTrackX > viewportWidth + 1
      );
    };

    const scheduleLayout = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateLayout);
    };

    updateLayout();

    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => scheduleLayout());

    if (observer) {
      if (viewportRef.current) observer.observe(viewportRef.current);
      if (trackRef.current) observer.observe(trackRef.current);
      const activeChip = trackRef.current?.querySelector<HTMLButtonElement>(
        '[data-latest="true"]'
      );
      if (activeChip) observer.observe(activeChip);
    } else {
      window.addEventListener('resize', scheduleLayout);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      if (!observer) {
        window.removeEventListener('resize', scheduleLayout);
      }
    };
  }, [chain]);

  if (chain.length === 0) return null;

  const lastIndex = chain.length - 1;

  const getChipClassName = (entry: ChainEntry, isLatest: boolean) =>
    cn(
      'h-8 shrink-0 rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition-[transform,box-shadow,background-color,border-color,color] duration-200',
      entry.player === 0
        ? isLatest
          ? 'border-primary/45 bg-primary/20 text-primary'
          : 'border-primary/25 bg-primary/10 text-primary/80'
        : entry.player === 1
          ? isLatest
            ? 'border-secondary/45 bg-secondary/20 text-secondary'
            : 'border-secondary/25 bg-secondary/10 text-secondary/80'
          : isLatest
            ? 'border-(--chip-line) bg-(--chip-bg) text-(--sea-ink)'
            : 'border-(--chip-line) bg-(--chip-bg) text-(--sea-ink-soft)',
      isLatest
        ? 'shadow-[0_10px_28px_rgba(30,90,72,0.18)] ring-1 ring-white/20 hover:-translate-y-0.5'
        : 'hover:opacity-95'
    );

  return (
    <div
      ref={viewportRef}
      className="h-10 w-full max-w-md overflow-hidden py-1"
      style={
        trackX === null
          ? { visibility: 'hidden' }
          : hasOverflow
            ? fadeMaskStyle
            : undefined
      }
    >
      <motion.div
        initial={false}
        ref={trackRef}
        animate={{ x: trackX ?? 0 }}
        transition={chain.length === 1 ? instantTransition : stripTransition}
        className="flex w-max min-w-max items-center"
      >
        {chain.map((entry, i) => {
          const isLatest = i === lastIndex;
          const isFirst = i === 0;

          return (
            <div
              key={`${entry.city.name}-${i}`}
              className="flex shrink-0 items-center"
            >
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    '-mx-px h-px w-4 shrink-0 bg-(--chip-line)',
                    isLatest ? 'opacity-100' : 'opacity-65'
                  )}
                />
              )}

              <motion.button
                type="button"
                data-latest={isLatest}
                onClick={() => onCityClick(i)}
                initial={isLatest && chain.length > 1 ? { opacity: 0 } : false}
                animate={{
                  opacity: isLatest ? 1 : isFirst ? 0.58 : 0.8
                }}
                transition={chipTransition}
                className={getChipClassName(entry, isLatest)}
              >
                {entry.city.name}
              </motion.button>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
