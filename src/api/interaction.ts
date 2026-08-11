/** 互动内容库与婴儿床硬件播放 API。 */
import { del, get, post, put, withQuery } from './request'
import { API } from './config'

export type PlaybackAction = 'play' | 'pause' | 'resume' | 'stop'
export type PlaybackActualState =
  | 'pending'
  | 'downloading'
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'completed'
  | 'failed'

export interface InteractionContent {
  id: string | number
  title?: string
  name?: string
  type?: string
  description?: string
  category?: string
  duration?: string | number
  duration_sec?: number
  age_range?: string
  mime_type?: string
  file_size_bytes?: number | null
  sha256?: string | null
  playable?: boolean
  is_favorite?: boolean
  play_count?: number
  last_played_at?: string | null
}

export interface PlaybackSession {
  session_id: number
  baby_id: number
  device_sn: string
  device_name?: string
  device_online: boolean
  desired_state: 'playing' | 'paused' | 'stopped'
  actual_state: PlaybackActualState
  revision: number
  acknowledged_revision: number
  position_sec: number
  duration_sec: number
  progress_percent: number
  error_code?: string | null
  error_message?: string | null
  stop_at?: string | null
  timer_remaining_sec?: number | null
  started_at?: string | null
  finished_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  content: InteractionContent
}

interface InteractionLibraryResponse {
  items?: InteractionContent[]
  library?: InteractionContent[]
}

export interface InteractionHistoryResponse {
  items?: unknown[]
  history?: unknown[]
  total?: number
  page?: number
  page_size?: number
}

export interface PlaybackStatusResponse {
  session: PlaybackSession | null
  device_sn?: string
  device_name?: string
  device_online?: boolean
}

export function setInteractionFavorite(babyId: number, contentId: string | number, favorite: boolean) {
  const url = withQuery(API.INTERACTION.FAVORITE(contentId), { baby_id: babyId })
  return favorite
    ? put<{ baby_id: number; content_id: number; is_favorite: boolean }>(url, undefined, { showError: false })
    : del<{ baby_id: number; content_id: number; is_favorite: boolean }>(url, undefined, { showError: false })
}

export function getInteractionLibrary(params: { baby_id: number; category?: string }) {
  return get<InteractionLibraryResponse>(withQuery(API.INTERACTION.LIBRARY, params), undefined, { showError: false })
}

export function controlInteractionPlayback(data: {
  baby_id: number
  action: PlaybackAction
  content_id?: number
  session_id?: number
  client_request_id: string
}) {
  return post<PlaybackSession>(API.INTERACTION.PLAYBACK_CONTROL, data, { showError: false })
}

export function getInteractionPlaybackStatus(babyId: number) {
  return get<PlaybackStatusResponse>(
    withQuery(API.INTERACTION.PLAYBACK_STATUS, { baby_id: babyId }),
    undefined,
    { showError: false },
  )
}

export function setInteractionPlaybackTimer(data: {
  baby_id: number
  session_id: number
  timer_minutes: 15 | 30 | 60 | null
}) {
  return put<PlaybackSession>(API.INTERACTION.PLAYBACK_TIMER, data, { showError: false })
}

export function getInteractionHistory(params: { baby_id: number; page?: number; page_size?: number }) {
  return get<InteractionHistoryResponse>(withQuery(API.INTERACTION.HISTORY, params), undefined, { showError: false })
}

/** 旧客户端兼容方法；新页面不再使用。 */
export function playInteractionContent(data: {
  baby_id: number
  content_type: string
  content_name: string
  content_data?: string
}) {
  return post(API.INTERACTION.CONTENT, data, { showError: false })
}
