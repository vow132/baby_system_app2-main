/**
 * 监测相关API
 * 对齐Apifox OpenAPI 3.0：传感器10个 + 被动响应5个
 * 传感器：3硬件 + 1小程序 + 4共用 + 2小程序
 * 被动响应：4小程序 + 1共用
 * 路径参数：{event_id}, {event_type_id}
 */
import { get, post, put, withQuery } from './request'
import { API } from './config'

// ========== 传感器数据类型 ==========

// 传感器数据（对齐后端 SensorDataInfo）
export interface SensorData {
  id: number
  device_sn: string
  baby_id: number
  collected_at: string | null
  breath_rate: number | null
  heart_rate: number | null
  body_movement: number | null
  distance_cm: number | null
  sound_db: number | null
  sound_type: string | null
  pose_status: string | null
  face_detected: number | null
  expression: string | null
  body_offset_cm: number | null
  roll_angle: number | null
  height_cm: number | null
  room_temp: number | null
  humidity: number | null
  noise_db: number | null
}

// 监测事件（对齐后端 EventInfo）
export interface MonitoringEvent {
  id: number
  baby_id: number
  device_sn: string
  event_type_id: number
  event_level: number | null
  trigger_source: string | null
  breath_rate: number | null
  heart_rate: number | null
  sound_db: number | null
  body_displace_cm: number | null
  pose_angle: number | null
  detected_at: string | null
  resolved_at: string | null
  duration_sec: number | null
  screen_acted: number | null
  sound_acted: number | null
  app_pushed: number | null
  parent_handled: number | null
  handled_at: string | null
  snapshot_url: string | null
  video_clip_url: string | null
  gif_url: string | null
  remark: string | null
  created_at: string | null
  event_type?: string | null
  source_table?: 'monitoring_events' | 'baby_status_log' | 'cry_event' | 'danger_event'
  source_ref?: string
  can_confirm?: boolean
}

// 场景分类结果（对齐后端 SceneClassifyResponse）
export interface SceneClassifyResult {
  baby_id: number
  scene_type: string
  confidence: number
  triggers: string[]
  timestamp: string | null
}

// ========== 婴儿状态类型 ==========

export interface BabyStatus {
  status_type: string       // sleeping/awake/playing/crying/danger
  status_level: number      // 0-3
  risk_label: string        // 正常/关注/警告/危险
  started_at: string | null
  duration_sec: number | null
  sensor_snapshot: {
    heart_rate: number | null
    breath_rate: number | null
    body_movement: string | null
    sound_db: number | null
    pose_status: string | null
  } | null
}

// ========== 被动响应类型 ==========

// 被动事件类型
export interface PassiveEventType {
  id: number
  parent_id: number
  event_code: string
  event_name: string
  category: string
  priority: number
  trigger_desc: string | null
  screen_response: string | null
  sound_response: string | null
  app_response: string | null
  sort_order: number
  is_active?: number | null
}

// ========== 传感器接口（硬件端 - 小程序不调用，但保留定义） ==========

/**
 * 设备上报心跳和体温等数据（硬件端）
 * POST /api/v1/sensor/upload
 */
export function uploadSensorData(data: {
  device_sn: string
  baby_id: number
  collected_at: string
  breath_rate?: number
  heart_rate?: number
  body_movement?: number
  distance_cm?: number
  sound_db?: number
  sound_type?: string
  pose_status?: string
  face_detected?: number
  expression?: string
  body_offset_cm?: number
  roll_angle?: number
  height_cm?: number
  room_temp?: number
  humidity?: number
  noise_db?: number
}) {
  return post(API.SENSOR.UPLOAD, data)
}

/**
 * 批量上传传感器历史数据文件（硬件端）
 * POST /api/v1/sensor/upload-file
 */
export function uploadSensorFile(data: { file: File }) {
  return post(API.SENSOR.UPLOAD_FILE, data)
}

/**
 * 手动触发一次事件检测（硬件端）
 * POST /api/v1/sensor/detect
 */
export function triggerDetection(data: { device_sn: string }) {
  return post(withQuery(API.SENSOR.DETECT, data))
}

// ========== 传感器接口（共用） ==========

/**
 * 查询传感器数据
 * GET /api/v1/sensor/data
 */
export function getSensorData(params?: {
  device_sn?: string
  baby_id?: number
  start_time?: string
  end_time?: string
  page?: number
  page_size?: number
}) {
  const queryParams: string[] = []
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.push(`${key}=${encodeURIComponent(String(value))}`)
      }
    })
  }
  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : ''
  return get<{ items: SensorData[]; page: number; page_size: number }>(`${API.SENSOR.DATA}${queryString}`, undefined, { showError: false })
}

/**
 * 查询婴儿状态及风险等级
 * GET /api/v1/sensor/status/baby?device_sn=xxx
 */
export function getBabyStatus(deviceSn: string) {
  return get<BabyStatus>(`${API.SENSOR.STATUS_BABY}?device_sn=${encodeURIComponent(deviceSn)}`, undefined, { showError: false })
}

/**
 * 获取监测事件列表
 * GET /api/v1/sensor/events
 */
export function getEvents(params?: {
  device_sn?: string
  baby_id?: number
  event_type_id?: number
  event_level?: number
  page?: number
  page_size?: number
}) {
  const queryParams: string[] = []
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.push(`${key}=${encodeURIComponent(String(value))}`)
      }
    })
  }
  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : ''
  return get<{ items: MonitoringEvent[]; page: number; page_size: number }>(`${API.SENSOR.EVENTS}${queryString}`)
}

/**
 * 获取事件详情
 * GET /api/v1/sensor/events/{event_id}
 */
export function getEventDetail(eventId: number, sourceTable = 'monitoring_events') {
  return get<MonitoringEvent>(withQuery(API.SENSOR.EVENT_DETAIL(eventId), {
    source_table: sourceTable,
  }))
}

/**
 * 确认事件
 * POST /api/v1/sensor/events/confirm
 */
export function confirmEvent(data: { event_id: number; parent_handled?: number; source_table?: string }) {
  return post(API.SENSOR.EVENT_CONFIRM, {
    event_id: data.event_id,
    parent_handled: data.parent_handled ?? 1,
    source_table: data.source_table || 'monitoring_events',
  })
}

// ========== 传感器接口（小程序端） ==========

/**
 * 多模态数据融合分析
 * POST /api/v1/sensor/fusion
 */
export function sensorFusion(data: {
  device_sn: string
  baby_id: number
  video_data?: string
  radar_data?: Record<string, any>
  audio_data?: string
}) {
  return post(API.SENSOR.FUSION, data)
}

/**
 * 场景分类识别
 * GET /api/v1/sensor/scene/classify
 */
export function getSceneClassify(babyId: number) {
  return get<SceneClassifyResult>(`${API.SENSOR.SCENE_CLASSIFY}?baby_id=${babyId}`)
}

/**
 * 执行场景响应脚本
 * POST /api/v1/sensor/scene/response
 */
export function executeSceneResponse(data: {
  baby_id: number
  scene_type: string
  response_mode?: string
}) {
  return post(API.SENSOR.SCENE_RESPONSE, data)
}

// ========== 被动响应接口 ==========

/**
 * 获取被动事件类型列表
 * GET /api/v1/response/event-types
 */
export function getPassiveEventTypes(category?: string, includeInactive = false) {
  const queryParams: string[] = []
  if (category) queryParams.push(`category=${encodeURIComponent(category)}`)
  if (includeInactive) queryParams.push('include_inactive=true')
  const query = queryParams.length ? `?${queryParams.join('&')}` : ''
  return get<PassiveEventType[]>(`${API.RESPONSE.EVENT_TYPES}${query}`)
}

/**
 * 获取被动事件类型详情
 * GET /api/v1/response/event-types/{id}
 */
export function getPassiveEventTypeDetail(id: number) {
  return get<PassiveEventType>(API.RESPONSE.EVENT_TYPE_DETAIL(id))
}

/**
 * 修改事件类型的响应规则
 * PUT /api/v1/response/event-types/{id}
 */
export function updatePassiveEventType(id: number, data: Partial<PassiveEventType>) {
  return put(API.RESPONSE.EVENT_TYPE_UPDATE(id), data)
}

/**
 * 手动执行某类场景的响应
 * POST /api/v1/response/trigger
 */
export function triggerResponse(data: { event_type_id: number; baby_id: number }) {
  return post(withQuery(API.RESPONSE.TRIGGER, data))
}

/**
 * 获取被动响应历史
 * GET /api/v1/response/history
 */
export function getResponseHistory(params?: {
  baby_id?: number
  category?: string
  page?: number
  page_size?: number
}) {
  const queryParams: string[] = []
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.push(`${key}=${encodeURIComponent(String(value))}`)
      }
    })
  }
  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : ''
  return get<{ items: MonitoringEvent[]; page: number; page_size: number }>(`${API.RESPONSE.HISTORY}${queryString}`)
}
