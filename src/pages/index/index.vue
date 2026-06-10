<template>
  <view class="home-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-left" @click="goToMy">
          <image class="nav-avatar" :src="currentUserAvatar" mode="aspectFill" />
          <text class="nav-greeting">{{ greetingText }}，{{ currentUserName }}</text>
        </view>
        <view class="nav-right" @click="goToNotifications">
          <u-icon name="bell" size="22" color="#fff" />
          <view v-if="unreadCount > 0" class="badge" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll-area" :style="{ paddingTop: (statusBarHeight + 56) + 'px' }">
      <!-- 无家庭提示 -->
      <view class="onboarding-hint" v-if="!familyStore.hasFamily" @click="goToOnboarding">
        <view class="hint-icon">
          <u-icon name="home-fill" size="24" color="#667eea" />
        </view>
        <view class="hint-content">
          <text class="hint-title">创建或加入家庭</text>
          <text class="hint-desc">完成设置后即可开始看护宝宝</text>
        </view>
        <u-icon name="arrow-right" size="18" color="#667eea" />
      </view>

      <!-- 宝宝状态卡（核心情感锚点） -->
      <view class="baby-status-card">
        <view class="status-main" @click="showBabyPicker = true">
          <view class="baby-left">
            <image class="baby-avatar" :src="currentBabyAvatar" mode="aspectFill" />
            <view class="baby-info">
              <text class="baby-name">{{ currentBabyName }}</text>
              <text class="baby-status-text" :class="statusTheme">
                <view class="status-indicator" :class="statusTheme" />
                {{ statusText }}
              </text>
            </view>
          </view>
          <view class="baby-right">
            <view class="vital-grid">
              <view class="vital-item">
                <text class="vital-value">{{ sensorData?.heart_rate || '--' }}</text>
                <text class="vital-label">心率</text>
              </view>
              <view class="vital-divider" />
              <view class="vital-item">
                <text class="vital-value">{{ sensorData?.breath_rate || '--' }}</text>
                <text class="vital-label">呼吸</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <scroll-view v-if="babyStore.babyList.length > 1" scroll-x class="baby-switcher" show-scrollbar="false">
        <view
          class="baby-chip"
          :class="{ active: babyStore.currentBaby?.id === baby.id }"
          v-for="baby in babyStore.babyList"
          :key="baby.id"
          @click="selectBaby(baby)"
        >
          <image class="chip-avatar" :src="baby.avatar_url || '/static/logo.png'" mode="aspectFill" />
          <text>{{ baby.name }}</text>
        </view>
      </scroll-view>

      <view class="message-entry" @click="goToNotifications">
        <view class="message-icon">
          <u-icon name="bell-fill" size="22" color="#667eea" />
          <view v-if="unreadCount > 0" class="message-dot" />
        </view>
        <view class="message-copy">
          <text class="message-title">消息中心</text>
          <text class="message-desc">{{ messageSummary }}</text>
        </view>
        <u-icon name="arrow-right" size="16" color="#cbd5e1" />
      </view>

      <!-- 快捷操作 -->
      <view class="quick-actions">
        <view class="action-item" @click="goToReport">
          <view class="action-icon" style="background: linear-gradient(135deg, #ff9900, #f5a623);">
            <u-icon name="file-text-fill" size="24" color="#fff" />
          </view>
          <text class="action-label">今日报告</text>
        </view>
        <view class="action-item" @click="goToContent">
          <view class="action-icon" style="background: linear-gradient(135deg, #19be6b, #0e9c5a);">
            <u-icon name="music-fill" size="24" color="#fff" />
          </view>
          <text class="action-label">播放内容</text>
        </view>
        <view class="action-item" @click="goToMoment">
          <view class="action-icon" style="background: linear-gradient(135deg, #f43f5e, #ec4899);">
            <u-icon name="camera-fill" size="24" color="#fff" />
          </view>
          <text class="action-label">温馨瞬间</text>
        </view>
        <view class="action-item" @click="goToAI">
          <view class="action-icon" style="background: linear-gradient(135deg, #667eea, #764ba2);">
            <u-icon name="mic-fill" size="24" color="#fff" />
          </view>
          <text class="action-label">AI陪伴</text>
        </view>
      </view>

      <!-- 今日作息 -->
      <view class="section-card">
        <view class="section-head">
          <text class="section-title">今日作息</text>
          <text class="section-more" @click="goToRoutine">查看日程</text>
        </view>
        <view v-if="routineItems.length > 0" class="routine-list">
          <view class="routine-row" v-for="item in routineItems.slice(0, 3)" :key="item.id || item.time_slot">
            <view class="routine-time">{{ getRoutineTime(item.time_slot) }}</view>
            <view class="routine-main">
              <text class="routine-title">{{ item.template_name || '作息提醒' }}</text>
              <text class="routine-desc">{{ item.description || getRoutineTypeText(item.activity_type) }}</text>
            </view>
            <view class="routine-tag" :class="getRoutineClass(item.activity_type)">{{ getRoutineTypeText(item.activity_type) }}</view>
          </view>
        </view>
        <view v-else class="compact-empty" @click="goToRoutine">
          <u-icon name="calendar" size="24" color="#8aa2ff" />
          <view class="compact-empty-main">
            <text class="compact-empty-title">还没有今日作息</text>
            <text class="compact-empty-desc">选择月龄后，可生成今天的 EASY 日程</text>
          </view>
          <u-icon name="arrow-right" size="16" color="#cbd5e1" />
        </view>
      </view>

      <!-- 作息建议 -->
      <view class="section-card advice-card" @click="goToRoutineAdvice">
        <view class="advice-icon">
          <u-icon name="info-circle" size="24" color="#fff" />
        </view>
        <view class="advice-main">
          <text class="advice-title">{{ routineAdviceTitle }}</text>
          <text class="advice-desc">{{ routineAdviceDesc }}</text>
        </view>
        <u-icon name="arrow-right" size="16" color="#cbd5e1" />
      </view>

      <!-- 今日事件 -->
      <view class="section-card">
        <view class="section-head">
          <text class="section-title">今日事件</text>
          <text class="section-more" @click="goToEvents">查看全部</text>
        </view>
        <view v-if="events.length > 0" class="event-timeline">
          <view class="event-row" v-for="event in events.slice(0, 4)" :key="event.id" @click="goToEventDetail(event.id)">
            <view class="event-dot" :class="getLevelClass(event.event_level)" />
            <view class="event-body">
              <text class="event-type">{{ getEventTypeName(event.event_type_id) }}</text>
              <text class="event-time">{{ formatTime(event.detected_at) }}</text>
            </view>
            <u-icon name="arrow-right" size="14" color="#ddd" />
          </view>
        </view>
        <view v-else class="empty-hint">
          <u-icon name="checkmark-circle" size="36" color="#d4edda" />
          <text class="empty-text">今日一切安好</text>
        </view>
      </view>

      <!-- 最近温馨瞬间 -->
      <view class="section-card">
        <view class="section-head">
          <text class="section-title">最近瞬间</text>
          <text class="section-more" @click="goToMoment">全部</text>
        </view>
        <view v-if="recentMoments.length > 0" class="moment-strip">
          <view class="moment-tile" v-for="item in recentMoments.slice(0, 3)" :key="item.id" @click="goToMoment">
            <image v-if="item.thumbnail_url || item.media_url" class="moment-thumb" :src="item.thumbnail_url || item.media_url" mode="aspectFill" />
            <view v-else class="moment-placeholder">
              <u-icon name="camera" size="24" color="#f43f5e" />
            </view>
            <text class="moment-caption">{{ item.caption || getMomentTypeText(item.type) }}</text>
          </view>
        </view>
        <view v-else class="compact-empty" @click="goToMoment">
          <u-icon name="camera" size="24" color="#f43f5e" />
          <view class="compact-empty-main">
            <text class="compact-empty-title">还没有保存的瞬间</text>
            <text class="compact-empty-desc">关键表情、坐起和翻身片段会出现在这里</text>
          </view>
          <u-icon name="arrow-right" size="16" color="#cbd5e1" />
        </view>
      </view>

    </scroll-view>

    <!-- 宝宝选择器 -->
    <u-picker :show="showBabyPicker" :columns="babyColumns" keyName="text" @confirm="onBabyConfirm" @cancel="showBabyPicker = false" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import { useUserStore, useFamilyStore, useBabyStore } from '@/stores'
import type { BabyInfo } from '@/api/baby'
import { getDeviceList, type DeviceInfo } from '@/api/device'
import { getSensorData, getEvents, getPassiveEventTypes, type SensorData, type MonitoringEvent, type PassiveEventType } from '@/api/monitor'
import { getRoutineOptimize, getRoutineToday, type RoutineInfo } from '@/api/routine'
import { getMomentTimeline, type MomentInfo } from '@/api/moment'

const userStore = useUserStore()
const familyStore = useFamilyStore()
const babyStore = useBabyStore()

const statusBarHeight = ref(44)
const showBabyPicker = ref(false)
const deviceList = ref<DeviceInfo[]>([])
const sensorData = ref<SensorData | null>(null)
const events = ref<MonitoringEvent[]>([])
const eventTypes = ref<PassiveEventType[]>([])
const routineItems = ref<RoutineInfo[]>([])
const routineSuggestions = ref<string[]>([])
const recentMoments = ref<MomentInfo[]>([])
const unreadCount = ref(0)
const updateTime = ref('--:--')

const babyColumns = computed(() => [
  babyStore.babyList.map(b => ({ text: b.name, value: b.id }))
])
const currentUserName = computed(() => userStore.userInfo?.nickname || '家长')
const currentUserAvatar = computed(() => userStore.userInfo?.avatar_url || '/static/logo.png')
const currentBabyName = computed(() => babyStore.currentBaby?.name || '添加宝宝')
const currentBabyAvatar = computed(() => babyStore.currentBaby?.avatar_url || '/static/logo.png')
const currentBabyDevice = computed(() => {
  const babyId = babyStore.currentBaby?.id
  if (!babyId) return null
  return deviceList.value.find(device => Number(device.baby_id) === Number(babyId)) || null
})

// 情感化问候语
const greetingText = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  if (h < 22) return '晚上好'
  return '夜深了'
})

// 宝宝状态文案
const statusTheme = computed(() => {
  if (!babyStore.currentBaby) return 'unknown'
  if (!currentBabyDevice.value) return sensorData.value ? 'unknown' : 'offline'
  return 'sleeping'
})

const statusText = computed(() => {
  if (!babyStore.currentBaby) return '点击添加宝宝'
  if (!currentBabyDevice.value) return sensorData.value ? '最近数据' : '未连接设备'
  const online = !!currentBabyDevice.value.online_status
  if (!online) return '设备离线'
  return '正在安睡'
})

const routineAdviceTitle = computed(() => {
  if (routineSuggestions.value.length) return routineSuggestions.value[0]
  if (routineItems.value.length) return '今日作息已安排'
  return '生成今天的作息节奏'
})

const messageSummary = computed(() => {
  if (unreadCount.value > 0) return `${unreadCount.value} 条待查看提醒`
  return '查看推送历史、告警和作息提醒'
})

const routineAdviceDesc = computed(() => {
  if (routineSuggestions.value.length > 1) return routineSuggestions.value[1]
  if (routineSuggestions.value.length === 1) return '查看完整建议后，可决定是否调整下一段 EASY 日程'
  if (routineItems.value.length) return '系统会结合睡眠、喂养和安抚记录持续给出建议'
  return '先选择月龄，首页会同步显示下一步提醒'
})

let refreshTimer: number | null = null

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 44
})

onShow(() => {
  // 登录检查：未登录跳转登录页
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
  refreshTimer = setInterval(() => {
    loadSensorData()
  }, 10000) as unknown as number
}

function stopRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

async function loadData() {
  await familyStore.fetchFamilyInfo()
  if (!familyStore.hasFamily) {
    babyStore.clearBabyCache()
    deviceList.value = []
    sensorData.value = null
    events.value = []
    todayRoutine.value = null
    routineAdvice.value = null
    recentMoments.value = []
    return
  }

  await Promise.allSettled([
    babyStore.fetchBabyList(),
    loadDevices(),
  ])
  await Promise.allSettled([
    loadSensorData(),
    loadEvents(),
    loadHomeRoutine(),
    loadRoutineAdvice(),
    loadRecentMoments(),
  ])
}

async function loadDevices() {
  try {
    const res = await getDeviceList()
    if (res.code === 0 && res.data) {
      deviceList.value = res.data
    }
  } catch {
    deviceList.value = []
  }
}

async function loadSensorData() {
  if (!babyStore.currentBaby) {
    sensorData.value = null
    return
  }

  const deviceSn = currentBabyDevice.value?.device_sn
  if (!deviceSn) {
    sensorData.value = null
    return
  }
  const params = { device_sn: deviceSn, baby_id: babyStore.currentBaby.id, page: 1, page_size: 10 }

  try {
    const res = await getSensorData(params)
    if (res.code === 0 && res.data?.items?.length) {
      sensorData.value = res.data.items[0]
    } else {
      sensorData.value = null
    }
  } catch (error) {
    sensorData.value = null
    console.warn('获取传感器数据失败:', error)
  }
  const now = new Date()
  updateTime.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

async function loadEvents() {
  if (!babyStore.currentBaby) return
  const [eventRes, typeRes] = await Promise.all([
    getEvents({ baby_id: babyStore.currentBaby.id, page: 1, page_size: 5 }),
    getPassiveEventTypes(),
  ])
  if (eventRes.code === 0 && eventRes.data) events.value = eventRes.data.items
  if (typeRes.code === 0 && typeRes.data) eventTypes.value = typeRes.data
  unreadCount.value = events.value.filter(e => !e.parent_handled).length
}

async function loadHomeRoutine() {
  if (!babyStore.currentBaby) {
    routineItems.value = []
    return
  }
  try {
    const res = await getRoutineToday(babyStore.currentBaby.id)
    routineItems.value = res.code === 0 && Array.isArray(res.data) ? res.data : []
  } catch {
    routineItems.value = []
  }
}

async function loadRoutineAdvice() {
  if (!babyStore.currentBaby) {
    routineSuggestions.value = []
    return
  }
  try {
    const res = await getRoutineOptimize(babyStore.currentBaby.id)
    const suggestions = res.code === 0 && Array.isArray(res.data?.suggestions) ? res.data.suggestions : []
    routineSuggestions.value = suggestions.filter(Boolean).slice(0, 2)
  } catch {
    routineSuggestions.value = []
  }
}

async function loadRecentMoments() {
  if (!babyStore.currentBaby) {
    recentMoments.value = []
    return
  }
  try {
    const res = await getMomentTimeline({ baby_id: babyStore.currentBaby.id, page: 1, page_size: 3 })
    recentMoments.value = res.code === 0 && res.data?.items ? res.data.items : []
  } catch {
    recentMoments.value = []
  }
}

function getEventTypeName(typeId: number | null) {
  return eventTypes.value.find(t => t.id === typeId)?.event_name || '未知事件'
}

function getLevelClass(level: number | null) {
  return ['dot-info', 'dot-low', 'dot-mid', 'dot-high', 'dot-urgent'][level || 0] || 'dot-info'
}

function formatTime(time: string | null) {
  if (!time) return ''
  return new Date(time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function getRoutineTime(timeSlot: string | null) {
  if (!timeSlot) return '--:--'
  const match = timeSlot.match(/\d{1,2}:\d{2}/)
  return match ? match[0].padStart(5, '0') : timeSlot.slice(0, 5)
}

function getRoutineTypeText(type: string | null) {
  const map: Record<string, string> = {
    eat: '喂养',
    feeding: '喂养',
    sleep: '睡眠',
    active: '活动',
    activity: '活动',
    care: '护理',
    comfort: '安抚',
  }
  return map[type || ''] || '提醒'
}

function getRoutineClass(type: string | null) {
  if (type === 'sleep') return 'sleep'
  if (type === 'eat' || type === 'feeding') return 'eat'
  if (type === 'active' || type === 'activity') return 'active'
  return 'care'
}

function getMomentTypeText(type: string | null) {
  const map: Record<string, string> = {
    photo: '照片',
    video: '视频',
    gif: '动图',
    smile: '第一次微笑',
    sitting: '坐起瞬间',
    rollover: '翻身瞬间',
  }
  return map[type || ''] || '温馨瞬间'
}

function onBabyConfirm({ value }: any) {
  const baby = babyStore.babyList.find(b => b.id === value[0].value)
  if (baby) selectBaby(baby)
  showBabyPicker.value = false
}

function selectBaby(baby: BabyInfo) {
  babyStore.setCurrentBaby(baby)
  sensorData.value = null
  events.value = []
  routineItems.value = []
  recentMoments.value = []
  Promise.allSettled([
    loadSensorData(),
    loadEvents(),
    loadHomeRoutine(),
    loadRoutineAdvice(),
    loadRecentMoments(),
  ])
}

// 导航
function goToMy() { uni.switchTab({ url: '/pages/my/index' }) }
function goToNotifications() { uni.navigateTo({ url: '/pages/notification/index' }) }
function goToReport() { uni.navigateTo({ url: '/pages/milestone/report' }) }
function goToContent() { uni.navigateTo({ url: '/pages/content/index' }) }
function goToMoment() { uni.navigateTo({ url: '/pages/moment/index' }) }
function goToEvents() { uni.navigateTo({ url: '/pages/monitor/events' }) }
function goToEventDetail(id: number) { uni.navigateTo({ url: `/pages/monitor/detail?id=${id}` }) }
function goToRoutine() { uni.navigateTo({ url: '/pages/routine/index' }) }
function goToRoutineAdvice() { uni.navigateTo({ url: '/pages/routine/optimize' }) }
function goToAI() { uni.navigateTo({ url: '/pages/ai/index' }) }
function goToOnboarding() { uni.navigateTo({ url: '/pages/onboarding/index' }) }
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background: #f5f6fa;
}

// 自定义导航栏
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
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
  }

  .nav-avatar {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    border: 2rpx solid rgba(255, 255, 255, 0.4);
    margin-right: 16rpx;
  }

  .nav-greeting {
    font-size: 30rpx;
    color: #fff;
    font-weight: 500;
  }

  .nav-right {
    position: relative;
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 50%;
  }

  .badge {
    position: absolute;
    top: 6rpx;
    right: 6rpx;
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    background: #fa3534;
    border: 2rpx solid #764ba2;
  }
}

.scroll-area {
  height: 100vh;
  box-sizing: border-box;
}

// 宝宝状态卡
.baby-status-card {
  margin: 24rpx 30rpx 0;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 24rpx rgba(102, 126, 234, 0.1);

  .status-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 32rpx;
  }

  .baby-left {
    display: flex;
    align-items: center;
    flex: 1;
  }

  .baby-avatar {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    margin-right: 24rpx;
    border: 4rpx solid #e0e7ff;
  }

  .baby-info {
    .baby-name {
      display: block;
      font-size: 34rpx;
      font-weight: 600;
      color: #1a1a2e;
    }

    .baby-status-text {
      display: flex;
      align-items: center;
      margin-top: 8rpx;
      font-size: 26rpx;
      color: #4caf50;

      &.offline { color: #999; }
      &.unknown { color: #667eea; }
    }

    .status-indicator {
      width: 14rpx;
      height: 14rpx;
      border-radius: 50%;
      background: #4caf50;
      margin-right: 10rpx;
      animation: pulse 2s infinite;

      &.offline { background: #999; animation: none; }
      &.unknown { background: #667eea; animation: none; }
    }
  }

  .baby-right {
    margin-left: 24rpx;
  }

  .vital-grid {
    display: flex;
    align-items: center;
    background: #f8f9fc;
    border-radius: 16rpx;
    padding: 16rpx 28rpx;
  }

  .vital-item {
    text-align: center;
    padding: 0 16rpx;

    .vital-value {
      display: block;
      font-size: 36rpx;
      font-weight: 700;
      color: #333;
    }

    .vital-label {
      display: block;
      font-size: 22rpx;
      color: #999;
      margin-top: 4rpx;
    }
  }

  .vital-divider {
    width: 1rpx;
    height: 48rpx;
    background: #e5e7eb;
    margin: 0 8rpx;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.baby-switcher {
  margin-top: 18rpx;
  white-space: nowrap;
}

.baby-chip {
  display: inline-flex;
  align-items: center;
  max-width: 220rpx;
  margin-left: 30rpx;
  padding: 10rpx 18rpx 10rpx 10rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #7c8798;
  font-size: 24rpx;
  box-shadow: 0 4rpx 18rpx rgba(31, 42, 68, 0.06);
  vertical-align: middle;

  &:last-child {
    margin-right: 30rpx;
  }

  &.active {
    color: #4f6dff;
    background: #eef2ff;
    box-shadow: inset 0 0 0 2rpx rgba(79, 109, 255, 0.16);
  }
}

.chip-avatar {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  margin-right: 10rpx;
  background: #f3f5fb;
  flex-shrink: 0;
}

// 无家庭提示
.onboarding-hint {
  display: flex;
  align-items: center;
  margin: 24rpx 30rpx 0;
  padding: 24rpx;
  background: linear-gradient(135deg, #eef2ff, #f5f0ff);
  border-radius: 20rpx;
  border: 2rpx solid #d4daff;

  .hint-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 16rpx;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 18rpx;
    flex-shrink: 0;
  }

  .hint-content {
    flex: 1;
    min-width: 0;
  }

  .hint-title {
    display: block;
    font-size: 28rpx;
    font-weight: 600;
    color: #1f2937;
  }

  .hint-desc {
    display: block;
    margin-top: 4rpx;
    font-size: 24rpx;
    color: #667eea;
  }
}

.message-entry {
  margin: 20rpx 30rpx 0;
  padding: 22rpx 24rpx;
  display: flex;
  align-items: center;
  border-radius: 22rpx;
  background: #fff;
  box-shadow: 0 4rpx 20rpx rgba(31, 42, 68, 0.05);
}

.message-icon {
  position: relative;
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  background: #eef2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 18rpx;
  flex-shrink: 0;
}

.message-dot {
  position: absolute;
  right: 8rpx;
  top: 8rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #f43f5e;
  border: 2rpx solid #fff;
}

.message-copy {
  flex: 1;
  min-width: 0;
}

.message-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #1f2937;
}

.message-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 23rpx;
  color: #8a95a8;
}

// 快捷操作
.quick-actions {
  display: flex;
  justify-content: space-between;
  padding: 32rpx 30rpx 0;

  .action-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 25%;
  }

  .action-icon {
    width: 96rpx;
    height: 96rpx;
    border-radius: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  }

  .action-label {
    font-size: 24rpx;
    color: #555;
  }
}

// 通用 section 卡
.section-card {
  margin: 28rpx 30rpx 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);

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

.routine-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.routine-row {
  display: flex;
  align-items: center;
  padding: 18rpx;
  background: #f8f9fc;
  border-radius: 18rpx;

  .routine-time {
    width: 88rpx;
    font-size: 28rpx;
    font-weight: 700;
    color: #667eea;
  }

  .routine-main {
    flex: 1;
    min-width: 0;
  }

  .routine-title {
    display: block;
    font-size: 28rpx;
    font-weight: 600;
    color: #1a1a2e;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .routine-desc {
    display: block;
    margin-top: 4rpx;
    font-size: 23rpx;
    color: #9aa3b2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .routine-tag {
    margin-left: 14rpx;
    padding: 6rpx 14rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
    color: #667eea;
    background: #eef2ff;

    &.sleep {
      color: #667eea;
      background: #eef2ff;
    }

    &.eat {
      color: #19be6b;
      background: #eaf8f1;
    }

    &.active {
      color: #ff9900;
      background: #fff6e6;
    }

    &.care {
      color: #8b5cf6;
      background: #f3edff;
    }
  }
}

.advice-card {
  display: flex;
  align-items: center;
  padding: 24rpx 28rpx;
  background: linear-gradient(135deg, #fffaf0, #ffffff);

  .advice-icon {
    width: 72rpx;
    height: 72rpx;
    border-radius: 22rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 20rpx;
    background: linear-gradient(135deg, #ffb84d, #ff8a00);
  }

  .advice-main {
    flex: 1;
    min-width: 0;
  }

  .advice-title {
    display: block;
    font-size: 29rpx;
    font-weight: 600;
    color: #1a1a2e;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .advice-desc {
    display: block;
    margin-top: 6rpx;
    font-size: 24rpx;
    color: #9aa3b2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.compact-empty {
  display: flex;
  align-items: center;
  padding: 22rpx;
  border-radius: 18rpx;
  background: #f8f9fc;

  .compact-empty-main {
    flex: 1;
    min-width: 0;
    margin-left: 16rpx;
  }

  .compact-empty-title {
    display: block;
    font-size: 27rpx;
    font-weight: 600;
    color: #334155;
  }

  .compact-empty-desc {
    display: block;
    margin-top: 4rpx;
    font-size: 23rpx;
    color: #9aa3b2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.moment-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;

  .moment-tile {
    min-width: 0;
  }

  .moment-thumb,
  .moment-placeholder {
    width: 100%;
    height: 132rpx;
    border-radius: 18rpx;
    background: #fff0f5;
  }

  .moment-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .moment-caption {
    display: block;
    margin-top: 8rpx;
    font-size: 22rpx;
    color: #64748b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

// 事件时间线
.event-timeline {
  .event-row {
    display: flex;
    align-items: center;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #f5f5f5;

    &:last-child { border-bottom: none; }

    .event-dot {
      width: 14rpx;
      height: 14rpx;
      border-radius: 50%;
      margin-right: 18rpx;
      flex-shrink: 0;

      &.dot-info   { background: #d1d5db; }
      &.dot-low    { background: #19be6b; }
      &.dot-mid    { background: #ff9900; }
      &.dot-high   { background: #fa3534; }
      &.dot-urgent { background: #ff0000; }
    }

    .event-body {
      flex: 1;

      .event-type {
        display: block;
        font-size: 28rpx;
        color: #333;
      }

      .event-time {
        font-size: 22rpx;
        color: #bbb;
        margin-top: 4rpx;
      }
    }
  }
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0;

  .empty-text {
    margin-top: 12rpx;
    font-size: 26rpx;
    color: #bbb;
  }
}

</style>
