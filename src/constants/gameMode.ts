export type GameMode = '1min' | '5min' | '10min' | 'unlimited';

export const GAME_MODES: Array<{
  id: GameMode;
  label: string;
  turnTime: number | null;
}> = [
  { id: '1min', label: '1 min', turnTime: 60 },
  { id: '5min', label: '5 min', turnTime: 300 },
  { id: '10min', label: '10 min', turnTime: 600 },
  { id: 'unlimited', label: 'Unlimited', turnTime: null }
];

export const DEFAULT_GAME_MODE: GameMode = '1min';

export function getTurnTimeForMode(mode: GameMode): number | null {
  return GAME_MODES.find((m) => m.id === mode)?.turnTime ?? 60;
}

export function getModeLabel(mode: GameMode): string {
  return GAME_MODES.find((m) => m.id === mode)?.label ?? mode;
}

export const UNLIMITED_TIMER_SENTINEL = -1;
