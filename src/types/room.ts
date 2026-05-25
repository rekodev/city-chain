import { type ChainEntry } from '@/types/city';
import { type GameMode } from '@/constants/gameMode';

export type Participant = {
  name: string;
  subtitle: string;
  image?: string | null;
};

export type LobbyPresenceData = {
  roomId: string;
  role: 'host' | 'guest';
  name: string;
  subtitle: string;
  image?: string | null;
  isAuthenticated: boolean;
};

export type RoomSnapshot = {
  roomId: string;
  roomStatus: 'waiting' | 'ready' | 'active' | 'finished' | 'abandoned';
  gameStatus: 'waiting' | 'active' | 'finished';
  gameMode: GameMode;
  participants: Array<{
    id: string;
    role: 'host' | 'player';
    slot: 0 | 1;
    displayName: string;
    isGuest: boolean;
    isReady: boolean;
    userId: string | null;
  }>;
  viewer: {
    participantId: string;
    role: 'host' | 'player';
    slot: 0 | 1;
  } | null;
  chain: ChainEntry[];
  timers: [number, number];
  currentTurnSlot: 0 | 1;
  version: number;
  gameOverReason: 'timeout' | 'gave_up' | 'disconnect' | 'completed' | null;
  loserSlot: 0 | 1 | null;
  startedAt: string | null;
  endedAt: string | null;
  lastMoveAt: string | null;
  rematchRequestedBySlot: 0 | 1 | null;
};
