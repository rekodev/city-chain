import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useGameState } from '@/hooks/useGameState'
import WorldMap from '@/components/game/WorldMap'
import PlayerCard from '@/components/game/PlayerCard'
import CityInput from '@/components/game/CityInput'
import ChainStrip from '@/components/game/ChainStrip'
import GameOverScreen from '@/components/game/GameOverScreen'
import StartScreen from '@/components/game/StartScreen'

export const Route = createFileRoute('/')({ component: Index })

function Index() {
  const { state, submitCity, getRequiredLetter, startGame, rematch } = useGameState()
  const [focusCity, setFocusCity] = useState<{ lat: number; lng: number } | null>(null)

  const handlePillClick = (index: number) => {
    const city = state.chain[index].city
    setFocusCity({ lat: city.lat, lng: city.lng })
    setTimeout(() => setFocusCity(null), 2000)
  }

  return (
    <div className="min-h-screen overflow-hidden">
      <WorldMap chain={state.chain} focusCity={focusCity} />

      {!state.started && <StartScreen onStart={startGame} />}

      {state.started && !state.gameOver && (
        <>
          <PlayerCard
            name={state.players[0]}
            time={state.timers[0]}
            isActive={state.currentPlayer === 0}
            player={0}
            position="left"
          />
          <PlayerCard
            name={state.players[1]}
            time={state.timers[1]}
            isActive={state.currentPlayer === 1}
            player={1}
            position="right"
          />
          <CityInput
            requiredLetter={getRequiredLetter()}
            onSubmit={submitCity}
            currentPlayer={state.currentPlayer}
            playerName={state.players[state.currentPlayer]}
          />
          <ChainStrip chain={state.chain} onCityClick={handlePillClick} />
        </>
      )}

      {state.gameOver && state.loser !== null && (
        <GameOverScreen
          loser={state.loser}
          players={state.players}
          chain={state.chain}
          onRematch={rematch}
        />
      )}
    </div>
  )
}
