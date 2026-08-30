import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RUN, useGameStore, loadHighScore } from './useGameStore.js'
import { CONFIG } from '../config.js'

const s = () => useGameStore.getState()

beforeEach(() => {
  localStorage.clear()
  useGameStore.setState({
    runState: RUN.LOADING, isGameOver: false, speed: 0, score: 0, coins: 0,
    multiplier: 1, highScore: 0, isHoverboardActive: false, runId: 0,
  })
})

describe('state machine', () => {
  it('loading -> ready -> running', () => {
    s().setReady(); expect(s().runState).toBe(RUN.READY)
    s().start(); expect(s().runState).toBe(RUN.RUNNING)
    expect(s().speed).toBe(CONFIG.speedStart)
  })
  it('start ignored unless ready', () => {
    s().start(); expect(s().runState).toBe(RUN.LOADING)
  })
  it('running -> crashed -> gameOver -> ready restart, high score kept', () => {
    s().setReady(); s().start()
    useGameStore.setState({ score: 500, coins: 7 })
    s().crash(); expect(s().runState).toBe(RUN.CRASHED)
    s().endRun(); expect(s().runState).toBe(RUN.GAMEOVER)
    expect(s().isGameOver).toBe(true); expect(s().highScore).toBe(500)
    s().restart()
    expect(s().runState).toBe(RUN.READY); expect(s().score).toBe(0)
    expect(s().coins).toBe(0); expect(s().multiplier).toBe(1)
    expect(s().highScore).toBe(500); expect(s().runId).toBe(1)
  })
  it('endRun ignored unless crashed', () => {
    s().endRun(); expect(s().runState).toBe(RUN.LOADING)
  })
  it('crash ignored unless running', () => {
    s().setReady(); s().crash(); expect(s().runState).toBe(RUN.READY)
  })
})

describe('economy', () => {
  it('addCoin adds coin and 25xmult once', () => {
    s().setReady(); s().start()
    s().addCoin()
    expect(s().coins).toBe(1); expect(s().score).toBe(25)
  })
  it('addCoin ignored when not running', () => {
    s().addCoin(); expect(s().coins).toBe(0)
  })
  it('addScore scales by multiplier', () => {
    s().setReady(); s().start()
    useGameStore.setState({ multiplier: 3 })
    s().addScore(10); expect(s().score).toBe(30)
  })
  it('multiplier caps at 10', () => {
    useGameStore.setState({ multiplier: 10 })
    s().nextMultiplier(); expect(s().multiplier).toBe(10)
  })
  it('setSpeed caps at max', () => {
    s().setSpeed(999); expect(s().speed).toBe(CONFIG.speedMax)
  })
})

describe('high score storage', () => {
  it('loads valid value', () => {
    localStorage.setItem(CONFIG.highScoreKey, '1234')
    expect(loadHighScore()).toBe(1234)
  })
  it('corrupt value falls back to 0', () => {
    localStorage.setItem(CONFIG.highScoreKey, 'not json{{{')
    expect(loadHighScore()).toBe(0)
  })
  it('negative value falls back to 0', () => {
    localStorage.setItem(CONFIG.highScoreKey, '-5')
    expect(loadHighScore()).toBe(0)
  })
  it('unavailable storage falls back to 0', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    expect(loadHighScore()).toBe(0)
    vi.restoreAllMocks()
  })
  it('saves only when final score exceeds stored high score', () => {
    s().setReady(); s().start()
    useGameStore.setState({ score: 100, highScore: 500 })
    s().crash(); s().endRun()
    expect(localStorage.getItem(CONFIG.highScoreKey)).toBeNull()
    expect(s().highScore).toBe(500)
  })
})
