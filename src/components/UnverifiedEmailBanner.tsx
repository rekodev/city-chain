import { useState } from 'react';
import { MailWarning, RefreshCw, X } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PATH } from '#/constants/path';

export default function UnverifiedEmailBanner() {
  const { data: session } = authClient.useSession();
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);

  if (!session?.user || session.user.emailVerified || dismissed) return null;

  const handleResend = async () => {
    setResending(true);
    const { error } = await authClient.sendVerificationEmail({
      email: session.user.email,
      callbackURL: PATH.play.index
    });
    setResending(false);

    if (error) {
      toast.error(error.message ?? 'Failed to send verification email');
      return;
    }

    toast.success('Verification email sent!');
  };

  return (
    <div className="border-b border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-sm">
          <MailWarning size={15} className="shrink-0 text-yellow-400" />
          <span className="text-yellow-200/80">
            Please verify your email address to unlock all features.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 px-2.5 text-xs text-yellow-300 hover:bg-yellow-500/20 hover:text-yellow-200"
            onClick={handleResend}
            disabled={resending}
          >
            <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
            {resending ? 'Sending…' : 'Resend email'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-yellow-400/60 hover:bg-yellow-500/20 hover:text-yellow-300"
            onClick={() => setDismissed(true)}
          >
            <X size={13} />
          </Button>
        </div>
      </div>
    </div>
  );
}
