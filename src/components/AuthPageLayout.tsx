import type { ReactNode } from 'react';
import HomeMap from '@/components/HomeMap';

export default function AuthPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <HomeMap />
      <div className="relative z-20 mt-14 flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10">
        <div className="bg-background/50 w-full max-w-md rounded-2xl border border-white/10 px-8 py-10 shadow-2xl backdrop-blur-md">
          {children}
        </div>
      </div>
    </div>
  );
}
