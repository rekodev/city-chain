import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { getMultiplayerRoomSnapshot } from '@/server/multiplayer-room';

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
    participants: snapshot.participants.map((p) => ({
      ...p,
      slot: p.slot as 0 | 1
    })),
    viewer: viewer
      ? {
          participantId: viewer.id,
          role: viewer.role,
          slot: viewer.slot as 0 | 1
        }
      : null
  };
}

export const getInitialFriendRoomSnapshot = createServerFn({ method: 'GET' })
  .inputValidator((roomId: string | null) => roomId)
  .handler(async ({ data: roomId }) => {
    if (!roomId) return null;

    const request = getRequest();
    const session = await auth.api.getSession({
      headers: request.headers
    });

    const user = session?.user ?? null;
    const existingGuestId = getCookieValue(
      request.headers.get('cookie'),
      GUEST_PLAYER_COOKIE
    );
    const guestId = existingGuestId || makeGuestPlayerId();
    const participantKey = user ? `user:${user.id}` : `guest:${guestId}`;
    const snapshot = await getMultiplayerRoomSnapshot(roomId);

    return withViewer(roomId, snapshot, participantKey, user?.id ?? null);
  });
