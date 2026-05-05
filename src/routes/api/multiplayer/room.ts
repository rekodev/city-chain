import { createFileRoute } from '@tanstack/react-router';
import { auth } from '@/lib/auth';
import { getAblyRestClient } from '@/server/ably';
import {
  ensureFriendRoom,
  getMultiplayerRoomSnapshot,
  giveUpFriendRoom,
  joinFriendRoom,
  rematchFriendRoom,
  resolveFriendRoomTimeout,
  startFriendRoom,
  submitFriendRoomMove
} from '@/server/multiplayer-room';
import { type CityData } from '@/types/city';

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

function withViewer(
  roomId: string,
  snapshot: Awaited<ReturnType<typeof getMultiplayerRoomSnapshot>>,
  participantKey: string,
  userId: string | null
) {
  if (!snapshot) return null;

  const viewer =
    snapshot.participants.find(
      (participant) => participant.userId === userId && userId
    ) ??
    snapshot.participants.find(
      (participant) =>
        participant.id === `host:${participantKey}:${roomId}` ||
        participant.id === `player:${participantKey}:${roomId}`
    ) ??
    null;

  return {
    ...snapshot,
    viewer: viewer
      ? {
          participantId: viewer.id,
          role: viewer.role,
          slot: viewer.slot as 0 | 1
        }
      : null
  };
}

async function publishRoomEvent(roomId: string, name: string) {
  await getAblyRestClient()
    .channels.get(`multiplayer-room:${roomId}`)
    .publish(name, { roomId });
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

        const identity = await getRequestIdentity(request);
        const snapshot = await getMultiplayerRoomSnapshot(roomId);

        if (!snapshot) {
          return Response.json({ error: 'Room not found' }, { status: 404 });
        }

        return Response.json(
          withViewer(
            roomId,
            snapshot,
            identity.participantKey,
            identity.user?.id ?? null
          )
        );
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
            }
          | {
              action: 'submit-move';
              roomId?: string;
              city?: CityData;
            }
          | {
              action: 'give-up';
              roomId?: string;
            }
          | {
              action: 'resolve-timeout';
              roomId?: string;
            }
          | {
              action: 'rematch';
              roomId?: string;
            };

        if (!body?.roomId?.trim()) {
          return Response.json({ error: 'Missing room id' }, { status: 400 });
        }

        const roomId = body.roomId.trim();
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
              roomId,
              hostDisplayName,
              hostUserId: identity.user?.id ?? null,
              hostParticipantKey: identity.participantKey
            });

            return Response.json(
              withViewer(
                roomId,
                snapshot,
                identity.participantKey,
                identity.user?.id ?? null
              ),
              { headers }
            );
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
              roomId,
              displayName,
              userId: identity.user?.id ?? null,
              participantKey: identity.participantKey
            });

            await publishRoomEvent(roomId, 'room.joined');

            return Response.json(
              withViewer(
                roomId,
                snapshot,
                identity.participantKey,
                identity.user?.id ?? null
              ),
              { headers }
            );
          }

          if (body.action === 'start') {
            const snapshot = await getMultiplayerRoomSnapshot(roomId);

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
              hostParticipant.id !== `host:${identity.participantKey}:${roomId}`
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

            const startedSnapshot = await startFriendRoom(roomId);

            await publishRoomEvent(roomId, 'game.started');
            await publishRoomEvent(roomId, 'game.updated');

            return Response.json(
              withViewer(
                roomId,
                startedSnapshot,
                identity.participantKey,
                identity.user?.id ?? null
              ),
              { headers }
            );
          }

          if (body.action === 'submit-move') {
            if (!body.city?.name) {
              return Response.json({ error: 'Missing city' }, { status: 400 });
            }

            const snapshot = await submitFriendRoomMove({
              roomId,
              city: body.city,
              participantKey: identity.participantKey,
              userId: identity.user?.id ?? null
            });

            await publishRoomEvent(roomId, 'game.updated');

            return Response.json(
              withViewer(
                roomId,
                snapshot,
                identity.participantKey,
                identity.user?.id ?? null
              ),
              { headers }
            );
          }

          if (body.action === 'give-up') {
            const snapshot = await giveUpFriendRoom({
              roomId,
              participantKey: identity.participantKey,
              userId: identity.user?.id ?? null
            });

            await publishRoomEvent(roomId, 'game.updated');

            return Response.json(
              withViewer(
                roomId,
                snapshot,
                identity.participantKey,
                identity.user?.id ?? null
              ),
              { headers }
            );
          }

          if (body.action === 'resolve-timeout') {
            const snapshot = await resolveFriendRoomTimeout(roomId);

            await publishRoomEvent(roomId, 'game.updated');

            return Response.json(
              withViewer(
                roomId,
                snapshot,
                identity.participantKey,
                identity.user?.id ?? null
              ),
              { headers }
            );
          }

          if (body.action === 'rematch') {
            const current = await getMultiplayerRoomSnapshot(roomId);
            if (!current) {
              return Response.json(
                { error: 'Room not found' },
                { status: 404 }
              );
            }

            const viewer = withViewer(
              roomId,
              current,
              identity.participantKey,
              identity.user?.id ?? null
            );
            if (!viewer?.viewer) {
              return Response.json(
                { error: 'Only participants can rematch' },
                { status: 403, headers }
              );
            }

            const { snapshot, started } = await rematchFriendRoom(
              roomId,
              identity.participantKey,
              identity.user?.id ?? null
            );

            if (started) {
              await publishRoomEvent(roomId, 'game.rematch');
            }
            await publishRoomEvent(roomId, 'game.updated');

            return Response.json(
              withViewer(
                roomId,
                snapshot,
                identity.participantKey,
                identity.user?.id ?? null
              ),
              { headers }
            );
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
