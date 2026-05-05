import { createFileRoute } from '@tanstack/react-router';
import { auth } from '@/lib/auth';
import { getAblyRestClient, getAblyTokenCapability } from '@/server/ably';

const GUEST_CLIENT_COOKIE = 'ably-guest-client-id';

function makeGuestClientId() {
  const random =
    globalThis.crypto?.randomUUID?.().slice(0, 8) ??
    Math.random().toString(36).slice(2, 10);
  return `guest:${random}`;
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

export const Route = createFileRoute('/api/ably/token')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers
        });

        const user = session?.user;
        const existingGuestClientId = getCookieValue(
          request.headers.get('cookie'),
          GUEST_CLIENT_COOKIE
        );
        const guestClientId = existingGuestClientId || makeGuestClientId();
        const clientId = user ? `user:${user.id}` : guestClientId;
        const rest = getAblyRestClient();
        const tokenRequest = await rest.auth.createTokenRequest({
          clientId,
          capability: getAblyTokenCapability()
        });

        const headers = new Headers();

        if (!user && !existingGuestClientId) {
          const secure =
            request.headers.get('x-forwarded-proto') === 'https' ||
            new URL(request.url).protocol === 'https:';

          headers.append(
            'set-cookie',
            `${GUEST_CLIENT_COOKIE}=${encodeURIComponent(guestClientId)}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? '; Secure' : ''}`
          );
        }

        return Response.json(tokenRequest, { headers });
      }
    }
  }
});
