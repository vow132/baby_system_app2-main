/**
 * 设备相关API
 * 对齐Apifox OpenAPI 3.0：9个接口（2小程序 + 3硬件 + 4共用）
 * 小程序端调用：LIST(小程序)、STATUS(小程序)、BIND(共用)、UNBIND(共用)、MODE_SWITCH(共用)、MODE_HISTORY(共用)
 * 硬件端接口保留定义供参考：REGISTER、WIFI_CONFIG、WIFI_STATUS
 * 路径参数：{device_sn}
 */
import { del, get, post, put, withQuery } from './request'
import { API } from './config'

// 设备信息（对齐后端 DeviceInfo）
export interface DeviceInfo {
  id: number
  device_sn: string
  baby_id: number | null
  device_name: string | null
  device_model: string | null
  firmware_version: string | null
  work_mode: string | null
  online_status: number | null
  last_online_at: string | null
  created_at: string | null
}

// 模式切换历史
export interface ModeSwitchRecord {
  id: number
  device_id: number
  baby_id: number
  from_mode: string | null
  to_mode: string
  switch_type: string | null
  switch_reason: string | null
  switched_at: string | null
}

export interface DeviceBattery {
  device_sn: string
  battery_level?: number
  charging?: boolean | number
  updated_at?: string | null
}

export interface FirmwareVersion {
  device_sn: string
  current_version?: string
  latest_version?: string
  need_upgrade?: boolean | number
}

export interface DeviceCredentialStatus {
  device_sn: string
  credential_service_enabled: boolean
  factory_provisioned: boolean
  activation_status: string | null
  claimed: boolean
  token_version: number | null
  token_status: string | null
  legacy_token_configured: boolean
  access_status: 'active' | 'pending' | 'legacy' | 'revoked' | 'not_initialized'
}

export interface DeviceRecoveryCode {
  device_sn: string
  recovery_code: string
  expires_at: string
  display_once: boolean
}

// ========== 小程序端接口 ==========

/**
 * 获取设备列表
 * GET /api/v1/device/list
 */
export function getDeviceList() {
  return get<DeviceInfo[]>(API.DEVICE.LIST, undefined, { showError: false })
}

/**
 * 获取设备状态
 * GET /api/v1/device/status/{device_sn}
 */
export function getDeviceStatus(deviceSn: string) {
  return get(API.DEVICE.STATUS(deviceSn))
}

export function getFirmwareVersion(deviceSn: string) {
  return get<FirmwareVersion>(withQuery(API.DEVICE.FIRMWARE_VERSION, { device_sn: deviceSn }), undefined, { showError: false })
}

export function upgradeDevice(data: { device_sn: string; version?: string }) {
  return post(withQuery(API.DEVICE.OTA_UPGRADE, data), data, { showError: false })
}

export function rebootDevice(deviceSn: string) {
  return post(API.DEVICE.REBOOT(deviceSn), undefined, { showError: false })
}

export function diagnoseDevice(deviceSn: string) {
  return post(API.DEVICE.DIAGNOSE(deviceSn), undefined, { showError: false })
}

export function getDeviceBattery(deviceSn: string) {
  return get<DeviceBattery>(withQuery(API.DEVICE.BATTERY, { device_sn: deviceSn }), undefined, { showError: false })
}

// ========== 共用接口 ==========

/**
 * 绑定设备到宝宝
 * POST /api/v1/device/bind
 */
export function bindDevice(data: { device_sn: string; baby_id: number; claim_code?: string }) {
  return post(API.DEVICE.BIND, data)
}

export function claimDevice(data: {
  device_sn: string
  claim_code: string
  baby_id?: number
  device_name?: string
}) {
  return post(API.DEVICE.CLAIM, data, { showError: false })
}

export function getDeviceCredentialStatus(deviceSn: string) {
  return get<DeviceCredentialStatus>(
    API.DEVICE.CREDENTIAL_STATUS(deviceSn),
    undefined,
    { showError: false },
  )
}

export function createDeviceRecoveryCode(deviceSn: string) {
  return post<DeviceRecoveryCode>(
    API.DEVICE.RECOVERY_CODE(deviceSn),
    undefined,
    { showError: false },
  )
}

export function revokeDeviceCredentials(
  deviceSn: string,
  data: { reason?: string; revoke_activation?: boolean } = {},
) {
  return post(
    API.DEVICE.REVOKE_CREDENTIALS(deviceSn),
    data,
    { showError: false },
  )
}

/**
 * 解绑设备
 * POST /api/v1/device/unbind
 */
export function unbindDevice(data: { device_sn: string }) {
  return post(withQuery(API.DEVICE.UNBIND, data))
}

/**
 * 注销设备并删除数据库记录
 * DELETE /api/v1/device/{device_sn}
 */
export function deleteDevice(deviceSn: string) {
  return del(API.DEVICE.DELETE(deviceSn))
}

/**
 * 修改设备名称
 * PUT /api/v1/device/name
 */
export function updateDeviceName(deviceSn: string, deviceName: string) {
  return put(API.DEVICE.UPDATE_NAME, { device_sn: deviceSn, device_name: deviceName })
}

/**
 * 切换设备模式
 * POST /api/v1/device/mode/switch
 */
export function switchDeviceMode(data: {
  device_sn: string
  target_mode: string
  switch_type?: string
}) {
  return post(API.DEVICE.MODE_SWITCH, data)
}

/**
 * 获取模式切换历史
 * GET /api/v1/device/mode/history
 */
export function getModeHistory(params: { device_sn: string; page?: number; page_size?: number }) {
  const queryParams: string[] = [`device_sn=${params.device_sn}`]
  if (params.page) queryParams.push(`page=${params.page}`)
  if (params.page_size) queryParams.push(`page_size=${params.page_size}`)
  return get<{ items: ModeSwitchRecord[]; page: number; page_size: number }>(
    `${API.DEVICE.MODE_HISTORY}?${queryParams.join('&')}`
  )
}

// ========== 硬件端接口（小程序不调用，但保留定义） ==========

/**
 * 注册新设备到系统（硬件端）
 * POST /api/v1/device/register
 */
export function registerDevice(data: {
  device_sn: string
  device_name: string
  device_model: string
}) {
  return post(API.DEVICE.REGISTER, data)
}

/**
 * 为设备配置WiFi网络连接（硬件端）
 * POST /api/v1/device/wifi-config
 * 对齐后端 WiFiConfig: { device_sn, ssid, password, security? }
 */
export function configDeviceWifi(data: {
  device_sn: string
  ssid: string
  password: string
  security?: string
}) {
  return post(API.DEVICE.WIFI_CONFIG, data)
}

/**
 * 查询设备WiFi连接状态（硬件端）
 * GET /api/v1/device/wifi-status/{device_sn}
 */
export function getDeviceWifiStatus(deviceSn: string) {
  return get(API.DEVICE.WIFI_STATUS(deviceSn))
}
