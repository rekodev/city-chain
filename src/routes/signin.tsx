import { createFileRoute, redirect } from '@tanstack/react-router';
import { authClient } from '@/lib/auth-client';
import { PATH } from '#/constants/path';
import SignInForm from '../components/SignInForm';

export const Route = createFileRoute('/signin')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (session?.user) throw redirect({ to: PATH.play.index });
  },
  component: RouteComponent
});

function RouteComponent() {
  return <SignInForm />;
}
