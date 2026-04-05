import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/play/friend')({ component: ComingSoon });

function ComingSoon() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-5xl">🚧</p>
      <h1 className="text-foreground text-2xl font-bold">Coming Soon</h1>
      <p className="text-muted-foreground">
        This mode is still under construction.
      </p>
      <Button asChild variant="ghost">
        <Link to="/play">← Back to game modes</Link>
      </Button>
    </div>
  );
}
