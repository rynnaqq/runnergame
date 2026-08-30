import { useEffect, useRef } from 'react'
import { useGameStore } from '../../store/useGameStore.js'

export default function GameOverModal() {
  const isGameOver = useGameStore((s) => s.isGameOver)
  const score = useGameStore((s) => s.score)
  const highScore = useGameStore((s) => s.highScore)
  const coins = useGameStore((s) => s.coins)
  const restart = useGameStore((s) => s.restart)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (isGameOver) buttonRef.current?.focus()
  }, [isGameOver])

  if (!isGameOver) return null

  const isNewBest = score > 0 && score >= highScore

  const handleRestart = () => {
    restart()
    document.getElementById('game-region')?.focus()
  }

  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Game over"
    >
      <div className="w-full max-w-xs rounded-lg bg-[#131a26] p-6 text-white shadow-xl">
        <h2 className="text-center text-2xl font-bold">RUN OVER</h2>
        {isNewBest && (
          <p className="mt-1 text-center text-sm font-semibold text-amber-400" aria-live="polite">
            NEW BEST!
          </p>
        )}
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-white/70">Score</dt>
            <dd className="font-bold" aria-live="polite">{Math.floor(score)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/70">Best</dt>
            <dd className="font-bold">{Math.floor(highScore)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/70">Coins</dt>
            <dd className="font-bold">{coins}</dd>
          </div>
        </dl>
        <button
          ref={buttonRef}
          type="button"
          onClick={handleRestart}
          className="mt-5 min-h-[44px] w-full rounded bg-sky-600 px-4 py-3 font-semibold hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Run again"
        >
          Run again
        </button>
      </div>
    </div>
  )
}
