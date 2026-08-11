import { describe, expect, it } from 'vitest'
import {
  getPlaybackPollDelay,
  isCurrentPlaybackResponse,
  isPlaybackFinishedForParent,
  isTerminalPlaybackState,
  normalizePlaybackProgress,
} from './playback-utils'

describe('interaction playback helpers', () => {
  it('uses bounded retry backoff without changing the healthy interval', () => {
    expect(getPlaybackPollDelay(0)).toBe(2000)
    expect(getPlaybackPollDelay(1)).toBe(2000)
    expect(getPlaybackPollDelay(2)).toBe(4000)
    expect(getPlaybackPollDelay(3)).toBe(8000)
    expect(getPlaybackPollDelay(9)).toBe(15000)
  })

  it('recognizes only hardware terminal states', () => {
    expect(isTerminalPlaybackState('completed')).toBe(true)
    expect(isTerminalPlaybackState('failed')).toBe(true)
    expect(isTerminalPlaybackState('stopped')).toBe(true)
    expect(isTerminalPlaybackState('playing')).toBe(false)
    expect(isTerminalPlaybackState('paused')).toBe(false)
  })

  it('finishes the parent player as soon as a stop command is saved', () => {
    expect(isPlaybackFinishedForParent('playing', 'stopped')).toBe(true)
    expect(isPlaybackFinishedForParent('pending', 'stopped')).toBe(true)
    expect(isPlaybackFinishedForParent('completed', 'playing')).toBe(true)
    expect(isPlaybackFinishedForParent('playing', 'playing')).toBe(false)
  })

  it('clamps progress and rejects stale baby responses', () => {
    expect(normalizePlaybackProgress(-10)).toBe(0)
    expect(normalizePlaybackProgress(45.5)).toBe(45.5)
    expect(normalizePlaybackProgress(140)).toBe(100)
    expect(isCurrentPlaybackResponse(3, 3, 8, 8)).toBe(true)
    expect(isCurrentPlaybackResponse(4, 3, 8, 8)).toBe(false)
    expect(isCurrentPlaybackResponse(3, 3, 9, 8)).toBe(false)
  })
})
