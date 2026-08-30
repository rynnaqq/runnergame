import { CONFIG } from '../config.js'

export const COINS_PER_CHUNK = 8
export const COIN_COUNT = CONFIG.chunkCount * COINS_PER_CHUNK

// Global coin pool. Positions are (localZ within chunk, chunk index); world Z
// is computed per frame from chunkWorldZ.
export const coinPool = Array.from({ length: COIN_COUNT }, () => ({
  active: false, x: 0, y: 0, localZ: 0, chunk: -1,
}))

export function resetCoins() {
  for (const c of coinPool) c.active = false
}
