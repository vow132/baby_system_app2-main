<template>
  <view class="event-detail-page">
    <view class="hero-card">
      <view class="level-badge" :class="getLevelClass(event?.event_level)">
        {{ getLevelText(event?.event_level) }}
      </view>
      <text class="event-title">{{ eventTypeName }}</text>
      <text class="event-time">{{ formatDateTime(event?.detected_at) }}</text>
    </view>

    <view class="section">
      <text class="section-title">事件信息</text>
      <view class="info-list">
        <view class="info-item">
          <text class="label">处理状态</text>
          <text class="value" :class="{ success: event?.parent_handled }">
            {{ event?.parent_handled ? '已处理' : '待处理' }}
          </text>
        </view>
        <view class="info-item">
          <text class="label">触发设备</text>
          <text class="value">#{{ event?.device_sn || '--' }}</text>
        </view>
        <view class="info-item">
          <text class="label">解除时间</text>
          <text class="value">{{ formatDateTime(event?.resolved_at) || '未解除' }}</text>
        </view>
      </view>
    </view>

    <view class="section" v-if="eventType">
      <text class="section-title">响应策略</text>
      <view class="strategy-card">
        <text class="strategy-label">触发条件</text>
        <text class="strategy-text">{{ eventType.trigger_desc || '暂无说明' }}</text>
        <text class="strategy-label">小程序提醒</text>
        <text class="strategy-text">{{ eventType.app_response || '暂无说明' }}</text>
        <text class="strategy-label">声音响应</text>
        <text class="strategy-text">{{ eventType.sound_response || '暂无说明' }}</text>
      </view>
    </view>

    <view class="section" v-if="event?.snapshot_url || event?.gif_url || event?.video_clip_url">
      <text class="section-title">事件素材</text>
      <image v-if="event?.snapshot_url || event?.gif_url" class="snapshot" :src="event.snapshot_url || event.gif_url" mode="aspectFill" />
      <view v-if="event?.video_clip_url" class="media-link" @click="previewVideo">
        <u-icon name="play-circle" size="36" color="#5677fc" />
        <text>查看事件视频</text>
      </view>
    </view>

    <view class="footer-actions">
      <u-button v-if="event?.can_confirm !== false && !event?.parent_handled" type="primary" text="标记为已处理" :loading="loading" @click="handleConfirm" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { confirmEvent, getEventDetail, getPassiveEventTypes, type MonitoringEvent, type PassiveEventType } from '@/api/monitor'

const eventId = ref<number | null>(null)
const sourceTable = ref('monitoring_events')
const event = ref<MonitoringEvent | null>(null)
const eventTypes = ref<PassiveEventType[]>([])
const loading = ref(false)

const eventType = computed(() => eventTypes.value.find(t => t.id === event.value?.event_type_id) || null)
const eventTypeName = computed(() => eventType.value?.event_name || `事件 #${event.value?.event_type_id || '--'}`)

onLoad((options) => {
  if (options?.id) {
    eventId.value = Number(options.id)
    sourceTable.value = options.source_table || 'monitoring_events'
    loadData()
  }
})

async function loadData() {
  if (!eventId.value) return
  try {
    const results = await Promise.allSettled([
      getEventDetail(eventId.value, sourceTable.value),
      getPassiveEventTypes(),
    ])
    const detailRes = results[0].status === 'fulfilled' ? results[0].value : null
    const typeRes = results[1].status === 'fulfilled' ? results[1].value : null
    if (detailRes && detailRes.code === 0 && detailRes.data) event.value = detailRes.data
    if (typeRes && typeRes.code === 0 && typeRes.data) eventTypes.value = typeRes.data
  } catch (e) {
    console.error('[monitor-detail] loadData', e)
  }
}

function getLevelText(level: number | null | undefined) {
  return ['信息', '低', '中', '高', '紧急'][level || 0] || '信息'
}

function getLevelClass(level: number | null | undefined) {
  return ['level-info', 'level-low', 'level-mid', 'level-high', 'level-urgent'][level || 0] || 'level-info'
}

function formatDateTime(time: string | null | undefined) {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN')
}

async function handleConfirm() {
  if (!event.value) return
  loading.value = true
  try {
    const res = await confirmEvent({
      event_id: event.value.id,
      parent_handled: 1,
      source_table: event.value.source_table || sourceTable.value,
    })
    if (res.code === 0) {
      uni.showToast({ title: '已处理', icon: 'success' })
      event.value.parent_handled = 1
    }
  } finally {
    loading.value = false
  }
}

function previewVideo() {
  if (!event.value?.video_clip_url) return
  uni.showModal({
    title: '事件视频',
    content: event.value.video_clip_url,
    showCancel: false,
  })
}

</script>

<style lang="scss" scoped>
.event-detail-page {
  min-height: 100vh;
  background: #f6f7fb;
  padding: 24rpx 30rpx 160rpx;
}

.hero-card {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 20rpx;
  padding: 36rpx 30rpx;
  color: #fff;
  margin-bottom: 24rpx;

  .level-badge {
    display: inline-block;
    padding: 6rpx 16rpx;
    border-radius: 8rpx;
    font-size: 22rpx;
    background: rgba(255, 255, 255, 0.22);
    margin-bottom: 20rpx;
  }

  .event-title {
    display: block;
    font-size: 38rpx;
    font-weight: 600;
  }

  .event-time {
    display: block;
    margin-top: 12rpx;
    font-size: 24rpx;
    opacity: 0.82;
  }
}

.section {
  margin-bottom: 24rpx;

  .section-title {
    display: block;
    font-size: 30rpx;
    font-weight: 600;
    color: #333;
    margin-bottom: 16rpx;
  }
}

.info-list,
.strategy-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f1f1f1;

  &:last-child {
    border-bottom: none;
  }

  .label {
    color: #777;
    font-size: 28rpx;
  }

  .value {
    color: #333;
    font-size: 28rpx;

    &.success {
      color: #19be6b;
    }
  }
}

.strategy-label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 20rpx;
}

.strategy-text {
  display: block;
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
  margin: 8rpx 0 20rpx;
}

.snapshot {
  width: 100%;
  height: 360rpx;
  border-radius: 16rpx;
  background: #eee;
}

.media-link {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-top: 16rpx;

  text {
    margin-left: 16rpx;
    color: #5677fc;
    font-size: 28rpx;
  }
}

.footer-actions {
  position: fixed;
  left: 30rpx;
  right: 30rpx;
  bottom: 40rpx;
  display: flex;
  gap: 20rpx;
}
</style>
