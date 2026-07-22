const DEVICE_ALIAS_KEY = 'baby_bed_device_alias_map'
const DEVICE_REMOVED_KEY = 'baby_bed_removed_device_sns'
const DEVICE_REGISTERED_KEY = 'baby_bed_registered_devices'

export interface LocalRegisteredDevice {
  device_sn: string
  device_name: string | null
  device_model: string | null
  created_at: string | null
}

export function getDeviceAliasMap(): Record<string, string> {
  return uni.getStorageSync(DEVICE_ALIAS_KEY) || {}
}

export function setDeviceAlias(deviceSn: string, alias: string) {
  const map = getDeviceAliasMap()
  map[deviceSn] = alias
  uni.setStorageSync(DEVICE_ALIAS_KEY, map)
}

export function getDeviceDisplayName(deviceSn: string, backendName?: string | null) {
  const map = getDeviceAliasMap()
  return map[deviceSn] || backendName || deviceSn
}

export function getRemovedDeviceSnList(): string[] {
  return uni.getStorageSync(DEVICE_REMOVED_KEY) || []
}

export function isRemovedDevice(deviceSn: string) {
  return getRemovedDeviceSnList().includes(deviceSn)
}

export function markDeviceRemoved(deviceSn: string) {
  const list = getRemovedDeviceSnList()
  if (!list.includes(deviceSn)) {
    list.push(deviceSn)
    uni.setStorageSync(DEVICE_REMOVED_KEY, list)
  }
}

export function clearRemovedDevice(deviceSn: string) {
  const list = getRemovedDeviceSnList().filter((sn) => sn !== deviceSn)
  uni.setStorageSync(DEVICE_REMOVED_KEY, list)
}

export function getLocalRegisteredDevices(): LocalRegisteredDevice[] {
  return uni.getStorageSync(DEVICE_REGISTERED_KEY) || []
}

export function upsertLocalRegisteredDevice(device: LocalRegisteredDevice) {
  const list = getLocalRegisteredDevices()
  const index = list.findIndex((item) => item.device_sn === device.device_sn)
  if (index >= 0) {
    list[index] = { ...list[index], ...device }
  } else {
    list.push(device)
  }
  uni.setStorageSync(DEVICE_REGISTERED_KEY, list)
}

export function removeLocalRegisteredDevice(deviceSn: string) {
  const list = getLocalRegisteredDevices().filter((item) => item.device_sn !== deviceSn)
  uni.setStorageSync(DEVICE_REGISTERED_KEY, list)
}
