import { createFileRoute, Link } from '@tanstack/react-router';
import { Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HomeMap from '@/components/HomeMap';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-14 text-center">
      <HomeMap />

      <div className="relative z-20 w-full max-w-xl">
        <div className="bg-background/50 rounded-2xl border border-white/10 px-8 py-10 shadow-2xl backdrop-blur-md">
          <div className="mb-5 flex justify-center">
            <Link2 size={52} className="text-primary" strokeWidth={2.2} />
          </div>
          <h1 className="text-foreground mb-4 text-5xl font-bold tracking-tight sm:text-6xl">
            Play CityChain
          </h1>
          <p className="text-muted-foreground mb-8 text-base sm:text-lg">
            Chain cities around the world, beat the clock, and conquer the map.
            Challenge a friend, test your geography, or take on our AI.
          </p>
          <Button asChild size="lg" className="px-10 text-base font-bold">
            <Link to="/play">Get Started</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
