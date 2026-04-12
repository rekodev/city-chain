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
  const [client, setClient] = useState<Ably.Realtime | null>(null);

  useEffect(() => {
    const nextClient = getRealtimeClient();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClient(nextClient);

    return () => {
      nextClient.close();
      realtimeClient = null;
    };
  }, []);

  if (!client) return <>{children}</>;

  return <AblyProvider client={client}>{children}</AblyProvider>;
}
