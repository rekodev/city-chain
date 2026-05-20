import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Link2, Mail, RefreshCw } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
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
      callbackURL: PATH.play.index
    });
    setResending(false);

    if (error) {
      toast.error(error.message ?? 'Failed to resend verification email');
      return;
    }

    toast.success('Verification email sent!');
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(220_40%_14%)_0%,hsl(220_40%_8%)_70%)]" />

      <Card className="border-muted bg-card/80 relative z-10 w-full max-w-md backdrop-blur-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto mb-2">
            <Link2 size={32} className="text-primary" strokeWidth={2.2} />
          </div>
          <div className="bg-primary/10 border-primary/20 mx-auto flex h-16 w-16 items-center justify-center rounded-full border">
            <Mail size={28} className="text-primary" />
          </div>
          <CardTitle className="text-foreground font-mono text-2xl font-bold tracking-tight">
            Check your inbox
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            We sent a verification link to{' '}
            <span className="text-foreground font-medium">
              {session?.user.email ?? 'your email'}
            </span>
            . Click it to activate your account and start exploring.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-muted-foreground text-center text-sm">
            Didn't receive it? Check your spam folder or resend below.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            className="w-full font-semibold"
            onClick={handleResend}
            disabled={resending || !session?.user.email}
          >
            <RefreshCw size={15} className={resending ? 'animate-spin' : ''} />
            {resending ? 'Sending…' : 'Resend Verification Email'}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            Already verified?{' '}
            <Link
              to={PATH.signIn}
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
