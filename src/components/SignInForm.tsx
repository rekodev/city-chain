import { useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Link2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PATH } from '#/constants/path';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event: ChangeEvent) => {
    event.preventDefault();
    setLoading(true);

    const { error } = await authClient.signIn.email({ email, password });

    setLoading(false);

    if (error) {
      toast.error(error.message ?? 'Failed to sign in');
      return;
    }

    toast.success('Welcome back, explorer!');
    navigate({ to: PATH.root });
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <div className="w-full max-w-md">
        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
              <Link2 className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Sign in to your CityChain account
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="explorer@citygame.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  to={PATH.forgotPassword}
                  className="text-muted-foreground hover:text-primary ml-auto text-xs transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>

            <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
              <span className="bg-background text-muted-foreground relative z-10 px-2">
                Or continue with
              </span>
            </div>

            <Button variant="outline" className="w-full" disabled>
              <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              Sign in with Google
            </Button>
          </div>

          <div className="text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link to={PATH.singUp} className="underline underline-offset-4">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
