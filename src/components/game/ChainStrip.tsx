import { useRef, useEffect } from 'react';
import { type ChainEntry } from '@/hooks/useGameState';
import { cn } from '@/lib/utils';

interface ChainStripProps {
  chain: ChainEntry[];
  onCityClick: (index: number) => void;
}

export default function ChainStrip({ chain, onCityClick }: ChainStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [chain.length]);

  if (chain.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className="scrollbar-hide flex max-w-xs gap-2 overflow-x-auto py-1"
      style={{ scrollbarWidth: 'none' }}
    >
      {chain.map((entry, i) => (
        <button
          key={i}
          onClick={() => onCityClick(i)}
          className={cn(
            'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all hover:scale-105',
            entry.player === 0
              ? 'border-primary/30 bg-primary/20 text-primary'
              : 'border-secondary/30 bg-secondary/20 text-secondary'
          )}
        >
          {entry.city.name}
        </button>
      ))}
    </div>
  );
}
