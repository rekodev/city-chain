import { memo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

const GEO_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

function HomeMap() {
  return (
    <div className="fixed inset-0 z-0">
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 20%, hsl(220,40%,8%) 80%)'
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40"
        style={{
          background: 'linear-gradient(to bottom, transparent, hsl(220,40%,8%))'
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24"
        style={{
          background: 'linear-gradient(to top, transparent, hsl(220,40%,8%))'
        }}
      />

      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 165, center: [10, 10] }}
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <radialGradient id="home-map-glow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="hsl(185,70%,45%)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#home-map-glow)" />

        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="hsl(220,25%,16%)"
                stroke="hsl(185,70%,45%)"
                strokeWidth={0.3}
                strokeOpacity={0.35}
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none' },
                  pressed: { outline: 'none' }
                }}
              />
            ))
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}

export default memo(HomeMap);
