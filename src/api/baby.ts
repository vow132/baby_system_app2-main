/**
 * 宝宝相关API
 * 对齐Apifox OpenAPI 3.0：5个接口（全部小程序接口）
 * 路径参数：{baby_id}
 */
import { get, post, put, del } from './request'
import { API } from './config'

// 宝宝信息
export interface BabyInfo {
  id: number
  family_id: number
  name: string
  gender: number | null
  birth_date: string | null
  current_age_months: number | null
  avatar_url: string | null
  created_at: string | null
}

/**
 * 添加宝宝
 */
export function addBaby(data: { 
  name: string
  gender?: number
  birth_date?: string
  avatar_url?: string 
}) {
  return post<BabyInfo>(API.BABY.ADD, data)
}

/**
 * 获取宝宝列表
 */
export function getBabyList() {
  return get<BabyInfo[]>(API.BABY.LIST, undefined, { showError: false })
}

/**
 * 获取宝宝详情
 */
export function getBabyDetail(id: number) {
  return get<BabyInfo>(API.BABY.DETAIL(id))
}

/**
 * 更新宝宝信息
 */
export function updateBaby(id: number, data: { 
  name?: string
  gender?: number
  birth_date?: string
  avatar_url?: string 
}) {
  return put(API.BABY.UPDATE(id), data)
}

/**
 * 删除宝宝
 */
export function deleteBaby(id: number) {
  return del(API.BABY.DELETE(id))
}

/**
 * 导出宝宝成长数据
 */
export function exportBabyData(id: number) {
  return get<{ download_url?: string; file_url?: string; url?: string }>(API.BABY.EXPORT(id), undefined, { showError: false })
}
