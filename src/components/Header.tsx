import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import UserMenu from '@/components/UserMenu';
import { authClient } from '@/lib/auth-client';
import { PATH } from '#/constants/path';

function AuthenticatedHeader({
  name,
  email,
  image
}: {
  name: string;
  email: string;
  image?: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button size="lg" variant="secondary" className="px-6 text-white" asChild>
        <Link to={PATH.play.index}>Play</Link>
      </Button>
      <UserMenu name={name} email={email} image={image} />
    </div>
  );
}

function UnauthenticatedHeader() {
  return (
    <div className="flex items-center gap-2">
      <Button size="lg" variant="secondary" className="px-6 text-white" asChild>
        <Link to={PATH.play.index}>Play</Link>
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <Link to={PATH.signIn}>Sign in</Link>
      </Button>
      <Button size="sm" asChild>
        <Link to={PATH.singUp}>Sign up</Link>
      </Button>
    </div>
  );
}

export default function Header() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  return (
    <header className="border-border/30 bg-background/70 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <span className="text-lg">🔗</span>
          <span className="text-foreground text-sm font-bold tracking-tight">
            City Chain
          </span>
        </Link>

        {user ? (
          <AuthenticatedHeader
            name={user.name}
            email={user.email}
            image={user.image}
          />
        ) : (
          <UnauthenticatedHeader />
        )}
      </div>
    </header>
  );
}
