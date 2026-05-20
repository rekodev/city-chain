import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Mail, RefreshCw } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PATH } from '#/constants/path';

export const Route = createFileRoute('/verify-email')({
  component: RouteComponent
});

function RouteComponent() {
  const [resending, setResending] = useState(false);
  const { data: session } = authClient.useSession();

  const handleResend = async () => {
    if (!session?.user.email) return;

    setResending(true);
    const { error } = await authClient.sendVerificationEmail({
      email: session.user.email,
      callbackURL: `${window.location.origin}${PATH.play.index}`
    });
    setResending(false);

    if (error) {
      toast.error(error.message ?? 'Failed to resend verification email');
      return;
    }

    toast.success('Verification email sent!');
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
          <Mail className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Check your inbox</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            We sent a verification link to{' '}
            <span className="text-foreground font-medium">
              {session?.user.email ?? 'your email'}
            </span>
            . Click it to activate your account and start exploring.
          </p>
        </div>
        <p className="text-muted-foreground text-sm">
          Didn't receive it? Check your spam folder or resend below.
        </p>
        <div className="flex w-full flex-col gap-3">
          <Button
            className="w-full"
            onClick={handleResend}
            disabled={resending || !session?.user.email}
          >
            <RefreshCw size={15} className={resending ? 'animate-spin' : ''} />
            {resending ? 'Sending…' : 'Resend Verification Email'}
          </Button>
          <p className="text-muted-foreground text-sm">
            Already verified?{' '}
            <Link to={PATH.signIn} className="underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
