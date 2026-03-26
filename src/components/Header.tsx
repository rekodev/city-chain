import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export default function Header() {
  return (
    <header className="border-border/30 bg-background/70 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <span className="text-lg">🔗</span>
          <span className="text-foreground text-sm font-bold tracking-tight">
            City Chain
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" asChild>
            <Link to="/play">Play</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Log in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/signup">Sign up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
