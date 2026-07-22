/**
 * 系统管理API
 * 对齐后端 FastAPI：5个接口（全部硬件端）
 */
import { get, post } from './request'
import { API } from './config'

export interface StorageStatus {
  database_size?: string
  used_storage?: string
  sync_queue?: number
  last_backup_at?: string | null
  seed_version?: string
}

export interface PerformanceStatus {
  api_latency_ms?: number
  memory_usage_mb?: number
  error_count?: number
  pass_rate?: number
  updated_at?: string | null
}

export function getStorageStatus() {
  return get<StorageStatus>(API.SYSTEM.STORAGE_STATUS, undefined, { showError: false })
}

/**
 * 数据同步
 * POST /api/v1/system/sync
 * 对齐后端 DataSyncRequest: { device_sn, sync_type, sync_direction }
 */
export function triggerSystemSync(data: {
  device_sn: string
  sync_type: string
  sync_direction: string
}) {
  return post(API.SYSTEM.SYNC, data, { showError: false })
}

export function getSeedVersion() {
  return get<{ version: string; updated_at?: string }>(API.SYSTEM.SEED_VERSION, undefined, { showError: false })
}

export function getPerformanceStatus() {
  return get<PerformanceStatus>(API.SYSTEM.PERFORMANCE, undefined, { showError: false })
}

export function getSystemHealth() {
  return get<{ status?: string; message?: string; checked_at?: string }>(API.SYSTEM.HEALTH, undefined, { showError: false })
}
