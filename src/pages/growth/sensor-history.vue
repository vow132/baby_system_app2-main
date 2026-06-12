<template>
  <view class="history-page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <u-icon name="arrow-left" size="22" color="#fff" />
        </view>
        <text class="nav-title">数据记录</text>
        <view class="nav-right" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll-area" :style="{ paddingTop: (statusBarHeight + 70) + 'px' }">
      <!-- 宝宝信息 -->
      <view class="baby-bar">
        <image class="baby-avatar" :src="babyStore.currentBaby?.avatar_url || '/static/logo.png'" mode="aspectFill" />
        <view class="baby-info">
          <text class="baby-name">{{ babyStore.currentBaby?.name || '请选择宝宝' }}</text>
          <text class="baby-age">{{ ageText }}</text>
        </view>
      </view>

      <!-- 时间选择 -->
      <view class="time-section">
        <view class="time-title">查询时间范围</view>
        <view class="time-picker-row">
          <picker mode="date" :value="startDate" @change="onStartDateChange">
            <view class="time-picker-btn">
              <text class="picker-label">开始日期</text>
              <text class="picker-value">{{ startDate || '选择日期' }}</text>
              <u-icon name="calendar-fill" size="16" color="#667eea" />
            </view>
          </picker>
          <view class="time-separator">至</view>
          <picker mode="date" :value="endDate" @change="onEndDateChange">
            <view class="time-picker-btn">
              <text class="picker-label">结束日期</text>
              <text class="picker-value">{{ endDate || '选择日期' }}</text>
              <u-icon name="calendar-fill" size="16" color="#667eea" />
            </view>
          </picker>
        </view>
        <view class="quick-date-row">
          <view
            class="quick-btn"
            :class="{ active: quickRange === 'today' }"
            @click="setQuickRange('today')"
          >今天</view>
          <view
            class="quick-btn"
            :class="{ active: quickRange === 'week' }"
            @click="setQuickRange('week')"
          >近7天</view>
          <view
            class="quick-btn"
            :class="{ active: quickRange === 'month' }"
            @click="setQuickRange('month')"
          >近30天</view>
        </view>
        <view class="search-btn" @click="loadData">
          <u-icon name="search" size="18" color="#fff" />
          <text class="search-text">查询</text>
        </view>
      </view>

      <!-- 数据摘要 -->
      <view v-if="sensorList.length > 0" class="summary-section">
        <view class="summary-title">数据摘要（共 {{ total }} 条）</view>
        <view class="summary-cards">
          <view class="summary-card heart">
            <text class="summary-value">{{ heartRateAvg }}</text>
            <text class="summary-unit">bpm</text>
            <text class="summary-label">平均心率</text>
          </view>
          <view class="summary-card breath">
            <text class="summary-value">{{ breathingRateAvg }}</text>
            <text class="summary-unit">次/分</text>
            <text class="summary-label">平均呼吸</text>
          </view>
          <view class="summary-card temp">
            <text class="summary-value">{{ temperatureAvg }}</text>
            <text class="summary-unit">°C</text>
            <text class="summary-label">平均体温</text>
          </view>
        </view>
      </view>

      <!-- 数据列表 -->
      <view v-if="sensorList.length > 0" class="data-section">
        <view class="data-title">详细记录</view>
        <view
          class="data-card"
          v-for="(item, idx) in sensorList"
          :key="item.id || idx"
        >
          <view class="data-card-head">
            <text class="data-time">{{ formatTime(item.created_at) }}</text>
            <text class="data-device">{{ item.device_sn || '未知设备' }}</text>
          </view>
          <view class="data-card-body">
            <view class="data-item" v-if="item.heart_rate !== null && item.heart_rate !== undefined">
              <view class="data-dot heart-dot" />
              <text class="data-label">心率</text>
              <text class="data-value">{{ item.heart_rate }} bpm</text>
            </view>
            <view class="data-item" v-if="item.breathing_rate !== null && item.breathing_rate !== undefined">
              <view class="data-dot breath-dot" />
              <text class="data-label">呼吸</text>
              <text class="data-value">{{ item.breathing_rate }} 次/分</text>
            </view>
            <view class="data-item" v-if="item.temperature !== null && item.temperature !== undefined">
              <view class="data-dot temp-dot" />
              <text class="data-label">体温</text>
              <text class="data-value">{{ item.temperature }} °C</text>
            </view>
            <view class="data-item" v-if="item.humidity !== null && item.humidity !== undefined">
              <view class="data-dot humid-dot" />
              <text class="data-label">湿度</text>
              <text class="data-value">{{ item.humidity }} %</text>
            </view>
            <view class="data-item" v-if="item.posture !== null && item.posture !== undefined">
              <view class="data-dot posture-dot" />
              <text class="data-label">姿态</text>
              <text class="data-value">{{ getPostureText(item.posture) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="sensorList.length > 0 && hasMore" class="load-more" @click="loadMore">
        <text>加载更多</text>
      </view>
      <view v-if="sensorList.length > 0 && !hasMore" class="no-more">
        <text>没有更多数据了</text>
      </view>

      <!-- 空状态 -->
      <view v-if="loaded && sensorList.length === 0" class="empty-state">
        <u-icon name="file-text-fill" size="60" color="#dde1e8" />
        <text class="empty-title">暂无数据</text>
        <text class="empty-desc">所选时间范围内没有传感器数据记录</text>
      </view>

      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBabyStore } from '@/stores'
import { getSensorData, type SensorData } from '@/api/monitor'
import { getDeviceList, type DeviceInfo } from '@/api/device'

const babyStore = useBabyStore()
const devices = ref<DeviceInfo[]>([])

const statusBarHeight = ref(44)
const startDate = ref('')
const endDate = ref('')
const quickRange = ref('')
const sensorList = ref<SensorData[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const hasMore = ref(true)
const loaded = ref(false)

const ageText = computed(() => {
  const m = babyStore.currentBaby?.current_age_months ?? 0
  if (m <= 0) return '月龄待完善'
  if (m <= 3) return '0-3月龄'
  if (m <= 6) return '4-6月龄'
  if (m <= 12) return '7-12月龄'
  if (m <= 24) return '13-24月龄'
  if (m <= 36) return '25-36月龄'
  return '37-48月龄'
})

const heartRateAvg = computed(() => {
  const vals = sensorList.value.map(i => i.heart_rate).filter(v => v != null) as number[]
  if (vals.length === 0) return '--'
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(0)
})

const breathingRateAvg = computed(() => {
  const vals = sensorList.value.map(i => i.breathing_rate).filter(v => v != null) as number[]
  if (vals.length === 0) return '--'
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(0)
})

const temperatureAvg = computed(() => {
  const vals = sensorList.value.map(i => i.temperature).filter(v => v != null) as number[]
  if (vals.length === 0) return '--'
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
})

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 44
  // 默认查今天
  setQuickRange('today')
})

onShow(async () => {
  await Promise.allSettled([babyStore.fetchBabyList(), loadDevices()])
})

async function loadDevices() {
  const res = await getDeviceList()
  if (res.code === 0 && Array.isArray(res.data)) {
    devices.value = res.data
  }
}

function setQuickRange(type: string) {
  quickRange.value = type
  const end = new Date()
  const start = new Date()
  if (type === 'today') {
    startDate.value = formatDate(end)
    endDate.value = formatDate(end)
  } else if (type === 'week') {
    start.setDate(end.getDate() - 6)
    startDate.value = formatDate(start)
    endDate.value = formatDate(end)
  } else if (type === 'month') {
    start.setDate(end.getDate() - 29)
    startDate.value = formatDate(start)
    endDate.value = formatDate(end)
  }
}

function onStartDateChange(e: any) {
  startDate.value = e.detail.value
  quickRange.value = ''
}

function onEndDateChange(e: any) {
  endDate.value = e.detail.value
  quickRange.value = ''
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function loadData() {
  if (!babyStore.currentBaby) {
    uni.showToast({ title: '请先选择宝宝', icon: 'none' })
    return
  }
  if (!startDate.value || !endDate.value) {
    uni.showToast({ title: '请选择时间范围', icon: 'none' })
    return
  }
  page.value = 1
  hasMore.value = true
  loaded.value = false
  await fetchData()
}

async function loadMore() {
  if (!hasMore.value) return
  page.value += 1
  await fetchData()
}

async function fetchData() {
  const baby = babyStore.currentBaby
  if (!baby) return

  const device = devices.value[0]
  const deviceSn = device?.device_sn
  if (!deviceSn) return
  const params: any = {
    baby_id: baby.id,
    device_sn: deviceSn,
    page: page.value,
    page_size: pageSize.value,
  }
  // 时间范围
  if (startDate.value) {
    params.start_time = startDate.value + 'T00:00:00'
  }
  if (endDate.value) {
    params.end_time = endDate.value + 'T23:59:59'
  }

  uni.showLoading({ title: '查询中...' })
  try {
    const res = await getSensorData(params)
    if (res.code === 0 || res.code === 200) {
      const items = res.data?.items || []
      const t = res.data?.total || 0
      if (page.value === 1) {
        sensorList.value = items
      } else {
        sensorList.value = [...sensorList.value, ...items]
      }
      total.value = t
      hasMore.value = sensorList.value.length < t
    } else {
      uni.showToast({ title: res.message || '查询失败', icon: 'none' })
    }
  } catch (e: any) {
    const msg = e?.message || ''
    if (msg.includes('500') || msg.includes('Internal')) {
      uni.showToast({ title: '服务器内部错误，请联系后端同事排查', icon: 'none', duration: 2500 })
    } else {
      uni.showToast({ title: '查询失败，请稍后重试', icon: 'none' })
    }
  } finally {
    loaded.value = true
    uni.hideLoading()
  }
}

function formatTime(t?: string | null): string {
  if (!t) return '--'
  const d = new Date(t)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

function getPostureText(p: number): string {
  return ['平躺', '左侧卧', '右侧卧', '俯卧', '坐姿'][p] || `未知(${p})`
}

function goBack() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.history-page {
  min-height: 100vh;
  background: #f5f6fb;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.nav-content {
  height: 104rpx;
  display: flex;
  align-items: center;
  padding: 0 30rpx;
  gap: 20rpx;
}

.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-title {
  flex: 1;
  color: #fff;
  font-size: 34rpx;
  font-weight: 700;
}

.nav-right {
  width: 60rpx;
}

.scroll-area {
  height: 100vh;
  box-sizing: border-box;
}

.baby-bar {
  margin: 24rpx 30rpx 0;
  padding: 24rpx 30rpx;
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(28, 35, 53, 0.06);
}

.baby-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  background: #f0f0f0;
  flex-shrink: 0;
}

.baby-info {
  min-width: 0;
}

.baby-name {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #252b3a;
}

.baby-age {
  display: block;
  font-size: 24rpx;
  color: #8a93a5;
  margin-top: 4rpx;
}

.time-section {
  margin: 24rpx 30rpx 0;
  padding: 28rpx 30rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(28, 35, 53, 0.06);
}

.time-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #252b3a;
  margin-bottom: 20rpx;
}

.time-picker-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.time-picker-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 18rpx 20rpx;
  background: #f5f6fb;
  border-radius: 16rpx;
}

.picker-label {
  font-size: 22rpx;
  color: #8a93a5;
  margin-right: auto;
}

.picker-value {
  font-size: 26rpx;
  color: #252b3a;
  font-weight: 600;
}

.time-separator {
  font-size: 26rpx;
  color: #8a93a5;
  flex-shrink: 0;
}

.quick-date-row {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.quick-btn {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  border-radius: 14rpx;
  background: #f5f6fb;
  color: #667085;
  font-size: 26rpx;
  font-weight: 600;
}

.quick-btn.active {
  background: rgba(102, 126, 234, 0.12);
  color: #667eea;
}

.search-btn {
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding: 22rpx 0;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.search-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
}

.summary-section {
  margin: 24rpx 30rpx 0;
}

.summary-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #252b3a;
  margin-bottom: 16rpx;
}

.summary-cards {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16rpx;
}

.summary-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 8rpx 24rpx rgba(28, 35, 53, 0.06);
}

.summary-value {
  font-size: 44rpx;
  font-weight: 900;
  line-height: 1.1;
}

.summary-unit {
  font-size: 20rpx;
  margin-top: 4rpx;
}

.summary-label {
  font-size: 22rpx;
  margin-top: 10rpx;
}

.heart .summary-value,
.heart .summary-unit,
.heart .summary-label {
  color: #ef4444;
}

.breath .summary-value,
.breath .summary-unit,
.breath .summary-label {
  color: #10b981;
}

.temp .summary-value,
.temp .summary-unit,
.temp .summary-label {
  color: #f59e0b;
}

.data-section {
  margin: 24rpx 30rpx 0;
}

.data-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #252b3a;
  margin-bottom: 16rpx;
}

.data-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(28, 35, 53, 0.06);
}

.data-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.data-time {
  font-size: 26rpx;
  color: #252b3a;
  font-weight: 600;
}

.data-device {
  font-size: 22rpx;
  color: #8a93a5;
}

.data-card-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.data-item {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.data-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.heart-dot { background: #ef4444; }
.breath-dot { background: #10b981; }
.temp-dot { background: #f59e0b; }
.humid-dot { background: #3b82f6; }
.posture-dot { background: #8b5cf6; }

.data-label {
  font-size: 24rpx;
  color: #8a93a5;
}

.data-value {
  font-size: 26rpx;
  color: #252b3a;
  font-weight: 600;
}

.load-more {
  text-align: center;
  padding: 24rpx;
  color: #667eea;
  font-size: 28rpx;
  font-weight: 600;
}

.no-more {
  text-align: center;
  padding: 24rpx;
  color: #8a93a5;
  font-size: 24rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 60rpx;
}

.empty-title {
  font-size: 32rpx;
  color: #252b3a;
  font-weight: 700;
  margin-top: 30rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: #8a93a5;
  margin-top: 12rpx;
  text-align: center;
}

.bottom-space {
  height: 60rpx;
}
</style>
