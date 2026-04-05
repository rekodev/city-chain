import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flag } from 'lucide-react';

import { usePracticeState } from '@/hooks/usePracticeState';
import { useGameStatus } from '@/context/gameStatus';
import WorldMap from '@/components/game/WorldMap';
import ChainStrip from '@/components/game/ChainStrip';
import CityInput from '@/components/game/CityInput';

export const Route = createFileRoute('/play/practice')({
  component: PracticeGame
});

function PracticeGame() {
  const navigate = useNavigate();
  const { setIsPlaying } = useGameStatus();
  const { state, startGame, submitCity, getRequiredLetter, reset, exitGame } =
    usePracticeState();

  const [focusCity, setFocusCity] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [ended, setEnded] = useState(false);
  const [finalChainLength, setFinalChainLength] = useState(0);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown < 0) {
      startGame();
      setIsPlaying(true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCountdown(null);
      return;
    }
    const delay = countdown === 0 ? 700 : 1000;
    const t = setTimeout(
      () => setCountdown((c) => (c !== null ? c - 1 : null)),
      delay
    );
    return () => clearTimeout(t);
  }, [countdown, startGame, setIsPlaying]);

  const handlePillClick = (index: number) => {
    const city = state.chain[index].city;
    setFocusCity({ lat: city.lat, lng: city.lng });
    setTimeout(() => setFocusCity(null), 2000);
  };

  const handleQuit = () => {
    setFinalChainLength(state.chain.length);
    setEnded(true);
    setIsPlaying(false);
  };

  const handleReset = () => {
    setEnded(false);
    reset();
    setCountdown(3);
  };

  const handleMainMenu = () => {
    exitGame();
    setIsPlaying(false);
    navigate({ to: '/play' });
  };

  if (!state.started && countdown === null && !ended) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center">
        <p className="text-5xl">🎯</p>
        <h1 className="text-3xl font-bold">Practice Mode</h1>
        <p className="text-muted-foreground max-w-xs text-sm">
          Chain cities with no timer or opponent. Just you and the map.
        </p>
        <button
          onClick={() => setCountdown(3)}
          className="bg-primary text-primary-foreground rounded-xl px-8 py-3 text-lg font-bold transition-all hover:scale-105 hover:opacity-90"
        >
          Start
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden">
      <WorldMap chain={state.chain} focusCity={focusCity} />

      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-background/70 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={countdown}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className={`font-mono font-black tabular-nums select-none ${
                  countdown === 0
                    ? 'text-secondary glow-cyan-text text-8xl'
                    : 'text-primary glow-amber-text text-[10rem]'
                }`}
              >
                {countdown === 0 ? 'GO!' : countdown}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {ended && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="mx-4 w-full max-w-md text-center"
          >
            <div className="mb-4 text-6xl">🎯</div>
            <h2 className="text-primary glow-amber-text mb-2 text-3xl font-bold">
              Session Over
            </h2>
            <p className="text-foreground mb-8 font-mono text-lg">
              Chain length:{' '}
              <span className="text-primary font-bold">{finalChainLength}</span>{' '}
              cities
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={handleReset}
                className="bg-primary text-primary-foreground w-full rounded-xl px-8 py-3 text-lg font-bold transition-all hover:scale-105 hover:opacity-90 sm:w-auto"
              >
                Reset
              </button>
              <button
                onClick={handleMainMenu}
                className="border-border/50 bg-card/60 text-muted-foreground hover:border-border hover:text-foreground w-full rounded-xl border px-8 py-3 text-lg font-semibold backdrop-blur-sm transition-all sm:w-auto"
              >
                Main Menu
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {state.started && !ended && countdown === null && (
        <>
          <div className="fixed inset-x-0 top-0 z-30">
            <div className="mx-auto flex max-w-7xl items-center justify-center px-4 pt-4">
              <ChainStrip chain={state.chain} onCityClick={handlePillClick} />
            </div>
          </div>

          <CityInput
            requiredLetter={getRequiredLetter()}
            onSubmit={submitCity}
            currentPlayer={0}
            playerName="Practice"
          />

          <div className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2">
            <button
              onClick={handleQuit}
              className="border-border/40 bg-card/70 text-muted-foreground hover:border-destructive/60 hover:text-destructive flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold backdrop-blur-md transition-colors"
            >
              <Flag size={14} />
              Quit
            </button>
          </div>
        </>
      )}
    </div>
  );
}
