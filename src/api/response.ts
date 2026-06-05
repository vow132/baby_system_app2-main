import { get, post, put } from './request'
import { API } from './config'

export interface PassiveEventType {
  id: number
  parent_id?: number
  event_code?: string
  event_name: string
  category: string
  priority?: number
  trigger_desc?: string | null
  screen_response?: string | null
  sound_response?: string | null
  app_response?: string | null
  sort_order?: number
  is_active?: number | null
  description?: string
  response_config?: Record<string, any>
}

export interface ResponseHistoryItem {
  id: number
  event_type_id: number
  baby_id: number
  triggered_at: string
  response_result?: string
}

export function getEventTypes(category?: string, includeInactive = false) {
  const queryParams: string[] = []
  if (category) queryParams.push(`category=${encodeURIComponent(category)}`)
  if (includeInactive) queryParams.push('include_inactive=true')
  const url = queryParams.length
    ? `${API.RESPONSE.EVENT_TYPES}?${queryParams.join('&')}`
    : API.RESPONSE.EVENT_TYPES
  return get<PassiveEventType[]>(url)
}

export function getEventTypeDetail(eventTypeId: number) {
  return get<PassiveEventType>(API.RESPONSE.EVENT_TYPE_DETAIL(eventTypeId))
}

export function updateEventType(eventTypeId: number, data: Partial<PassiveEventType>) {
  return put(API.RESPONSE.EVENT_TYPE_UPDATE(eventTypeId), data)
}

export function triggerResponse(eventTypeId: number, babyId: number) {
  return post(API.RESPONSE.TRIGGER, { event_type_id: eventTypeId, baby_id: babyId })
}

export function getResponseHistory(babyId: number, params?: { category?: string; page?: number; page_size?: number }) {
  const queryParams = [`baby_id=${babyId}`]
  if (params?.category) queryParams.push(`category=${params.category}`)
  if (params?.page) queryParams.push(`page=${params.page}`)
  if (params?.page_size) queryParams.push(`page_size=${params.page_size}`)
  return get<{ items: ResponseHistoryItem[]; total: number }>(
    `${API.RESPONSE.HISTORY}?${queryParams.join('&')}`
  )
}
