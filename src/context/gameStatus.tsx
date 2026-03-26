import { createContext, useContext, useState } from 'react'

interface GameStatusContextType {
  isPlaying: boolean
  setIsPlaying: (v: boolean) => void
}

const GameStatusContext = createContext<GameStatusContextType>({
  isPlaying: false,
  setIsPlaying: () => {}
})

export function GameStatusProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  return (
    <GameStatusContext.Provider value={{ isPlaying, setIsPlaying }}>
      {children}
    </GameStatusContext.Provider>
  )
}

export const useGameStatus = () => useContext(GameStatusContext)
