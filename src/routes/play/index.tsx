import { createFileRoute, Link } from '@tanstack/react-router';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

export const Route = createFileRoute('/play/')({ component: PlayMenu });

const GEO_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const modes = [
  {
    id: 'local',
    icon: '📱',
    label: 'Local Multiplayer',
    description: 'Pass the device and take turns together',
    href: '/play/local',
    disabled: false
  },
  {
    id: 'practice',
    icon: '🎯',
    label: 'Practice',
    description: 'Chain cities solo with no timer pressure',
    href: '/play/practice',
    disabled: false
  },
  {
    id: 'bots',
    icon: '🤖',
    label: 'Play Bots',
    description: 'Challenge our AI at Easy, Medium, or Hard',
    href: '/play/bots',
    disabled: true,
    badge: 'Coming Soon'
  },
  {
    id: 'friend',
    icon: '🔗',
    label: 'Play a Friend',
    description: 'Generate a private link and invite someone',
    href: '/play/friend',
    disabled: true,
    badge: 'Coming Soon'
  },
  {
    id: 'online',
    icon: '🌐',
    label: 'Play Online',
    description: 'Get matched with a random opponent worldwide',
    href: '/play/online',
    disabled: true,
    badge: 'Coming Soon'
  }
];

function GlobePlaceholder() {
  return (
    <div className="pointer-events-none opacity-80 select-none">
      <ComposableMap
        projection="geoOrthographic"
        projectionConfig={{ scale: 280, rotate: [-20, -20, 0] }}
        width={560}
        height={560}
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <radialGradient id="globe-glow" cx="40%" cy="35%">
            <stop offset="0%" stopColor="hsl(185,70%,45%)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(220,40%,8%)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={280} cy={280} r={280} fill="hsl(220,40%,8%)" />
        <circle cx={280} cy={280} r={280} fill="url(#globe-glow)" />
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="hsl(220,25%,20%)"
                stroke="hsl(185,70%,45%)"
                strokeWidth={0.4}
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none' },
                  pressed: { outline: 'none' }
                }}
              />
            ))
          }
        </Geographies>
        <circle
          cx={280}
          cy={280}
          r={279}
          fill="none"
          stroke="hsl(185,70%,35%)"
          strokeWidth={1}
          strokeOpacity={0.4}
        />
      </ComposableMap>
    </div>
  );
}

function ModeCard({
  icon,
  label,
  description,
  href,
  disabled,
  badge
}: (typeof modes)[number]) {
  const inner = (
    <div
      className={`flex items-center gap-4 rounded-xl border px-5 py-4 transition-all ${
        disabled
          ? 'border-border/30 bg-card/30 cursor-not-allowed opacity-50'
          : 'border-border/50 bg-card/60 hover:border-primary/50 hover:bg-card/90 hover:shadow-[0_0_20px_hsl(36,90%,55%,0.08)]'
      }`}
    >
      <span className="text-3xl">{icon}</span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-foreground font-semibold">{label}</span>
          {badge && (
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
              {badge}
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
      </div>
      {!disabled && (
        <svg
          className="text-muted-foreground"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M6 3l5 5-5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );

  if (disabled) return <div>{inner}</div>;
  return <Link to={href as '/play/local'}>{inner}</Link>;
}

export default function PlayMenu() {
  return (
    <div className="flex min-h-screen pt-14">
      {/* Globe — hidden on mobile */}
      <div className="hidden items-center justify-center p-12 lg:flex lg:flex-1">
        <div className="aspect-square w-full max-w-120">
          <GlobePlaceholder />
        </div>
      </div>

      {/* Mode selection */}
      <div className="lg:border-border/30 flex w-full flex-col justify-center px-6 py-12 lg:w-115 lg:shrink-0 lg:border-x lg:px-10">
        <h2 className="text-foreground mb-1 text-2xl font-bold">
          Play City Chain
        </h2>
        <p className="text-muted-foreground mb-7 text-sm">
          Choose a game mode to get started
        </p>
        <div className="flex flex-col gap-3">
          {modes.map((mode) => (
            <ModeCard key={mode.id} {...mode} />
          ))}
        </div>
      </div>
    </div>
  );
}
