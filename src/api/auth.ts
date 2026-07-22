/**
 * 认证相关API
 * 对齐Apifox OpenAPI 3.0：5个接口（全部小程序接口）
 */
import { post, get, put } from './request'
import { API } from './config'

// 用户信息类型
export interface UserInfo {
  id: number
  phone: string | null
  email: string | null
  nickname: string | null
  avatar_url: string | null
  gender: number | null
  status: string | null
  last_login_at: string | null
  created_at: string | null
}

// 登录响应
export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: {
    id: number
    phone: string
    nickname: string
    avatar_url?: string
  }
}

/**
 * 用户注册
 */
export function register(data: { phone: string; password: string; nickname?: string }) {
  return post<LoginResponse>(API.AUTH.REGISTER, data, { ignore401: true })
}

/**
 * 用户登录
 */
export function login(data: { phone: string; password: string }) {
  return post<LoginResponse>(API.AUTH.LOGIN, data, { ignore401: true })
}

/**
 * 发送短信验证码
 */
export function sendSmsCode(data: { phone: string; scene: 'login' | 'reset_password' | 'bind_phone' | 'change_phone_old' | 'change_phone_new' }) {
  return post(API.AUTH.SMS_CODE, data, { ignore401: true })
}

/**
 * 手机验证码登录
 */
export function codeLogin(data: { phone: string; code: string }) {
  return post<LoginResponse>(API.AUTH.CODE_LOGIN, data, { ignore401: true })
}

/**
 * 忘记密码重置
 */
export function resetPassword(data: { phone: string; code: string; new_password: string }) {
  return post(API.AUTH.RESET_PASSWORD, data)
}

/**
 * 登录态修改密码
 */
export function changePassword(data: { old_password: string; new_password: string }) {
  return post(API.AUTH.CHANGE_PASSWORD, data, { ignore401: true })
}

/**
 * 绑定或更换手机号
 */
export function bindPhone(data: { phone: string; code: string }) {
  return post(API.AUTH.BIND_PHONE, data)
}

/**
 * 更换手机号
 */
export function changePhone(data: {
  old_phone_code: string
  new_phone: string
  new_phone_code: string
}) {
  return post(API.AUTH.BIND_PHONE, data)
}

/**
 * 注销账号
 */
export function cancelAccount(data: { confirm_text: string; password?: string }) {
  return post(API.AUTH.CANCEL_ACCOUNT, data, { ignore401: true })
}

/**
 * 微信登录
 */
export function wechatLogin(data: { code: string }) {
  return post<LoginResponse>(API.AUTH.WECHAT_LOGIN, data, { ignore401: true })
}

/**
 * 获取用户信息
 */
export function getUserInfo() {
  return get<UserInfo>(API.AUTH.INFO, undefined, { showError: false })
}

/**
 * 更新用户信息
 */
export function updateUserInfo(data: { nickname?: string; avatar_url?: string; gender?: number }) {
  return put(API.AUTH.UPDATE_INFO, data)
}
