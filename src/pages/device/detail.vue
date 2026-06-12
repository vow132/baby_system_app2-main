<template>
  <view class="device-detail-page">
    <view class="device-header">
      <view class="device-status">
        <view class="status-dot" :class="{ online: !!device?.online_status }" />
        <text>{{ device?.online_status ? '在线' : '离线' }}</text>
      </view>
      <text class="device-name">{{ displayName }}</text>
      <text class="device-sn">SN: {{ deviceSn }}</text>
    </view>

    <view class="section">
      <text class="section-title">设备信息</text>
      <view class="info-list">
        <view class="info-item"><text class="label">固件版本</text><text class="value">{{ firmwareText }}</text></view>
        <view class="info-item"><text class="label">电池状态</text><text class="value">{{ batteryText }}</text></view>
        <view class="info-item"><text class="label">工作模式</text><text class="value">{{ getModeText(device?.work_mode) }}</text></view>
        <view class="info-item"><text class="label">当前绑定</text><text class="value">{{ currentBindBabyText }}</text></view>
        <view class="info-item"><text class="label">最后在线</text><text class="value">{{ formatTime(device?.last_online_at) }}</text></view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">模式切换</text>
      <view class="mode-list">
        <view class="mode-item" v-for="mode in modes" :key="mode.value" :class="{ active: device?.work_mode === mode.value }" @click="switchMode(mode.value)">
          <view class="mode-icon" :style="{ background: mode.color }">
            <u-icon :name="mode.icon" size="44" color="#fff" />
          </view>
          <text class="mode-name">{{ mode.label }}</text>
          <text class="mode-desc">{{ mode.desc }}</text>
          <text class="mode-policy">{{ mode.policy }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">操作</text>
      <view class="action-list">
        <view class="action-item" @click="viewHistory"><u-icon name="list" size="40" /><text>切换历史</text><u-icon name="arrow-right" size="28" color="#ccc" /></view>
        <view class="action-item" @click="handleUpgrade"><u-icon name="arrow-upward" size="40" color="#5677fc" /><text>固件升级</text></view>
        <view class="action-item" @click="handleDiagnose"><u-icon name="checkmark-circle" size="40" color="#19be6b" /><text>设备诊断</text></view>
        <view class="action-item" @click="handleReboot"><u-icon name="reload" size="40" color="#ff9900" /><text>远程重启</text></view>
        <view class="action-item" @click="openRename"><u-icon name="edit-pen" size="40" color="#5677fc" /><text>设备改名</text></view>
        <view class="action-item" @click="unbindCurrentDevice"><u-icon name="minus-circle" size="40" color="#fa3534" /><text>解绑设备</text></view>
        <view class="action-item" @click="deactivateDevice"><u-icon name="close-circle" size="40" color="#fa3534" /><text>删除设备</text></view>
      </view>
    </view>


    <u-popup :show="showRenamePopup" mode="center" round="16" @close="showRenamePopup = false">
      <view class="rename-popup">
        <text class="rename-title">设备改名</text>
        <u-input v-model="renameValue" placeholder="请输入新的设备名称" border="surround" />
        <view class="popup-actions">
          <u-button text="取消" shape="circle" @click="showRenamePopup = false" />
          <u-button type="primary" text="保存" shape="circle" @click="saveRename" />
        </view>
      </view>
    </u-popup>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { deleteDevice, diagnoseDevice, getDeviceBattery, getDeviceList, getDeviceStatus, getFirmwareVersion, rebootDevice, switchDeviceMode, unbindDevice, updateDeviceName, upgradeDevice, type DeviceBattery, type DeviceInfo, type FirmwareVersion } from '@/api/device'
import { useBabyStore } from '@/stores'
import { clearRemovedDevice, getDeviceDisplayName, getLocalRegisteredDevices, markDeviceRemoved, removeLocalRegisteredDevice, setDeviceAlias, upsertLocalRegisteredDevice } from '@/common/deviceLocal'

const babyStore = useBabyStore()
const device = ref<DeviceInfo | null>(null)
const deviceList = ref<DeviceInfo[]>([])
const battery = ref<DeviceBattery | null>(null)
const firmware = ref<FirmwareVersion | null>(null)
const deviceSn = ref('')
const showRenamePopup = ref(false)
const renameValue = ref('')

const modes = [
  { label: '睡床', value: 'sleep', icon: 'moon', color: 'linear-gradient(135deg, #5677fc, #3d5afe)', desc: '夜间守护', policy: '全量监测与告警' },
  { label: '游戏床', value: 'play', icon: 'play-circle', color: 'linear-gradient(135deg, #19be6b, #0e9c5a)', desc: '活动观察', policy: '降低动作误报' },
  { label: '拼床', value: 'co_sleep', icon: 'home', color: 'linear-gradient(135deg, #ff9900, #f5a623)', desc: '亲近陪睡', policy: '弱化灯光与声音' },
]

// 优先显示绑定宝宝名，其次数据库中的 device_name
const displayName = computed(() => {
  if (device.value?.baby_id) {
    const baby = babyStore.babyList.find(b => String(b.id) === String(device.value!.baby_id))
    if (baby) return baby.name
  }
  return device.value?.device_name || deviceSn.value
})
const firmwareText = computed(() => firmware.value?.current_version || device.value?.firmware_version || '待同步')
const batteryText = computed(() => {
  if (!battery.value) return '待同步'
  const level = battery.value.battery_level ?? '--'
  const charging = battery.value.charging ? '充电中' : '未充电'
  return `${level}% · ${charging}`
})
const currentDeviceFromList = computed(() => {
  return deviceList.value.find((item) => item.device_sn === deviceSn.value) || null
})
const currentBoundBabyId = computed(() => {
  return device.value?.baby_id || currentDeviceFromList.value?.baby_id || null
})
const currentBindBabyText = computed(() => {
  if (!currentBoundBabyId.value) return '未绑定'
  return babyStore.babyList.find((b) => String(b.id) === String(currentBoundBabyId.value))?.name || `ID:${currentBoundBabyId.value}`
})

function isSuccessCode(code: number) {
  return code === 0 || code === 200
}

onLoad(async (options) => {
  if (options?.sn) deviceSn.value = options.sn
  await loadDevice()
})

async function loadDevice() {
  await Promise.allSettled([babyStore.fetchBabyList()])

  // 直接调用 getDeviceStatus 获取设备信息（后端已支持未绑定设备）
  const [statusRes, listRes, firmwareRes, batteryRes] = await Promise.allSettled([
    getDeviceStatus(deviceSn.value),
    getDeviceList(),
    getFirmwareVersion(deviceSn.value),
    getDeviceBattery(deviceSn.value),
  ])

  if (statusRes.status === 'fulfilled' && isSuccessCode(statusRes.value.code)) {
    device.value = statusRes.value.data as DeviceInfo
    // 直接使用数据库中的 device_name，不使用本地别名
    renameValue.value = device.value?.device_name || ''
  }

  if (listRes.status === 'fulfilled' && isSuccessCode(listRes.value.code) && Array.isArray(listRes.value.data)) {
    deviceList.value = listRes.value.data
    // 如果 getDeviceStatus 没返回 baby_id，从列表中补充
    const listDevice = listRes.value.data.find((item: DeviceInfo) => item.device_sn === deviceSn.value)
    if (listDevice && device.value) {
      device.value = { ...device.value, baby_id: listDevice.baby_id }
    }
  }

  if (firmwareRes.status === 'fulfilled' && isSuccessCode(firmwareRes.value.code)) firmware.value = firmwareRes.value.data
  if (batteryRes.status === 'fulfilled' && isSuccessCode(batteryRes.value.code)) battery.value = batteryRes.value.data

  // 如果还是没有设备信息，尝试从本地缓存获取
  if (!device.value) {
    const localDevice = getLocalRegisteredDevices().find((item) => item.device_sn === deviceSn.value)
    if (localDevice) {
      device.value = {
        id: -1,
        device_sn: localDevice.device_sn,
        baby_id: null,
        device_name: localDevice.device_name,
        device_model: localDevice.device_model,
        firmware_version: null,
        work_mode: null,
        online_status: 0,
        last_online_at: null,
        created_at: localDevice.created_at,
      }
      renameValue.value = getDeviceDisplayName(deviceSn.value, localDevice.device_name)
    }
  }
}

function getModeText(mode: string | null | undefined) {
  const map: Record<string, string> = { sleep: '睡眠模式', play: '游戏模式', co_sleep: '拼床模式' }
  return map[mode || ''] || '未知'
}

function formatTime(time?: string | null) {
  if (!time) return '未知'
  return new Date(time).toLocaleString('zh-CN')
}

async function switchMode(mode: string) {
  if (!device.value || device.value.work_mode === mode) return
  const res = await switchDeviceMode({ device_sn: deviceSn.value, target_mode: mode })
  if (isSuccessCode(res.code)) {
    device.value.work_mode = mode
    uni.showToast({ title: '切换成功', icon: 'success' })
  } else {
    uni.showToast({ title: res.message || '切换失败', icon: 'none' })
  }
}

function viewHistory() {
  uni.navigateTo({ url: `/pages/device/history?sn=${deviceSn.value}` })
}

async function handleUpgrade() {
  const res = await upgradeDevice({ device_sn: deviceSn.value, version: firmware.value?.latest_version })
  uni.showToast({ title: isSuccessCode(res.code) ? '已发起升级' : (res.message || '升级失败'), icon: 'none' })
}

async function handleDiagnose() {
  const res = await diagnoseDevice(deviceSn.value)
  uni.showToast({ title: isSuccessCode(res.code) ? '诊断已发起' : (res.message || '诊断失败'), icon: 'none' })
}

function handleReboot() {
  uni.showModal({
    title: '远程重启',
    content: '确认重启设备吗？',
    success: async (modalRes) => {
      if (!modalRes.confirm) return
      const res = await rebootDevice(deviceSn.value)
      uni.showToast({ title: isSuccessCode(res.code) ? '重启指令已发送' : (res.message || '重启失败'), icon: 'none' })
    },
  })
}

function openRename() {
  renameValue.value = displayName.value
  showRenamePopup.value = true
}

async function saveRename() {
  const name = (renameValue.value || '').trim()
  if (!name) {
    uni.showToast({ title: '请输入设备名称', icon: 'none' })
    return
  }

  // 调用后端 API 更新设备名称到数据库
  try {
    const res = await updateDeviceName(deviceSn.value, name)
    if (isSuccessCode(res.code)) {
      // 更新本地显示
      if (device.value) device.value.device_name = name
      showRenamePopup.value = false
      uni.showToast({ title: '名称修改成功', icon: 'success' })
    } else {
      uni.showToast({ title: res.message || '修改失败', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '修改失败', icon: 'none' })
  }
}

function unbindCurrentDevice() {
  if (!currentBoundBabyId.value) {
    uni.showToast({ title: '当前未绑定', icon: 'none' })
    return
  }
  uni.showModal({
    title: '确认解绑',
    content: '解绑后设备仍存在，可再次切换绑定宝宝。',
    success: async (modalRes) => {
      if (!modalRes.confirm) return
      const res = await unbindDevice({ device_sn: deviceSn.value })
      if (isSuccessCode(res.code)) {
        clearRemovedDevice(deviceSn.value)
        if (device.value) device.value.baby_id = null
        const listDevice = deviceList.value.find((item) => item.device_sn === deviceSn.value)
        if (listDevice) listDevice.baby_id = null
        if (device.value) {
          upsertLocalRegisteredDevice({
            device_sn: device.value.device_sn,
            device_name: device.value.device_name,
            device_model: device.value.device_model,
            created_at: device.value.created_at,
          })
        }
        uni.showToast({ title: '解绑成功', icon: 'success' })
        await loadDevice()
      } else {
        uni.showToast({ title: res.message || '解绑失败', icon: 'none' })
      }
    },
  })
}

function deactivateDevice() {
  uni.showModal({
    title: '删除设备',
    content: currentBoundBabyId.value
      ? '当前设备已绑定宝宝，请先解绑后再删除'
      : '确认删除该设备的话将清除所有绑定过的数据',
    success: async (modalRes) => {
      if (!modalRes.confirm) return
      // 如果设备已绑定，提示先解绑
      if (currentBoundBabyId.value) {
        uni.showToast({ title: '请先解绑设备后再删除', icon: 'none' })
        return
      }
      const res = await deleteDevice(deviceSn.value)
      if (!isSuccessCode(res.code)) {
        uni.showToast({ title: res.message || '删除失败', icon: 'none' })
        return
      }
      markDeviceRemoved(deviceSn.value)
      removeLocalRegisteredDevice(deviceSn.value)
      uni.showToast({ title: '设备已删除', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 500)
    },
  })
}
</script>

<style lang="scss" scoped>
.device-detail-page { min-height: 100vh; background: #f8f8f8; }
.device-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40rpx 30rpx; text-align: center; color: #fff; }
.device-status { display: flex; align-items: center; justify-content: center; margin-bottom: 20rpx; }
.status-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: #cbd5e1; margin-right: 10rpx; }
.status-dot.online { background: #19be6b; }
.device-name { display: block; font-size: 38rpx; font-weight: 700; margin-bottom: 10rpx; }
.device-sn { font-size: 26rpx; opacity: 0.9; }
.section { margin: 20rpx 30rpx; }
.section-title { display: block; font-size: 30rpx; font-weight: 700; color: #333; margin-bottom: 20rpx; }
.info-list, .action-list { background: #fff; border-radius: 16rpx; }
.info-item { display: flex; justify-content: space-between; padding: 24rpx; border-bottom: 1rpx solid #f3f4f6; }
.info-item:last-child { border-bottom: none; }
.label { color: #64748b; }
.value { color: #1f2937; }
.mode-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); background: #fff; border-radius: 16rpx; padding: 16rpx; gap: 12rpx; }
.mode-item { min-width: 0; display: flex; flex-direction: column; align-items: center; padding: 20rpx 10rpx; border-radius: 14rpx; border: 2rpx solid transparent; background: #fff; }
.mode-item.active { border-color: #667eea; background: rgba(86, 119, 252, 0.08); box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.14); }
.mode-icon { width: 64rpx; height: 64rpx; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 12rpx; }
.mode-name { font-size: 28rpx; color: #333; font-weight: 700; line-height: 1.25; }
.mode-desc { margin-top: 8rpx; font-size: 22rpx; color: #8a94a6; line-height: 1.25; }
.mode-policy { margin-top: 8rpx; font-size: 21rpx; color: #667eea; line-height: 1.35; text-align: center; }
.action-item { display: flex; align-items: center; padding: 24rpx; border-bottom: 1rpx solid #f3f4f6; }
.action-item:last-child { border-bottom: none; }
.action-item text { flex: 1; margin-left: 20rpx; font-size: 30rpx; }
.popup { padding: 26rpx; }
.popup-title { font-size: 32rpx; font-weight: 600; margin-bottom: 18rpx; display: block; }
.popup-actions { display: flex; gap: 16rpx; margin-top: 20rpx; }
.popup-actions .u-button { flex: 1; }
.rename-popup { width: 620rpx; padding: 28rpx; }
.rename-title { display: block; font-size: 30rpx; font-weight: 600; margin-bottom: 16rpx; color: #1f2937; }
</style>
