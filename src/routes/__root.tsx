import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '../components/ui/sonner';
import { TooltipProvider } from '../components/ui/tooltip';
import { GameStatusProvider, useGameStatus } from '../context/gameStatus';
import AblyRootProvider from '../components/AblyRootProvider';
import { getInitialSession } from '../server/session';

import appCss from '../styles.css?url';
import Header from '#/components/Header';
import Footer from '#/components/Footer';
import { PATH } from '#/constants/path';

const queryClient = new QueryClient();

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

  return (
    <>
      <Toaster />
      {!isPlaying && <Header initialUser={initialUser} />}
      <main className="mx-auto w-full max-w-7xl">
        <Outlet />
      </main>
      {!isPlaying && <Footer />}
    </>
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
