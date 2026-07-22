/**
 * 里程碑/成长记录API
 * 对齐后端 FastAPI：10个接口（全部小程序接口）
 * 路径参数：{milestone_id}, {report_id}
 */
import { get, post, del } from './request'
import { API } from './config'

// 里程碑信息（对齐后端 MilestoneInfo）
export interface MilestoneInfo {
  id: number
  baby_id: number
  event_type_id: number
  milestone_code: string
  milestone_name: string
  milestone_desc: string | null
  age_months: number | null
  snapshot_url: string | null
  gif_url: string | null
  video_clip_url: string | null
  gif_size_bytes: number | null
  detected_at: string | null
  is_highlight: number | null
  week_report_included: number | null
  created_at: string | null
}

// 成长周报（对齐后端 WeeklyReportInfo）
export interface WeeklyReport {
  report_id: string
  baby_id: number
  week_start: string
  week_end: string
  title: string
  summary: string
  highlights: Record<string, any>[]
  milestones: Record<string, any>[]
  sleep_analysis: Record<string, any> | null
  feeding_analysis: Record<string, any> | null
  recommendations: string[]
  status: string
  generated_at: string | null
}

// 视频截取结果（对齐后端 EventCaptureResponse）
export interface CaptureResult {
  capture_id: string
  baby_id: number
  event_type: string
  video_url: string
  gif_url: string | null
  gif_size_bytes: number | null
  duration_sec: number
  status: string
  created_at: string | null
}

/**
 * 创建里程碑
 * POST /api/v1/milestone/create
 */
export function createMilestone(data: {
  baby_id: number
  event_type_id: number
  milestone_code: string
  milestone_name: string
  detected_at: string
  milestone_desc?: string
  age_months?: number
  snapshot_url?: string
  gif_url?: string
  video_clip_url?: string
}) {
  return post<MilestoneInfo>(API.MILESTONE.CREATE, data)
}

/**
 * 获取里程碑列表
 * GET /api/v1/milestone/list
 */
export function getMilestoneList(params?: { baby_id?: number; page?: number; page_size?: number }) {
  const queryParams: string[] = []
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.push(`${key}=${encodeURIComponent(String(value))}`)
      }
    })
  }
  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : ''
  return get<{ items: MilestoneInfo[]; page: number; page_size: number }>(`${API.MILESTONE.LIST}${queryString}`)
}

/**
 * 获取里程碑详情
 * GET /api/v1/milestone/{milestone_id}
 */
export function getMilestoneDetail(id: number) {
  return get<MilestoneInfo>(API.MILESTONE.DETAIL(id))
}

/**
 * 删除里程碑
 * DELETE /api/v1/milestone/{milestone_id}
 */
export function deleteMilestone(id: number) {
  return del(API.MILESTONE.DELETE(id))
}

/**
 * AI生成成长周报
 * POST /api/v1/milestone/report/generate
 */
export function generateWeeklyReport(data: { baby_id: number; week_start?: string }) {
  return post<WeeklyReport>(API.MILESTONE.REPORT_GENERATE, data)
}

/**
 * 获取周报列表
 * GET /api/v1/milestone/report/list
 */
export function getWeeklyReportList(params?: { baby_id?: number; page?: number; page_size?: number }) {
  const queryParams: string[] = []
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.push(`${key}=${encodeURIComponent(String(value))}`)
      }
    })
  }
  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : ''
  return get<{ items: WeeklyReport[]; page: number; page_size: number }>(`${API.MILESTONE.REPORT_LIST}${queryString}`)
}

/**
 * 获取周报详情
 * GET /api/v1/milestone/report/{report_id}
 */
export function getWeeklyReportDetail(id: number) {
  return get<WeeklyReport>(API.MILESTONE.REPORT_DETAIL(id))
}

/**
 * 截取事件前后视频片段
 * POST /api/v1/milestone/capture
 */
export function captureMilestone(data: {
  baby_id: number
  event_type: string
  trigger_time: string
  pre_seconds?: number
  post_seconds?: number
}) {
  return post<CaptureResult>(API.MILESTONE.CAPTURE, data)
}

/**
 * 视频片段转GIF动图
 * POST /api/v1/milestone/gif/generate
 */
export function generateGif(data: {
  capture_id: string
  quality?: string
  max_size_mb?: number
}) {
  return post<CaptureResult>(API.MILESTONE.GIF_GENERATE, data)
}

/**
 * AI生成每日展板形式周报
 * POST /api/v1/milestone/weekly-report/generate
 */
export function generateWeeklyBoardReport(data: { baby_id: number; week_start?: string }) {
  return post<WeeklyReport>(API.MILESTONE.WEEKLY_REPORT_GENERATE, data)
}
