<template>
  <view class="assets-page">
    <view class="hero">
      <view class="hero-copy">
        <text class="hero-title">成长素材</text>
        <text class="hero-desc">自动捕捉宝宝的关键成长瞬间</text>
      </view>
      <view class="hero-icon">
        <u-icon name="camera-fill" size="28" color="#fff" />
      </view>
    </view>

    <view class="stats-card">
      <view class="stat-item" v-for="item in stats" :key="item.label">
        <text class="stat-value">{{ item.value }}</text>
        <text class="stat-label">{{ item.label }}</text>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <view>
          <text class="section-title">自动生成流程</text>
          <text class="section-desc">识别关键动作后，系统会整理成可查看、可分享的成长素材</text>
        </view>
      </view>
      <view class="flow-card">
        <view class="flow-step" v-for="(item, index) in flowSteps" :key="item.title">
          <view class="flow-dot" :class="{ done: index < 2 }">
            <u-icon :name="item.icon" size="16" color="#fff" />
          </view>
          <view class="flow-copy">
            <text class="flow-title">{{ item.title }}</text>
            <text class="flow-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <view>
          <text class="section-title">成长相册</text>
          <text class="section-desc">后端自动沉淀 · {{ filteredAssets.length }} 个素材</text>
        </view>
        <text class="section-action" @click="loadAssets">刷新</text>
      </view>

      <scroll-view scroll-x class="filter-scroll album-filter" show-scrollbar="false">
        <view class="filter-list">
          <view
            class="filter-chip"
            v-for="item in eventFilters"
            :key="item.value"
            :class="{ active: activeFilter === item.value }"
            @click="activeFilter = item.value"
          >
            {{ item.label }}
          </view>
        </view>
      </scroll-view>

      <view class="asset-grid" v-if="filteredAssets.length > 0">
        <view class="asset-card" v-for="item in filteredAssets" :key="item.id" @click="previewAsset(item)">
          <view class="asset-cover">
            <image v-if="getSnapshotUrl(item)" class="cover-image" :src="getSnapshotUrl(item)" mode="aspectFill" />
            <view v-else class="cover-placeholder">
              <u-icon name="photo-fill" size="34" color="#d6c7f7" />
            </view>
            <view class="media-badge">{{ getMediaLabel(item) }}</view>
          </view>
          <view class="asset-body">
            <view class="asset-title-row">
              <text class="asset-title">{{ item.milestone_name || getEventName(item.event_type) }}</text>
              <text class="status-tag" :class="getAssetStatus(item).className">{{ getAssetStatus(item).text }}</text>
            </view>
            <text class="asset-time">{{ formatTime(item.created_at || item.detected_at) }}</text>
            <view class="asset-tags">
              <text class="asset-tag">{{ getEventName(item.event_type) }}</text>
              <text class="asset-tag" v-if="item.gif_size_bytes">{{ formatSize(item.gif_size_bytes) }}</text>
            </view>
            <view class="asset-actions">
              <text @click.stop="previewAsset(item)">查看</text>
              <text @click.stop="shareAsset(item)">分享</text>
            </view>
          </view>
        </view>
      </view>

      <view class="empty" v-else>
        <u-icon name="camera" size="48" color="#d5dbea" />
        <text class="empty-title">暂时还没有素材</text>
        <text class="empty-desc">算法识别到关键动作并生成 GIF/短视频后，会自动沉淀到这里</text>
      </view>
    </view>

    <view class="section manual-section">
      <view class="section-head">
        <view>
          <view class="section-title-row">
            <text class="section-title">补录精彩瞬间</text>
            <text class="section-badge">辅助</text>
          </view>
          <text class="section-desc">自动识别遗漏时，可手动选择事件类型后发起一次截取</text>
        </view>
      </view>
      <view class="capture-card">
        <view class="capture-types">
          <view
            class="capture-type"
            v-for="item in captureTypes"
            :key="item.value"
            :class="{ active: eventType === item.value }"
            @click="eventType = item.value"
          >
            <u-icon :name="item.icon" size="20" :color="eventType === item.value ? '#fff' : '#9b59b6'" />
            <text>{{ item.label }}</text>
          </view>
        </view>
        <view class="capture-button" :class="{ loading: capturing }" @click="captureEvent">
          <u-icon name="plus-circle-fill" size="20" color="#fff" />
          <text>{{ capturing ? '正在提交...' : '提交补录' }}</text>
        </view>
        <text class="capture-hint">系统会截取关键时刻前后的短片，并在生成后放入成长相册。</text>
      </view>
    </view>

    <view class="capture-result" v-if="captureResult">
      <u-icon name="checkmark-circle-fill" size="22" color="#10b981" />
      <view class="result-copy">
        <text class="result-title">已开始整理素材</text>
        <text class="result-desc">{{ getEventName(eventType) }}素材生成后会自动出现在成长相册</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get, post } from '@/api/request'
import { API } from '@/api/config'
import { useBabyStore } from '@/stores'

type EventFilter = 'all' | 'smile' | 'sit' | 'turn_over' | 'raise_head' | 'crawl'

const babyStore = useBabyStore()
const milestones = ref<any[]>([])
const eventType = ref<EventFilter>('smile')
const activeFilter = ref<EventFilter>('all')
const captureResult = ref<any | null>(null)
const capturing = ref(false)

const eventFilters: { label: string; value: EventFilter }[] = [
  { label: '全部', value: 'all' },
  { label: '微笑', value: 'smile' },
  { label: '坐起', value: 'sit' },
  { label: '翻身', value: 'turn_over' },
  { label: '抬头', value: 'raise_head' },
  { label: '爬行', value: 'crawl' },
]

const captureTypes = [
  { label: '微笑', value: 'smile', icon: 'heart-fill' },
  { label: '坐起', value: 'sit', icon: 'star-fill' },
  { label: '翻身', value: 'turn_over', icon: 'reload' },
  { label: '抬头', value: 'raise_head', icon: 'arrow-upward' },
  { label: '爬行', value: 'crawl', icon: 'grid-fill' },
] as const

const flowSteps = [
  { title: '识别关键动作', desc: '微笑、坐起、翻身等瞬间被记录', icon: 'eye-fill' },
  { title: '截取前后片段', desc: '保留关键时刻前后的完整上下文', icon: 'play-circle-fill' },
  { title: '生成GIF/短视频', desc: '整理成适合回看和分享的素材', icon: 'photo-fill' },
  { title: '保存到成长相册', desc: '同步到相册，家人随时查看', icon: 'checkmark-circle-fill' },
]

const filteredAssets = computed(() => {
  if (activeFilter.value === 'all') return milestones.value
  return milestones.value.filter(item => normalizeEventType(item.event_type || item.event_code || item.milestone_code || item.milestone_name) === activeFilter.value)
})

const stats = computed(() => [
  { label: '本周捕捉', value: milestones.value.length },
  { label: '已生成', value: milestones.value.filter(item => getMediaUrl(item)).length },
  { label: '处理中', value: milestones.value.filter(item => !getMediaUrl(item)).length },
])

onShow(async () => {
  if (!babyStore.currentBaby) await babyStore.fetchBabyList()
  await loadAssets()
})

async function loadAssets() {
  if (!babyStore.currentBaby) return
  const res = await get(`${API.MILESTONE.LIST}?baby_id=${babyStore.currentBaby.id}&page=1&page_size=50`)
  if (res.code === 0 && res.data?.items) milestones.value = res.data.items
}

async function captureEvent() {
  if (!babyStore.currentBaby || capturing.value) return
  capturing.value = true
  try {
    const res = await post(API.MILESTONE.CAPTURE, {
      baby_id: babyStore.currentBaby.id,
      event_type: eventType.value,
      trigger_time: new Date().toISOString(),
      pre_seconds: 3,
      post_seconds: 5,
    })
    if (res.code === 0) {
      captureResult.value = res.data || { status: 'processing' }
      uni.showToast({ title: '已开始整理素材', icon: 'success' })
      await loadAssets()
    }
  } finally {
    capturing.value = false
  }
}

function previewAsset(item: any) {
  const gifUrl = item.gif_url
  const videoUrl = item.video_clip_url || item.video_url
  const snapshotUrl = getSnapshotUrl(item)
  if (gifUrl) {
    uni.previewImage({ current: gifUrl, urls: [gifUrl] })
    return
  }
  if (videoUrl) {
    uni.navigateTo({ url: `/pages/video/player?url=${encodeURIComponent(videoUrl)}` })
    return
  }
  if (snapshotUrl) {
    uni.previewImage({ current: snapshotUrl, urls: [snapshotUrl] })
    return
  }
  uni.showToast({ title: '素材正在生成中', icon: 'none' })
}

function shareAsset(item: any) {
  const shareUrl = item.share_url || item.gif_url || item.video_clip_url || item.video_url || item.snapshot_url
  if (!shareUrl) {
    uni.showToast({ title: '素材生成后可分享', icon: 'none' })
    return
  }
  uni.setClipboardData({
    data: shareUrl,
    success: () => uni.showToast({ title: '素材链接已复制', icon: 'success' }),
  })
}

function getAssetStatus(item: any) {
  if (getMediaUrl(item)) return { text: '已生成', className: 'ready' }
  if (getSnapshotUrl(item)) return { text: '生成中', className: 'processing' }
  return { text: '待整理', className: 'pending' }
}

function getMediaLabel(item: any) {
  if (item.gif_url) return 'GIF'
  if (item.video_clip_url || item.video_url) return '短视频'
  return '片段'
}

function getMediaUrl(item: any) {
  return item.gif_url || item.video_clip_url || item.video_url || ''
}

function getSnapshotUrl(item: any) {
  return item.snapshot_url || item.cover_url || item.thumbnail_url || ''
}

function getEventName(value: string | null | undefined) {
  const type = normalizeEventType(value)
  const map: Record<string, string> = {
    smile: '微笑',
    sit: '坐起',
    turn_over: '翻身',
    raise_head: '抬头',
    crawl: '爬行',
  }
  return map[type] || '成长瞬间'
}

function normalizeEventType(value: string | null | undefined): EventFilter | 'unknown' {
  const raw = String(value || '').toLowerCase()
  if (raw.includes('smile') || raw.includes('微笑')) return 'smile'
  if (raw.includes('sit') || raw.includes('坐')) return 'sit'
  if (raw.includes('turn') || raw.includes('翻')) return 'turn_over'
  if (raw.includes('head') || raw.includes('抬头')) return 'raise_head'
  if (raw.includes('crawl') || raw.includes('爬')) return 'crawl'
  return 'unknown'
}

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function formatTime(time: string | null | undefined) {
  if (!time) return '刚刚'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return '刚刚'
  return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<style lang="scss" scoped>
.assets-page {
  min-height: 100vh;
  background: #f5f6fb;
  padding: 24rpx 30rpx 54rpx;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  background: linear-gradient(135deg, #9b59b6, #7c3aed);
  border-radius: 26rpx;
  padding: 36rpx 32rpx;
  color: #fff;
  margin-bottom: 22rpx;
  box-shadow: 0 16rpx 38rpx rgba(124, 58, 237, 0.18);
}

.hero-copy {
  min-width: 0;
}

.hero-title {
  display: block;
  font-size: 44rpx;
  font-weight: 900;
  line-height: 1.2;
}

.hero-desc {
  display: block;
  font-size: 26rpx;
  opacity: 0.9;
  margin-top: 12rpx;
  line-height: 1.45;
}

.hero-icon {
  width: 84rpx;
  height: 84rpx;
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stats-card {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
  margin-bottom: 22rpx;
}

.stat-item {
  background: #fff;
  border-radius: 22rpx;
  padding: 22rpx 12rpx;
  text-align: center;
  box-shadow: 0 10rpx 26rpx rgba(28, 35, 53, 0.05);
}

.stat-value {
  display: block;
  color: #7c3aed;
  font-size: 38rpx;
  font-weight: 900;
}

.stat-label {
  display: block;
  color: #8a93a5;
  font-size: 23rpx;
  margin-top: 6rpx;
}

.filter-scroll {
  white-space: nowrap;
  margin-bottom: 22rpx;
}

.album-filter {
  margin-bottom: 20rpx;
}

.filter-list {
  display: inline-flex;
  gap: 14rpx;
}

.filter-chip {
  padding: 14rpx 24rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #667085;
  font-size: 24rpx;
  box-shadow: 0 8rpx 22rpx rgba(28, 35, 53, 0.04);
}

.filter-chip.active {
  color: #fff;
  background: #7c3aed;
  font-weight: 700;
}

.section {
  background: #fff;
  border-radius: 26rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(28, 35, 53, 0.05);
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 22rpx;
}

.section-title {
  display: block;
  color: #252b3a;
  font-size: 32rpx;
  font-weight: 850;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.section-badge {
  color: #8a93a5;
  background: #eef2f7;
  border-radius: 999rpx;
  padding: 4rpx 12rpx;
  font-size: 21rpx;
}

.section-desc {
  display: block;
  color: #98a2b3;
  font-size: 23rpx;
  line-height: 1.45;
  margin-top: 8rpx;
}

.section-action {
  color: #7c3aed;
  font-size: 26rpx;
  white-space: nowrap;
}

.flow-card {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.flow-step {
  display: flex;
  gap: 18rpx;
  align-items: flex-start;
}

.flow-dot {
  width: 52rpx;
  height: 52rpx;
  border-radius: 18rpx;
  background: #cfd6e3;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.flow-dot.done {
  background: #7c3aed;
}

.flow-title {
  display: block;
  color: #252b3a;
  font-size: 27rpx;
  font-weight: 800;
}

.flow-desc {
  display: block;
  color: #98a2b3;
  font-size: 23rpx;
  line-height: 1.4;
  margin-top: 5rpx;
}

.asset-grid {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.asset-card {
  background: #f8f9fd;
  border-radius: 24rpx;
  overflow: hidden;
}

.asset-cover {
  position: relative;
  height: 260rpx;
  background: #f0eafb;
}

.cover-image,
.cover-placeholder {
  width: 100%;
  height: 100%;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-badge {
  position: absolute;
  right: 18rpx;
  top: 18rpx;
  color: #fff;
  background: rgba(37, 43, 58, 0.6);
  border-radius: 999rpx;
  padding: 7rpx 14rpx;
  font-size: 22rpx;
}

.asset-body {
  padding: 22rpx;
}

.asset-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.asset-title {
  flex: 1;
  color: #252b3a;
  font-size: 30rpx;
  font-weight: 850;
}

.status-tag {
  flex-shrink: 0;
  border-radius: 999rpx;
  padding: 7rpx 14rpx;
  font-size: 22rpx;
  background: #eef2f7;
  color: #667085;
}

.status-tag.ready {
  background: #e7f8ef;
  color: #10b981;
}

.status-tag.processing {
  background: #fff5db;
  color: #f59e0b;
}

.asset-time {
  display: block;
  color: #98a2b3;
  font-size: 23rpx;
  margin-top: 8rpx;
}

.asset-tags,
.asset-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 16rpx;
}

.asset-tag {
  color: #7c3aed;
  background: #f0eafb;
  border-radius: 999rpx;
  padding: 6rpx 14rpx;
  font-size: 22rpx;
}

.asset-actions {
  justify-content: flex-end;
  gap: 24rpx;
  border-top: 1rpx solid #edf0f6;
  padding-top: 16rpx;
}

.asset-actions text {
  color: #7c3aed;
  font-size: 25rpx;
  font-weight: 700;
}

.empty {
  padding: 54rpx 30rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.empty-title {
  color: #667085;
  font-size: 28rpx;
  font-weight: 800;
  margin-top: 18rpx;
}

.empty-desc {
  color: #98a2b3;
  font-size: 24rpx;
  line-height: 1.5;
  margin-top: 8rpx;
}

.manual-section {
  background: #fbfcff;
  box-shadow: none;
  border: 1rpx solid #edf0f6;
}

.capture-card {
  background: #f8f9fd;
  border-radius: 24rpx;
  padding: 22rpx;
}

.capture-types {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
}

.capture-type {
  min-height: 96rpx;
  border-radius: 20rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  color: #667085;
  font-size: 23rpx;
}

.capture-type.active {
  color: #fff;
  background: #7c3aed;
  font-weight: 700;
}

.capture-button {
  margin-top: 20rpx;
  height: 88rpx;
  border-radius: 22rpx;
  background: #8b5cf6;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  font-size: 28rpx;
  font-weight: 800;
}

.capture-button.loading {
  opacity: 0.72;
}

.capture-hint {
  display: block;
  color: #98a2b3;
  font-size: 23rpx;
  line-height: 1.45;
  margin-top: 16rpx;
}

.capture-result {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #ecfdf3;
  border-radius: 22rpx;
  padding: 20rpx 22rpx;
}

.result-copy {
  min-width: 0;
}

.result-title {
  display: block;
  color: #167449;
  font-size: 27rpx;
  font-weight: 800;
}

.result-desc {
  display: block;
  color: #53a17a;
  font-size: 23rpx;
  line-height: 1.45;
  margin-top: 5rpx;
}
</style>
