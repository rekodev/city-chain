import Ably from 'ably';
import { AblyProvider } from 'ably/react';
import { useEffect, useState } from 'react';

let realtimeClient: Ably.Realtime | null = null;

function getRealtimeClient() {
  if (!realtimeClient) {
    realtimeClient = new Ably.Realtime({
      authUrl: '/api/ably/token'
    });
  }

  return realtimeClient;
}

export default function AblyRootProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [client] = useState<Ably.Realtime | null>(() =>
    typeof window !== 'undefined' ? getRealtimeClient() : null
  );

  useEffect(() => {
    return () => {
      if (client) {
        client.close();
        realtimeClient = null;
      }
    };
  }, [client]);

  if (!client) return <>{children}</>;

  return <AblyProvider client={client}>{children}</AblyProvider>;
}
