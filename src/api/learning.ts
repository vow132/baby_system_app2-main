/**
 * AI学习推荐API
 * 对齐Apifox OpenAPI 3.0：2个接口（全部小程序接口）
 */
import { get } from './request'
import { API } from './config'

// 学习进度
export interface LearningProgress {
  baby_id: number
  total_interactions: number
  knowledge_areas: { area: string; progress: number }[]
  last_updated: string | null
}

// 推荐内容
export interface Recommendation {
  id: number
  title: string
  type: string
  description: string | null
  content_url: string | null
  relevance_score: number
}

/**
 * 查看AI学习进度情况
 * GET /api/v1/learning/progress
 */
export function getLearningProgress(babyId: number) {
  return get<LearningProgress>(`${API.LEARNING.PROGRESS}?baby_id=${babyId}`)
}

/**
 * 获取AI个性化推荐内容
 * GET /api/v1/learning/recommendations
 */
export function getRecommendations(params: { baby_id: number; limit?: number }) {
  const queryParams: string[] = [`baby_id=${params.baby_id}`]
  if (params.limit) queryParams.push(`limit=${params.limit}`)
  return get<Recommendation[]>(`${API.LEARNING.RECOMMENDATIONS}?${queryParams.join('&')}`)
}
