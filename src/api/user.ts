/**
 * 用户偏好API
 * 对齐Apifox OpenAPI 3.0：2个接口（全部小程序接口）
 */
import { get, put } from './request'
import { API } from './config'

// 用户主题配置
export interface UserTheme {
  theme_name: string
  primary_color: string | null
  font_size: string | null
  animation_enabled: boolean | null
}

/**
 * 获取用户主题配置
 * GET /api/v1/user/theme
 */
export function getUserTheme() {
  return get<UserTheme>(API.USER.THEME)
}

/**
 * 更新用户主题配置
 * PUT /api/v1/user/theme
 */
export function updateUserTheme(data: {
  theme_name?: string
  primary_color?: string
  font_size?: string
  animation_enabled?: boolean
}) {
  return put<UserTheme>(API.USER.UPDATE_THEME, data)
}
