import { Link } from '@tanstack/react-router';

export default function Footer() {
  return (
    <footer className="border-border/30 bg-background/80 border-t px-4 py-8 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <span className="text-base">🔗</span>
          <span className="text-foreground text-sm font-bold">City Chain</span>
        </Link>

        <p className="text-muted-foreground text-center text-xs sm:text-left">
          Chain cities. Beat the clock. Conquer the map.
        </p>

        <div className="text-muted-foreground flex items-center gap-5 text-xs">
          <Link
            to="/privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <span>© {new Date().getFullYear()} City Chain</span>
        </div>
      </div>
    </footer>
  );
}
