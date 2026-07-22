/**
 * 作息管理API
 * 对齐后端 FastAPI：12个接口（全部小程序接口）
 * 路径参数：{routine_id}, {baby_id}
 */
import { get, post, put, del } from './request'
import { API } from './config'

// 作息信息（对齐后端 RoutineInfo）
export interface RoutineInfo {
  id: number
  baby_id: number
  template_name: string
  age_month_min: number | null
  age_month_max: number | null
  time_slot: string | null
  activity_type: string
  activity_name: string | null
  duration_min: number | null
  reminder_enabled: number | null
  reminder_before_min: number | null
  is_auto_adjusted: number | null
  adjust_reason: string | null
  effective_date: string | null
  expire_date: string | null
  is_active: number | null
  created_at: string | null
}

// 作息冲突信息（对齐后端 ConflictInfo）
export interface RoutineConflict {
  id: number
  baby_id: number
  routine_id: number | null
  conflict_date: string | null
  expected_time: string | null
  actual_time: string | null
  deviation_min: number | null
  conflict_type: string | null
  audit_analysis: string | null
  suggested_fix: string | null
  auto_fixed: number | null
  created_at: string | null
}

// 作息优化建议（对齐后端 RoutineOptimizeResponse）
export interface RoutineOptimizeSuggestion {
  baby_id: number
  optimization_id: string
  current_plan: Record<string, any>[]
  optimized_plan: Record<string, any>[]
  changes: string[]
  confidence_score: number
  generated_at: string | null
}

// EASY模式作息模板（对齐后端 EASYTemplateResponse）
export interface EasyTemplate {
  template_id: string
  baby_id: number
  age_month: number
  template_name: string
  activities: {
    time_slot: string
    activity_type: string
    activity_name: string
    duration_min: number
    reminder_enabled: boolean
  }[]
  cycle_days: number
  created_at: string | null
}

// 冲突检查结果（对齐后端 ConflictCheckResponse）
export interface ConflictCheckResult {
  baby_id: number
  check_period: string
  total_conflicts: number
  conflicts: Record<string, any>[]
  summary: string
  suggestions: string[]
  can_auto_fix: boolean
}

/**
 * 创建作息安排
 * POST /api/v1/routine/create
 */
export function createRoutine(data: {
  baby_id: number
  template_name: string
  time_slot: string
  activity_type: string
  effective_date: string
  age_month_min?: number
  age_month_max?: number
  activity_name?: string
  duration_min?: number
  reminder_enabled?: number
  reminder_before_min?: number
  expire_date?: string
}) {
  return post<RoutineInfo>(API.ROUTINE.CREATE, data)
}

/**
 * 获取作息列表
 * GET /api/v1/routine/list
 */
export function getRoutineList(params?: { baby_id?: number; activity_type?: string; page?: number; page_size?: number }) {
  const queryParams: string[] = []
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.push(`${key}=${encodeURIComponent(String(value))}`)
      }
    })
  }
  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : ''
  return get<{ items: RoutineInfo[]; page: number; page_size: number }>(`${API.ROUTINE.LIST}${queryString}`)
}

/**
 * 获取作息详情
 * GET /api/v1/routine/{routine_id}
 */
export function getRoutineDetail(id: number) {
  return get<RoutineInfo>(API.ROUTINE.DETAIL(id))
}

/**
 * 更新作息安排
 * PUT /api/v1/routine/{routine_id}
 */
export function updateRoutine(id: number, data: {
  template_name?: string
  time_slot?: string
  activity_type?: string
  activity_name?: string
  duration_min?: number
  reminder_enabled?: number
  reminder_before_min?: number
  expire_date?: string
  is_active?: number
}) {
  return put(API.ROUTINE.UPDATE(id), data)
}

/**
 * 删除作息安排
 * DELETE /api/v1/routine/{routine_id}
 */
export function deleteRoutine(id: number) {
  return del(API.ROUTINE.DELETE(id))
}

/**
 * 检测作息冲突
 * GET /api/v1/routine/conflicts/{baby_id}
 */
export function getRoutineConflicts(babyId: number) {
  return get<RoutineConflict[]>(API.ROUTINE.CONFLICTS(babyId))
}

/**
 * AI作息优化建议
 * GET /api/v1/routine/optimize/{baby_id}
 */
export function getRoutineOptimize(babyId: number) {
  return get<RoutineOptimizeSuggestion>(API.ROUTINE.OPTIMIZE(babyId), undefined, { showError: false })
}

/**
 * 查询宝宝今日作息日程
 * GET /api/v1/routine/today/{baby_id}
 */
export function getRoutineToday(babyId: number) {
  return get<RoutineInfo[]>(API.ROUTINE.TODAY(babyId), undefined, { showError: false })
}

/**
 * 获取EASY模式作息模板
 * GET /api/v1/routine/easy/template
 */
export function getEasyTemplate(params: { baby_id: number; age_month: number }) {
  const queryParams: string[] = [`baby_id=${params.baby_id}`, `age_month=${params.age_month}`]
  return get<EasyTemplate>(`${API.ROUTINE.EASY_TEMPLATE}?${queryParams.join('&')}`)
}

/**
 * AI优化作息计划
 * POST /api/v1/routine/easy/optimize
 */
export function easyOptimize(data: { baby_id: number; analysis_days?: number }) {
  return post<RoutineOptimizeSuggestion>(API.ROUTINE.EASY_OPTIMIZE, data)
}

/**
 * 检测作息冲突并生成建议
 * POST /api/v1/routine/conflict/check
 */
export function checkRoutineConflict(data: { baby_id: number; check_days?: number }) {
  return post<ConflictCheckResult>(API.ROUTINE.CONFLICT_CHECK, data)
}

/**
 * 自动修复作息冲突
 * POST /api/v1/routine/conflict/fix
 */
export function fixRoutineConflict(data: { baby_id: number; fix_type?: string; conflict_ids?: number[] }) {
  return post<ConflictCheckResult>(API.ROUTINE.CONFLICT_FIX, data)
}
