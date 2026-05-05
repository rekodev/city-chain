import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  multiplayerMove,
  multiplayerRoom,
  multiplayerRoomParticipant,
  multiplayerRoomState
} from '@/lib/db/schema';
import { type CityData, type ChainEntry } from '@/types/city';
import type { NeonTransaction } from '#/types/neon';

type RoomRecord = typeof multiplayerRoom.$inferSelect;
type RoomStateRecord = typeof multiplayerRoomState.$inferSelect;
type ParticipantRecord = typeof multiplayerRoomParticipant.$inferSelect;
type RoomQueryClient = typeof db | NeonTransaction;

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
  chain: ChainEntry[];
  timers: [number, number];
  currentTurnSlot: 0 | 1;
  version: number;
  gameOverReason: 'timeout' | 'gave_up' | 'disconnect' | 'completed' | null;
  startedAt: string | null;
  endedAt: string | null;
  lastMoveAt: string | null;
  rematchRequestedBySlot: 0 | 1 | null;
};

function serializeDate(value: Date | null) {
  return value ? value.toISOString() : null;
}

function mapSnapshot(
  room: RoomRecord,
  state: RoomStateRecord,
  participants: ParticipantRecord[]
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
        slot: participant.slot as 0 | 1,
        displayName: participant.displayName,
        isGuest: participant.isGuest,
        isReady: participant.isReady,
        userId: participant.userId
      })),
    chain: state.chain,
    timers: state.timers,
    currentTurnSlot: state.currentTurnSlot as 0 | 1,
    version: state.version,
    gameOverReason: state.gameOverReason ?? null,
    startedAt: serializeDate(state.startedAt),
    endedAt: serializeDate(state.endedAt),
    lastMoveAt: serializeDate(state.lastMoveAt),
    rematchRequestedBySlot: (state.rematchRequestedBySlot ?? null) as
      | 0
      | 1
      | null
  };
}

function getParticipantId(
  roomId: string,
  participantKey: string,
  role: 'host' | 'player'
) {
  return `${role}:${participantKey}:${roomId}`;
}

function getRequiredLetter(chain: ChainEntry[]) {
  if (chain.length === 0) return null;

  const lastCity = chain[chain.length - 1]?.city.name ?? '';
  return lastCity[lastCity.length - 1]?.toUpperCase() ?? null;
}

function applyElapsedToTimers(state: RoomStateRecord, now: Date) {
  const anchor = state.lastMoveAt ?? state.startedAt ?? now;
  const elapsedSeconds = Math.max(0, (now.getTime() - anchor.getTime()) / 1000);
  const timers: [number, number] = [...state.timers] as [number, number];

  timers[state.currentTurnSlot] = Math.max(
    0,
    Number((timers[state.currentTurnSlot] - elapsedSeconds).toFixed(1))
  );

  return {
    timers,
    expired: timers[state.currentTurnSlot] <= 0
  };
}

async function getRoomBundle(
  client: RoomQueryClient,
  roomId: string
): Promise<{
  room: RoomRecord;
  state: RoomStateRecord;
  participants: ParticipantRecord[];
} | null> {
  const [room] = await client
    .select()
    .from(multiplayerRoom)
    .where(eq(multiplayerRoom.id, roomId))
    .limit(1);

  if (!room) return null;

  const [state] = await client
    .select()
    .from(multiplayerRoomState)
    .where(eq(multiplayerRoomState.roomId, roomId))
    .limit(1);

  if (!state) return null;

  const participants = await client
    .select()
    .from(multiplayerRoomParticipant)
    .where(eq(multiplayerRoomParticipant.roomId, roomId));

  return { room, state, participants };
}

async function getViewerParticipant(
  client: RoomQueryClient,
  roomId: string,
  userId: string | null,
  participantKey: string
) {
  const [participant] = userId
    ? await client
        .select()
        .from(multiplayerRoomParticipant)
        .where(
          and(
            eq(multiplayerRoomParticipant.roomId, roomId),
            eq(multiplayerRoomParticipant.userId, userId)
          )
        )
        .limit(1)
    : await client
        .select()
        .from(multiplayerRoomParticipant)
        .where(
          eq(
            multiplayerRoomParticipant.id,
            getParticipantId(roomId, participantKey, 'player')
          )
        )
        .limit(1);

  if (participant) return participant;

  const [hostParticipant] = await client
    .select()
    .from(multiplayerRoomParticipant)
    .where(
      eq(
        multiplayerRoomParticipant.id,
        getParticipantId(roomId, participantKey, 'host')
      )
    )
    .limit(1);

  return hostParticipant ?? null;
}

async function finishRoom(
  tx: NeonTransaction,
  roomId: string,
  state: RoomStateRecord,
  timers: [number, number],
  reason: 'timeout' | 'gave_up' | 'disconnect',
  endedAt: Date
) {
  await tx
    .update(multiplayerRoom)
    .set({
      status: 'finished',
      endedAt,
      lastActivityAt: endedAt,
      updatedAt: endedAt
    })
    .where(eq(multiplayerRoom.id, roomId));

  await tx
    .update(multiplayerRoomState)
    .set({
      status: 'finished',
      timers,
      gameOverReason: reason,
      endedAt,
      lastMoveAt: endedAt,
      version: state.version + 1,
      updatedAt: endedAt
    })
    .where(eq(multiplayerRoomState.roomId, roomId));
}

const STALE_ROOM_TIMEOUT_MS = 30 * 60 * 1000;
const STALE_LOBBY_TIMEOUT_MS = 24 * 60 * 60 * 1000;

export async function getMultiplayerRoomSnapshot(roomId: string) {
  const bundle = await getRoomBundle(db, roomId);
  if (!bundle) return null;

  const { room, state, participants } = bundle;

  if (room.status === 'active') {
    const lastActivity = room.lastActivityAt ?? room.startedAt;
    const isStale =
      lastActivity &&
      Date.now() - lastActivity.getTime() > STALE_ROOM_TIMEOUT_MS;

    if (isStale) {
      const endedAt = new Date();
      const { timers } = applyElapsedToTimers(state, endedAt);
      await db.transaction(async (tx) => {
        const [fresh] = await tx
          .select()
          .from(multiplayerRoom)
          .where(eq(multiplayerRoom.id, roomId))
          .limit(1);
        if (fresh?.status === 'active') {
          await finishRoom(tx, roomId, state, timers, 'disconnect', endedAt);
        }
      });
      return getMultiplayerRoomSnapshot(roomId);
    }
  }

  if (room.status === 'waiting' || room.status === 'ready') {
    const lastActivity = room.lastActivityAt ?? room.createdAt;
    const isStale =
      lastActivity &&
      Date.now() - lastActivity.getTime() > STALE_LOBBY_TIMEOUT_MS;

    if (isStale) {
      const now = new Date();
      await db.transaction(async (tx) => {
        const [fresh] = await tx
          .select()
          .from(multiplayerRoom)
          .where(eq(multiplayerRoom.id, roomId))
          .limit(1);
        if (fresh?.status === 'waiting' || fresh?.status === 'ready') {
          await tx
            .update(multiplayerRoom)
            .set({ status: 'abandoned', lastActivityAt: now, updatedAt: now })
            .where(eq(multiplayerRoom.id, roomId));
          await tx
            .update(multiplayerRoomState)
            .set({ status: 'finished', endedAt: now, updatedAt: now })
            .where(eq(multiplayerRoomState.roomId, roomId));
        }
      });
      return getMultiplayerRoomSnapshot(roomId);
    }
  }

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
    id: getParticipantId(roomId, hostParticipantKey, 'host'),
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

  const expectedParticipantId = getParticipantId(
    roomId,
    participantKey,
    'player'
  );

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
  const now = new Date();
  const countdownEnd = new Date(now.getTime() + 3700);

  await db
    .update(multiplayerRoom)
    .set({
      status: 'active',
      startedAt: now,
      lastActivityAt: now,
      updatedAt: now
    })
    .where(eq(multiplayerRoom.id, roomId));

  await db
    .update(multiplayerRoomState)
    .set({
      status: 'active',
      chain: [],
      timers: [60, 60],
      currentTurnSlot: 0,
      version: 0,
      gameOverReason: null,
      startedAt: now,
      endedAt: null,
      lastMoveAt: countdownEnd,
      updatedAt: now
    })
    .where(eq(multiplayerRoomState.roomId, roomId));

  return getMultiplayerRoomSnapshot(roomId);
}

export async function rematchFriendRoom(
  roomId: string,
  participantKey: string,
  userId: string | null
) {
  const now = new Date();
  const countdownEnd = new Date(now.getTime() + 3700);

  return db.transaction(async (tx) => {
    const bundle = await getRoomBundle(tx, roomId);
    if (!bundle) throw new Error('Room not found');

    if (bundle.room.status !== 'finished') {
      return {
        snapshot: mapSnapshot(bundle.room, bundle.state, bundle.participants),
        started: false
      };
    }

    const viewer = await getViewerParticipant(
      tx,
      roomId,
      userId,
      participantKey
    );
    if (!viewer) throw new Error('You are not part of this room');

    const mySlot = viewer.slot as 0 | 1;
    const currentRequest = bundle.state.rematchRequestedBySlot;

    if (currentRequest === mySlot) {
      return {
        snapshot: mapSnapshot(bundle.room, bundle.state, bundle.participants),
        started: false
      };
    }

    if (currentRequest !== null && currentRequest !== mySlot) {
      await tx
        .delete(multiplayerMove)
        .where(eq(multiplayerMove.roomId, roomId));

      await tx
        .update(multiplayerRoom)
        .set({
          status: 'active',
          startedAt: now,
          lastActivityAt: now,
          updatedAt: now
        })
        .where(eq(multiplayerRoom.id, roomId));

      await tx
        .update(multiplayerRoomState)
        .set({
          status: 'active',
          chain: [],
          timers: [60, 60],
          currentTurnSlot: 0,
          version: 0,
          gameOverReason: null,
          rematchRequestedBySlot: null,
          startedAt: now,
          endedAt: null,
          lastMoveAt: countdownEnd,
          updatedAt: now
        })
        .where(eq(multiplayerRoomState.roomId, roomId));

      const updated = await getRoomBundle(tx, roomId);
      if (!updated) throw new Error('Room not found after rematch');
      return {
        snapshot: mapSnapshot(
          updated.room,
          updated.state,
          updated.participants
        ),
        started: true
      };
    }

    await tx
      .update(multiplayerRoomState)
      .set({ rematchRequestedBySlot: mySlot, updatedAt: now })
      .where(eq(multiplayerRoomState.roomId, roomId));

    const updated = await getRoomBundle(tx, roomId);
    if (!updated) throw new Error('Room not found');
    return {
      snapshot: mapSnapshot(updated.room, updated.state, updated.participants),
      started: false
    };
  });
}

export async function submitFriendRoomMove({
  roomId,
  city,
  participantKey,
  userId
}: {
  roomId: string;
  city: CityData;
  participantKey: string;
  userId: string | null;
}) {
  return db.transaction(async (tx) => {
    const bundle = await getRoomBundle(tx, roomId);
    if (!bundle) {
      throw new Error('Room not found');
    }

    const { room, state, participants } = bundle;
    if (room.status !== 'active' || state.status !== 'active') {
      throw new Error('Room is not active');
    }

    const viewer = await getViewerParticipant(
      tx,
      roomId,
      userId,
      participantKey
    );
    if (!viewer) {
      throw new Error('You are not part of this room');
    }

    if (viewer.slot !== state.currentTurnSlot) {
      throw new Error('It is not your turn');
    }

    const now = new Date();
    const { timers, expired } = applyElapsedToTimers(state, now);

    if (expired) {
      throw new Error('Turn timed out');
    }

    if (
      state.chain.some(
        (entry) => entry.city.name.toLowerCase() === city.name.toLowerCase()
      )
    ) {
      throw new Error('City already used');
    }

    const requiredLetter = getRequiredLetter(state.chain);
    if (requiredLetter && city.name[0]?.toUpperCase() !== requiredLetter) {
      throw new Error(`City must start with "${requiredLetter}"`);
    }

    const nextTurnSlot = (state.currentTurnSlot === 0 ? 1 : 0) as 0 | 1;
    const nextChain = [...state.chain, { city, player: viewer.slot as 0 | 1 }];
    const nextVersion = state.version + 1;

    await tx.insert(multiplayerMove).values({
      id: crypto.randomUUID(),
      roomId,
      participantId: viewer.id,
      turnNumber: state.chain.length,
      playerSlot: viewer.slot,
      city
    });

    await tx
      .update(multiplayerRoomState)
      .set({
        chain: nextChain,
        timers,
        currentTurnSlot: nextTurnSlot,
        version: nextVersion,
        lastMoveAt: now,
        updatedAt: now
      })
      .where(eq(multiplayerRoomState.roomId, roomId));

    await tx
      .update(multiplayerRoom)
      .set({
        lastActivityAt: now,
        updatedAt: now
      })
      .where(eq(multiplayerRoom.id, roomId));

    return mapSnapshot(
      room,
      {
        ...state,
        chain: nextChain,
        timers,
        currentTurnSlot: nextTurnSlot,
        version: nextVersion,
        lastMoveAt: now,
        updatedAt: now
      },
      participants
    );
  });
}

export async function giveUpFriendRoom({
  roomId,
  participantKey,
  userId
}: {
  roomId: string;
  participantKey: string;
  userId: string | null;
}) {
  return db.transaction(async (tx) => {
    const bundle = await getRoomBundle(tx, roomId);
    if (!bundle) {
      throw new Error('Room not found');
    }

    const { room, state, participants } = bundle;
    if (room.status !== 'active' || state.status !== 'active') {
      throw new Error('Room is not active');
    }

    const viewer = await getViewerParticipant(
      tx,
      roomId,
      userId,
      participantKey
    );
    if (!viewer) {
      throw new Error('You are not part of this room');
    }

    const endedAt = new Date();
    const { timers } = applyElapsedToTimers(state, endedAt);

    await finishRoom(tx, roomId, state, timers, 'gave_up', endedAt);

    return mapSnapshot(
      {
        ...room,
        status: 'finished',
        endedAt,
        lastActivityAt: endedAt,
        updatedAt: endedAt
      },
      {
        ...state,
        status: 'finished',
        timers,
        gameOverReason: 'gave_up',
        endedAt,
        lastMoveAt: endedAt,
        version: state.version + 1,
        updatedAt: endedAt
      },
      participants
    );
  });
}

export async function resolveFriendRoomTimeout(roomId: string) {
  return db.transaction(async (tx) => {
    const bundle = await getRoomBundle(tx, roomId);
    if (!bundle) {
      throw new Error('Room not found');
    }

    const { room, state, participants } = bundle;
    if (room.status !== 'active' || state.status !== 'active') {
      return mapSnapshot(room, state, participants);
    }

    const endedAt = new Date();
    const { timers, expired } = applyElapsedToTimers(state, endedAt);

    if (!expired) {
      return mapSnapshot(room, state, participants);
    }

    await finishRoom(tx, roomId, state, timers, 'timeout', endedAt);

    return mapSnapshot(
      {
        ...room,
        status: 'finished',
        endedAt,
        lastActivityAt: endedAt,
        updatedAt: endedAt
      },
      {
        ...state,
        status: 'finished',
        timers,
        gameOverReason: 'timeout',
        endedAt,
        lastMoveAt: endedAt,
        version: state.version + 1,
        updatedAt: endedAt
      },
      participants
    );
  });
}
