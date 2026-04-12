import { useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Link2 } from 'lucide-react';
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

export default function SignUpForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (event: ChangeEvent) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { error } = await authClient.signUp.email({ name, email, password });

    setLoading(false);

    if (error) {
      toast.error(error.message ?? 'Failed to create account');
      return;
    }

    toast.success('Account created! Welcome aboard, ' + name);
    navigate({ to: '/' });
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(220_40%_14%)_0%,hsl(220_40%_8%)_70%)]" />

      <Card className="border-muted bg-card/80 relative z-10 w-full max-w-md backdrop-blur-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto mb-2">
            <Link2 size={32} className="text-primary" strokeWidth={2.2} />
          </div>
          <CardTitle className="text-foreground font-mono text-2xl font-bold tracking-tight">
            Join CityChain
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Create your account and start exploring
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Display Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="MapMaster42"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-muted border-muted text-foreground placeholder:text-muted-foreground"
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              Already have an account?{' '}
              <Link
                to={PATH.signIn}
                className="text-primary font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
