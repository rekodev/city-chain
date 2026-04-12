import { createFileRoute } from '@tanstack/react-router';
import { auth } from '@/lib/auth';
import { getAblyRestClient } from '@/server/ably';
import {
  ensureFriendRoom,
  getMultiplayerRoomSnapshot,
  joinFriendRoom,
  startFriendRoom
} from '@/server/multiplayer-room';

const GUEST_PLAYER_COOKIE = 'multiplayer-guest-id';

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

function makeGuestPlayerId() {
  return (
    globalThis.crypto?.randomUUID?.().slice(0, 12) ??
    Math.random().toString(36).slice(2, 14)
  );
}

async function getRequestIdentity(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers
  });
  const user = session?.user ?? null;
  const existingGuestId = getCookieValue(
    request.headers.get('cookie'),
    GUEST_PLAYER_COOKIE
  );
  const guestId = existingGuestId || makeGuestPlayerId();

  return {
    user,
    participantKey: user ? `user:${user.id}` : `guest:${guestId}`,
    guestId,
    shouldSetGuestCookie: !user && !existingGuestId
  };
}

function buildHeaders(
  request: Request,
  guestId: string,
  shouldSetGuestCookie: boolean
) {
  const headers = new Headers();

  if (!shouldSetGuestCookie) return headers;

  const secure =
    request.headers.get('x-forwarded-proto') === 'https' ||
    new URL(request.url).protocol === 'https:';

  headers.append(
    'set-cookie',
    `${GUEST_PLAYER_COOKIE}=${encodeURIComponent(guestId)}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? '; Secure' : ''}`
  );

  return headers;
}

export const Route = createFileRoute('/api/multiplayer/room')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const roomId = url.searchParams.get('room')?.trim();

        if (!roomId) {
          return Response.json({ error: 'Missing room id' }, { status: 400 });
        }

        const snapshot = await getMultiplayerRoomSnapshot(roomId);

        if (!snapshot) {
          return Response.json({ error: 'Room not found' }, { status: 404 });
        }

        return Response.json(snapshot);
      },
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as
          | {
              action: 'ensure-host';
              roomId?: string;
              hostDisplayName?: string;
            }
          | {
              action: 'join';
              roomId?: string;
              displayName?: string;
            }
          | {
              action: 'start';
              roomId?: string;
            };

        if (!body?.roomId?.trim()) {
          return Response.json({ error: 'Missing room id' }, { status: 400 });
        }

        const identity = await getRequestIdentity(request);
        const headers = buildHeaders(
          request,
          identity.guestId,
          identity.shouldSetGuestCookie
        );

        try {
          if (body.action === 'ensure-host') {
            const hostDisplayName = body.hostDisplayName?.trim();

            if (!hostDisplayName) {
              return Response.json(
                { error: 'Missing host display name' },
                { status: 400 }
              );
            }

            const snapshot = await ensureFriendRoom({
              roomId: body.roomId.trim(),
              hostDisplayName,
              hostUserId: identity.user?.id ?? null,
              hostParticipantKey: identity.participantKey
            });

            return Response.json(snapshot, { headers });
          }

          if (body.action === 'join') {
            const displayName = body.displayName?.trim();

            if (!displayName) {
              return Response.json(
                { error: 'Missing player display name' },
                { status: 400 }
              );
            }

            const snapshot = await joinFriendRoom({
              roomId: body.roomId.trim(),
              displayName,
              userId: identity.user?.id ?? null,
              participantKey: identity.participantKey
            });

            await getAblyRestClient()
              .channels.get(`multiplayer-room:${body.roomId.trim()}`)
              .publish('room.joined', {
                roomId: body.roomId.trim(),
                displayName
              });

            return Response.json(snapshot, { headers });
          }

          if (body.action === 'start') {
            const snapshot = await getMultiplayerRoomSnapshot(
              body.roomId.trim()
            );

            if (!snapshot) {
              return Response.json(
                { error: 'Room not found' },
                { status: 404 }
              );
            }

            const hostParticipant = snapshot.participants.find(
              (participant) => participant.role === 'host'
            );

            if (
              hostParticipant &&
              hostParticipant.id !==
                `host:${identity.participantKey}:${body.roomId.trim()}`
            ) {
              return Response.json(
                { error: 'Only the host can start this room' },
                { status: 403 }
              );
            }

            if (snapshot.participants.length < 2) {
              return Response.json(
                { error: 'Two players must be present before starting' },
                { status: 400 }
              );
            }

            const startedSnapshot = await startFriendRoom(body.roomId.trim());

            await getAblyRestClient()
              .channels.get(`multiplayer-room:${body.roomId.trim()}`)
              .publish('game.started', {
                roomId: body.roomId.trim()
              });

            return Response.json(startedSnapshot, { headers });
          }

          return Response.json(
            { error: 'Unsupported action' },
            { status: 400 }
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Room request failed';
          return Response.json({ error: message }, { status: 400, headers });
        }
      }
    }
  }
});
