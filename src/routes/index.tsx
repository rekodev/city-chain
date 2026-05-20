import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { Gamepad2, Link2, MapPin, Timer, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HomeMap from '@/components/HomeMap';
import { useRef } from 'react';
import { authClient } from '@/lib/auth-client';
import { PATH } from '#/constants/path';

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (session?.user) throw redirect({ to: PATH.play.index });
  },
  component: Home
});

const HOW_IT_WORKS = [
  {
    icon: MapPin,
    step: '01',
    title: 'Pick a city',
    description:
      'Start with any city in the world. The bigger your geography knowledge, the further you go.'
  },
  {
    icon: Link2,
    step: '02',
    title: 'Chain to the next',
    description:
      'Name a city that begins with the last letter of the previous one. Tokyo → Oslo → Ottawa → Amsterdam…'
  },
  {
    icon: Timer,
    step: '03',
    title: 'Beat the clock',
    description:
      'Each turn has a countdown. Run out of time or repeat a city and you lose. Keep the chain alive as long as possible.'
  },
  {
    icon: Trophy,
    step: '04',
    title: 'Outlast your opponent',
    description:
      'Play solo, challenge a friend, or compete online. The last player standing wins the map.'
  }
];

function Home() {
  const howItWorksRef = useRef<HTMLDivElement>(null);

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <HomeMap />

      {/* Hero */}
      <div className="relative z-20 flex min-h-screen flex-col items-center justify-center px-4 pt-14 text-center">
        <div className="w-full max-w-xl">
          <div className="bg-background/50 rounded-2xl border border-white/10 px-8 py-10 shadow-2xl backdrop-blur-md">
            <div className="mb-5 flex justify-center">
              <div className="bg-primary/10 ring-primary/20 rounded-2xl p-4 ring-2">
                <Link2 size={44} className="text-primary" strokeWidth={2.2} />
              </div>
            </div>
            <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl">
              <span className="from-foreground to-foreground/60 bg-linear-to-b bg-clip-text text-transparent">
                Play CityChain
              </span>
            </h1>
            <p className="text-muted-foreground mb-8 text-base sm:text-lg">
              Chain cities around the world, beat the clock, and conquer the
              map. Challenge a friend, test your geography, or take on our AI.
            </p>
            <Button asChild size="lg" className="px-10 text-base font-bold">
              <Link to="/play">
                <Gamepad2 size={18} />
                Get Started
              </Link>
            </Button>
          </div>
        </div>

        <button
          onClick={scrollToHowItWorks}
          className="text-muted-foreground/50 hover:text-muted-foreground mt-10 flex cursor-pointer flex-col items-center gap-1 text-sm transition-colors"
        >
          <span>How it works</span>
          <span className="animate-bounce">↓</span>
        </button>
      </div>

      {/* How it works */}
      <div ref={howItWorksRef} className="relative z-20 px-4 pt-4 pb-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-foreground mb-2 text-center text-3xl font-bold tracking-tight">
            How it works
          </h2>
          <p className="text-muted-foreground mb-12 text-center text-base">
            Simple rules. Endless geography.
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            {HOW_IT_WORKS.map(({ icon: Icon, step, title, description }) => (
              <div
                key={step}
                className="bg-background/50 rounded-2xl border border-white/10 p-6 backdrop-blur-md"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                    Step {step}
                  </span>
                </div>
                <h3 className="text-foreground mb-2 text-lg font-semibold">
                  {title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <Button
              asChild
              variant="outline"
              size="lg"
              className="gap-2 px-10 text-base font-semibold"
            >
              <Link to="/play">
                <Gamepad2 size={18} />
                Start Playing
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
