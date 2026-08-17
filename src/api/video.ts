/**
 * 视频识别API
 * 家长端视频查询、管理和短期签名媒体地址
 */
import { get, put, del, withQuery } from './request'
import { API } from './config'
import { BASE_URL } from './config'

// 视频信息（对齐后端 VideoResponse）
export interface VideoInfo {
  id: number
  device_sn: string
  video_url: string
  img_url?: string | null
  video_content_text: string | null
  created_at: string
  updated_at: string
  file_name?: string
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  duration?: number | null
  file_size?: number | null
  resolution?: string | null
}

// 视频分页列表
export interface VideoListResult {
  list: VideoInfo[]
  total: number
}

// ========== 温馨瞬间视频列表（小程序） ==========

/** 温馨瞬间视频条目（videos 表字段） */
export interface MomentVideoItem {
  id: number
  video_url: string
  created_at: string | null
  video_content_text: string | null
  file_name?: string
  device_sn?: string
  baby_id?: number | null
}

export interface MomentVideoListResult {
  list: MomentVideoItem[]
  total: number
}

/**
 * 获取温馨瞬间视频列表
 * GET /api/v1/video/list?device_sn=xxx&page_index=1&page_size=50
 */
export function getMomentVideos(params: {
  device_sn: string
  page?: number
  page_size?: number
}) {
  return get<MomentVideoListResult>(withQuery(API.VIDEO.LIST, {
    device_sn: params.device_sn,
    page_index: params.page,
    page_size: params.page_size,
  }), undefined, { showError: false })
}

/** 将相对路径拼接为完整视频流地址 */
export function resolveVideoUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const host = BASE_URL.split('/api/v1')[0]
  return host + (url.startsWith('/') ? url : `/${url}`)
}

// ========== 家长管理接口 ==========

/**
 * 家长根据 ID 查询视频
 * GET /api/v1/video/get/{video_id}
 */
export function getVideoDetail(videoId: number) {
  return get<VideoInfo>(API.VIDEO.DETAIL(videoId))
}

/**
 * 家长更新视频信息
 * PUT /api/v1/video/update/{video_id}
 */
export function updateVideo(videoId: number, data: {
  video_content_text?: string
}) {
  return put<VideoInfo>(API.VIDEO.UPDATE(videoId), data)
}

/**
 * 家长删除视频信息
 * DELETE /api/v1/video/delete/{video_id}
 */
export function deleteVideo(videoId: number) {
  return del(API.VIDEO.DELETE(videoId))
}

/**
 * 家长根据设备 SN 查询视频
 * GET /api/v1/video/by-device/{device_sn}
 */
export function getVideosByDevice(deviceSn: string) {
  return get<VideoInfo[]>(API.VIDEO.BY_DEVICE(deviceSn), undefined, { showError: false })
}

/**
 * 家长分页查询视频列表
 * GET /api/v1/video/list
 */
export function getVideoList(params: {
  device_sn: string
  page?: number
  page_size?: number
}) {
  return get<VideoListResult>(withQuery(API.VIDEO.LIST, {
    device_sn: params.device_sn,
    page_index: params.page,
    page_size: params.page_size,
  }), undefined, { showError: false })
}
