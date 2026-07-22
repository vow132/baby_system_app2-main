/**
 * 视频识别API
 * 对齐后端 FastAPI：7个接口（1小程序 + 6硬件）
 */
import { get, post, put, del, withQuery } from './request'
import { API } from './config'
import { BASE_URL } from './config'

// 视频信息（对齐后端 VideoResponse）
export interface VideoInfo {
  id: number
  device_sn: string
  video_url: string
  video_content_text: string
  created_at: string
  updated_at: string
}

// 视频分页列表
export interface VideoListResult {
  items: VideoInfo[]
  total: number
  page: number
  page_size: number
}

// ========== 小程序端接口 ==========

/**
 * 获取视频流
 * GET /api/v1/video/stream/{filename}
 */
export function getVideoStream(filename: string) {
  return get(`${API.VIDEO.STREAM(filename)}`, { responseType: 'blob' })
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
  items: MomentVideoItem[]
  total: number
  page: number
  page_size: number
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

// ========== 硬件端接口（小程序不调用，但保留定义） ==========

/**
 * 上传视频文件（硬件端）
 * POST /api/v1/video/upload
 */
export function uploadVideo(data: {
  device_sn: string
  video_url: string
  video_content_text: string
}) {
  return post<VideoInfo>(API.VIDEO.UPLOAD, data)
}

/**
 * 视频信息根据id查询（硬件端）
 * GET /api/v1/video/get/{video_id}
 */
export function getVideoDetail(videoId: number) {
  return get<VideoInfo>(API.VIDEO.DETAIL(videoId))
}

/**
 * 更新视频信息（硬件端）
 * PUT /api/v1/video/update/{video_id}
 */
export function updateVideo(videoId: number, data: {
  video_url?: string
  video_content_text?: string
}) {
  return put<VideoInfo>(API.VIDEO.UPDATE(videoId), data)
}

/**
 * 删除视频信息（硬件端）
 * DELETE /api/v1/video/delete/{video_id}
 */
export function deleteVideo(videoId: number) {
  return del(API.VIDEO.DELETE(videoId))
}

/**
 * 根据设备sn查询视频（硬件端）
 * GET /api/v1/video/by-device/{device_sn}
 */
export function getVideosByDevice(deviceSn: string) {
  return get<VideoInfo[]>(API.VIDEO.BY_DEVICE(deviceSn), undefined, { showError: false })
}

/**
 * 分页查询视频列表（硬件端）
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
