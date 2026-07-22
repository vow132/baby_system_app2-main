/**
 * 硬件控制API
 * 对齐后端 FastAPI：11个接口（8硬件 + 1小程序 + 1共用 + 1硬件）
 */
import { get, post, put, del, withQuery } from './request'
import { API } from './config'

// 灯光配置
export interface LightConfig {
  id: number
  event_type_id: number
  light_mode: string
  color_primary: string
  brightness_pct: number
  created_at: string | null
}

// 动画信息（对齐后端 AnimationResponse）
export interface AnimationInfo {
  id: number
  event_type_id: number
  animation_name: string
  animation_desc: string | null
  animation_url: string
  duration_ms: number
  file_size_bytes: number | null
  screen_mode: string
  bg_color: string | null
  text_overlay: string | null
  is_active: number
  created_at: string
}

// 动画创建请求（对齐后端 AnimationCreate）
export interface AnimationCreate {
  event_type_id: number
  animation_name: string
  animation_url: string
  duration_ms: number
  animation_desc?: string
  file_size_bytes?: number
  screen_mode?: string
  bg_color?: string
  text_overlay?: string
}

// 动画更新请求（对齐后端 AnimationUpdate）
export interface AnimationUpdate {
  event_type_id?: number
  animation_name?: string
  animation_desc?: string
  animation_url?: string
  duration_ms?: number
  file_size_bytes?: number
  screen_mode?: string
  bg_color?: string
  text_overlay?: string
  is_active?: number
}

// 设备模式信息
export interface HardwareModeInfo {
  device_sn: string
  mode: string
  baby_id: number | null
  config: any
  updated_at: string
}

// ========== 灯光相关接口 ==========

/**
 * 设置设备RGB灯光颜色模式（硬件端）
 * POST /api/v1/hardware/light/set
 */
export function setLight(data: {
  device_sn: string
  color_r: number
  color_g: number
  color_b: number
  brightness?: number
}) {
  return post(withQuery(API.HARDWARE.LIGHT_SET, data))
}

/**
 * 查询所有灯光预设配置（硬件端）
 * GET /api/v1/hardware/light/configs
 */
export function getLightConfigs(deviceSn: string) {
  return get<LightConfig[]>(`${API.HARDWARE.LIGHT_CONFIGS}?device_sn=${deviceSn}`)
}

/**
 * 灯光预设配置应用到设备（硬件端）
 * POST /api/v1/hardware/light/config/apply
 */
export function applyLightConfig(data: { config_id: number; device_sn: string }) {
  return post(withQuery(API.HARDWARE.LIGHT_CONFIG_APPLY, data))
}

/**
 * 控制氛围灯RGB和动画（硬件端）
 * POST /api/v1/hardware/light/control
 */
export function controlLight(data: {
  device_sn: string
  color_r: number
  color_g: number
  color_b: number
  brightness?: number
  animation_mode?: string
}) {
  return post(withQuery(API.HARDWARE.LIGHT_CONTROL, data))
}

/**
 * 保存自定义灯光预设配置（小程序端）
 * POST /api/v1/hardware/light/config/save
 */
export function saveLightConfig(data: {
  event_type_id: number
  alarm_level_id?: number
  light_mode: string
  color_primary: string
  brightness_pct: number
}) {
  return post<LightConfig>(withQuery(API.HARDWARE.LIGHT_CONFIG_SAVE, data))
}

// ========== 屏幕动画相关接口 ==========

/**
 * 查询设备支持的屏幕动画（硬件端）
 * GET /api/v1/hardware/animation/list
 */
export function getAnimationList(deviceSn: string) {
  return get<AnimationInfo[]>(`${API.HARDWARE.ANIMATION_LIST}?device_sn=${deviceSn}`)
}

/**
 * 设备屏幕上播放动画（硬件端）
 * POST /api/v1/hardware/animation/play
 */
export function playAnimation(data: { device_sn: string; animation_id: number }) {
  return post(withQuery(API.HARDWARE.ANIMATION_PLAY, data))
}

/**
 * 停止当前播放的屏幕动画（硬件端）
 * POST /api/v1/hardware/animation/stop
 */
export function stopAnimation(deviceSn: string) {
  return post(withQuery(API.HARDWARE.ANIMATION_STOP, { device_sn: deviceSn }))
}

/**
 * 控制5寸屏幕动画加载（硬件端）
 * POST /api/v1/hardware/screen/animation
 */
export function controlScreenAnimation(data: {
  device_sn: string
  animation_id?: number
  animation_name?: string
}) {
  return post(withQuery(API.HARDWARE.SCREEN_ANIMATION, data))
}

// ========== 设备模式相关接口 ==========

/**
 * 切换婴儿床工作模式（共用）
 * POST /api/v1/hardware/mode/switch
 */
export function switchHardwareMode(data: {
  device_sn: string
  mode: string
  baby_id?: number
}) {
  return post(withQuery(API.HARDWARE.MODE_SWITCH, data))
}

/**
 * 获取当前工作模式及配置（硬件端）
 * GET /api/v1/hardware/mode/current
 */
export function getCurrentMode(deviceSn: string) {
  return get<HardwareModeInfo>(`${API.HARDWARE.MODE_CURRENT}?device_sn=${deviceSn}`)
}

// ========== 动画管理（小程序端） ==========

/**
 * 创建动画（小程序端）
 * POST /api/v1/hardware/animation/create
 */
export function createAnimation(data: AnimationCreate) {
  return post<AnimationInfo>(API.HARDWARE.ANIMATION_CREATE, data)
}

/**
 * 获取动画详情（小程序端）
 * GET /api/v1/hardware/animation/detail/{animation_id}
 */
export function getAnimationDetail(animationId: number) {
  return get<AnimationInfo>(API.HARDWARE.ANIMATION_DETAIL(animationId))
}

/**
 * 更新动画（小程序端）
 * PUT /api/v1/hardware/animation/update/{animation_id}
 */
export function updateAnimation(animationId: number, data: AnimationUpdate) {
  return put<AnimationInfo>(API.HARDWARE.ANIMATION_UPDATE(animationId), data)
}

/**
 * 删除动画（小程序端）
 * DELETE /api/v1/hardware/animation/delete/{animation_id}
 */
export function deleteAnimation(animationId: number) {
  return del(API.HARDWARE.ANIMATION_DELETE(animationId))
}

