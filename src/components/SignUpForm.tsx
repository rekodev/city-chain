import { useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PATH } from '#/constants/path';
import AuthPageLayout from '@/components/AuthPageLayout';
import Logo from '@/components/Logo';

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

    if (error) {
      setLoading(false);
      toast.error(error.message ?? 'Failed to create account');
      return;
    }

    await authClient.sendVerificationEmail({
      email,
      callbackURL: `${window.location.origin}${PATH.play.index}`
    });

    setLoading(false);
    navigate({ to: PATH.verifyEmail });
  };

  return (
    <AuthPageLayout>
      <form onSubmit={handleSignup} className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-primary/10 ring-primary/20 flex size-12 items-center justify-center rounded-2xl ring-2">
            <Logo size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Create an account</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Join CityChain and start exploring
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="MapMaster42"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </Button>

          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-background/50 text-muted-foreground relative z-10 px-2">
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
            Sign up with Google
          </Button>
        </div>

        <div className="text-center text-sm">
          Already have an account?{' '}
          <Link to={PATH.signIn} className="underline underline-offset-4">
            Sign in
          </Link>
        </div>
      </form>
    </AuthPageLayout>
  );
}
