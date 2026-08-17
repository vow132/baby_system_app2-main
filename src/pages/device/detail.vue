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
      <view class="section-title-row">
        <text class="section-title">设备安全</text>
        <view v-if="credentialStatus" class="security-badge" :class="credentialStatus.access_status">
          <text>{{ credentialStatusLabel }}</text>
        </view>
      </view>
      <view class="security-panel">
        <view v-if="credentialLoading" class="security-state">
          <u-loading-icon mode="circle" size="30" />
          <text>正在检查设备凭证</text>
        </view>
        <view v-else-if="credentialError" class="security-state error" @click="loadCredentialStatus">
          <u-icon name="reload" size="32" color="#c2410c" />
          <view>
            <text>安全状态暂时无法获取</text>
            <text class="security-state-hint">点击重试</text>
          </view>
        </view>
        <template v-else>
          <view class="security-summary">
            <u-icon :name="credentialStatus?.access_status === 'active' ? 'lock-fill' : 'info-circle'" size="38" :color="credentialStatus?.access_status === 'active' ? '#16875f' : '#a16207'" />
            <view>
              <text class="security-summary-title">{{ credentialStatusLabel }}</text>
              <text class="security-summary-desc">{{ credentialStatusDescription }}</text>
            </view>
          </view>
          <view class="security-meta" v-if="credentialStatus?.token_version">
            <text>当前凭证版本</text>
            <text>v{{ credentialStatus.token_version }}</text>
          </view>
        </template>
      </view>
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
        <view class="action-item" :class="{ disabled: credentialActionLoading }" @click="handleCreateRecoveryCode">
          <u-icon name="lock-open" size="40" color="#5677fc" />
          <view class="action-copy"><text>生成设备恢复码</text><text>设备丢失凭证时使用，仅显示一次</text></view>
          <u-icon name="arrow-right" size="28" color="#ccc" />
        </view>
        <view class="action-item danger" :class="{ disabled: credentialActionLoading }" @click="handleRevokeCredentials">
          <u-icon name="lock" size="40" color="#dc2626" />
          <view class="action-copy"><text>撤销设备访问</text><text>设备将立即无法上报数据或播放内容</text></view>
        </view>
        <view class="action-item" @click="unbindCurrentDevice"><u-icon name="minus-circle" size="40" color="#fa3534" /><text>解绑设备</text></view>
        <view class="action-item" @click="deactivateDevice"><u-icon name="close-circle" size="40" color="#fa3534" /><text>删除设备</text></view>
      </view>
    </view>


    <u-popup :show="showRenamePopup" mode="center" round="16" @close="showRenamePopup = false">
      <view class="rename-popup">
        <text class="rename-title">设备改名</text>
        <u-input v-model="renameValue" placeholder="请输入新的设备名称" border="surround" maxlength="20" />
        <view class="popup-actions">
          <u-button text="取消" shape="circle" @click="showRenamePopup = false" />
          <u-button type="primary" text="保存" shape="circle" @click="saveRename" />
        </view>
      </view>
    </u-popup>

    <u-popup :show="showRecoveryPopup" mode="center" round="16" :closeOnClickOverlay="false">
      <view class="recovery-popup">
        <view class="recovery-icon"><u-icon name="lock-open" size="46" color="#5677fc" /></view>
        <text class="recovery-title">设备恢复码</text>
        <text class="recovery-warning">此恢复码只显示一次，请先复制并通过安全方式交给设备操作人员。</text>
        <text class="recovery-code" selectable>{{ recoveryCode }}</text>
        <text class="recovery-expiry">有效期至 {{ recoveryExpiresText }}</text>
        <view class="popup-actions stacked">
          <u-button type="primary" text="复制恢复码" shape="circle" @click="copyRecoveryCode" />
          <u-button text="我已妥善保存" shape="circle" @click="closeRecoveryPopup" />
        </view>
      </view>
    </u-popup>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  createDeviceRecoveryCode,
  deleteDevice,
  diagnoseDevice,
  getDeviceBattery,
  getDeviceCredentialStatus,
  getDeviceList,
  getDeviceStatus,
  getFirmwareVersion,
  rebootDevice,
  revokeDeviceCredentials,
  switchDeviceMode,
  unbindDevice,
  updateDeviceName,
  upgradeDevice,
  type DeviceBattery,
  type DeviceCredentialStatus,
  type DeviceInfo,
  type FirmwareVersion,
} from '@/api/device'
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
const credentialStatus = ref<DeviceCredentialStatus | null>(null)
const credentialLoading = ref(false)
const credentialError = ref('')
const credentialActionLoading = ref(false)
const showRecoveryPopup = ref(false)
const recoveryCode = ref('')
const recoveryExpiresAt = ref('')

const modes = [
  { label: '睡床', value: 'sleep', icon: 'clock', color: 'linear-gradient(135deg, #5677fc, #3d5afe)', desc: '夜间守护', policy: '全量监测与告警' },
  { label: '游戏床', value: 'play', icon: 'play-circle', color: 'linear-gradient(135deg, #19be6b, #0e9c5a)', desc: '活动观察', policy: '降低动作误报' },
  { label: '拼床', value: 'co_sleep', icon: 'home', color: 'linear-gradient(135deg, #ff9900, #f5a623)', desc: '亲近陪睡', policy: '弱化灯光与声音' },
]

// 优先显示设备名称
const displayName = computed(() => {
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
const credentialStatusLabel = computed(() => {
  const status = credentialStatus.value?.access_status
  if (status === 'active') return '设备访问已保护'
  if (status === 'pending') return '等待设备确认新凭证'
  if (status === 'legacy') return '兼容模式'
  if (status === 'revoked') return '设备访问已撤销'
  return '设备播放功能待初始化'
})
const credentialStatusDescription = computed(() => {
  const status = credentialStatus.value?.access_status
  if (status === 'active') return '设备请求已使用独立凭证验证'
  if (status === 'pending') return '保持设备联网，确认后会自动生效'
  if (status === 'legacy') return '设备仍在使用迁移期凭证，建议尽快完成配网升级'
  if (status === 'revoked') return '需要重新配网或使用恢复码后才能继续连接'
  return '完成设备配网后即可安全播放和上报数据'
})
const recoveryExpiresText = computed(() => formatTime(recoveryExpiresAt.value))

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
      device.value = { ...device.value, baby_id: listDevice.baby_id, device_name: device.value.device_name || listDevice.device_name }
    }
  }

  if (firmwareRes.status === 'fulfilled' && isSuccessCode(firmwareRes.value.code)) firmware.value = firmwareRes.value.data
  if (batteryRes.status === 'fulfilled' && isSuccessCode(batteryRes.value.code)) battery.value = batteryRes.value.data
  await loadCredentialStatus()

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

async function loadCredentialStatus() {
  if (!deviceSn.value) return
  credentialLoading.value = true
  credentialError.value = ''
  try {
    const res = await getDeviceCredentialStatus(deviceSn.value)
    credentialStatus.value = res.data
  } catch (error: any) {
    credentialStatus.value = null
    credentialError.value = error?.message || '安全状态加载失败'
  } finally {
    credentialLoading.value = false
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

function handleCreateRecoveryCode() {
  if (credentialActionLoading.value) return
  uni.showModal({
    title: '生成设备恢复码',
    content: '新恢复码会使之前生成但未使用的恢复码立即失效。是否继续？',
    confirmText: '继续生成',
    success: async (modalRes) => {
      if (!modalRes.confirm) return
      credentialActionLoading.value = true
      try {
        const res = await createDeviceRecoveryCode(deviceSn.value)
        recoveryCode.value = res.data.recovery_code
        recoveryExpiresAt.value = res.data.expires_at
        showRecoveryPopup.value = true
      } catch (error: any) {
        uni.showToast({ title: error?.message || '恢复码生成失败', icon: 'none' })
      } finally {
        credentialActionLoading.value = false
      }
    },
  })
}

function copyRecoveryCode() {
  if (!recoveryCode.value) return
  uni.setClipboardData({
    data: recoveryCode.value,
    success: () => uni.showToast({ title: '恢复码已复制', icon: 'success' }),
  })
}

function closeRecoveryPopup() {
  showRecoveryPopup.value = false
  recoveryCode.value = ''
  recoveryExpiresAt.value = ''
}

function handleRevokeCredentials() {
  if (credentialActionLoading.value) return
  uni.showModal({
    title: '撤销设备访问',
    content: '撤销后设备会立即无法上报数据或播放内容，需要重新配网或使用恢复码。确定继续？',
    confirmText: '撤销访问',
    confirmColor: '#dc2626',
    success: async (modalRes) => {
      if (!modalRes.confirm) return
      credentialActionLoading.value = true
      try {
        await revokeDeviceCredentials(deviceSn.value, { reason: 'parent_action' })
        uni.showToast({ title: '设备访问已撤销', icon: 'success' })
        await loadCredentialStatus()
      } catch (error: any) {
        uni.showToast({ title: error?.message || '撤销失败', icon: 'none' })
      } finally {
        credentialActionLoading.value = false
      }
    },
  })
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
.section-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.section-title-row .section-title { margin-bottom: 0; }
.security-badge { padding: 7rpx 16rpx; border-radius: 999rpx; background: #fff7ed; color: #a16207; font-size: 22rpx; }
.security-badge.active { background: #ecfdf5; color: #047857; }
.security-badge.revoked { background: #fef2f2; color: #b91c1c; }
.security-badge.pending { background: #eef2ff; color: #4f46e5; }
.security-panel { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.security-state { min-height: 88rpx; display: flex; align-items: center; gap: 16rpx; color: #475569; font-size: 26rpx; }
.security-state.error { color: #9a3412; }
.security-state-hint { display: block; margin-top: 6rpx; color: #c2410c; font-size: 22rpx; }
.security-summary { display: flex; align-items: flex-start; gap: 18rpx; }
.security-summary > view { flex: 1; }
.security-summary-title { display: block; color: #1f2937; font-size: 28rpx; font-weight: 700; }
.security-summary-desc { display: block; margin-top: 8rpx; color: #64748b; font-size: 24rpx; line-height: 1.5; }
.security-meta { display: flex; justify-content: space-between; margin-top: 20rpx; padding-top: 18rpx; border-top: 1rpx solid #f1f5f9; color: #64748b; font-size: 24rpx; }
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
.action-item { min-height: 88rpx; box-sizing: border-box; display: flex; align-items: center; padding: 24rpx; border-bottom: 1rpx solid #f3f4f6; }
.action-item:last-child { border-bottom: none; }
.action-item text { flex: 1; margin-left: 20rpx; font-size: 30rpx; }
.action-item.disabled { opacity: 0.5; pointer-events: none; }
.action-item.danger { color: #b91c1c; }
.action-copy { flex: 1; margin-left: 20rpx; }
.action-copy text { display: block; margin-left: 0; }
.action-copy text:first-child { font-size: 30rpx; color: inherit; }
.action-copy text:last-child { margin-top: 7rpx; font-size: 22rpx; line-height: 1.4; color: #64748b; }
.popup { padding: 26rpx; }
.popup-title { font-size: 32rpx; font-weight: 600; margin-bottom: 18rpx; display: block; }
.popup-actions { display: flex; gap: 16rpx; margin-top: 20rpx; }
.popup-actions .u-button { flex: 1; }
.rename-popup { width: 620rpx; padding: 28rpx; }
.rename-title { display: block; font-size: 30rpx; font-weight: 600; margin-bottom: 16rpx; color: #1f2937; }
.recovery-popup { width: 620rpx; padding: 34rpx 30rpx; text-align: center; }
.recovery-icon { width: 82rpx; height: 82rpx; margin: 0 auto 18rpx; border-radius: 50%; background: #eef2ff; display: flex; align-items: center; justify-content: center; }
.recovery-title { display: block; color: #1f2937; font-size: 34rpx; font-weight: 700; }
.recovery-warning { display: block; margin-top: 14rpx; color: #92400e; font-size: 24rpx; line-height: 1.55; }
.recovery-code { display: block; margin: 24rpx 0 12rpx; padding: 24rpx 14rpx; border-radius: 14rpx; background: #f1f5f9; color: #111827; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 34rpx; font-weight: 700; letter-spacing: 4rpx; word-break: break-all; }
.recovery-expiry { display: block; color: #64748b; font-size: 22rpx; }
.popup-actions.stacked { flex-direction: column; margin-top: 28rpx; }
</style>
