import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '../components/ui/sonner';
import { TooltipProvider } from '../components/ui/tooltip';
import { GameStatusProvider, useGameStatus } from '../context/gameStatus';

import appCss from '../styles.css?url';
import Header from '#/components/Header';
import Footer from '#/components/Footer';

const queryClient = new QueryClient();

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found.</p>
      <a href="/" className="underline">
        Go home
      </a>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'City Chain' }
    ],
    links: [{ rel: 'stylesheet', href: appCss }]
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument
});

function AppShell({ children }: { children: React.ReactNode }) {
  const { isPlaying } = useGameStatus();
  return (
    <>
      <Toaster />
      {!isPlaying && <Header />}
      <main className="mx-auto w-full max-w-7xl">{children}</main>
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
          <TooltipProvider>
            <GameStatusProvider>
              <AppShell>{children}</AppShell>
            </GameStatusProvider>
          </TooltipProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
