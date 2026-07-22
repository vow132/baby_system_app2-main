/**
 * 家庭相关API
 * 对齐后端 FastAPI：7个接口（全部小程序接口）
 */
import { get, post, put, del, withQuery } from './request'
import { API } from './config'

// 家庭信息（对齐后端 FamilyInfo）
export interface FamilyInfo {
  id: number
  family_name: string | null
  family_code: string | null
  plan_type: string | null
  plan_expire_at: string | null
  device_quota: number | null
  baby_quota: number | null
  status: string | null
  current_member_id?: number | null
  member_role?: string | null
  relation?: string | null
  is_admin?: number | null
  can_view?: number | null
  can_control?: number | null
  can_receive_push?: number | null
  created_at: string | null
}

// 家庭成员（对齐后端 FamilyMemberInfo）
export interface FamilyMember {
  id: number
  family_id: number
  user_id: number
  member_role: string | null
  relation: string | null
  display_name: string | null
  phone: string | null
  can_view: number | null
  can_control: number | null
  can_receive_push: number | null
  push_priority: number | null
  is_emergency_contact: number | null
  is_admin: number | null
  is_active: number | null
  joined_at: string | null
  nickname: string | null
  avatar_url: string | null
}

/**
 * 创建家庭
 */
export function createFamily(data: { family_name: string }) {
  return post(withQuery(API.FAMILY.CREATE, data), data)
}

/**
 * 加入家庭
 * 对齐后端 FamilyJoin: { family_code, member_role?, relation?, display_name? }
 */
export function joinFamily(data: {
  family_code: string
  member_role?: string
  relation?: string
  display_name?: string
}) {
  return post(withQuery(API.FAMILY.JOIN, data), data)
}

/**
 * 获取家庭信息
 */
export function getFamilyInfo() {
  return get<FamilyInfo>(API.FAMILY.INFO, undefined, { showError: false })
}

/**
 * 更新家庭信息
 */
export function updateFamilyInfo(data: { family_name?: string }) {
  return put(withQuery(API.FAMILY.UPDATE, data), data)
}

/**
 * 获取家庭成员列表
 */
export function getFamilyMembers() {
  return get<FamilyMember[]>(API.FAMILY.MEMBERS)
}

/**
 * 管理员修改家庭成员角色
 */
export function updateFamilyMemberRole(memberId: number, data: {
  member_role: string
  is_admin?: number
  can_view?: number
  can_control?: number
  can_receive_push?: number
}) {
  return put(withQuery(API.FAMILY.MEMBER_ROLE(memberId), data), data)
}

/**
 * 管理员移除指定家庭成员
 */
export function removeFamilyMember(memberId: number, reason?: string) {
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : ''
  return del(`${API.FAMILY.MEMBER_REMOVE(memberId)}${query}`)
}

/**
 * 获取邀请码
 */
export function getInviteCode() {
  return get<{ family_code: string }>(API.FAMILY.INVITE_CODE)
}

/**
 * 退出家庭
 */
export function regenerateInviteCode() {
  return post<{ family_code: string }>(API.FAMILY.INVITE_REGENERATE)
}

export function transferFamilyAdmin(memberId: number) {
  return post(API.FAMILY.TRANSFER_ADMIN, { member_id: memberId })
}

export function dissolveFamily() {
  return post(API.FAMILY.DISSOLVE)
}

export function leaveFamily() {
  return post(API.FAMILY.LEAVE)
}
