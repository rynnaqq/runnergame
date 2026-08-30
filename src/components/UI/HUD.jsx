import { useGameStore, RUN } from '../../store/useGameStore.js'
import { CONFIG } from '../../config.js'

// Each metric subscribes to its own slice so unrelated updates never
// re-render it (store writes are throttled to CONFIG.hudHz).

function Score() {
  const score = useGameStore((s) => s.score)
  return (
    <div className="rounded bg-black/50 px-3 py-1 text-white" aria-live="polite">
      <span className="text-[10px] uppercase tracking-wider text-white/60">Score </span>
      <span className="font-bold tabular-nums">{Math.floor(score)}</span>
    </div>
  )
}

function Coins() {
  const coins = useGameStore((s) => s.coins)
  return (
    <div className="rounded bg-black/50 px-3 py-1 text-amber-300">
      <span className="text-[10px] uppercase tracking-wider text-amber-200/60">Coins </span>
      <span className="font-bold tabular-nums">{coins}</span>
    </div>
  )
}

function Multiplier() {
  const multiplier = useGameStore((s) => s.multiplier)
  return (
    <div className="rounded bg-black/50 px-3 py-1 text-emerald-300">
      <span className="font-bold tabular-nums">{multiplier}x</span>
    </div>
  )
}

function Speed() {
  const speed = useGameStore((s) => s.speed)
  return (
    <div className="rounded bg-black/50 px-3 py-1 text-white">
      <span className="text-[10px] uppercase tracking-wider text-white/60">Speed </span>
      <span className="font-bold tabular-nums">{Math.round(speed * 3.6)}</span>
      <div className="mt-0.5 h-1 w-16 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full bg-sky-400"
          style={{ width: `${Math.min(100, (speed / CONFIG.speedMax) * 100)}%` }}
        />
      </div>
    </div>
  )
}

function ReadyOverlay() {
  const start = useGameStore((s) => s.start)
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/40 p-6 text-white">
      <h1 className="text-4xl font-black tracking-widest drop-shadow md:text-5xl">RAILWAY RUSH</h1>
      <div className="rounded bg-black/60 px-5 py-4 text-center text-sm leading-6">
        <p><b>Move</b> — Left/Right arrows, A/D, or swipe sideways</p>
        <p><b>Jump</b> — Up arrow, W, Space, or swipe up</p>
        <p><b>Slide</b> — Down arrow, S, or swipe down</p>
      </div>
      <button
        type="button"
        onClick={start}
        className="min-h-[44px] rounded bg-sky-600 px-8 py-3 font-semibold hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        Tap to start
      </button>
      <p className="text-xs text-white/70">or press any arrow key</p>
    </div>
  )
}

export default function HUD() {
  const runState = useGameStore((s) => s.runState)
  if (runState === RUN.LOADING || runState === RUN.ERROR) return null
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 flex justify-center gap-2 p-3"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      {runState === RUN.RUNNING || runState === RUN.CRASHED ? (
        <div className="pointer-events-none flex flex-wrap justify-center gap-2">
          <Score />
          <Coins />
          <Multiplier />
          <Speed />
        </div>
      ) : null}
      {runState === RUN.READY && (
        <div className="pointer-events-auto absolute inset-0">
          <ReadyOverlay />
        </div>
      )}
    </div>
  )
}
