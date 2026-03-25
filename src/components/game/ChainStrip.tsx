import { useRef, useEffect } from "react";
import { type ChainEntry } from "@/hooks/useGameState";
import { cn } from "@/lib/utils";

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
    <div className="fixed bottom-4 left-0 right-0 z-20 px-4">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-2 justify-center"
        style={{ scrollbarWidth: "none" }}
      >
        {chain.map((entry, i) => (
          <button
            key={i}
            onClick={() => onCityClick(i)}
            className={cn(
              "shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all hover:scale-105 border",
              entry.player === 0
                ? "bg-primary/20 text-primary border-primary/30"
                : "bg-secondary/20 text-secondary border-secondary/30",
            )}
          >
            {entry.city.name}
          </button>
        ))}
      </div>
    </div>
  );
}
