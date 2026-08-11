/**
 * 温馨瞬间API
 * 对齐Apifox OpenAPI 3.0：4个接口（全部小程序接口）
 * 路径参数：{month}, {moment_id}
 */
import { get, post, withQuery } from './request'
import { API } from './config'

// 温馨瞬间信息
export interface MomentInfo {
  id: number
  baby_id: number
  type: string
  media_url: string
  thumbnail_url: string | null
  caption: string | null
  captured_at: string
  created_at: string | null
  share_path: string
  share_expires_at: string
}

// 原生小程序分享信息
export interface ShareResult {
  share_path: string
  image_url: string
  expires_at: string
}

// 免登录公开分享页只使用单张照片的最小信息
export interface PublicMomentInfo {
  id: number
  type: 'photo'
  media_url: string
  thumbnail_url: string | null
  caption: string | null
  captured_at: string
  created_at: string | null
  share_path: string
  share_expires_at: string
}

/**
 * 时间线查看温馨瞬间
 * GET /api/v1/moment/timeline
 */
export function getMomentTimeline(params: {
  baby_id: number
  page?: number
  page_size?: number
}) {
  const queryParams: string[] = [`baby_id=${params.baby_id}`]
  if (params.page) queryParams.push(`page=${params.page}`)
  if (params.page_size) queryParams.push(`page_size=${params.page_size}`)
  return get<{ items: MomentInfo[]; page: number; page_size: number }>(`${API.MOMENT.TIMELINE}?${queryParams.join('&')}`, undefined, { showError: false })
}

/**
 * 按月筛选温馨瞬间列表
 * GET /api/v1/moment/month/{month}
 */
export function getMomentByMonth(month: string, babyId: number) {
  return get<MomentInfo[]>(`${API.MOMENT.MONTH(month)}?baby_id=${babyId}`)
}

/**
 * 生成分享链接供他人访问
 * POST /api/v1/moment/share
 */
export function shareMoment(data: { moment_id?: number; moment_ids?: number[] }) {
  const momentId = data.moment_id || data.moment_ids?.[0]
  return post<ShareResult>(withQuery(API.MOMENT.SHARE, { moment_id: momentId }))
}

/**
 * 通过七天有效的分享令牌免登录查看单张照片
 * GET /api/v1/moment/public/{token}
 */
export function getPublicSharedMoment(token: string) {
  return get<PublicMomentInfo>(API.MOMENT.PUBLIC(token), undefined, { showError: false })
}

/**
 * 获取照片视频下载链接
 * GET /api/v1/moment/download/{moment_id}
 */
export function downloadMoment(momentId: number) {
  return get<{ moment_id: number; download_url: string }>(
    API.MOMENT.DOWNLOAD(momentId),
    undefined,
    { showError: false },
  )
}
