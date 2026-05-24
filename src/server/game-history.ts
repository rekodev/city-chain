import { db } from '@/lib/db';
import { gameHistory } from '@/lib/db/schema';
import { type ChainEntry } from '@/types/city';
import { type GameMode } from '@/constants/gameMode';

type Participant = {
  userId: string | null;
  slot: number;
  displayName: string;
};

type SaveRoomGameHistoryParams = {
  gameType: 'friend';
  participants: Participant[];
  chain: ChainEntry[];
  gameMode: GameMode;
  loserSlot: number | null;
  gameOverReason: string | null;
  endedAt: Date;
};

export async function saveRoomGameHistory({
  gameType,
  participants,
  chain,
  gameMode,
  loserSlot,
  gameOverReason,
  endedAt
}: SaveRoomGameHistoryParams) {
  const authenticatedParticipants = participants.filter((p) => p.userId);
  if (authenticatedParticipants.length === 0) return;

  const players = participants.map((p) => ({
    name: p.displayName,
    slot: p.slot
  }));
  const chainLength = chain.length;

  const records = authenticatedParticipants.map((p) => ({
    id: crypto.randomUUID(),
    userId: p.userId!,
    gameType,
    gameMode,
    players,
    chain,
    chainLength,
    userSlot: p.slot,
    loserSlot: loserSlot ?? null,
    gameOverReason: gameOverReason ?? null,
    playedAt: endedAt
  }));

  await db.insert(gameHistory).values(records);
}
