import { get, put, withQuery } from './request'
import { API } from './config'

export interface PushHistoryItem {
  id: number
  title?: string
  content?: string
  push_type?: string
  created_at?: string | null
  read_status?: number | boolean | null
}

export interface PushSettings {
  channel_app?: boolean
  channel_sms?: boolean
  quiet_hours?: string
}

export function getPushHistory(params?: { page?: number; page_size?: number; push_type?: string }) {
  return get<{ items: PushHistoryItem[]; page?: number; page_size?: number }>(withQuery(API.PUSH.HISTORY, params), undefined, { showError: false })
}

export function updatePushSettings(data: PushSettings) {
  return put(withQuery(API.PUSH.SETTINGS, data), data, { showError: false })
}
