import { useState, type ChangeEvent } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Mail } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PATH } from '#/constants/path';
import AuthPageLayout from '@/components/AuthPageLayout';
import Logo from '@/components/Logo';

export const Route = createFileRoute('/forgot-password')({
  component: RouteComponent
});

function RouteComponent() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: ChangeEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}${PATH.resetPassword}`
    });

    setLoading(false);

    if (error) {
      toast.error(error.message ?? 'Failed to send reset email');
      return;
    }

    setSent(true);
  };

  return (
    <AuthPageLayout>
      {sent ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-primary/10 ring-primary/20 flex size-12 items-center justify-center rounded-2xl ring-2">
            <Mail size={22} className="text-primary" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Check your inbox</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              If an account exists for{' '}
              <span className="text-foreground font-medium">{email}</span>,
              you'll receive a reset link shortly.
            </p>
          </div>
          <Link
            to={PATH.signIn}
            className="text-muted-foreground hover:text-primary text-sm underline underline-offset-4 transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="bg-primary/10 ring-primary/20 flex size-12 items-center justify-center rounded-2xl ring-2">
              <Logo size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Forgot password?</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Enter your email and we'll send you a reset link.
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
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </Button>
          </div>

          <div className="text-center text-sm">
            Remembered it?{' '}
            <Link to={PATH.signIn} className="underline underline-offset-4">
              Sign in
            </Link>
          </div>
        </form>
      )}
    </AuthPageLayout>
  );
}
