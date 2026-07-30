<template>
  <view class="care-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-left">
          <text class="nav-title">看护</text>
          <view class="nav-baby-switch" @click="showBabySwitcher">
            <text class="nav-baby-name">{{ currentBabyName }}</text>
            <u-icon name="arrow-down-fill" size="16" color="rgba(255,255,255,0.8)" />
          </view>
        </view>
        <view class="nav-right" @click="goToScene">
          <u-icon name="grid" size="20" color="#fff" />
          <text class="nav-btn-text">场景</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll-area" :style="{ paddingTop: (statusBarHeight + 56) + 'px' }">
      <!-- 视频预览区 -->
      <view class="video-section" :class="{ 'fullscreen-mode': videoMode === 'full', 'mini-mode': videoMode === 'mini' }">
        <view class="video-wrap" :class="[riskLevel, { 'mini-wrap': videoMode === 'mini' }]">
          <view class="video-topbar">
            <view class="live-pill" :class="{ off: !deviceOnline, warn: riskLevel === 'warning' || riskLevel === 'danger' }">
              <view class="live-dot" />
              <text>{{ videoStatusText }}</text>
            </view>
            <view class="video-actions">
              <view class="video-action" @click.stop="toggleMini">
                <u-icon :name="videoMode === 'mini' ? 'grid' : 'minus'" size="16" color="#fff" />
                <text>{{ videoMode === 'mini' ? '还原' : '小窗' }}</text>
              </view>
              <view class="video-action" @click.stop="toggleFull">
                <u-icon :name="videoMode === 'full' ? 'close' : 'scan'" size="16" color="#fff" />
                <text>{{ videoMode === 'full' ? '退出' : '全屏' }}</text>
              </view>
            </view>
          </view>
          <view class="video-placeholder" :class="{ offline: !deviceOnline }">
            <u-icon name="camera" size="36" :color="deviceOnline ? '#667eea' : '#ccc'" />
            <text v-if="!deviceOnline">设备离线 · 暂无视频画面</text>
            <text v-else>实时画面准备中</text>
            <text class="video-hint">{{ videoHintText }}</text>
          </view>
          <view class="monitor-osd" :class="{ muted: !deviceOnline, compact: videoMode === 'mini' }">
            <view class="osd-chip" :class="{ warn: isHeartAbnormal }">
              <text class="osd-label">心率</text>
              <text class="osd-value">{{ osdHeart }} 次/分</text>
            </view>
            <view class="osd-chip" :class="{ warn: isBreathAbnormal }">
              <text class="osd-label">呼吸</text>
              <text class="osd-value">{{ osdBreath }} 次/分</text>
            </view>
            <view class="osd-chip" :class="{ warn: isPostureAbnormal }">
              <text class="osd-label">姿态</text>
              <text class="osd-value">{{ osdPosture }}</text>
            </view>
            <view class="osd-sync">同步 {{ osdSyncTime }}</view>
          </view>
        </view>
        <view class="video-replay-entry" @click="goToVideo">
          <view class="replay-left">
            <view class="replay-icon">
              <u-icon name="play-circle-fill" size="22" color="#fff" />
            </view>
            <view>
              <text class="replay-title">视频回放</text>
              <text class="replay-desc">查看上传历史、播放和删除记录</text>
            </view>
          </view>
          <u-icon name="arrow-right" size="18" color="#c8ced8" />
        </view>
      </view>

      <!-- 风险等级 + 综合状态 -->
      <view class="risk-hero" :class="riskLevel">
        <view class="risk-main">
          <view class="risk-icon" :class="riskLevel">
            <u-icon :name="riskIcon" size="30" color="#fff" />
          </view>
          <view class="risk-text">
            <text class="risk-label">{{ riskLabel }}</text>
            <text class="risk-detail">更新于 {{ updateTime }}</text>
          </view>
          <view class="risk-link" @click.stop="goToSensorHistory">
            <text class="risk-link-text">历史数据</text>
            <u-icon name="arrow-right" size="14" color="rgba(0,0,0,.45)" />
          </view>
        </view>
      </view>

      <!-- 多维监测数据 -->
      <view class="sensor-grid">
        <view class="sensor-cell" v-for="item in sensorCells" :key="item.label">
          <view class="sensor-icon" :style="{ background: item.bg }">
            <u-icon :name="item.icon" size="22" :color="item.color" />
          </view>
          <text class="sensor-value">{{ item.value }}</text>
          <text class="sensor-unit">{{ item.unit }}</text>
          <text class="sensor-label">{{ item.label }}</text>
        </view>
      </view>

      <!-- 最新告警 -->
      <view class="alert-card" v-if="alerts.length">
        <text class="alert-title">最新告警</text>
        <view class="alert-item" v-for="alert in alerts" :key="alert.id">
          <view class="alert-level" :class="'lvl-' + alert.level">
            <text>{{ ['', '低', '中', '高', '紧急'][alert.level] }}</text>
          </view>
          <view class="alert-body">
            <text class="alert-type">{{ alert.type }}</text>
            <text class="alert-time">{{ alert.time }}</text>
          </view>
          <u-icon name="arrow-right" size="22" color="#ccc" />
        </view>
      </view>
      <view class="alert-safe" v-else>
        <view class="safe-box">
          <u-icon name="checkmark-circle" size="36" color="#c8e6c9" />
          <text class="safe-text">暂无告警，一切正常</text>
        </view>
      </view>

      <!-- 看护功能入口 -->
      <view class="func-grid">
        <view class="func-card" @click="goToRoutineAdvice">
          <view class="func-icon" style="background: linear-gradient(135deg, #667eea, #764ba2);">
            <u-icon name="order" size="26" color="#fff" />
          </view>
          <text class="func-name">作息建议</text>
          <text class="func-count">7天分析</text>
        </view>
        <view class="func-card" @click="goToRoutine">
          <view class="func-icon" style="background: linear-gradient(135deg, #ff9900, #f5a623);">
            <u-icon name="calendar-fill" size="26" color="#fff" />
          </view>
          <text class="func-name">作息管理</text>
        </view>
        <view class="func-card" @click="goToScene">
          <view class="func-icon" style="background: linear-gradient(135deg, #9b59b6, #8e44ad);">
            <u-icon name="grid-fill" size="26" color="#fff" />
          </view>
          <text class="func-name">场景联动</text>
        </view>
        <view class="func-card" @click="goToContent">
          <view class="func-icon" style="background: linear-gradient(135deg, #19be6b, #0e9c5a);">
            <u-icon name="play-circle-fill" size="26" color="#fff" />
          </view>
          <text class="func-name">互动内容</text>
        </view>
      </view>

      <!-- 今日事件 -->
      <view class="section-card">
        <view class="section-head">
          <text class="section-title">今日事件</text>
          <text class="section-more" @click="goToEvents">全部</text>
        </view>

        <view v-if="events.length > 0" class="event-list">
          <view class="event-item" v-for="event in events.slice(0, 5)" :key="event.id" @click="goToEventDetail(event.id)">
            <view class="event-level" :class="getLevelClass(event.event_level)">
              {{ getLevelText(event.event_level) }}
            </view>
            <view class="event-body">
              <text class="event-type">{{ getEventTypeName(event.event_type_id) }}</text>
              <text class="event-time">{{ formatTime(event.detected_at) }}</text>
            </view>
            <u-icon :name="event.parent_handled ? 'checkmark-circle-fill' : 'clock-fill'" :color="event.parent_handled ? '#19be6b' : '#ff9900'" size="26" />
          </view>
        </view>
        <view v-else class="empty-box">
          <u-icon name="checkmark-circle" size="40" color="#d4edda" />
          <text class="empty-text">今日一切安好</text>
        </view>
      </view>

      <!-- 事件分类 -->
      <view class="section-card">
        <view class="section-head">
          <text class="section-title">事件分类</text>
        </view>
        <view class="category-row">
          <view class="category-chip" v-for="cat in categories" :key="cat.value" :style="{ background: cat.bgColor }" @click="filterByCategory(cat.value)">
            <view class="chip-dot" :style="{ background: cat.color }" />
            <text class="chip-name">{{ cat.label }}</text>
            <text class="chip-count">{{ getCategoryCount(cat.value) }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import { useUserStore, useBabyStore } from '@/stores'
import { getEvents, getPassiveEventTypes, getBabyStatus, type MonitoringEvent, type PassiveEventType, type BabyStatus } from '@/api/monitor'
import { formatBabyAge } from '@/utils/age'
import { getDeviceList, type DeviceInfo } from '@/api/device'

const userStore = useUserStore()
const babyStore = useBabyStore()
const babyStatus = ref<BabyStatus | null>(null)
const events = ref<MonitoringEvent[]>([])
const eventTypes = ref<PassiveEventType[]>([])
const deviceList = ref<DeviceInfo[]>([])
const updateTime = ref('--:--')
const statusBarHeight = ref(44)
const videoMode = ref<'normal' | 'mini' | 'full'>('normal')

const deviceOnline = computed(() => deviceList.value.some(d => d.online_status))

// 当前宝宝信息
const currentBabyName = computed(() => babyStore.currentBaby?.name || '选择宝宝')
const currentBabyStatus = computed(() => {
  return formatBabyAge(babyStore.currentBaby)
})

const categories = [
  { label: '睡眠', value: 'sleep', color: '#5677fc', bgColor: 'rgba(86,119,252,0.08)' },
  { label: '清醒', value: 'wake', color: '#ff9900', bgColor: 'rgba(255,153,0,0.08)' },
  { label: '玩耍', value: 'play', color: '#19be6b', bgColor: 'rgba(25,190,107,0.08)' },
  { label: '哭闹', value: 'cry', color: '#fa3534', bgColor: 'rgba(250,53,52,0.08)' },
  { label: '危险', value: 'danger', color: '#ff0000', bgColor: 'rgba(255,0,0,0.08)' },
]

// 多维传感器数据
const sensorCells = computed(() => {
  const snap = babyStatus.value?.sensor_snapshot
  return [
    { label: '心率', metric: 'heart_rate', icon: 'heart-fill', color: '#667eea', bg: '#eef2ff', value: snap?.heart_rate ?? '--', unit: '次/分' },
    { label: '呼吸', metric: 'breath_rate', icon: 'volume-fill', color: '#19be6b', bg: '#ecfdf5', value: snap?.breath_rate ?? '--', unit: '次/分' },
    { label: '哭声', metric: 'cry_level', icon: 'mic', color: '#ff9900', bg: '#fff7e6', value: getCryStatus(), unit: '', alert: true },
    { label: '姿态', metric: 'pose_status', icon: 'man-add-fill', color: '#9b59b6', bg: '#f3e8ff', value: getPoseShort(), unit: '' },
  ]
})

function getCryStatus(): string {
  return babyStatus.value?.status_type === 'crying' ? '哭声' : '正常'
}

function getPoseShort(): string {
  const m: Record<string, string> = { supine: '平躺', prone: '俯卧', left: '左侧卧', right: '右侧卧', sit: '坐姿', lying: '平躺', side: '侧卧', sitting: '坐姿', standing: '站立' }
  return m[babyStatus.value?.sensor_snapshot?.pose_status || ''] || '未知'
}

// 风险等级
const riskLevel = computed(() => {
  if (!deviceOnline.value) return 'offline'
  const level = babyStatus.value?.status_level ?? 0
  if (level >= 3) return 'danger'
  if (level >= 2) return 'warning'
  return 'safe'
})

const riskIcon = computed(() => {
  if (riskLevel.value === 'offline') return 'wifi-off'
  if (riskLevel.value === 'danger') return 'error-circle-fill'
  if (riskLevel.value === 'warning') return 'info-circle-fill'
  return 'checkmark-circle-fill'
})

const riskLabel = computed(() => {
  if (riskLevel.value === 'offline') return '设备离线'
  if (riskLevel.value === 'danger') return '⚠ 有紧急告警'
  if (riskLevel.value === 'warning') return '⚠ 轻度异常'
  return '安全看护中'
})

const postureText = computed(() => getPoseShort())
const osdHeart = computed(() => deviceOnline.value ? (babyStatus.value?.sensor_snapshot?.heart_rate ?? '--') : '--')
const osdBreath = computed(() => deviceOnline.value ? (babyStatus.value?.sensor_snapshot?.breath_rate ?? '--') : '--')
const osdPosture = computed(() => deviceOnline.value ? postureText.value : '--')
const osdSyncTime = computed(() => deviceOnline.value ? updateTime.value : '--:--')
const isHeartAbnormal = computed(() => {
  const heart = babyStatus.value?.sensor_snapshot?.heart_rate
  return deviceOnline.value && typeof heart === 'number' && (heart < 80 || heart > 180)
})
const isBreathAbnormal = computed(() => {
  const breath = babyStatus.value?.sensor_snapshot?.breath_rate
  return deviceOnline.value && typeof breath === 'number' && (breath < 20 || breath > 60)
})
const isPostureAbnormal = computed(() => deviceOnline.value && babyStatus.value?.sensor_snapshot?.pose_status === 'prone')
const videoStatusText = computed(() => {
  if (!deviceOnline.value) return '离线'
  if (riskLevel.value === 'danger') return '紧急'
  if (riskLevel.value === 'warning') return '注意'
  return '实时'
})
const videoHintText = computed(() => {
  if (!deviceOnline.value) return '请检查设备连接'
  if (riskLevel.value === 'danger') return '检测到紧急状态，请立即查看'
  if (riskLevel.value === 'warning') return '有状态变化，请留意宝宝'
  return '正在保持低内存监控'
})

// 最新告警
const alerts = computed(() => {
  return events.value
    .filter(e => (e.event_level ?? 0) >= 3)
    .slice(0, 3)
    .map(e => ({
      id: e.id,
      level: e.event_level || 0,
      type: eventTypes.value.find(t => t.id === e.event_type_id)?.event_name || '未知',
      time: formatTime(e.detected_at),
    }))
})

let refreshTimer: number | null = null

onMounted(() => {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 44
})

onShow(() => {
  if (!userStore.isLoggedIn) {
    uni.redirectTo({ url: '/pages/login/login' })
    return
  }
  loadData()
  startRefresh()
})

onHide(() => {
  stopRefresh()
})

onUnmounted(() => {
  stopRefresh()
})

function startRefresh() {
  stopRefresh()
  refreshTimer = setInterval(loadData, 10000) as unknown as number
}

function stopRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

async function loadData() {
  if (!babyStore.currentBaby) return
  updateTime.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const deviceRes = await getDeviceList()
  if (deviceRes.code === 0 && deviceRes.data) deviceList.value = deviceRes.data

  const deviceSn = deviceList.value[0]?.device_sn
  const reqs: any[] = [
    getEvents({ baby_id: babyStore.currentBaby.id, page: 1, page_size: 10 }),
    getPassiveEventTypes(),
  ]
  if (deviceSn) {
    reqs.push(getBabyStatus(deviceSn))
  }
  const [eventRes, typeRes, statusRes] = await Promise.all(reqs)
  if (statusRes?.code === 0 && statusRes.data) babyStatus.value = statusRes.data
  if (eventRes.code === 0 && eventRes.data) events.value = eventRes.data.items
  if (typeRes.code === 0 && typeRes.data) eventTypes.value = typeRes.data
}

function getLevelText(level: number | null) {
  return ['信息', '低', '中', '高', '紧急'][level || 0] || '信息'
}

function getLevelClass(level: number | null) {
  return ['level-info', 'level-low', 'level-mid', 'level-high', 'level-urgent'][level || 0] || 'level-info'
}

function getEventTypeName(typeId: number | null) {
  return eventTypes.value.find(t => t.id === typeId)?.event_name || '未知事件'
}

function formatTime(time: string | null) {
  if (!time) return ''
  return new Date(time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function getCategoryCount(category: string) {
  return events.value.filter(e => eventTypes.value.find(t => t.id === e.event_type_id)?.category === category).length
}

function goToEvents() { uni.navigateTo({ url: '/pages/monitor/events' }) }
function goToEventDetail(id: number) { uni.navigateTo({ url: `/pages/monitor/detail?id=${id}` }) }
function goToRoutine() { uni.navigateTo({ url: '/pages/routine/index' }) }
function goToRoutineAdvice() { uni.navigateTo({ url: '/pages/routine/optimize' }) }
function goToScene() { uni.navigateTo({ url: '/pages/scene/index' }) }
function goToVideo() { uni.navigateTo({ url: '/pages/video/index' }) }
function goToContent() { uni.navigateTo({ url: '/pages/content/index' }) }
function goToSensorHistory() {
  uni.navigateTo({ url: '/pages/growth/sensor-history' })
}
function filterByCategory(c: string) { uni.navigateTo({ url: `/pages/monitor/events?category=${c}` }) }

// 显示宝宝切换选择器
function showBabySwitcher() {
  const babies = babyStore.babyList
  if (babies.length <= 1) {
    if (babies.length === 0) {
      uni.showToast({ title: '请先添加宝宝', icon: 'none' })
    }
    return
  }
  const itemList = babies.map(baby => `${baby.name}${baby.birth_date ? ` (${formatBabyAge(baby)})` : ''}`)
  uni.showActionSheet({
    itemList,
    success: (res) => {
      const selectedBaby = babies[res.tapIndex]
      if (selectedBaby && selectedBaby.id !== babyStore.currentBaby?.id) {
        babyStore.setCurrentBaby(selectedBaby)
        uni.showToast({ title: `已切换到 ${selectedBaby.name}`, icon: 'none', duration: 1500 })
        // 重新加载数据
        loadData()
      }
    },
  })
}

function toggleMini() {
  videoMode.value = videoMode.value === 'mini' ? 'normal' : 'mini'
}
function toggleFull() {
  videoMode.value = videoMode.value === 'full' ? 'normal' : 'full'
}
</script>

<style lang="scss" scoped>
.care-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 30rpx;
}

.nav-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  .nav-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12rpx 30rpx;
  }

  .nav-left {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  .nav-title {
    font-size: 34rpx;
    font-weight: 600;
    color: #fff;
  }

  .nav-baby-switch {
    display: flex;
    align-items: center;
    gap: 6rpx;
    padding: 6rpx 16rpx;
    background: rgba(255,255,255,0.15);
    border-radius: 30rpx;
  }

  .nav-baby-name {
    font-size: 24rpx;
    color: #fff;
    max-width: 160rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 6rpx;
    padding: 8rpx 20rpx;
    background: rgba(255,255,255,0.15);
    border-radius: 30rpx;
  }

  .nav-btn-text {
    font-size: 24rpx;
    color: #fff;
  }
}

.scroll-area {
  height: 100vh;
  box-sizing: border-box;
}

// 视频预览区
.video-section {
  margin: 24rpx 30rpx 0;

  &.fullscreen-mode {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 999;
    margin: 0;
    padding: calc(var(--status-bar-height, 0px) + 24rpx) 24rpx 24rpx;
    background: #0f1020;
    display: flex;
    align-items: center;
    justify-content: center;

    .video-wrap {
      width: 100%;
      border-radius: 18rpx;
      box-shadow: none;
    }

    .video-replay-entry {
      display: none;
    }
  }

  &.mini-mode {
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    .video-replay-entry {
      width: 100%;
      box-sizing: border-box;
    }
  }
}
.video-wrap {
  background: #1a1a2e;
  border-radius: 20rpx;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  position: relative;
  box-shadow: 0 10rpx 28rpx rgba(17,24,39,.12);

  &.safe {
    border: 2rpx solid rgba(25,190,107,.18);
  }

  &.warning {
    border: 2rpx solid rgba(255,153,0,.78);
    box-shadow: 0 10rpx 30rpx rgba(255,153,0,.18);
  }

  &.danger {
    border: 2rpx solid rgba(250,53,52,.86);
    box-shadow: 0 10rpx 34rpx rgba(250,53,52,.22);
  }

  &.offline {
    border: none;
  }

  &.mini-wrap {
    width: 430rpx;
    aspect-ratio: 4 / 3;
    border-radius: 18rpx;
  }
}

.video-topbar {
  position: absolute;
  left: 18rpx;
  right: 18rpx;
  top: 16rpx;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
}

.live-pill {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(25, 190, 107, .18);
  color: #d1fae5;
  font-size: 21rpx;
  font-weight: 600;
  backdrop-filter: blur(8rpx);

  &.off {
    background: rgba(148, 163, 184, .2);
    color: #cbd5e1;

    .live-dot {
      background: #94a3b8;
      box-shadow: none;
    }
  }

  &.warn {
    background: rgba(250, 53, 52, .22);
    color: #fff;

    .live-dot {
      background: #ff4d4f;
      box-shadow: 0 0 0 8rpx rgba(250,53,52,.16);
    }
  }
}

.live-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #19be6b;
  box-shadow: 0 0 0 8rpx rgba(25,190,107,.14);
}

.video-actions {
  display: flex;
  gap: 10rpx;
  pointer-events: auto;
}

.video-action {
  display: flex;
  align-items: center;
  gap: 5rpx;
  padding: 8rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, .42);
  color: #fff;
  backdrop-filter: blur(8rpx);

  text {
    font-size: 20rpx;
    color: #fff;
  }
}

.video-replay-entry {
  margin-top: 16rpx;
  background: #fff;
  border-radius: 18rpx;
  padding: 20rpx 22rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}

.replay-left {
  display: flex;
  align-items: center;
  min-width: 0;
}

.replay-icon {
  width: 58rpx;
  height: 58rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #1f2937, #475569);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.replay-title {
  display: block;
  color: #1a1a2e;
  font-size: 28rpx;
  font-weight: 700;
}

.replay-desc {
  display: block;
  margin-top: 4rpx;
  color: #999;
  font-size: 22rpx;
}

.video-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  background: #1a1a2e;
  padding: 52rpx 24rpx 72rpx;
  box-sizing: border-box;

  text {
    font-size: 26rpx;
    color: #667eea;
  }

  &.offline text {
    color: #888;
  }

  .video-hint {
    font-size: 22rpx;
    color: #666;
  }
}

.monitor-osd {
  position: absolute;
  left: 18rpx;
  right: 18rpx;
  bottom: 18rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
  z-index: 2;
}

.monitor-osd.muted {
  opacity: .72;
}

.monitor-osd.compact {
  left: 12rpx;
  right: 12rpx;
  bottom: 12rpx;
  gap: 6rpx;

  .osd-chip,
  .osd-sync {
    padding: 6rpx 10rpx;
  }

  .osd-label,
  .osd-value,
  .osd-sync {
    font-size: 18rpx;
  }
}

.osd-chip,
.osd-sync {
  background: rgba(0, 0, 0, .45);
  color: #fff;
  border-radius: 999rpx;
  padding: 8rpx 14rpx;
  backdrop-filter: blur(8rpx);
}

.osd-chip.warn {
  background: rgba(250, 53, 52, .78);
}

.osd-label {
  font-size: 20rpx;
  opacity: .72;
  margin-right: 6rpx;
}

.osd-value {
  font-size: 22rpx;
  font-weight: 600;
}

.osd-sync {
  margin-left: auto;
  font-size: 20rpx;
  opacity: .82;
}

// 风险等级条
.risk-hero {
  margin: 24rpx 30rpx 0;
  border-radius: 20rpx;
  padding: 28rpx 30rpx;

  &.safe    { background: linear-gradient(135deg, #e8f5e9, #c8e6c9); }
  &.warning { background: linear-gradient(135deg, #fff3e0, #ffe0b2); }
  &.danger  { background: linear-gradient(135deg, #ffebee, #ffcdd2); }
  &.offline { background: linear-gradient(135deg, #eceff1, #cfd8dc); }

  .risk-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .risk-icon {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 22rpx;
    flex-shrink: 0;

    &.safe    { background: #43a047; }
    &.warning { background: #ef6c00; }
    &.danger  { background: #e53935; }
    &.offline { background: #90a4ae; }
  }

  .risk-text {
    .risk-label {
      display: block;
      font-size: 32rpx;
      font-weight: 700;
      color: #1a1a2e;
    }
    .risk-detail {
      font-size: 22rpx;
      color: #999;
      margin-top: 6rpx;
    }
  }

  .risk-link {
    display: flex;
    align-items: center;
    gap: 6rpx;
    margin-left: 16rpx;
    flex-shrink: 0;
  }

  .risk-link-text {
    font-size: 24rpx;
    color: rgba(0, 0, 0, .45);
  }
}

// 多维传感器 4格
.sensor-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  padding: 24rpx 30rpx 0;

  .sensor-cell {
    background: #fff;
    border-radius: 16rpx;
    padding: 24rpx 10rpx;
    text-align: center;
    box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
    transition: transform .15s ease, box-shadow .15s ease;
  }

  .sensor-cell:active {
    transform: scale(.97);
    box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08);
  }

  .sensor-icon {
    width: 52rpx;
    height: 52rpx;
    border-radius: 14rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 10rpx;
  }

  .sensor-value {
    display: block;
    font-size: 34rpx;
    font-weight: 700;
    color: #333;
  }

  .sensor-unit {
    font-size: 18rpx;
    color: #aaa;
  }

  .sensor-label {
    display: block;
    font-size: 22rpx;
    color: #999;
    margin-top: 4rpx;
  }
}

// 告警卡片
.alert-card {
  margin: 24rpx 30rpx 0;
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  border-left: 6rpx solid #e53935;

  .alert-title {
    font-size: 28rpx;
    font-weight: 700;
    color: #e53935;
    margin-bottom: 16rpx;
  }
}
.alert-item {
  display: flex;
  align-items: center;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  &:last-child { border-bottom: none; }

  .alert-level {
    padding: 4rpx 14rpx;
    border-radius: 8rpx;
    font-size: 20rpx;
    margin-right: 16rpx;
    flex-shrink: 0;
    text { font-weight: 600; }

    &.lvl-3 { background: rgba(255,152,0,0.12); color: #ff9800; }
    &.lvl-4 { background: rgba(229,57,53,0.12); color: #e53935; }
  }

  .alert-body {
    flex: 1;
    .alert-type { display: block; font-size: 27rpx; color: #333; font-weight: 500; }
    .alert-time { font-size: 22rpx; color: #999; margin-top: 4rpx; }
  }
}

.alert-safe {
  margin: 24rpx 30rpx 0;
  .safe-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40rpx;
    background: #f1f8e9;
    border-radius: 20rpx;
    .safe-text { margin-top: 10rpx; font-size: 26rpx; color: #8bc34a; }
  }
}

// 功能网格
.func-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
  padding: 28rpx 30rpx 0;

  .func-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #fff;
    border-radius: 20rpx;
    padding: 28rpx 12rpx;
    box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
  }

  .func-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14rpx;
  }

  .func-name {
    font-size: 24rpx;
    color: #333;
    font-weight: 500;
  }

  .func-count {
    font-size: 20rpx;
    color: #999;
    margin-top: 4rpx;
  }
}

// 通用 section
.section-card {
  margin: 28rpx 30rpx 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.04);

  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
  }

  .section-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #1a1a2e;
  }

  .section-more {
    font-size: 24rpx;
    color: #667eea;
  }
}

.event-list {
  .event-item {
    display: flex;
    align-items: center;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #f5f5f5;
    &:last-child { border-bottom: none; }

    .event-level {
      flex-shrink: 0;
      padding: 4rpx 14rpx;
      border-radius: 8rpx;
      font-size: 20rpx;
      margin-right: 16rpx;
      &.level-info   { background: #f0f0f0; color: #999; }
      &.level-low    { background: rgba(25,190,107,0.12); color: #19be6b; }
      &.level-mid    { background: rgba(255,153,0,0.12); color: #ff9900; }
      &.level-high   { background: rgba(250,53,52,0.12); color: #fa3534; }
      &.level-urgent { background: rgba(255,0,0,0.12); color: #ff0000; }
    }

    .event-body {
      flex: 1;
      .event-type { display: block; font-size: 28rpx; color: #333; }
      .event-time { font-size: 22rpx; color: #bbb; margin-top: 4rpx; }
    }
  }
}

.empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 50rpx 0;
  .empty-text { margin-top: 12rpx; font-size: 26rpx; color: #bbb; }
}

.category-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;

  .category-chip {
    display: flex;
    align-items: center;
    padding: 16rpx 24rpx;
    border-radius: 14rpx;

    .chip-dot {
      width: 14rpx;
      height: 14rpx;
      border-radius: 50%;
      margin-right: 12rpx;
    }

    .chip-name {
      font-size: 26rpx;
      color: #333;
      font-weight: 500;
    }

    .chip-count {
      font-size: 22rpx;
      color: #999;
      margin-left: 8rpx;
    }
  }
}
</style>
