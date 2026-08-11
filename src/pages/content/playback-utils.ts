import type { PlaybackActualState } from '@/api/interaction'

const POLL_BACKOFF_MS = [2000, 4000, 8000, 15000] as const

export function getPlaybackPollDelay(errorCount: number): number {
  if (errorCount <= 0) return 2000
  return POLL_BACKOFF_MS[Math.min(errorCount - 1, POLL_BACKOFF_MS.length - 1)]
}

export function isTerminalPlaybackState(state?: PlaybackActualState | null): boolean {
  return state === 'stopped' || state === 'completed' || state === 'failed'
}

export function isPlaybackFinishedForParent(
  actualState?: PlaybackActualState | null,
  desiredState?: 'playing' | 'paused' | 'stopped' | null,
): boolean {
  return desiredState === 'stopped' || isTerminalPlaybackState(actualState)
}

export function normalizePlaybackProgress(value: number): number {
  return Math.max(0, Math.min(Number(value) || 0, 100))
}

export function isCurrentPlaybackResponse(
  currentGeneration: number,
  responseGeneration: number,
  currentBabyId: number | undefined,
  responseBabyId: number,
): boolean {
  return currentGeneration === responseGeneration && currentBabyId === responseBabyId
}
