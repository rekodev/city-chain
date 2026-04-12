import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  multiplayerRoom,
  multiplayerRoomParticipant,
  multiplayerRoomState
} from '@/lib/db/schema';

export type MultiplayerRoomSnapshot = {
  roomId: string;
  roomStatus: 'waiting' | 'ready' | 'active' | 'finished' | 'abandoned';
  gameStatus: 'waiting' | 'active' | 'finished';
  participants: Array<{
    id: string;
    role: 'host' | 'player';
    slot: number;
    displayName: string;
    isGuest: boolean;
    isReady: boolean;
    userId: string | null;
  }>;
};

function mapSnapshot(
  room: typeof multiplayerRoom.$inferSelect,
  state: typeof multiplayerRoomState.$inferSelect,
  participants: Array<typeof multiplayerRoomParticipant.$inferSelect>
): MultiplayerRoomSnapshot {
  return {
    roomId: room.id,
    roomStatus: room.status,
    gameStatus: state.status,
    participants: participants
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((participant) => ({
        id: participant.id,
        role: participant.role,
        slot: participant.slot,
        displayName: participant.displayName,
        isGuest: participant.isGuest,
        isReady: participant.isReady,
        userId: participant.userId
      }))
  };
}

export async function getMultiplayerRoomSnapshot(roomId: string) {
  const [room] = await db
    .select()
    .from(multiplayerRoom)
    .where(eq(multiplayerRoom.id, roomId))
    .limit(1);

  if (!room) return null;

  const [state] = await db
    .select()
    .from(multiplayerRoomState)
    .where(eq(multiplayerRoomState.roomId, roomId))
    .limit(1);

  const participants = await db
    .select()
    .from(multiplayerRoomParticipant)
    .where(eq(multiplayerRoomParticipant.roomId, roomId));

  if (!state) return null;

  return mapSnapshot(room, state, participants);
}

export async function ensureFriendRoom({
  roomId,
  hostDisplayName,
  hostUserId,
  hostParticipantKey
}: {
  roomId: string;
  hostDisplayName: string;
  hostUserId: string | null;
  hostParticipantKey: string;
}) {
  const existing = await getMultiplayerRoomSnapshot(roomId);
  if (existing) return existing;

  await db.insert(multiplayerRoom).values({
    id: roomId,
    kind: 'friend',
    status: 'waiting',
    hostUserId,
    hostDisplayName
  });

  await db.insert(multiplayerRoomState).values({
    roomId,
    status: 'waiting'
  });

  await db.insert(multiplayerRoomParticipant).values({
    id: `host:${hostParticipantKey}:${roomId}`,
    roomId,
    userId: hostUserId,
    role: 'host',
    slot: 0,
    displayName: hostDisplayName,
    isGuest: !hostUserId,
    isReady: true
  });

  return getMultiplayerRoomSnapshot(roomId);
}

export async function joinFriendRoom({
  roomId,
  displayName,
  userId,
  participantKey
}: {
  roomId: string;
  displayName: string;
  userId: string | null;
  participantKey: string;
}) {
  const [room] = await db
    .select()
    .from(multiplayerRoom)
    .where(eq(multiplayerRoom.id, roomId))
    .limit(1);

  if (!room) {
    throw new Error('Room not found');
  }

  const expectedParticipantId = `player:${participantKey}:${roomId}`;

  const existingByUser = userId
    ? await db
        .select()
        .from(multiplayerRoomParticipant)
        .where(
          and(
            eq(multiplayerRoomParticipant.roomId, roomId),
            eq(multiplayerRoomParticipant.userId, userId)
          )
        )
        .limit(1)
    : await db
        .select()
        .from(multiplayerRoomParticipant)
        .where(eq(multiplayerRoomParticipant.id, expectedParticipantId))
        .limit(1);

  const [existingSlotOne] = await db
    .select()
    .from(multiplayerRoomParticipant)
    .where(
      and(
        eq(multiplayerRoomParticipant.roomId, roomId),
        eq(multiplayerRoomParticipant.slot, 1)
      )
    )
    .limit(1);

  if (!existingByUser[0] && existingSlotOne) {
    throw new Error('Room is full');
  }

  if (existingByUser[0]) {
    await db
      .update(multiplayerRoomParticipant)
      .set({
        displayName,
        isReady: true,
        leftAt: null,
        lastSeenAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(multiplayerRoomParticipant.id, existingByUser[0].id));
  } else {
    await db.insert(multiplayerRoomParticipant).values({
      id: expectedParticipantId,
      roomId,
      userId,
      role: 'player',
      slot: 1,
      displayName,
      isGuest: !userId,
      isReady: true
    });
  }

  await db
    .update(multiplayerRoom)
    .set({
      status: 'ready',
      lastActivityAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(multiplayerRoom.id, roomId));

  return getMultiplayerRoomSnapshot(roomId);
}

export async function startFriendRoom(roomId: string) {
  await db
    .update(multiplayerRoom)
    .set({
      status: 'active',
      startedAt: new Date(),
      lastActivityAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(multiplayerRoom.id, roomId));

  await db
    .update(multiplayerRoomState)
    .set({
      status: 'active',
      startedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(multiplayerRoomState.roomId, roomId));

  return getMultiplayerRoomSnapshot(roomId);
}
