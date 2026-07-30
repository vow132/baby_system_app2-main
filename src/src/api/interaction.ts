/**
 * 互动内容API
 * 对齐后端 FastAPI：3个接口
 */
import { get, post } from './request'
import { API } from './config'

// 互动内容
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
  content_url?: string | null
}

interface InteractionLibraryResponse {
  items?: InteractionContent[]
  library?: InteractionContent[]
}

interface InteractionHistoryResponse {
  items?: unknown[]
  list?: unknown[]
  history?: unknown[]
}

export function getInteractionLibrary(params?: { baby_id?: number; category?: string }) {
  const queryParams: string[] = []
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.push(`${key}=${encodeURIComponent(String(value))}`)
      }
    })
  }
  const queryString = queryParams.length ? `?${queryParams.join('&')}` : ''
  return get<InteractionLibraryResponse | InteractionContent[]>(`${API.INTERACTION.LIBRARY}${queryString}`, undefined, { showError: false })
}

/**
 * 播放互动内容
 * POST /api/v1/interaction/content
 * 对齐后端 InteractionContentRequest: { baby_id, content_type, content_name, content_data? }
 */
export function playInteractionContent(data: {
  baby_id: number
  content_type: string
  content_name: string
  content_data?: string
}) {
  return post(API.INTERACTION.CONTENT, data, { showError: false })
}

export function getInteractionHistory(params?: { baby_id?: number; page?: number; page_size?: number }) {
  const queryParams: string[] = []
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.push(`${key}=${encodeURIComponent(String(value))}`)
      }
    })
  }
  const queryString = queryParams.length ? `?${queryParams.join('&')}` : ''
  return get<InteractionHistoryResponse | unknown[]>(`${API.INTERACTION.HISTORY}${queryString}`, undefined, { showError: false })
}
