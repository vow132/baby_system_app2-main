<template>
  <view class="notification-page">
    <view class="hero">
      <text class="hero-title">消息中心</text>
      <text class="hero-desc">看护告警、作息提醒和系统通知</text>
    </view>

    <view class="filter-row">
      <text v-for="item in filters" :key="item.value" class="filter-chip" :class="{ active: pushType === item.value }" @click="switchType(item.value)">
        {{ item.label }}
      </text>
    </view>

    <view v-if="growthReminders.length" class="growth-section">
      <view class="section-head">
        <text>作息提醒</text>
        <text class="section-count">{{ growthReminders.length }}条</text>
      </view>
      <view class="growth-card" v-for="item in growthReminders" :key="item.entry_id" @click="openRoutine">
        <view class="growth-badge" :class="reminderClass(item)">{{ reminderStatus(item) }}</view>
        <view class="notice-copy">
          <text class="notice-title">{{ item.activity || '作息提醒' }}</text>
          <text class="notice-content">{{ item.message || item.app_tip || item.reminder || '请查看今日作息安排' }}</text>
          <text class="notice-time">{{ item.time_range || item.start_hhmm || '--:--' }}</text>
        </view>
      </view>
    </view>


    <view v-if="notices.length" class="section-head device-section-head">
      <text>设备告警与系统通知</text>
      <text class="section-count device-count">{{ notices.length }}条</text>
    </view>
    <view class="notice-list" v-if="notices.length">
      <view class="notice-card" v-for="item in notices" :key="item.id" @click="openNotice(item)">
        <view class="notice-dot" :class="{ unread: !item.read_status }" />
        <view class="notice-copy">
          <text class="notice-title">{{ item.title || getTypeText(item.push_type) }}</text>
          <text class="notice-content">{{ item.content || '暂无通知内容' }}</text>
          <text class="notice-time">{{ formatTime(item.created_at) }}</text>
        </view>
      </view>
    </view>
    <view class="empty" v-if="!notices.length && !growthReminders.length">
      <u-icon name="bell" size="44" color="#cfd6e3" />
      <text>暂无推送历史</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getPushHistory, type PushHistoryItem } from '@/api/push'
import { getGrowthReminders, type GrowthReminder } from '@/api/egolife'
import { useBabyStore } from '@/stores'

const babyStore = useBabyStore()
const growthReminders = ref<GrowthReminder[]>([])

const notices = ref<PushHistoryItem[]>([])
const loading = ref(false)
const pushType = ref('')
const filters = [
  { label: '全部', value: '' },
  { label: '提醒', value: 'warning' },
  { label: '告警', value: 'alert' },
  { label: '紧急', value: 'emergency' },
]

onShow(async () => {
  if (!babyStore.currentBaby) await babyStore.fetchBabyList()
  await loadHistory()
})

async function loadHistory() {
  loading.value = true
  try {
    const [pushResult, growthResult] = await Promise.allSettled([
      getPushHistory({ page: 1, page_size: 30, push_type: pushType.value || undefined }),
      babyStore.currentBaby ? getGrowthReminders(babyStore.currentBaby.id) : Promise.resolve(null),
    ])
    const pushData = pushResult.status === 'fulfilled' ? pushResult.value : null
    notices.value = pushData?.code === 0
      ? (Array.isArray(pushData.data) ? pushData.data : pushData.data?.items || [])
      : []
    const growthData = growthResult.status === 'fulfilled' ? growthResult.value : null
    growthReminders.value = Array.isArray(growthData?.items) ? growthData.items.slice(0, 6) : []
  } finally {
    loading.value = false
  }
}

function switchType(type: string) {
  pushType.value = type
  loadHistory()
}

function getTypeText(type?: string) {
  const map: Record<string, string> = { warning: '哭声提醒', alert: '哭声告警', emergency: '紧急哭声报警' }
  return map[type || ''] || '通知'
}

function reminderStatus(item: GrowthReminder) {
  const minutes = Number(item.minutes_until_start)
  if (item.status === 'due' || (Number.isFinite(minutes) && minutes <= 0)) return '已到期'
  if (item.status === 'upcoming' || (Number.isFinite(minutes) && minutes <= 60)) return '即将开始'
  return '稍后'
}

function reminderClass(item: GrowthReminder) {
  const status = reminderStatus(item)
  if (status === '已到期') return 'due'
  if (status === '即将开始') return 'upcoming'
  return 'later'
}

function openRoutine() {
  uni.navigateTo({ url: '/pages/routine/index' })
}

function openNotice(item: PushHistoryItem) {
  if (!item.page) return
  const query = [
    item.event_id ? `id=${item.event_id}` : '',
    item.baby_id ? `baby_id=${item.baby_id}` : '',
    item.notification_id ? `notification_id=${item.notification_id}` : '',
  ].filter(Boolean).join('&')
  uni.navigateTo({ url: `/${item.page}${query ? `?${query}` : ''}` })
}

function formatTime(time?: string | null) {
  if (!time) return '刚刚'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return '刚刚'
  return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<style lang="scss" scoped>
.notification-page { min-height: 100vh; background: #f5f6fa; padding: 24rpx 30rpx 50rpx; }
.hero { padding: 34rpx 30rpx; border-radius: 22rpx; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; margin-bottom: 22rpx; }
.hero-title { display: block; font-size: 42rpx; font-weight: 800; }
.hero-desc { display: block; margin-top: 10rpx; font-size: 26rpx; opacity: .88; }
.filter-row { display: flex; gap: 14rpx; margin-bottom: 20rpx; }
.filter-chip { padding: 12rpx 22rpx; border-radius: 999rpx; background: #fff; color: #7c8798; font-size: 25rpx; }
.filter-chip.active { background: #eef2ff; color: #5677fc; font-weight: 700; }
.growth-section { display: flex; flex-direction: column; gap: 14rpx; margin-bottom: 24rpx; }
.section-head { display: flex; align-items: center; justify-content: space-between; color: #374151; font-size: 27rpx; font-weight: 800; }
.section-count { color: #f59e0b; font-size: 23rpx; font-weight: 600; }
.growth-card { display: flex; align-items: flex-start; gap: 18rpx; padding: 24rpx; border-radius: 18rpx; background: #fffbeb; }
.growth-badge { flex-shrink: 0; padding: 7rpx 12rpx; border-radius: 999rpx; font-size: 21rpx; font-weight: 700; }
.growth-badge.due { color: #b91c1c; background: #fee2e2; }
.growth-badge.upcoming { color: #b45309; background: #fef3c7; }
.growth-badge.later { color: #475569; background: #e2e8f0; }

.device-section-head { margin-bottom: 14rpx; }
.device-count { color: #5677fc; }
.notice-list { display: flex; flex-direction: column; gap: 16rpx; }
.notice-card { display: flex; gap: 18rpx; background: #fff; border-radius: 18rpx; padding: 24rpx; }
.notice-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #cbd5e1; margin-top: 12rpx; flex-shrink: 0; }
.notice-dot.unread { background: #5677fc; }
.notice-copy { flex: 1; min-width: 0; }
.notice-title { display: block; font-size: 29rpx; color: #252b3a; font-weight: 700; }
.notice-content { display: block; margin-top: 8rpx; color: #737d90; font-size: 25rpx; line-height: 1.45; }
.notice-time { display: block; margin-top: 10rpx; color: #a5adbb; font-size: 22rpx; }
.empty { margin-top: 150rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; color: #a2a9b8; font-size: 26rpx; }
</style>
