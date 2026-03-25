import { memo, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
} from "react-simple-maps";
import { motion } from "framer-motion";
import { type ChainEntry } from "@/hooks/useGameState";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface WorldMapProps {
  chain: ChainEntry[];
  focusCity?: { lat: number; lng: number } | null;
  onPillClick?: (index: number) => void;
}

function WorldMap({ chain, focusCity }: WorldMapProps) {
  const center: [number, number] = useMemo(() => {
    if (focusCity) return [focusCity.lng, focusCity.lat];
    if (chain.length > 0) {
      const last = chain[chain.length - 1].city;
      return [last.lng, last.lat];
    }
    return [20, 20];
  }, [chain, focusCity]);

  const zoom = chain.length > 0 ? 3 : 1.2;

  const lines = useMemo(() => {
    const result: {
      from: [number, number];
      to: [number, number];
      index: number;
    }[] = [];
    for (let i = 1; i < chain.length; i++) {
      result.push({
        from: [chain[i - 1].city.lng, chain[i - 1].city.lat],
        to: [chain[i].city.lng, chain[i].city.lat],
        index: i,
      });
    }
    return result;
  }, [chain]);

  return (
    <div className="fixed inset-0 z-0">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          center,
          scale: zoom * 120,
        }}
        className="w-full h-full"
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="hsl(220, 25%, 18%)"
                stroke="hsl(220, 20%, 25%)"
                strokeWidth={0.5}
                style={{
                  default: { outline: "none" },
                  hover: { outline: "none" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {lines.map((line) => (
          <Line
            key={line.index}
            from={line.from}
            to={line.to}
            stroke="hsl(36, 90%, 55%)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="6 4"
            style={{ opacity: 0.6 }}
          />
        ))}

        {chain.map((entry, i) => (
          <Marker key={i} coordinates={[entry.city.lng, entry.city.lat]}>
            <motion.circle
              initial={{ r: 0, opacity: 0 }}
              animate={{ r: 6, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.1,
              }}
              fill={
                entry.player === 0 ? "hsl(36, 90%, 55%)" : "hsl(185, 70%, 45%)"
              }
              className={
                entry.player === 0
                  ? "drop-shadow-[0_0_6px_hsl(36,100%,60%)]"
                  : "drop-shadow-[0_0_6px_hsl(185,100%,55%)]"
              }
            />
            <motion.circle
              initial={{ r: 0, opacity: 0 }}
              animate={{ r: 12, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop",
              }}
              fill="none"
              stroke={
                entry.player === 0 ? "hsl(36, 90%, 55%)" : "hsl(185, 70%, 45%)"
              }
              strokeWidth={1.5}
            />
            <text
              textAnchor="middle"
              y={-14}
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 9,
                fill: "hsl(210, 20%, 90%)",
                fontWeight: 600,
                textShadow: "0 1px 4px rgba(0,0,0,0.8)",
              }}
            >
              {entry.city.name}
            </text>
          </Marker>
        ))}
      </ComposableMap>
    </div>
  );
}

export default memo(WorldMap);
