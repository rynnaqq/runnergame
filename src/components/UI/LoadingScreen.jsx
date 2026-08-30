import { useProgress } from '@react-three/drei'

export default function LoadingScreen({ onRetry }) {
  const { progress, errors } = useProgress()

  if (errors.length > 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0b0e14] text-white">
        <p className="text-lg font-semibold">Asset loading failed.</p>
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[44px] min-w-[44px] rounded bg-sky-600 px-6 py-2 font-medium hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0b0e14] text-white">
      <p className="text-xl font-bold tracking-widest" aria-live="polite">RAILWAY RUSH</p>
      <div className="h-2 w-56 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-sky-400 transition-[width] duration-200" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-sm text-white/70">{Math.round(progress)}%</p>
    </div>
  )
}
