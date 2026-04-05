import { useState, useCallback } from 'react';
import { type CityData, type ChainEntry } from '@/types/city';

export interface PracticeState {
  chain: ChainEntry[];
  started: boolean;
}

export function usePracticeState() {
  const [state, setState] = useState<PracticeState>({
    chain: [],
    started: false
  });

  const getRequiredLetter = useCallback((): string | null => {
    if (state.chain.length === 0) return null;
    const lastCity = state.chain[state.chain.length - 1].city.name;
    return lastCity[lastCity.length - 1].toUpperCase();
  }, [state.chain]);

  const startGame = useCallback(() => {
    setState({ chain: [], started: true });
  }, []);

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
        chain: [...prev.chain, { city }]
      }));

      return null;
    },
    [state.chain, getRequiredLetter]
  );

  const reset = useCallback(() => {
    setState({ chain: [], started: true });
  }, []);

  const exitGame = useCallback(() => {
    setState({ chain: [], started: false });
  }, []);

  return { state, startGame, submitCity, getRequiredLetter, reset, exitGame };
}
