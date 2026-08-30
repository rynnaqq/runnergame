import { useEffect } from 'react'
import { useGameStore, RUN } from '../store/useGameStore.js'

export const TOUCH_THRESHOLD = 24
export const inputQueue = []

const KEY_MAP = {
  ArrowLeft: 'moveLeft', a: 'moveLeft', A: 'moveLeft',
  ArrowRight: 'moveRight', d: 'moveRight', D: 'moveRight',
  ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump',
  ArrowDown: 'slide', s: 'slide', S: 'slide',
}

export function resolveAction(key, repeat = false) {
  if (repeat) return null
  return KEY_MAP[key] ?? null
}

export function swipeAction(dx, dy) {
  const ax = Math.abs(dx), ay = Math.abs(dy)
  if (Math.max(ax, ay) < TOUCH_THRESHOLD) return null
  return ax >= ay ? (dx < 0 ? 'moveLeft' : 'moveRight') : (dy < 0 ? 'jump' : 'slide')
}

function dispatch(action) {
  const s = useGameStore.getState()
  if (s.runState === RUN.READY) {
    s.start()
  } else if (s.runState !== RUN.RUNNING) {
    return // loading / crashed / gameOver / error: ignored; restart goes through the modal button
  }
  inputQueue.push(action)
}

export function useControls() {
  useEffect(() => {
    let touchStart = null

    const onKeyDown = (e) => {
      const action = resolveAction(e.key, e.repeat)
      if (action) { e.preventDefault(); dispatch(action) }
    }
    const onTouchStart = (e) => {
      const t = e.changedTouches[0]
      touchStart = { x: t.clientX, y: t.clientY, id: t.identifier }
    }
    const onTouchMove = (e) => {
      if (e.cancelable) e.preventDefault()
    }
    const onTouchEnd = (e) => {
      if (!touchStart) return
      const t = [...e.changedTouches].find((c) => c.identifier === touchStart.id)
      if (!t) return
      const action = swipeAction(t.clientX - touchStart.x, t.clientY - touchStart.y)
      touchStart = null
      if (action) dispatch(action)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('touchstart', onTouchStart, { passive: false })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: false })
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])
}
