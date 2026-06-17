<template>
  <view class="moment-page">
    <view class="hero">
      <text class="hero-title">温馨瞬间</text>
      <text class="hero-desc">按时间珍藏宝宝的照片和视频</text>
    </view>

    <view class="toolbar">
      <view class="month-picker">
        <u-icon name="arrow-left" size="16" color="#e91e63" @click="prevMonth" />
        <text class="month-text">{{ currentMonth }}</text>
        <u-icon name="arrow-right" size="16" color="#e91e63" @click="nextMonth" />
      </view>
      <view class="view-toggle">
        <view class="toggle-item" :class="{ active: viewMode === 'timeline' }" @click="viewMode = 'timeline'">
          <u-icon name="list" size="15" :color="viewMode === 'timeline' ? '#e91e63' : '#98a2b3'" />
          <text>时间线</text>
        </view>
        <view class="toggle-item" :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'">
          <u-icon name="grid" size="15" :color="viewMode === 'grid' ? '#e91e63' : '#98a2b3'" />
          <text>网格</text>
        </view>
      </view>
    </view>

    <view class="summary-card" v-if="moments.length > 0 || videos.length > 0">
      <view>
        <text class="summary-title">{{ currentMonthLabel }}回忆</text>
        <text class="summary-desc">已保存 {{ moments.length + videos.length }} 个温馨瞬间</text>
      </view>
      <u-icon name="heart-fill" size="24" color="#e91e63" />
    </view>

    <view class="timeline-view" v-if="viewMode === 'timeline' && (moments.length > 0 || videos.length > 0)">
      <view class="date-group" v-for="group in groupedMoments" :key="group.date">
        <view class="date-header">
          <view class="date-dot" />
          <text class="date-text">{{ group.label }}</text>
          <text class="date-count">{{ group.items.length }}个</text>
        </view>

        <view class="moment-card" v-for="item in group.items" :key="item.kind + '-' + (item.kind === 'moment' ? item.data.id : item.data.id)" @click="handleCardClick(item)">
          <view class="moment-media">
            <image
              v-if="item.kind === 'moment' && isPhoto(item.data)"
              :src="resolveMediaUrl(item.data.thumbnail_url || item.data.media_url, '')"
              mode="aspectFill"
              class="moment-image"
            />
            <view v-else class="moment-video">
              <u-icon name="play-circle-fill" size="32" color="#fff" />
            </view>
          </view>
          <view class="moment-info">
            <text class="moment-title">{{ item.kind === 'moment' ? getMomentTitle(item.data) : (item.data.file_name || '宝宝的温馨视频') }}</text>
            <text class="moment-meta">{{ formatTime(item.kind === 'moment' ? (item.data.captured_at || item.data.created_at) : item.data.created_at) }} · {{ item.kind === 'moment' ? getTypeText(item.data) : '视频' }}</text>
            <text class="moment-caption">{{ item.kind === 'moment' ? getCaption(item.data) : (item.data.video_content_text || 'AI识别中...') }}</text>
          </view>
          <view class="moment-actions">
            <u-icon v-if="item.kind === 'moment'" name="share" size="18" color="#e91e63" @click.stop="shareMoment(item.data)" />
            <u-icon v-if="item.kind === 'moment'" name="download" size="18" color="#10b981" @click.stop="downloadMoment(item.data)" />
          </view>
        </view>
      </view>
    </view>

    <view class="grid-view" v-if="viewMode === 'grid' && (moments.length > 0 || videos.length > 0)">
      <view class="grid-item" v-for="item in moments" :key="'m-' + item.id" @click="openDetail(item)">
        <image
          v-if="isPhoto(item)"
          :src="resolveMediaUrl(item.thumbnail_url || item.media_url, '')"
          mode="aspectFill"
          class="grid-image"
        />
        <view v-else class="grid-video">
          <u-icon name="play-circle-fill" size="30" color="#fff" />
        </view>
        <view class="grid-badge">{{ getTypeText(item) }}</view>
      </view>
      <view class="grid-item" v-for="v in videos" :key="'v-' + v.id" @click="playVideoItem(v)">
        <view class="grid-video">
          <u-icon name="play-circle-fill" size="30" color="#fff" />
        </view>
        <view class="grid-badge">视频</view>
      </view>
    </view>

    <view class="empty" v-if="moments.length === 0 && videos.length === 0">
      <u-icon name="photo" size="54" color="#d5dbea" />
      <text class="empty-title">这个月还没有温馨瞬间</text>
      <text class="empty-desc">当系统捕捉到宝宝的照片或视频，会自动整理到这里</text>
    </view>

    <view class="load-more" v-if="moments.length > 0 && hasMore" @click="loadMore">
      <text>{{ loadingMore ? '加载中...' : '查看更多' }}</text>
    </view>

    <view class="detail-mask" v-if="selectedMoment || playingVideoUrl" @click="closeDetail">
      <view class="detail-panel" @click.stop>
        <view class="detail-media">
          <video
            v-if="playingVideoUrl"
            :src="playingVideoUrl"
            class="detail-video-player"
            controls
            autoplay
            object-fit="contain"
          />
          <image
            v-else-if="selectedMoment && isPhoto(selectedMoment)"
            :src="resolveMediaUrl(selectedMoment.media_url, '')"
            mode="aspectFill"
            class="detail-image"
          />
          <view v-else class="detail-video">
            <u-icon name="play-circle-fill" size="42" color="#fff" />
            <text>视频预览</text>
          </view>
        </view>
        <view class="detail-body" v-if="selectedMoment">
          <text class="detail-title">{{ getMomentTitle(selectedMoment) }}</text>
          <text class="detail-time">{{ formatDateTime(selectedMoment.captured_at || selectedMoment.created_at) }}</text>
          <text class="detail-caption">{{ getCaption(selectedMoment) }}</text>
          <view class="detail-actions">
            <text @click="shareMoment(selectedMoment)">分享</text>
            <text @click="downloadMoment(selectedMoment)">下载</text>
            <text @click="closeDetail">关闭</text>
          </view>
        </view>
        <view class="detail-body" v-else>
          <view class="detail-actions">
            <text @click="closeDetail">关闭</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBabyStore } from '@/stores'
import {
  getMomentTimeline,
  getMomentByMonth,
  shareMoment as shareMomentApi,
  downloadMoment as downloadMomentApi,
  type MomentInfo,
} from '@/api/moment'
import {
  getMomentVideos,
  resolveVideoUrl,
  type MomentVideoItem,
} from '@/api/video'
import { getDeviceList, type DeviceInfo } from '@/api/device'
import { resolveMediaUrl } from '@/common/media'

const babyStore = useBabyStore()

const moments = ref<MomentInfo[]>([])
const videos = ref<MomentVideoItem[]>([])
const loading = ref(false)
const viewMode = ref<'timeline' | 'grid'>('timeline')
const currentMonth = ref('')
const currentPage = ref(1)
const hasMore = ref(false)
const loadingMore = ref(false)
const selectedMoment = ref<MomentInfo | null>(null)
const playingVideoUrl = ref('')

const now = new Date()
currentMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

const currentMonthLabel = computed(() => currentMonth.value.replace('-', '年') + '月')

type TimelineItem =
  | { kind: 'moment'; data: MomentInfo }
  | { kind: 'video'; data: MomentVideoItem }

const groupedMoments = computed(() => {
  const map = new Map<string, TimelineItem[]>()
  moments.value.forEach(item => {
    const key = formatDateKey(item.captured_at || item.created_at)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push({ kind: 'moment', data: item })
  })
  videos.value.forEach(item => {
    const key = formatDateKey(item.created_at)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push({ kind: 'video', data: item })
  })
  return Array.from(map.entries())
    .map(([date, items]) => ({ date, label: formatDateLabel(date), items }))
    .sort((a, b) => b.date.localeCompare(a.date))
})

onShow(async () => {
  if (!babyStore.currentBaby) await babyStore.fetchBabyList()
  await loadMoments()
})

async function loadMoments() {
  if (!babyStore.currentBaby) return
  currentPage.value = 1
  loading.value = true
  try {
    // 先拿设备列表，取第一个设备的 device_sn
    const deviceRes = await getDeviceList()
    const deviceList: DeviceInfo[] = deviceRes.code === 0 && deviceRes.data ? deviceRes.data : []
    const firstDeviceSn = deviceList[0]?.device_sn

    const requests: Promise<any>[] = [
      getMomentTimeline({
        baby_id: babyStore.currentBaby.id,
        page: 1,
        page_size: 20,
      }),
    ]
    if (firstDeviceSn) {
      requests.push(
        getMomentVideos({
          device_sn: firstDeviceSn,
          page: 1,
          page_size: 50,
        }),
      )
    }

    const [momentRes, videoRes] = await Promise.all(requests)
    if (momentRes.code === 0 && momentRes.data) {
      moments.value = momentRes.data.items || []
      hasMore.value = moments.value.length >= 20
    }
    if (videoRes && videoRes.code === 0 && videoRes.data) {
      videos.value = videoRes.data.list || []
    }
  } catch (e) {
    console.error('[moment] loadMoments', e)
  } finally {
    loading.value = false
  }
}

async function loadMonthMoments() {
  if (!babyStore.currentBaby) return
  try {
    const deviceRes = await getDeviceList()
    const deviceList: DeviceInfo[] = deviceRes.code === 0 && deviceRes.data ? deviceRes.data : []
    const firstDeviceSn = deviceList[0]?.device_sn

    const requests: Promise<any>[] = [
      getMomentByMonth(currentMonth.value, babyStore.currentBaby.id),
    ]
    if (firstDeviceSn) {
      requests.push(
        getMomentVideos({
          device_sn: firstDeviceSn,
          page: 1,
          page_size: 100,
        }),
      )
    }

    const [momentRes, videoRes] = await Promise.all(requests)
    if (momentRes.code === 0 && momentRes.data) {
      moments.value = momentRes.data
      hasMore.value = false
    }
    if (videoRes && videoRes.code === 0 && videoRes.data) {
      videos.value = videoRes.data.list || []
    }
  } catch (e) {
    console.error('[moment] loadMonthMoments', e)
  }
}

async function loadMore() {
  if (!babyStore.currentBaby || loadingMore.value) return
  loadingMore.value = true
  currentPage.value++
  try {
    const res = await getMomentTimeline({
      baby_id: babyStore.currentBaby.id,
      page: currentPage.value,
      page_size: 20,
    })
    if (res.code === 0 && res.data?.items) {
      moments.value.push(...res.data.items)
      hasMore.value = res.data.items.length >= 20
    }
  } finally {
    loadingMore.value = false
  }
}

function prevMonth() {
  const [year, month] = currentMonth.value.split('-').map(Number)
  const date = new Date(year, month - 2, 1)
  currentMonth.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  loadMonthMoments()
}

function nextMonth() {
  const [year, month] = currentMonth.value.split('-').map(Number)
  const date = new Date(year, month, 1)
  currentMonth.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  loadMonthMoments()
}

function isPhoto(item: MomentInfo) {
  return item.type === 'photo' || /\.(jpg|jpeg|png|webp)$/i.test(item.media_url || '')
}

function getTypeText(item: MomentInfo) {
  return isPhoto(item) ? '照片' : '视频'
}

function getMomentTitle(item: MomentInfo) {
  if (item.caption?.trim()) return item.caption.trim()
  return isPhoto(item) ? '宝宝的温馨照片' : '宝宝的温馨视频'
}

function getCaption(item: MomentInfo) {
  if (item.caption?.trim()) return item.caption.trim()
  return '系统已自动保存这个成长瞬间'
}

function openDetail(item: MomentInfo) {
  selectedMoment.value = item
  playingVideoUrl.value = ''
}

function handleCardClick(item: TimelineItem) {
  if (item.kind === 'moment') {
    openDetail(item.data)
  } else {
    playVideoItem(item.data)
  }
}

function playVideoItem(item: MomentVideoItem) {
  playingVideoUrl.value = resolveVideoUrl(item.video_url)
  selectedMoment.value = null
}

function closeDetail() {
  selectedMoment.value = null
  playingVideoUrl.value = ''
}

async function shareMoment(item: MomentInfo) {
  try {
    const res = await shareMomentApi({ moment_ids: [item.id] })
    if (res.code === 0 && res.data) {
      uni.setClipboardData({
        data: res.data.share_url,
        success: () => uni.showToast({ title: '分享链接已复制', icon: 'success' }),
      })
    } else {
      uni.showToast({ title: res.message || '分享失败', icon: 'none' })
    }
  } catch (e) {
    console.error('[moment] shareMoment', e)
    uni.showToast({ title: '分享请求失败', icon: 'none' })
  }
}

async function downloadMoment(item: MomentInfo) {
  try {
    const res = await downloadMomentApi(item.id)
    if (res.code === 0 && res.data) {
      uni.downloadFile({
        url: res.data.download_url,
        success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
      })
    } else {
      uni.showToast({ title: res.message || '下载失败', icon: 'none' })
    }
  } catch (e) {
    console.error('[moment] downloadMoment', e)
    uni.showToast({ title: '下载请求失败', icon: 'none' })
  }
}

function formatDateKey(time: string | null | undefined) {
  if (!time) return 'unknown'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return 'unknown'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDateLabel(dateKey: string) {
  if (dateKey === 'unknown') return '未标记时间'
  const today = formatDateKey(new Date().toISOString())
  if (dateKey === today) return '今天'
  const date = new Date(dateKey)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function formatTime(time: string | null | undefined) {
  if (!time) return '时间未标记'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return '时间未标记'
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(time: string | null | undefined) {
  if (!time) return '时间未标记'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return '时间未标记'
  return date.toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<style lang="scss" scoped>
.moment-page {
  min-height: 100vh;
  background: #f5f6fb;
  padding: 0 30rpx 50rpx;
}

.hero {
  background: linear-gradient(135deg, #e91e63, #c2185b);
  border-radius: 24rpx;
  padding: 36rpx 30rpx;
  color: #fff;
  margin-bottom: 24rpx;
}

.hero-title {
  display: block;
  font-size: 42rpx;
  font-weight: 800;
}

.hero-desc {
  display: block;
  font-size: 26rpx;
  opacity: 0.9;
  margin-top: 10rpx;
}

.toolbar {
  margin-bottom: 20rpx;
}

.month-picker {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 26rpx;
  margin-bottom: 18rpx;
}

.month-text {
  min-width: 210rpx;
  text-align: center;
  font-size: 31rpx;
  font-weight: 800;
  color: #252b3a;
}

.view-toggle {
  display: flex;
  gap: 12rpx;
}

.toggle-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 22rpx;
  background: #fff;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #98a2b3;
}

.toggle-item.active {
  background: #fff0f5;
  color: #e91e63;
  font-weight: 700;
}

.summary-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 22rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 10rpx 28rpx rgba(28, 35, 53, 0.05);
}

.summary-title {
  display: block;
  color: #252b3a;
  font-size: 29rpx;
  font-weight: 800;
}

.summary-desc {
  display: block;
  color: #98a2b3;
  font-size: 23rpx;
  margin-top: 6rpx;
}

.date-group {
  margin-bottom: 24rpx;
}

.date-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.date-dot {
  width: 15rpx;
  height: 15rpx;
  border-radius: 50%;
  background: #e91e63;
  margin-right: 12rpx;
}

.date-text {
  font-size: 28rpx;
  font-weight: 800;
  color: #252b3a;
}

.date-count {
  font-size: 22rpx;
  color: #98a2b3;
  margin-left: 10rpx;
}

.moment-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx;
  margin-bottom: 14rpx;
  box-shadow: 0 8rpx 24rpx rgba(28, 35, 53, 0.04);
}

.moment-media {
  width: 108rpx;
  height: 108rpx;
  border-radius: 16rpx;
  overflow: hidden;
  margin-right: 18rpx;
  flex-shrink: 0;
  background: #1f2937;
}

.moment-image,
.moment-video {
  width: 100%;
  height: 100%;
}

.moment-video {
  display: flex;
  align-items: center;
  justify-content: center;
}

.moment-info {
  flex: 1;
  min-width: 0;
}

.moment-title {
  display: block;
  color: #252b3a;
  font-size: 28rpx;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.moment-meta,
.moment-caption {
  display: block;
  font-size: 23rpx;
  line-height: 1.45;
}

.moment-meta {
  color: #98a2b3;
  margin-top: 6rpx;
}

.moment-caption {
  color: #667085;
  margin-top: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.moment-actions {
  display: flex;
  gap: 16rpx;
  flex-shrink: 0;
  margin-left: 12rpx;
}

.grid-view {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}

.grid-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 18rpx;
  overflow: hidden;
  background: #1f2937;
}

.grid-image,
.grid-video {
  width: 100%;
  height: 100%;
}

.grid-video {
  display: flex;
  align-items: center;
  justify-content: center;
}

.grid-badge {
  position: absolute;
  top: 10rpx;
  right: 10rpx;
  color: #fff;
  background: rgba(37, 43, 58, 0.58);
  font-size: 20rpx;
  padding: 4rpx 10rpx;
  border-radius: 999rpx;
}

.empty {
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 70rpx 34rpx;
  text-align: center;
}

.empty-title {
  margin-top: 16rpx;
  color: #667085;
  font-size: 28rpx;
  font-weight: 800;
}

.empty-desc {
  margin-top: 8rpx;
  color: #98a2b3;
  font-size: 24rpx;
  line-height: 1.5;
}

.load-more {
  text-align: center;
  padding: 30rpx;
  color: #e91e63;
  font-size: 26rpx;
}

.detail-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(15, 23, 42, 0.48);
  display: flex;
  align-items: flex-end;
}

.detail-panel {
  width: 100%;
  background: #fff;
  border-radius: 30rpx 30rpx 0 0;
  overflow: hidden;
}

.detail-media {
  height: 430rpx;
  background: #1f2937;
}

.detail-image,
.detail-video,
.detail-video-player {
  width: 100%;
  height: 100%;
}

.detail-video {
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 25rpx;
}

.detail-body {
  padding: 28rpx 30rpx 36rpx;
}

.detail-title {
  display: block;
  color: #252b3a;
  font-size: 32rpx;
  font-weight: 900;
}

.detail-time,
.detail-caption {
  display: block;
  margin-top: 10rpx;
  line-height: 1.5;
}

.detail-time {
  color: #98a2b3;
  font-size: 24rpx;
}

.detail-caption {
  color: #667085;
  font-size: 26rpx;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 34rpx;
  margin-top: 28rpx;
}

.detail-actions text {
  color: #e91e63;
  font-size: 27rpx;
  font-weight: 800;
}
</style>
