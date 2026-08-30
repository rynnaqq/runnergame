import { create } from 'zustand'
import { CONFIG } from '../config.js'

export const RUN = {
  LOADING: 'loading',
  READY: 'ready',
  RUNNING: 'running',
  CRASHED: 'crashed',
  GAMEOVER: 'gameOver',
  ERROR: 'error',
}

export function loadHighScore() {
  try {
    const raw = localStorage.getItem(CONFIG.highScoreKey)
    if (raw == null) return 0
    const n = Number(JSON.parse(raw))
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
  } catch {
    return 0
  }
}

export function saveHighScore(n) {
  try {
    localStorage.setItem(CONFIG.highScoreKey, JSON.stringify(n))
  } catch {
    /* storage unavailable: score still lives for this session */
  }
}

export const useGameStore = create((set) => ({
  runState: RUN.LOADING,
  isGameOver: false,
  speed: 0,
  score: 0,
  coins: 0,
  multiplier: 1,
  highScore: 0,
  isHoverboardActive: false,
  runId: 0,

  setReady: () => set((s) => (s.runState === RUN.LOADING ? { runState: RUN.READY } : {})),
  start: () => set((s) => (s.runState === RUN.READY ? { runState: RUN.RUNNING, speed: CONFIG.speedStart } : {})),
  crash: () => set((s) => (s.runState === RUN.RUNNING ? { runState: RUN.CRASHED } : {})),
  endRun: () =>
    set((s) => {
      if (s.runState !== RUN.CRASHED) return {}
      const highScore = s.score > s.highScore ? Math.floor(s.score) : s.highScore
      if (highScore !== s.highScore) saveHighScore(highScore)
      return { runState: RUN.GAMEOVER, isGameOver: true, highScore }
    }),
  restart: () =>
    set((s) => (s.runState === RUN.GAMEOVER
      ? { runState: RUN.READY, isGameOver: false, speed: 0, score: 0, coins: 0, multiplier: 1, isHoverboardActive: false, runId: s.runId + 1 }
      : {})),
  addCoin: () => set((s) => (s.runState === RUN.RUNNING ? { coins: s.coins + 1, score: s.score + CONFIG.coinScore * s.multiplier } : {})),
  addScore: (dist) => set((s) => (s.runState === RUN.RUNNING ? { score: s.score + dist * s.multiplier } : {})),
  setSpeed: (v) => set({ speed: Math.min(v, CONFIG.speedMax) }),
  nextMultiplier: () => set((s) => ({ multiplier: Math.min(s.multiplier + 1, CONFIG.multMax) })),
}))
