import { useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
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
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(220_40%_14%)_0%,hsl(220_40%_8%)_70%)]" />

      <Card className="border-muted bg-card/80 relative z-10 w-full max-w-md backdrop-blur-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto mb-2 text-4xl">🌍</div>
          <CardTitle className="text-foreground font-mono text-2xl font-bold tracking-tight">
            City Chain
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to continue your journey
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="explorer@citygame.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-muted border-muted text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-muted border-muted text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-primary font-medium hover:underline"
              >
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
