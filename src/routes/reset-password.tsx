import { useState, type ChangeEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PATH } from '#/constants/path';
import AuthPageLayout from '@/components/AuthPageLayout';
import Logo from '@/components/Logo';

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) ?? ''
  }),
  component: RouteComponent
});

function RouteComponent() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: ChangeEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { error } = await authClient.resetPassword({
      newPassword: password,
      token
    });

    setLoading(false);

    if (error) {
      toast.error(error.message ?? 'Failed to reset password');
      return;
    }

    toast.success('Password reset! You can now sign in.');
    navigate({ to: PATH.signIn });
  };

  if (!token) {
    return (
      <AuthPageLayout>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-primary/10 ring-primary/20 flex size-12 items-center justify-center rounded-2xl ring-2">
            <Logo size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Invalid link</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              This reset link is invalid or has expired.
            </p>
          </div>
          <Link
            to={PATH.forgotPassword}
            className="text-sm underline underline-offset-4"
          >
            Request a new one
          </Link>
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-primary/10 ring-primary/20 flex size-12 items-center justify-center rounded-2xl ring-2">
            <Logo size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Set new password</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Choose a strong password for your account.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="password">New Password</Label>
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
            {loading ? 'Resetting…' : 'Reset Password'}
          </Button>
        </div>
      </form>
    </AuthPageLayout>
  );
}
