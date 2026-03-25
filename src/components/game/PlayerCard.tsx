import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PlayerCardProps {
  name: string;
  time: number;
  isActive: boolean;
  player: 0 | 1;
  position: "left" | "right";
}

export default function PlayerCard({
  name,
  time,
  isActive,
  player,
  position,
}: PlayerCardProps) {
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;
  const isLow = time < 10;

  return (
    <motion.div
      animate={isActive ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={
        isActive ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}
      }
      className={cn(
        "fixed top-4 z-20 px-5 py-3 rounded-xl backdrop-blur-md border",
        position === "left" ? "left-4" : "right-4",
        isActive ? "border-ring bg-card/80" : "border-border/50 bg-card/50",
      )}
    >
      <div
        className={cn(
          "text-xs font-medium mb-1 uppercase tracking-wider",
          player === 0
            ? "text-primary glow-amber-text"
            : "text-secondary glow-cyan-text",
        )}
      >
        {name}
      </div>
      <div
        className={cn(
          "font-mono text-2xl font-bold tabular-nums",
          isLow ? "text-destructive animate-pulse" : "text-foreground",
        )}
      >
        {timeStr}
      </div>
    </motion.div>
  );
}
