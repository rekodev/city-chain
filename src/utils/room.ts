import { type GameOverReason } from '@/hooks/useGameState';
import { type ChainEntry } from '@/types/city';
import {
  type Participant,
  type LobbyPresenceData,
  type RoomSnapshot
} from '@/types/room';

export function makeRoomId() {
  const fromCrypto = globalThis.crypto
    ?.randomUUID?.()
    .replace(/-/g, '')
    .slice(0, 8);
  return (fromCrypto ?? Math.random().toString(36).slice(2, 10)).toUpperCase();
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function getParticipantFromPresence(
  members: Array<{ clientId?: string; data?: unknown }>,
  roomId: string,
  role: LobbyPresenceData['role']
): Participant | undefined {
  for (const member of [...members].reverse()) {
    const data = member.data;

    if (!data || typeof data !== 'object') continue;

    const candidate = data as Partial<LobbyPresenceData>;
    if (
      candidate.roomId !== roomId ||
      candidate.role !== role ||
      !candidate.name
    ) {
      continue;
    }

    return {
      name: candidate.name,
      subtitle:
        candidate.subtitle ||
        (role === 'host' ? 'Hosting this lobby' : 'Joined via invite link'),
      image: candidate.image
    };
  }

  return undefined;
}

export function getParticipantFromSnapshot(
  snapshot: RoomSnapshot | null,
  slot: 0 | 1,
  subtitle: string
): Participant | undefined {
  const participant = snapshot?.participants.find(
    (entry) => entry.slot === slot
  );

  if (!participant) return undefined;

  return {
    name: participant.displayName,
    subtitle,
    image: undefined
  };
}

export function formatConnectionState(state: string) {
  switch (state) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting';
    case 'disconnected':
      return 'Reconnecting';
    default:
      return state;
  }
}

export function getRequiredLetter(chain: ChainEntry[]) {
  if (chain.length === 0) return null;
  const lastCity = chain[chain.length - 1]?.city.name ?? '';
  return lastCity
    ? (lastCity[lastCity.length - 1]?.toUpperCase() ?? null)
    : null;
}

export function getCountdownValue(snapshot: RoomSnapshot | null, now: number) {
  if (snapshot?.gameStatus !== 'active' || !snapshot.startedAt) return null;

  const elapsed = now - new Date(snapshot.startedAt).getTime();
  if (elapsed < 0) return 3;
  if (elapsed < 1000) return 3;
  if (elapsed < 2000) return 2;
  if (elapsed < 3000) return 1;
  if (elapsed < 3700) return 0;
  return null;
}

export function getDerivedTimers(
  snapshot: RoomSnapshot | null,
  now: number
): [number, number] {
  if (!snapshot) return [60, 60];

  const timers: [number, number] = [...snapshot.timers];
  if (snapshot.gameStatus !== 'active' || !snapshot.lastMoveAt) return timers;

  const activeTimer = timers[snapshot.currentTurnSlot];
  if (activeTimer < 0) return timers;

  const elapsedSeconds = Math.max(
    0,
    (now - new Date(snapshot.lastMoveAt).getTime()) / 1000
  );

  timers[snapshot.currentTurnSlot] = Math.max(
    0,
    Number((activeTimer - elapsedSeconds).toFixed(1))
  );

  return timers;
}

export function getPlayers(snapshot: RoomSnapshot | null): [string, string] {
  const host = snapshot?.participants.find(
    (participant) => participant.slot === 0
  );
  const guest = snapshot?.participants.find(
    (participant) => participant.slot === 1
  );

  return [host?.displayName || 'Player 1', guest?.displayName || 'Player 2'];
}

export function mapGameOverReason(
  reason: RoomSnapshot['gameOverReason']
): GameOverReason | null {
  if (reason === 'timeout') return 'timeout';
  if (reason === 'gave_up') return 'gaveUp';
  return null;
}
