import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { type ChainEntry, type CityData } from '../../types/city';

type MultiplayerTimers = [number, number];
type MultiplayerGameOverReason =
  | 'timeout'
  | 'gave_up'
  | 'disconnect'
  | 'completed';

export const multiplayerRoomKind = pgEnum('multiplayer_room_kind', [
  'friend',
  'matchmaking'
]);

export const multiplayerRoomStatus = pgEnum('multiplayer_room_status', [
  'waiting',
  'ready',
  'active',
  'finished',
  'abandoned'
]);

export const multiplayerParticipantRole = pgEnum(
  'multiplayer_participant_role',
  ['host', 'player']
);

export const multiplayerGameStatus = pgEnum('multiplayer_game_status', [
  'waiting',
  'active',
  'finished'
]);

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull()
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' })
  },
  (table) => [index('session_userId_idx').on(table.userId)]
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [index('account_userId_idx').on(table.userId)]
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const multiplayerRoom = pgTable(
  'multiplayer_room',
  {
    id: text('id').primaryKey(),
    kind: multiplayerRoomKind('kind').notNull(),
    status: multiplayerRoomStatus('status').default('waiting').notNull(),
    hostUserId: text('host_user_id').references(() => user.id, {
      onDelete: 'set null'
    }),
    hostDisplayName: text('host_display_name').notNull(),
    startedAt: timestamp('started_at'),
    endedAt: timestamp('ended_at'),
    lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [
    index('multiplayer_room_kind_idx').on(table.kind),
    index('multiplayer_room_status_idx').on(table.status),
    index('multiplayer_room_hostUserId_idx').on(table.hostUserId)
  ]
);

export const multiplayerRoomParticipant = pgTable(
  'multiplayer_room_participant',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id')
      .notNull()
      .references(() => multiplayerRoom.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, {
      onDelete: 'set null'
    }),
    role: multiplayerParticipantRole('role').default('player').notNull(),
    slot: integer('slot').notNull(),
    displayName: text('display_name').notNull(),
    isGuest: boolean('is_guest').default(false).notNull(),
    isReady: boolean('is_ready').default(false).notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
    leftAt: timestamp('left_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [
    index('multiplayer_room_participant_roomId_idx').on(table.roomId),
    index('multiplayer_room_participant_userId_idx').on(table.userId),
    uniqueIndex('multiplayer_room_participant_roomId_slot_idx').on(
      table.roomId,
      table.slot
    )
  ]
);

export const multiplayerRoomState = pgTable(
  'multiplayer_room_state',
  {
    roomId: text('room_id')
      .primaryKey()
      .references(() => multiplayerRoom.id, { onDelete: 'cascade' }),
    status: multiplayerGameStatus('status').default('waiting').notNull(),
    chain: jsonb('chain')
      .$type<ChainEntry[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    timers: jsonb('timers')
      .$type<MultiplayerTimers>()
      .default(sql`'[60, 60]'::jsonb`)
      .notNull(),
    currentTurnSlot: integer('current_turn_slot').default(0).notNull(),
    version: integer('version').default(0).notNull(),
    gameOverReason: text('game_over_reason').$type<MultiplayerGameOverReason>(),
    startedAt: timestamp('started_at'),
    endedAt: timestamp('ended_at'),
    lastMoveAt: timestamp('last_move_at'),
    rematchRequestedBySlot: integer('rematch_requested_by_slot'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [index('multiplayer_room_state_status_idx').on(table.status)]
);

export const multiplayerMove = pgTable(
  'multiplayer_move',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id')
      .notNull()
      .references(() => multiplayerRoom.id, { onDelete: 'cascade' }),
    participantId: text('participant_id')
      .notNull()
      .references(() => multiplayerRoomParticipant.id, { onDelete: 'cascade' }),
    turnNumber: integer('turn_number').notNull(),
    playerSlot: integer('player_slot').notNull(),
    city: jsonb('city').$type<CityData>().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    index('multiplayer_move_roomId_idx').on(table.roomId),
    index('multiplayer_move_participantId_idx').on(table.participantId),
    uniqueIndex('multiplayer_move_roomId_turnNumber_idx').on(
      table.roomId,
      table.turnNumber
    )
  ]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  hostedMultiplayerRooms: many(multiplayerRoom),
  multiplayerParticipants: many(multiplayerRoomParticipant)
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id]
  })
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id]
  })
}));

export const multiplayerRoomRelations = relations(
  multiplayerRoom,
  ({ many, one }) => ({
    hostUser: one(user, {
      fields: [multiplayerRoom.hostUserId],
      references: [user.id]
    }),
    participants: many(multiplayerRoomParticipant),
    state: one(multiplayerRoomState),
    moves: many(multiplayerMove)
  })
);

export const multiplayerRoomParticipantRelations = relations(
  multiplayerRoomParticipant,
  ({ many, one }) => ({
    room: one(multiplayerRoom, {
      fields: [multiplayerRoomParticipant.roomId],
      references: [multiplayerRoom.id]
    }),
    user: one(user, {
      fields: [multiplayerRoomParticipant.userId],
      references: [user.id]
    }),
    moves: many(multiplayerMove)
  })
);

export const multiplayerRoomStateRelations = relations(
  multiplayerRoomState,
  ({ one }) => ({
    room: one(multiplayerRoom, {
      fields: [multiplayerRoomState.roomId],
      references: [multiplayerRoom.id]
    })
  })
);

export const multiplayerMoveRelations = relations(
  multiplayerMove,
  ({ one }) => ({
    room: one(multiplayerRoom, {
      fields: [multiplayerMove.roomId],
      references: [multiplayerRoom.id]
    }),
    participant: one(multiplayerRoomParticipant, {
      fields: [multiplayerMove.participantId],
      references: [multiplayerRoomParticipant.id]
    })
  })
);
