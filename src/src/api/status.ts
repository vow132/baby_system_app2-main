/**
 * 状态日志API
 * 对齐后端 FastAPI：11个接口（3硬件 + 8小程序）
 * 路径参数：{log_id}, {event_id}
 */
import { get, post, put, withQuery } from './request'
import { API } from './config'

// 状态日志（对齐后端 StatusLogInfo）
export interface StatusLog {
  id: number
  baby_id: number
  device_sn: string
  status_type: string
  status_level: number
  started_at: string
  ended_at: string | null
  duration_sec: number | null
  breath_rate: number | null
  heart_rate: number | null
  sound_db: number | null
  created_at: string | null
}

// 哭闹事件（对齐后端 CryEventInfo）
export interface CryEvent {
  id: number
  baby_id: number
  cry_level: number
  cry_type: string | null
  started_at: string
  ended_at: string | null
  duration_sec: number | null
  sound_db: number | null
  lullaby_played: number
  parent_handled: number
  snapshot_url: string | null
  created_at: string | null
}

// 危险事件（对齐后端 DangerEventInfo）
export interface DangerEvent {
  id: number
  baby_id: number
  danger_type: string
  severity: number
  detected_at: string
  ended_at: string | null
  duration_sec: number | null
  alert_played: number
  push_sent: number
  parent_handled: number
  snapshot_url: string | null
  created_at: string | null
}

// 睡眠报告（对齐后端 SleepReportInfo）
export interface SleepReport {
  id: number
  baby_id: number
  report_date: string
  total_sleep_min: number
  night_sleep_min: number
  day_sleep_min: number
  nap_count: number
  longest_sleep_min: number
  sleep_score: number | null
  cry_count: number
  danger_count: number
  ai_summary: string | null
  created_at: string | null
}

// ========== 硬件端接口（小程序不调用，但保留定义） ==========

/**
 * 硬件端上报宝宝状态变化
 * POST /api/v1/status/log
 */
export function reportStatusLog(data: {
  baby_id: number
  device_sn: string
  status_type: string
  started_at: string
  status_level?: number
  breath_rate?: number
  heart_rate?: number
  sound_db?: number
  pose_status?: string
  expression?: string
}) {
  return post(API.STATUS.LOG, data)
}

/**
 * 结束状态日志
 * PUT /api/v1/status/log/{log_id}/end
 */
export function endStatusLog(logId: number, data: { ended_at: string }) {
  return put(withQuery(API.STATUS.LOG_END(logId), data))
}

/**
 * 硬件端上报哭闹事件
 * POST /api/v1/status/cry
 */
export function reportCryEvent(data: {
  baby_id: number
  device_sn: string
  cry_level: number
  started_at: string
  cry_type?: string
  sound_db?: number
  heart_rate?: number
  body_movement?: number
  expression?: string
}) {
  return post(API.STATUS.CRY, data)
}

/**
 * 硬件端上报危险事件
 * POST /api/v1/status/danger
 */
export function reportDangerEvent(data: {
  baby_id: number
  device_sn: string
  danger_type: string
  severity: number
  detected_at: string
  breath_rate?: number
  heart_rate?: number
  body_offset_cm?: number
  pose_status?: string
}) {
  return post(API.STATUS.DANGER, data)
}

// ========== 小程序端接口 ==========

/**
 * 查询宝宝状态历史记录
 * GET /api/v1/status/history
 */
export function getStatusHistory(params: {
  baby_id: number
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
}) {
  const queryParams: string[] = []
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.push(`${key}=${encodeURIComponent(String(value))}`)
    }
  })
  return get<{ items: StatusLog[]; page: number; page_size: number }>(`${API.STATUS.HISTORY}?${queryParams.join('&')}`)
}

/**
 * 父母处理哭闹事件
 * POST /api/v1/status/cry/{event_id}/handle
 */
export function handleCryEvent(eventId: number, data: { handle_method: string }) {
  return post(API.STATUS.CRY_HANDLE(eventId), data)
}

/**
 * 获取哭闹事件列表
 * GET /api/v1/status/cry/list
 */
export function getCryEventList(params: {
  baby_id: number
  page?: number
  page_size?: number
}) {
  const queryParams: string[] = [`baby_id=${params.baby_id}`]
  if (params.page) queryParams.push(`page=${params.page}`)
  if (params.page_size) queryParams.push(`page_size=${params.page_size}`)
  return get<{ items: CryEvent[]; page: number; page_size: number }>(`${API.STATUS.CRY_LIST}?${queryParams.join('&')}`)
}

/**
 * 父母处理危险事件
 * POST /api/v1/status/danger/{event_id}/handle
 */
export function handleDangerEvent(eventId: number, data: { handle_result: string }) {
  return post(API.STATUS.DANGER_HANDLE(eventId), data)
}

/**
 * 获取危险事件列表
 * GET /api/v1/status/danger/list
 */
export function getDangerEventList(params: {
  baby_id: number
  page?: number
  page_size?: number
}) {
  const queryParams: string[] = [`baby_id=${params.baby_id}`]
  if (params.page) queryParams.push(`page=${params.page}`)
  if (params.page_size) queryParams.push(`page_size=${params.page_size}`)
  return get<{ items: DangerEvent[]; page: number; page_size: number }>(`${API.STATUS.DANGER_LIST}?${queryParams.join('&')}`)
}

/**
 * 获取每日睡眠报告
 * GET /api/v1/status/sleep-report
 */
export function getSleepReport(params: { baby_id: number; report_date: string }) {
  return get<SleepReport>(`${API.STATUS.SLEEP_REPORT}?baby_id=${params.baby_id}&report_date=${params.report_date}`)
}

/**
 * 生成每日睡眠报告
 * POST /api/v1/status/sleep-report/generate
 */
export function generateSleepReport(data: { baby_id: number; report_date: string }) {
  return post<SleepReport>(withQuery(API.STATUS.SLEEP_REPORT_GENERATE, data))
}
