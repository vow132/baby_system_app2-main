<template>
  <view class="device-list-page">
    <view class="page-header">
      <text class="page-title">设备管理</text>
      <text class="page-subtitle">添加设备、查看详情与注销管理</text>
    </view>

    <view class="device-list">
      <view class="device-card" v-for="device in visibleDeviceList" :key="device.device_sn" @click="goToDetail(device)">
        <view class="card-header">
          <view class="device-icon">
            <u-icon name="grid-fill" size="40" color="#667eea" />
          </view>
          <view class="header-info">
            <text class="device-name">{{ getDisplayName(device) }}</text>
            <view class="status-badge" :class="{ online: !!device.online_status }">
              <view class="status-dot" />
              <text>{{ device.online_status ? '在线' : '离线' }}</text>
            </view>
          </view>
          <u-icon name="arrow-right" size="32" color="#ccc" />
        </view>

        <view class="card-body">
          <view class="info-item">
            <text class="info-label">设备序列号</text>
            <text class="info-value">{{ device.device_sn }}</text>
          </view>
          <view class="info-item bind-row" @click.stop="handleBindStatusClick(device)">
            <text class="info-label">绑定状态</text>
            <view class="bind-status">
              <text class="info-value" :class="{ unbound: !device.baby_id }">{{ getBindStatusText(device) }}</text>
              <u-icon name="arrow-right" size="24" color="#bbb" />
            </view>
          </view>
        </view>
      </view>

      <view class="add-card" @click="openAddPopup">
        <view class="add-icon">
          <u-icon name="plus" size="48" color="#667eea" />
        </view>
        <text class="add-text">添加设备</text>
        <text class="add-desc">register 入库建档（首次）</text>
      </view>
    </view>

    <view class="empty-state" v-if="visibleDeviceList.length === 0">
      <u-icon name="grid" size="80" color="#ddd" />
      <text class="empty-text">暂无设备</text>
      <text class="empty-desc">点击上方按钮添加第一台设备</text>
    </view>

    <u-popup :show="showAddDevice" mode="bottom" round="20" @close="showAddDevice = false">
      <view class="popup-content">
        <view class="popup-header">
          <text class="popup-title">添加设备</text>
          <u-icon name="close" size="32" color="#999" @click="showAddDevice = false" />
        </view>

        <view class="form-content">
          <u-form :model="deviceForm" labelPosition="top">
            <u-form-item label="设备序列号" required borderBottom>
              <u-input v-model="deviceForm.device_sn" placeholder="请输入设备序列号" border="none" />
              <text v-if="deviceSnError" class="form-error">{{ deviceSnError }}</text>
            </u-form-item>
            <u-form-item label="设备名称" required borderBottom>
              <u-input v-model="deviceForm.device_name" placeholder="例如：三毛的婴儿床" border="none" />
              <text v-if="deviceNameError" class="form-error">{{ deviceNameError }}</text>
            </u-form-item>
            <u-form-item label="设备型号" borderBottom>
              <u-input v-model="deviceForm.device_model" placeholder="可选" border="none" />
            </u-form-item>
            <u-form-item label="绑定宝宝（可选）" borderBottom>
              <picker mode="selector" :range="babyNameOptions" @change="onPickBaby">
                <view class="picker-value">
                  <text>{{ selectedBabyLabel }}</text>
                  <u-icon name="arrow-right" size="24" color="#bbb" />
                </view>
              </picker>
            </u-form-item>
          </u-form>
        </view>

        <view class="popup-footer">
          <u-button text="取消" shape="circle" @click="showAddDevice = false" />
          <u-button type="primary" text="确定添加" shape="circle" :loading="loading" :disabled="!canSubmitAddDevice" @click="handleAddDevice" />
        </view>
      </view>
    </u-popup>

    <u-popup :show="showBindDevice" mode="bottom" round="20" @close="showBindDevice = false">
      <view class="popup-content">
        <view class="popup-header">
          <text class="popup-title">绑定宝宝</text>
          <u-icon name="close" size="32" color="#999" @click="showBindDevice = false" />
        </view>

        <view v-if="!babyStore.babyList.length" class="empty-tip">当前家庭还没有宝宝，请先添加宝宝</view>
        <view v-else class="baby-list">
          <view
            class="baby-item"
            v-for="baby in babyStore.babyList"
            :key="baby.id"
            :class="{ active: bindBabyId === baby.id, disabled: isBabyBoundToOtherDevice(baby.id, bindingDevice?.device_sn) }"
            @click="selectBindBaby(baby.id)"
          >
            <text>{{ baby.name }}</text>
            <u-icon v-if="bindBabyId === baby.id" name="checkmark-circle-fill" size="32" color="#5677fc" />
          </view>
        </view>

        <view class="popup-footer">
          <u-button text="取消" shape="circle" @click="showBindDevice = false" />
          <u-button type="primary" text="确认绑定" shape="circle" :loading="bindLoading" :disabled="!babyStore.babyList.length" @click="handleBindExistingDevice" />
        </view>
      </view>
    </u-popup>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { bindDevice, getDeviceList, registerDevice, unbindDevice, type DeviceInfo } from '@/api/device'
import { useBabyStore } from '@/stores'
import { clearRemovedDevice, getDeviceDisplayName, getLocalRegisteredDevices, getRemovedDeviceSnList, removeLocalRegisteredDevice, upsertLocalRegisteredDevice } from '@/common/deviceLocal'

const babyStore = useBabyStore()
const deviceList = ref<DeviceInfo[]>([])
const showAddDevice = ref(false)
const showBindDevice = ref(false)
const loading = ref(false)
const bindLoading = ref(false)
const selectedBabyId = ref<number | null>(null)
const bindBabyId = ref<number | null>(null)
const bindingDevice = ref<DeviceInfo | null>(null)

const deviceForm = reactive({
  device_sn: '',
  device_name: '',
  device_model: '',
})

const visibleDeviceList = computed(() => {
  const removedSet = new Set(getRemovedDeviceSnList())
  return deviceList.value.filter((item) => !removedSet.has(item.device_sn) || !!item.baby_id)
})

const babyOptions = computed(() => babyStore.babyList.map((baby) => ({ label: baby.name, value: baby.id })))
const babyNameOptions = computed(() => ['暂不绑定宝宝', ...babyOptions.value.map((item) => item.label)])

const selectedBabyLabel = computed(() => {
  if (!selectedBabyId.value) return '暂不绑定宝宝'
  return babyStore.babyList.find((b) => b.id === selectedBabyId.value)?.name || '暂不绑定宝宝'
})

onShow(async () => {
  await Promise.allSettled([loadDevices(), babyStore.fetchBabyList()])
})

function onPickBaby(event: any) {
  const index = Number(event?.detail?.value ?? 0)
  selectedBabyId.value = index === 0 ? null : babyOptions.value[index - 1]?.value ?? null
}

function isSuccessCode(code: number) {
  return code === 0 || code === 200
}

function getDisplayName(device: DeviceInfo) {
  return getDeviceDisplayName(device.device_sn, device.device_name)
}

function getBindBabyText(babyId: number | null) {
  if (!babyId) return '未绑定'
  return babyStore.babyList.find((b) => String(b.id) === String(babyId))?.name || `ID:${babyId}`
}

function getBindStatusText(device: DeviceInfo) {
  if (!device.baby_id) return '未绑定'
  return `已绑定${getBindBabyText(device.baby_id)}`
}

function isDuplicateDeviceName(name: string) {
  const target = name.trim()
  if (!target) return false
  return visibleDeviceList.value.some((device) => getDisplayName(device) === target)
}

function isDuplicateDeviceSn(deviceSn: string) {
  const target = deviceSn.trim()
  if (!target) return false
  return deviceList.value.some((device) => device.device_sn === target)
}

const deviceSnError = computed(() => {
  return isDuplicateDeviceSn(deviceForm.device_sn) ? '序列号已存在' : ''
})

const deviceNameError = computed(() => {
  return isDuplicateDeviceName(deviceForm.device_name) ? '设备名称已存在' : ''
})

const canSubmitAddDevice = computed(() => {
  return !!deviceForm.device_sn.trim() &&
    !!deviceForm.device_name.trim() &&
    !deviceSnError.value &&
    !deviceNameError.value &&
    !loading.value
})

async function loadDevices() {
  const res = await getDeviceList()
  if (isSuccessCode(res.code) && Array.isArray(res.data)) {
    deviceList.value = mergeLocalRegisteredDevices(res.data)
    pruneStaleLocalDevices(res.data)
  }
}

/** 后端返回的设备列表里不存在的本地缓存设备，清理掉（数据库已删除但缓存残留） */
function pruneStaleLocalDevices(remoteList: DeviceInfo[]) {
  const remoteSnSet = new Set(remoteList.map((item) => item.device_sn))
  const localList = getLocalRegisteredDevices()
  let changed = false
  for (const local of localList) {
    if (!remoteSnSet.has(local.device_sn)) {
      removeLocalRegisteredDevice(local.device_sn)
      changed = true
    }
  }
  if (changed) {
    deviceList.value = mergeLocalRegisteredDevices(remoteList)
  }
}

function createLocalDeviceId(deviceSn: string) {
  let hash = 0
  for (let i = 0; i < deviceSn.length; i += 1) {
    hash = (hash * 31 + deviceSn.charCodeAt(i)) | 0
  }
  return -Math.abs(hash || 1)
}

function mergeLocalRegisteredDevices(remoteList: DeviceInfo[]) {
  const remoteSnSet = new Set(remoteList.map((item) => item.device_sn))
  const localList = getLocalRegisteredDevices()
    .filter((item) => item.device_sn && !remoteSnSet.has(item.device_sn))
    .map<DeviceInfo>((item) => ({
      id: createLocalDeviceId(item.device_sn),
      device_sn: item.device_sn,
      baby_id: null,
      device_name: item.device_name,
      device_model: item.device_model,
      firmware_version: null,
      work_mode: null,
      online_status: 0,
      last_online_at: null,
      created_at: item.created_at,
    }))
  return [...remoteList, ...localList]
}

function openAddPopup() {
  selectedBabyId.value = null
  showAddDevice.value = true
}

function goToDetail(device: DeviceInfo) {
  uni.navigateTo({ url: `/pages/device/detail?sn=${device.device_sn}` })
}

function isBabyBoundToOtherDevice(babyId: number, currentDeviceSn?: string) {
  return deviceList.value.some((item) => {
    return item.device_sn !== currentDeviceSn && String(item.baby_id || '') === String(babyId)
  })
}

async function handleBindStatusClick(device: DeviceInfo) {
  await babyStore.fetchBabyList()
  if (device.baby_id) {
    uni.showModal({
      title: '解绑设备',
      content: `当前已绑定${getBindBabyText(device.baby_id)}，是否解除绑定？`,
      success: async (modalRes) => {
        if (!modalRes.confirm) return
        const res = await unbindDevice({ device_sn: device.device_sn })
        if (isSuccessCode(res.code)) {
          clearRemovedDevice(device.device_sn)
          device.baby_id = null
          upsertLocalRegisteredDevice({
            device_sn: device.device_sn,
            device_name: device.device_name,
            device_model: device.device_model,
            created_at: device.created_at,
          })
          uni.showToast({ title: '已解绑', icon: 'success' })
          await loadDevices()
        } else {
          uni.showToast({ title: res.message || '解绑失败', icon: 'none' })
        }
      },
    })
    return
  }

  if (!babyStore.babyList.length) {
    uni.showToast({ title: '请先添加宝宝', icon: 'none' })
    return
  }
  bindingDevice.value = device
  bindBabyId.value = babyStore.currentBaby?.id || babyStore.babyList[0]?.id || null
  showBindDevice.value = true
}

function selectBindBaby(babyId: number) {
  if (isBabyBoundToOtherDevice(babyId, bindingDevice.value?.device_sn)) {
    uni.showToast({ title: '该宝宝已被绑定', icon: 'none' })
    return
  }
  bindBabyId.value = babyId
}

async function handleBindExistingDevice() {
  if (!bindingDevice.value || !bindBabyId.value) return
  if (isBabyBoundToOtherDevice(bindBabyId.value, bindingDevice.value.device_sn)) {
    uni.showToast({ title: '该宝宝已被绑定', icon: 'none' })
    return
  }

  bindLoading.value = true
  try {
    const res = await bindDevice({ device_sn: bindingDevice.value.device_sn, baby_id: bindBabyId.value })
    if (isSuccessCode(res.code)) {
      uni.showToast({ title: '已绑定', icon: 'success' })
      showBindDevice.value = false
      await loadDevices()
    } else {
      uni.showToast({ title: isDeviceOccupiedMessage(res.message) ? getBindOccupiedToast() : res.message || '绑定失败', icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: isDeviceOccupiedMessage(e?.message) ? getBindOccupiedToast() : e?.message || '绑定失败', icon: 'none' })
  } finally {
    bindLoading.value = false
  }
}

function isDeviceOccupiedMessage(message?: string) {
  const text = String(message || '')
  return (
    text.includes('已绑定') ||
    text.includes('占用') ||
    text.includes('请先解绑') ||
    text.includes('已被绑定') ||
    text.includes('already bound')
  )
}

function getBindOccupiedToast() {
  return '设备已绑定，如需更换请先解绑设备'
}

async function handleAddDevice() {
  if (!deviceForm.device_sn.trim() || !deviceForm.device_name.trim()) {
    uni.showToast({ title: '请先填写序列号和设备名', icon: 'none' })
    return
  }
  if (isDuplicateDeviceSn(deviceForm.device_sn)) {
    uni.showToast({ title: '序列号已存在', icon: 'none' })
    return
  }
  if (isDuplicateDeviceName(deviceForm.device_name)) {
    uni.showToast({ title: '设备名称已存在', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const registerRes = await registerDevice({
      device_sn: deviceForm.device_sn.trim(),
      device_name: deviceForm.device_name.trim(),
      device_model: deviceForm.device_model || '',
    })

    if (!isSuccessCode(registerRes.code)) {
      uni.showToast({ title: registerRes.message || '添加失败', icon: 'none' })
      return
    }

    clearRemovedDevice(deviceForm.device_sn)
    if (!selectedBabyId.value) {
      upsertLocalRegisteredDevice({
        device_sn: deviceForm.device_sn,
        device_name: deviceForm.device_name,
        device_model: deviceForm.device_model || '',
        created_at: new Date().toISOString(),
      })
      uni.showToast({ title: '设备添加成功', icon: 'success' })
      showAddDevice.value = false
      deviceForm.device_sn = ''
      deviceForm.device_name = ''
      deviceForm.device_model = ''
      await loadDevices()
      return
    }

    const bindRes = await bindDevice({ device_sn: deviceForm.device_sn, baby_id: selectedBabyId.value })
    if (!isSuccessCode(bindRes.code)) {
      const toastText = isDeviceOccupiedMessage(bindRes.message)
        ? getBindOccupiedToast()
        : bindRes.message || '设备已添加，绑定失败'
      uni.showToast({ title: toastText, icon: 'none' })
      return
    }

    uni.showToast({ title: '设备添加成功', icon: 'success' })
    showAddDevice.value = false
    deviceForm.device_sn = ''
    deviceForm.device_name = ''
    deviceForm.device_model = ''
    await loadDevices()
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.includes('已注册') || msg.includes('already registered')) {
      uni.showToast({ title: '序列号已存在', icon: 'none' })
      return
    }
    uni.showToast({ title: e?.message || '添加失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.device-list-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 200rpx, #f8f9fc 200rpx);
  padding-bottom: 40rpx;
}
.page-header { padding: 40rpx 30rpx 60rpx; }
.page-title { display: block; font-size: 40rpx; font-weight: 600; color: #fff; margin-bottom: 12rpx; }
.page-subtitle { font-size: 26rpx; color: rgba(255, 255, 255, 0.8); }
.device-list { padding: 0 30rpx; }
.device-card { background: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 24rpx; box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06); }
.card-header { display: flex; align-items: center; margin-bottom: 24rpx; }
.device-icon { width: 80rpx; height: 80rpx; border-radius: 16rpx; background: rgba(102, 126, 234, 0.1); display: flex; align-items: center; justify-content: center; margin-right: 20rpx; }
.header-info { flex: 1; }
.device-name { display: block; font-size: 32rpx; font-weight: 600; color: #333; margin-bottom: 8rpx; }
.status-badge { display: inline-flex; align-items: center; padding: 4rpx 12rpx; border-radius: 20rpx; background: #f5f5f5; }
.status-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #ccc; margin-right: 8rpx; }
.status-badge text { font-size: 22rpx; color: #999; }
.status-badge.online { background: rgba(25, 190, 107, 0.1); }
.status-badge.online .status-dot { background: #19be6b; }
.status-badge.online text { color: #19be6b; }
.card-body { padding-top: 20rpx; border-top: 1rpx solid #f5f5f5; }
.info-item { display: flex; align-items: center; margin-bottom: 16rpx; }
.info-item:last-child { margin-bottom: 0; }
.info-label { width: 160rpx; font-size: 26rpx; color: #999; }
.info-value { flex: 1; font-size: 28rpx; color: #333; }
.bind-row { align-items: center; }
.bind-status { flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 8rpx; }
.bind-status .info-value { flex: none; color: #5677fc; }
.bind-status .info-value.unbound { color: #999; }
.add-card { display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fff; border-radius: 20rpx; padding: 50rpx; border: 2rpx dashed #667eea; }
.add-icon { width: 88rpx; height: 88rpx; border-radius: 50%; background: rgba(102, 126, 234, 0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 16rpx; }
.add-text { font-size: 30rpx; font-weight: 500; color: #667eea; margin-bottom: 8rpx; }
.add-desc { font-size: 24rpx; color: #999; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 30rpx; }
.empty-text { display: block; font-size: 30rpx; color: #666; margin-top: 30rpx; margin-bottom: 12rpx; }
.empty-desc { font-size: 24rpx; color: #999; }
.popup-content { padding: 30rpx; }
.popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30rpx; }
.popup-title { font-size: 34rpx; font-weight: 600; color: #333; }
.popup-footer { display: flex; gap: 20rpx; margin-top: 30rpx; }
.popup-footer .u-button { flex: 1; }
.form-error { display: block; color: #fa3534; font-size: 24rpx; padding: 4rpx 0 8rpx; }
.picker-value { width: 100%; display: flex; align-items: center; justify-content: space-between; color: #333; padding: 14rpx 0; }
.empty-tip { color: #94a3b8; font-size: 26rpx; padding: 16rpx 0 28rpx; }
.baby-list { margin-top: 8rpx; }
.baby-item { display: flex; align-items: center; justify-content: space-between; padding: 22rpx 18rpx; border-radius: 14rpx; background: #f8fafc; margin-bottom: 12rpx; font-size: 28rpx; color: #1f2937; }
.baby-item.active { background: #eef2ff; color: #5677fc; }
.baby-item.disabled { opacity: 0.55; }
</style>
