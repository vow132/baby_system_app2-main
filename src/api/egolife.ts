/**
 * Baby-EgoLife（8122）接口。
 * 开发环境可直连 8122；正式环境通过 8123 /egolife 认证网关访问。
 */
import {
  EGOLIFE_BASE_URL,
  EGOLIFE_TEST_CONTEXT,
  EGOLIFE_USE_GATEWAY,
  TIMEOUT,
  TOKEN_KEY,
} from './config'

export interface EgoLifeContext {
  family_id: string
  device_sn: string
  baby_id: string
}

export interface ScheduleEntry {
  id: number
  age_group: string
  time_range: string
  activity: string
  type: string
  appTip?: string
  app_tip?: string
  app_push?: string
  reminder?: string
  sleep_duration_hours?: { min?: number; max?: number } | null
  family_id?: string | null
  device_sn?: string | null
  baby_id?: string | number | null
}

export interface GrowthReminder {
  entry_id: number
  age_group: string
  time_range: string
  start_hhmm?: string
  end_hhmm?: string
  fire_at_hhmm?: string
  lead_minutes?: number
  minutes_until_start?: number
  activity: string
  type: string
  app_tip?: string
  app_push?: string
  reminder?: string
  message?: string
  status?: 'due' | 'upcoming' | 'next' | string
  easy_phase?: string
  easy_label?: string
}

export interface EasyAnalysis {
  age_group?: string
  age_months?: number
  period?: string
  dates?: string[]
  coach?: Record<string, any>
  summary?: {
    avg_coverage_pct?: number
    avg_cycles?: number
    cycle_mode?: string
    summary_tips?: string[]
    daily?: Array<Record<string, any>>
    [key: string]: any
  }
}

export interface HabitSuggestion {
  entry_id?: number
  activity?: string
  old_time_range?: string
  new_time_range?: string
  reason?: string
  [key: string]: any
}

export interface HabitAnalysis {
  age_group?: string
  age_months?: number
  period?: string
  dates?: string[]
  deviations?: Array<Record<string, any>> | {
    by_type?: Array<Record<string, any>>
    significant_samples?: Array<Record<string, any>>
    significant_count?: number
    matched?: number
    unmatched_alignable?: number
    [key: string]: any
  }
  suggestions?: HabitSuggestion[]
  applied_changes?: Array<Record<string, any>>
  has_personal_schedule?: boolean
  schedule_entry_count?: number
  schedule_source?: string
  profile?: Record<string, any>
}

export interface GrowthCoach {
  age_group?: string
  age_months?: number
  current?: Record<string, any>
  next?: Record<string, any>
  lines?: string[]
  tips?: string[]
  coach_lines?: string[]
  [key: string]: any
}

export interface GrowthReport {
  behavior?: Record<string, number>
  emotion?: Record<string, number>
  posture?: Record<string, number>
  risk?: Record<string, number>
  highlights?: any[]
  insights?: any[]
  daily_trend?: any[]
  easy?: Record<string, any>
  habit?: Record<string, any>
  wow?: Record<string, any>
  qa_records?: any[]
  [key: string]: any
}

export interface MpCheckinType {
  id: string
  label: string
  event_type: string
  primary?: boolean
  supports_backfill?: boolean
  backfill_hint?: string
}

export interface MpCheckinInput {
  type: string
  date: string
  time: string
  note?: string
}

export interface MpCheckinResult {
  event_id?: string
  event?: EgoLifeEvent
  [key: string]: any
}

export interface EgoLifeEvent {
  event_id?: string
  id?: string | number
  timestamp?: string
  date?: string
  text?: string
  event_type?: string
  type?: string
  source?: string
  [key: string]: any
}

interface EgoLifeRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  params?: Record<string, any>
  data?: any
  showLoading?: boolean
  showError?: boolean
}

function appendQuery(url: string, params: Record<string, any>): string {
  const values = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  if (!values.length) return url
  return `${url}${url.includes('?') ? '&' : '?'}${values.join('&')}`
}

function extractMessage(raw: any): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  if (typeof raw.message === 'string') return raw.message
  if (typeof raw.detail === 'string') return raw.detail
  return ''
}

function normalizeResponse<T>(raw: any): T {
  if (raw?.code !== undefined && raw.code !== 0 && raw.code !== 200) {
    throw new Error(extractMessage(raw) || '请求失败')
  }
  if (raw?.status !== undefined && raw.status !== 'ok') {
    throw new Error(extractMessage(raw) || '请求失败')
  }
  return (raw?.data !== undefined ? raw.data : raw) as T
}

export function egoLifeRequest<T>(
  path: string,
  localBabyId: number,
  options: EgoLifeRequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    params = {},
    data,
    showLoading = false,
    showError = true,
  } = options
  const context: EgoLifeContext = EGOLIFE_TEST_CONTEXT
  const query = EGOLIFE_USE_GATEWAY
    ? { ...params, baby_id: localBabyId }
    : { ...params, ...context }
  const payload = !EGOLIFE_USE_GATEWAY && data && typeof data === 'object'
    ? { ...data, ...context }
    : data
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = uni.getStorageSync(TOKEN_KEY)
  if (EGOLIFE_USE_GATEWAY && token) headers.Authorization = `Bearer ${token}`

  if (showLoading) uni.showLoading({ title: '加载中...', mask: true })

  return new Promise((resolve, reject) => {
    uni.request({
      url: appendQuery(EGOLIFE_BASE_URL + path, query),
      method,
      data: payload,
      header: headers,
      timeout: TIMEOUT,
      success: (response) => {
        try {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            if (response.statusCode === 401 && EGOLIFE_USE_GATEWAY) {
              uni.removeStorageSync(TOKEN_KEY)
              uni.reLaunch({ url: '/pages/login/login' })
            }
            throw new Error(extractMessage(response.data) || `网络错误(${response.statusCode})`)
          }
          resolve(normalizeResponse<T>(response.data))
        } catch (error: any) {
          if (showError) uni.showToast({ title: error?.message || '请求失败', icon: 'none' })
          reject(error)
        }
      },
      fail: (error) => {
        const message = (error as any)?.errMsg || 'Baby-EgoLife连接失败'
        if (showError) uni.showToast({ title: message, icon: 'none' })
        reject(new Error(message))
      },
      complete: () => {
        if (showLoading) uni.hideLoading()
      },
    })
  })
}

export async function getScheduleAgeGroups(babyId: number): Promise<string[]> {
  const data = await egoLifeRequest<any>('/schedule/age-groups', babyId, { showError: false })
  const groups = Array.isArray(data) ? data : data?.age_groups
  return Array.isArray(groups) ? groups.map(String) : []
}

export async function getEgoSchedule(
  babyId: number,
  params: { age_group?: string; grouped?: boolean } = {},
): Promise<{ items: ScheduleEntry[]; total: number }> {
  const data = await egoLifeRequest<any>('/schedule', babyId, {
    params: { ...params, grouped: params.grouped === undefined ? false : params.grouped },
    showError: false,
  })
  const items = Array.isArray(data) ? data : data?.items
  return { items: Array.isArray(items) ? items : [], total: Number(data?.total ?? items?.length ?? 0) }
}

export function createEgoSchedule(babyId: number, data: Omit<ScheduleEntry, 'id'>) {
  return egoLifeRequest<ScheduleEntry>('/schedule', babyId, { method: 'POST', data, showError: false })
}

export function updateEgoSchedule(babyId: number, id: number, data: Partial<ScheduleEntry>) {
  return egoLifeRequest<ScheduleEntry>(`/schedule/${id}`, babyId, { method: 'PUT', data })
}

export function deleteEgoSchedule(babyId: number, id: number) {
  return egoLifeRequest<{ deleted: number }>('/schedule/delete', babyId, {
    method: 'POST',
    data: { id },
  })
}

export function getGrowthMeta(babyId: number) {
  return egoLifeRequest<any>('/growth/meta', babyId, { showError: false })
}

export function getGrowthProfile(babyId: number) {
  return egoLifeRequest<any>('/growth/baby-profile', babyId, { showError: false })
}

export function updateGrowthProfile(babyId: number, data: Record<string, any>) {
  return egoLifeRequest<any>('/growth/baby-profile', babyId, { method: 'PUT', data })
}

export function getGrowthReminders(babyId: number) {
  return egoLifeRequest<{
    age_group?: string
    count?: number
    due_count?: number
    upcoming_count?: number
    items?: GrowthReminder[]
    next?: GrowthReminder | null
    now?: string
  }>('/growth/reminders', babyId, { showError: false })
}

export function getGrowthEasy(babyId: number, params: Record<string, any> = {}) {
  return egoLifeRequest<EasyAnalysis>('/growth/easy', babyId, { params, showError: false })
}

export function getGrowthCoach(babyId: number, params: Record<string, any> = {}) {
  return egoLifeRequest<GrowthCoach>('/growth/coach', babyId, { params, showError: false })
}

export function getGrowthHabit(babyId: number, params: Record<string, any> = {}) {
  return egoLifeRequest<HabitAnalysis>('/growth/habit', babyId, { params, showError: false })
}

export function applyGrowthHabit(babyId: number, ageGroup: string, dryRun = false) {
  return egoLifeRequest<{
    applied?: any[]
    skipped?: any[]
    suggestions?: any[]
    suggestion_count?: number
    change_logs?: any[]
    cloned_schedule?: boolean
    dry_run?: boolean
  }>('/growth/habit/apply', babyId, {
    method: 'POST',
    data: { age_group: ageGroup, dry_run: dryRun },
  })
}

export function getEgoEvents(babyId: number, params: Record<string, any> = {}) {
  return egoLifeRequest<{ events?: EgoLifeEvent[]; items?: EgoLifeEvent[]; total?: number }>(
    '/events',
    babyId,
    { params, showError: false },
  )
}

export function createEgoEvent(babyId: number, data: { timestamp: string; text: string; source?: string; duration_seconds?: number }) {
  return egoLifeRequest<EgoLifeEvent>('/events', babyId, { method: 'POST', data })
}

export function updateEgoEvent(babyId: number, eventId: string, data: Partial<EgoLifeEvent>) {
  return egoLifeRequest<EgoLifeEvent>(`/events/${encodeURIComponent(eventId)}`, babyId, { method: 'PUT', data })
}

export function getEgoMemory(babyId: number, params: Record<string, any> = {}) {
  return egoLifeRequest<any>('/memory', babyId, { params, showError: false })
}

export function getDaySummaries(babyId: number, params: Record<string, any> = {}) {
  return egoLifeRequest<any[]>('/summaries/day', babyId, { params, showError: false })
}

export function getGrowthReport(babyId: number, params: Record<string, any> = {}) {
  return egoLifeRequest<GrowthReport>('/reports/summary', babyId, { params, showError: false })
}

export function askBabyData(babyId: number, question: string) {
  return egoLifeRequest<any>('/ask', babyId, { method: 'POST', data: { question } })
}

export function getBabyQaHistory(babyId: number, params: Record<string, any> = {}) {
  return egoLifeRequest<{ items?: any[]; total?: number }>('/qa/history', babyId, {
    params,
    showError: false,
  })
}

export async function getMpCheckinTypes(babyId: number): Promise<MpCheckinType[]> {
  const data = await egoLifeRequest<{ items?: MpCheckinType[] } | MpCheckinType[]>(
    '/mp/checkin/types',
    babyId,
    { showError: false },
  )
  return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
}

export function createMpCheckin(babyId: number, data: MpCheckinInput) {
  return egoLifeRequest<MpCheckinResult>('/mp/checkin', babyId, { method: 'POST', data })
}

export function undoMpCheckin(babyId: number, eventId: string) {
  return egoLifeRequest<Record<string, any>>('/mp/checkin/undo', babyId, {
    method: 'POST',
    data: { event_id: eventId },
  })
}
