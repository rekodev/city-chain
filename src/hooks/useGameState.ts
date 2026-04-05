import { useState, useCallback, useRef, useEffect } from 'react';
import { type CityData } from '@/types/city';

export interface ChainEntry {
  city: CityData;
  player: 0 | 1;
}

export type GameOverReason = 'timeout' | 'gaveUp';

export interface GameState {
  chain: ChainEntry[];
  currentPlayer: 0 | 1;
  timers: [number, number];
  gameOver: boolean;
  loser: 0 | 1 | null;
  gameOverReason: GameOverReason | null;
  players: [string, string];
  started: boolean;
}

const TURN_TIME = 60;

export function useGameState() {
  const [state, setState] = useState<GameState>({
    chain: [],
    currentPlayer: 0,
    timers: [TURN_TIME, TURN_TIME],
    gameOver: false,
    loser: null,
    gameOverReason: null,
    players: ['Player 1', 'Player 2'],
    started: false
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.gameOver) return prev;
        const newTimers: [number, number] = [...prev.timers];
        newTimers[prev.currentPlayer] = Math.max(
          0,
          newTimers[prev.currentPlayer] - 0.1
        );
        if (newTimers[prev.currentPlayer] <= 0) {
          return {
            ...prev,
            timers: newTimers,
            gameOver: true,
            loser: prev.currentPlayer,
            gameOverReason: 'timeout'
          };
        }
        return { ...prev, timers: newTimers };
      });
    }, 100);
  }, [stopTimer]);

  const startGame = useCallback((p1: string, p2: string) => {
    setState({
      chain: [],
      currentPlayer: 0,
      timers: [TURN_TIME, TURN_TIME],
      gameOver: false,
      loser: null,
      gameOverReason: null,
      players: [p1 || 'Player 1', p2 || 'Player 2'],
      started: true
    });
  }, []);

  useEffect(() => {
    if (state.started && !state.gameOver) {
      startTimer();
    }
    if (state.gameOver) {
      stopTimer();
    }
    return stopTimer;
  }, [state.started, state.gameOver, startTimer, stopTimer]);

  const getRequiredLetter = useCallback((): string | null => {
    if (state.chain.length === 0) return null;
    const lastCity = state.chain[state.chain.length - 1].city.name;
    return lastCity[lastCity.length - 1].toUpperCase();
  }, [state.chain]);

  const submitCity = useCallback(
    (city: CityData): string | null => {
      if (
        state.chain.some(
          (e) => e.city.name.toLowerCase() === city.name.toLowerCase()
        )
      ) {
        return 'City already used';
      }

      const required = getRequiredLetter();
      if (required && city.name[0].toUpperCase() !== required) {
        return `City must start with "${required}"`;
      }

      setState((prev) => ({
        ...prev,
        chain: [...prev.chain, { city, player: prev.currentPlayer }],
        currentPlayer: prev.currentPlayer === 0 ? 1 : 0
      }));

      return null;
    },
    [state.chain, getRequiredLetter]
  );

  const giveUp = useCallback(() => {
    stopTimer();
    setState((prev) => ({
      ...prev,
      gameOver: true,
      loser: prev.currentPlayer,
      gameOverReason: 'gaveUp'
    }));
  }, [stopTimer]);

  const rematch = useCallback(() => {
    setState((prev) => ({
      chain: [],
      currentPlayer: 0,
      timers: [TURN_TIME, TURN_TIME],
      gameOver: false,
      loser: null,
      gameOverReason: null,
      players: prev.players,
      started: true
    }));
  }, []);

  const exitGame = useCallback(() => {
    stopTimer();
    setState({
      chain: [],
      currentPlayer: 0,
      timers: [TURN_TIME, TURN_TIME],
      gameOver: false,
      loser: null,
      gameOverReason: null,
      players: ['Player 1', 'Player 2'],
      started: false
    });
  }, [stopTimer]);

  return {
    state,
    submitCity,
    getRequiredLetter,
    startGame,
    rematch,
    exitGame,
    giveUp
  };
}
