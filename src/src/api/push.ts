import { get, post, put, withQuery } from './request'
import { API } from './config'

export interface PushHistoryItem {
  id: number
  notification_id?: number
  event_id?: number | null
  baby_id?: number
  title?: string
  content?: string
  push_type?: string
  push_status?: string
  skip_reason?: string | null
  error_message?: string | null
  page?: string | null
  created_at?: string | null
  read_status?: number | boolean | null
}

export interface PushSettings {
  channel_app?: boolean
  channel_sms?: boolean
  cry_alert_enabled?: boolean
  quiet_hours?: string | null
}

export type SubscriptionStatus = 'accept' | 'reject' | 'ban' | 'filter' | 'consumed'

export interface PushTemplate {
  template_id: string
  subscription_kind: 'one_time' | 'long_term'
  enabled: boolean
}

export interface PushSubscription {
  template_id: string
  template_type: string
  subscription_kind: 'one_time' | 'long_term'
  status: SubscriptionStatus
  available_count: number
  needs_resubscribe: boolean
  last_confirmed_at?: string | null
}

export function getPushHistory(params?: { page?: number; page_size?: number; push_type?: string }) {
  return get<{ items: PushHistoryItem[]; page?: number; page_size?: number }>(withQuery(API.PUSH.HISTORY, params), undefined, { showError: false })
}

export function getPushSettings() {
  return get<PushSettings>(API.PUSH.SETTINGS, undefined, { showError: false })
}

export function updatePushSettings(data: PushSettings) {
  return put<PushSettings>(API.PUSH.SETTINGS, data, { showError: false })
}

export function getPushTemplates() {
  return get<{ cry_alert: PushTemplate }>(API.PUSH.TEMPLATES, undefined, { showError: false })
}

export function getPushSubscriptions() {
  return get<PushSubscription[]>(API.PUSH.SUBSCRIPTIONS, undefined, { showError: false })
}

export function confirmPushSubscriptions(data: {
  client_request_id: string
  results: Array<{ template_id: string; status: Exclude<SubscriptionStatus, 'consumed'> }>
}) {
  return post<PushSubscription[]>(API.PUSH.SUBSCRIPTION_CONFIRM, data, { showError: false })
}

export function sendPushTest(data: {
  target_user_id: number
  baby_id: number
  message: string
  level?: number
  occurred_at?: string
}) {
  return post(API.PUSH.TEST, data, { showError: false })
}
