import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useLocation
} from '@tanstack/react-router';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '../components/ui/sonner';
import { TooltipProvider } from '../components/ui/tooltip';
import { GameStatusProvider, useGameStatus } from '../context/gameStatus';
import AblyRootProvider from '../components/AblyRootProvider';
import { getInitialSession } from '../server/session';
import UnverifiedEmailBanner from '#/components/UnverifiedEmailBanner';
import { authClient } from '#/lib/auth-client';

import appCss from '../styles.css?url';
import Header from '#/components/Header';
import Footer from '#/components/Footer';
import { PATH } from '#/constants/path';

const queryClient = new QueryClient();

const NO_FOOTER_PATHS = new Set<string>([
  PATH.signIn,
  PATH.singUp,
  PATH.forgotPassword,
  PATH.resetPassword,
  PATH.verifyEmail,
  PATH.play.index,
  PATH.play.local,
  PATH.play.practice,
  PATH.play.friend,
  PATH.play.bots,
  PATH.play.online
]);

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found.</p>
      <a href={PATH.root} className="underline">
        Go home
      </a>
    </div>
  );
}

export const Route = createRootRoute({
  loader: async () => ({
    initialUser: await getInitialSession()
  }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'CityChain' }
    ],
    links: [{ rel: 'stylesheet', href: appCss }]
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
  component: AppShell
});

function AppShell() {
  const { isPlaying } = useGameStatus();
  const { initialUser } = Route.useLoaderData();
  const { pathname } = useLocation();
  const hideFooter = NO_FOOTER_PATHS.has(pathname);
  const { data: session } = authClient.useSession();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const showBanner =
    !isPlaying &&
    !!session?.user &&
    !session.user.emailVerified &&
    !bannerDismissed;

  return (
    <div className="flex min-h-screen flex-col">
      <Toaster />
      {!isPlaying && <Header initialUser={initialUser} />}
      {showBanner && (
        <div className="fixed top-14 right-0 left-0 z-50">
          <UnverifiedEmailBanner onDismiss={() => setBannerDismissed(true)} />
        </div>
      )}
      <main className="mx-auto w-full max-w-7xl flex-1">
        <Outlet />
      </main>
      {!isPlaying && !hideFooter && <Footer />}
    </div>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <AblyRootProvider>
            <TooltipProvider>
              <GameStatusProvider>{children}</GameStatusProvider>
            </TooltipProvider>
          </AblyRootProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
