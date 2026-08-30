import { describe, it, expect } from 'vitest'
import { resolveAction, swipeAction } from './useControls.js'

describe('resolveAction', () => {
  it('maps arrows, WASD, space', () => {
    expect(resolveAction('ArrowLeft')).toBe('moveLeft')
    expect(resolveAction('ArrowRight')).toBe('moveRight')
    expect(resolveAction('ArrowUp')).toBe('jump')
    expect(resolveAction('ArrowDown')).toBe('slide')
    expect(resolveAction('a')).toBe('moveLeft')
    expect(resolveAction('d')).toBe('moveRight')
    expect(resolveAction('w')).toBe('jump')
    expect(resolveAction('s')).toBe('slide')
    expect(resolveAction(' ')).toBe('jump')
    expect(resolveAction('Shift')).toBe(null)
  })
  it('ignores key repeat', () => {
    expect(resolveAction('ArrowLeft', true)).toBe(null)
  })
})

describe('swipeAction', () => {
  it('dominant axis wins; no diagonal double-fire', () => {
    expect(swipeAction(-50, -3)).toBe('moveLeft')
    expect(swipeAction(50, 3)).toBe('moveRight')
    expect(swipeAction(3, -50)).toBe('jump')
    expect(swipeAction(3, 50)).toBe('slide')
    expect(swipeAction(30, 28)).toBe('moveRight') // horizontal dominant
  })
  it('below threshold -> null', () => {
    expect(swipeAction(20, 0)).toBe(null)
    expect(swipeAction(0, 0)).toBe(null)
  })
})
