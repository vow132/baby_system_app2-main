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

    <view class="notice-list" v-if="notices.length">
      <view class="notice-card" v-for="item in notices" :key="item.id">
        <view class="notice-dot" :class="{ unread: !item.read_status }" />
        <view class="notice-copy">
          <text class="notice-title">{{ item.title || getTypeText(item.push_type) }}</text>
          <text class="notice-content">{{ item.content || '暂无通知内容' }}</text>
          <text class="notice-time">{{ formatTime(item.created_at) }}</text>
        </view>
      </view>
    </view>
    <view class="empty" v-else>
      <u-icon name="bell" size="44" color="#cfd6e3" />
      <text>暂无推送历史</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getPushHistory, type PushHistoryItem } from '@/api/push'

const notices = ref<PushHistoryItem[]>([])
const loading = ref(false)
const pushType = ref('')
const filters = [
  { label: '全部', value: '' },
  { label: '告警', value: 'alarm' },
  { label: '作息', value: 'routine' },
  { label: '系统', value: 'system' },
]

onShow(loadHistory)

async function loadHistory() {
  loading.value = true
  try {
    const res = await getPushHistory({ page: 1, page_size: 30, push_type: pushType.value || undefined })
    notices.value = res.code === 0 ? (Array.isArray(res.data) ? res.data : res.data?.items || []) : []
  } catch (e) {
    console.error('[notification] loadHistory', e)
  } finally {
    loading.value = false
  }
}

function switchType(type: string) {
  pushType.value = type
  loadHistory()
}

function getTypeText(type?: string) {
  const map: Record<string, string> = { alarm: '看护告警', routine: '作息提醒', system: '系统通知' }
  return map[type || ''] || '通知'
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
