import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Flag } from 'lucide-react'
import { useGameState } from '@/hooks/useGameState'
import { useGameStatus } from '@/context/gameStatus'
import WorldMap from '@/components/game/WorldMap'
import PlayerCard from '@/components/game/PlayerCard'
import CityInput from '@/components/game/CityInput'
import ChainStrip from '@/components/game/ChainStrip'
import GameOverScreen from '@/components/game/GameOverScreen'
import StartScreen from '@/components/game/StartScreen'

export const Route = createFileRoute('/play/local')({ component: LocalGame })

function LocalGame() {
  const navigate = useNavigate()
  const { setIsPlaying } = useGameStatus()
  const { state, submitCity, getRequiredLetter, startGame, rematch, exitGame, giveUp } =
    useGameState()

  const [focusCity, setFocusCity] = useState<{ lat: number; lng: number } | null>(null)
  // countdown: 3 → 2 → 1 → 0 ("GO!") → null (game running)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [pendingPlayers, setPendingPlayers] = useState<[string, string] | null>(null)

  const isActiveGame = state.started && !state.gameOver

  useEffect(() => {
    setIsPlaying(isActiveGame)
    return () => setIsPlaying(false)
  }, [isActiveGame, setIsPlaying])

  // Countdown tick
  useEffect(() => {
    if (countdown === null) return
    if (countdown < 0) {
      if (pendingPlayers) {
        startGame(pendingPlayers[0], pendingPlayers[1])
        setPendingPlayers(null)
      }
      setCountdown(null)
      return
    }
    const delay = countdown === 0 ? 700 : 1000
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), delay)
    return () => clearTimeout(t)
  }, [countdown, pendingPlayers, startGame])

  const handleStart = (p1: string, p2: string) => {
    setPendingPlayers([p1 || 'Player 1', p2 || 'Player 2'])
    setCountdown(3)
  }

  const handlePillClick = (index: number) => {
    const city = state.chain[index].city
    setFocusCity({ lat: city.lat, lng: city.lng })
    setTimeout(() => setFocusCity(null), 2000)
  }

  const handleExit = () => {
    exitGame()
    navigate({ to: '/play' })
  }

  return (
    <div className="min-h-screen overflow-hidden">
      <WorldMap chain={state.chain} focusCity={focusCity} />

      {!state.started && countdown === null && (
        <StartScreen onStart={handleStart} />
      )}

      {/* 3-2-1 countdown overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"
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
                    ? 'text-8xl text-secondary glow-cyan-text'
                    : 'text-[10rem] text-primary glow-amber-text'
                }`}
              >
                {countdown === 0 ? 'GO!' : countdown}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {isActiveGame && (
        <>
          {/* Top bar: clocks span full max-w-7xl */}
          <div className="fixed inset-x-0 top-0 z-30">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 pt-4">
              <PlayerCard
                name={state.players[0]}
                time={state.timers[0]}
                isActive={state.currentPlayer === 0}
                player={0}
              />
              <PlayerCard
                name={state.players[1]}
                time={state.timers[1]}
                isActive={state.currentPlayer === 1}
                player={1}
              />
            </div>
          </div>

          <CityInput
            requiredLetter={getRequiredLetter()}
            onSubmit={submitCity}
            currentPlayer={state.currentPlayer}
            playerName={state.players[state.currentPlayer]}
          />

          {/* Give Up — below the input, centered */}
          <div className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2">
            <button
              onClick={giveUp}
              className="flex items-center gap-2 rounded-xl border border-border/40 bg-card/70 px-5 py-2.5 text-sm font-semibold text-muted-foreground backdrop-blur-md transition-colors hover:border-destructive/60 hover:text-destructive"
            >
              <Flag size={14} />
              Give Up
            </button>
          </div>

          <ChainStrip chain={state.chain} onCityClick={handlePillClick} />
        </>
      )}

      {state.gameOver && state.loser !== null && (
        <GameOverScreen
          loser={state.loser}
          players={state.players}
          chain={state.chain}
          gameOverReason={state.gameOverReason}
          onRematch={rematch}
          onExit={handleExit}
        />
      )}
    </div>
  )
}
