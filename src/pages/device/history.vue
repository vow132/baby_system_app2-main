<template>
  <view class="history-page">
    <view class="summary-card">
      <text class="summary-title">设备切换历史</text>
      <text class="summary-subtitle">SN: {{ deviceSn || '--' }}</text>
    </view>

    <view class="history-list">
      <view class="history-item" v-for="item in records" :key="item.id">
        <view class="timeline-dot" />
        <view class="history-content">
          <view class="history-row">
            <text class="mode-title">{{ getModeText(item.from_mode) }} → {{ getModeText(item.to_mode) }}</text>
            <text class="switch-type">{{ item.switch_type || '手动' }}</text>
          </view>
          <text class="reason">{{ item.switch_reason || '暂无切换说明' }}</text>
          <text class="time">{{ formatTime(item.switched_at) }}</text>
        </view>
      </view>

      <view class="empty-state" v-if="records.length === 0 && !loading">
        <u-icon name="list" size="72" color="#ddd" />
        <text>暂无切换历史</text>
      </view>

      <u-loadmore v-if="records.length > 0 || loading" :status="loadStatus" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onReachBottom } from '@dcloudio/uni-app'
import { getModeHistory, type ModeSwitchRecord } from '@/api/device'

const deviceSn = ref('')
const records = ref<ModeSwitchRecord[]>([])
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)
const loading = ref(false)

const loadStatus = computed(() => {
  if (loading.value) return 'loading'
  return hasMore.value ? 'loadmore' : 'nomore'
})

onLoad((options) => {
  if (options?.sn) {
    deviceSn.value = String(options.sn)
    loadHistory()
  }
})

onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    page.value++
    loadHistory()
  }
})

async function loadHistory() {
  if (!deviceSn.value) return
  loading.value = true
  try {
    const res = await getModeHistory({ device_sn: deviceSn.value, page: page.value, page_size: pageSize })
    if (res.code === 0 && res.data) {
      const list = res.data.items || []
      records.value = page.value === 1 ? list : records.value.concat(list)
      hasMore.value = list.length === pageSize
    }
  } finally {
    loading.value = false
  }
}

function getModeText(mode: string | null) {
  const modeMap: Record<string, string> = {
    sleep: '睡眠',
    play: '游戏',
    co_sleep: '拼床',
  }
  return modeMap[mode || ''] || '未知'
}

function formatTime(time: string | null) {
  if (!time) return '未知时间'
  return new Date(time).toLocaleString('zh-CN')
}
</script>

<style lang="scss" scoped>
.history-page {
  min-height: 100vh;
  background: #f6f7fb;
  padding: 24rpx 30rpx;
}

.summary-card {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 20rpx;
  padding: 36rpx 30rpx;
  color: #fff;
  margin-bottom: 24rpx;

  .summary-title {
    display: block;
    font-size: 36rpx;
    font-weight: 600;
  }

  .summary-subtitle {
    display: block;
    font-size: 24rpx;
    opacity: 0.82;
    margin-top: 10rpx;
  }
}

.history-list {
  background: #fff;
  border-radius: 18rpx;
  padding: 10rpx 24rpx;
}

.history-item {
  display: flex;
  padding: 26rpx 0;
  border-bottom: 1rpx solid #f1f1f1;

  &:last-child {
    border-bottom: none;
  }

  .timeline-dot {
    width: 18rpx;
    height: 18rpx;
    border-radius: 50%;
    background: #5677fc;
    margin: 12rpx 20rpx 0 0;
    flex-shrink: 0;
  }

  .history-content {
    flex: 1;
  }

  .history-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mode-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #333;
  }

  .switch-type {
    font-size: 22rpx;
    color: #5677fc;
    background: rgba(86, 119, 252, 0.1);
    border-radius: 8rpx;
    padding: 4rpx 12rpx;
  }

  .reason,
  .time {
    display: block;
    font-size: 24rpx;
    color: #999;
    margin-top: 10rpx;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
  color: #999;

  text {
    margin-top: 16rpx;
    font-size: 26rpx;
  }
}
</style>
