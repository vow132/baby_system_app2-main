<template>
  <view class="video-page">
    <view class="hero">
      <text class="hero-title">视频回放</text>
      <text class="hero-desc">查看设备上传的视频片段与分析状态</text>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-item" :class="{ active: filterStatus === '' }" @click="filterStatus = ''">全部</view>
      <view class="filter-item" :class="{ active: filterStatus === 'completed' }" @click="filterStatus = 'completed'">可播放</view>
      <view class="filter-item" :class="{ active: filterStatus === 'processing' }" @click="filterStatus = 'processing'">分析中</view>
    </view>

    <!-- 视频列表 -->
    <view class="video-list">
      <view class="video-card" v-for="video in filteredVideos" :key="video.id" @click="playVideo(video)">
        <view class="video-cover">
          <view class="cover-placeholder">
            <u-icon name="play-circle-fill" size="36" color="rgba(255,255,255,0.9)" />
          </view>
          <view class="video-duration" v-if="video.duration">{{ formatDuration(video.duration) }}</view>
          <view class="video-status-badge" :class="video.status">{{ getStatusText(video.status) }}</view>
        </view>
        <view class="video-info">
          <text class="video-name">{{ video.file_name }}</text>
          <view class="video-meta">
            <text class="meta-item">
              <u-icon name="calendar" size="14" color="#999" />
              {{ formatDate(video.created_at) }}
            </text>
            <text class="meta-item" v-if="video.file_size">
              <u-icon name="folder" size="14" color="#999" />
              {{ formatFileSize(video.file_size) }}
            </text>
            <text class="meta-item" v-if="video.resolution">
              <u-icon name="eye" size="14" color="#999" />
              {{ video.resolution }}
            </text>
          </view>
        </view>
        <view class="video-actions">
          <u-icon name="trash" size="18" color="#fa3534" @click.stop="confirmDelete(video)" />
        </view>
      </view>

      <view class="empty" v-if="filteredVideos.length === 0">
        <u-icon name="play-circle" size="56" color="#ddd" />
        <text class="empty-text">暂无视频回放</text>
        <text class="empty-hint">设备上传视频并完成分析后，会显示在这里</text>
      </view>
    </view>

    <!-- 视频播放弹窗 -->
    <u-popup :show="showPlayer" mode="center" round="12" @close="showPlayer = false">
      <view class="player-popup">
        <view class="player-header">
          <text class="player-title">{{ playingVideo?.file_name }}</text>
          <u-icon name="close" size="20" color="#999" @click="showPlayer = false" />
        </view>
        <view class="player-body">
          <view class="player-placeholder">
            <u-icon name="play-circle-fill" size="64" color="#667eea" />
            <text class="player-hint">正在加载播放器...</text>
          </view>
        </view>
      </view>
    </u-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBabyStore } from '@/stores'
import { getVideoList, deleteVideo, resolveVideoUrl, type VideoInfo } from '@/api/video'
import { getDeviceList, type DeviceInfo } from '@/api/device'

const babyStore = useBabyStore()

const videos = ref<VideoInfo[]>([])
const devices = ref<DeviceInfo[]>([])
const loading = ref(false)
const filterStatus = ref('')
const showPlayer = ref(false)
const playingVideo = ref<VideoInfo | null>(null)

const filteredVideos = computed(() => {
  if (!filterStatus.value) return videos.value
  return videos.value.filter(v => v.status === filterStatus.value)
})

onShow(async () => {
  if (!babyStore.currentBaby) await babyStore.fetchBabyList()
  loadVideos()
})

async function loadVideos() {
  if (!babyStore.currentBaby) {
    videos.value = []
    return
  }
  loading.value = true
  try {
    const deviceRes = await getDeviceList()
    if (deviceRes.code === 0 && deviceRes.data) devices.value = deviceRes.data
    const currentDevice = devices.value.find(device => device.baby_id === babyStore.currentBaby?.id) || devices.value[0]
    const deviceSn = currentDevice?.device_sn
    if (!deviceSn) {
      videos.value = []
      return
    }
    const res = await getVideoList({ device_sn: deviceSn, page: 1, page_size: 50 })
    if (res.code === 0 && res.data) {
      videos.value = Array.isArray(res.data) ? res.data : (res.data.list || [])
    } else {
      videos.value = []
    }
  } catch (error) {
    videos.value = []
  } finally {
    loading.value = false
  }
}

function playVideo(video: VideoInfo) {
  const url = resolveVideoUrl(video.video_url)
  if (!url) {
    uni.showToast({ title: '视频地址无效', icon: 'none' })
    return
  }
  uni.navigateTo({ url: `/pages/video/player?url=${encodeURIComponent(url)}` })
}

function confirmDelete(video: VideoInfo) {
  uni.showModal({
    title: '确认删除',
    content: `确定删除视频 "${video.file_name}" 吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        const delRes = await deleteVideo(video.id)
        if (delRes.code === 0) {
          videos.value = videos.value.filter(v => v.id !== video.id)
          uni.showToast({ title: '已删除', icon: 'success' })
        } else {
          uni.showToast({ title: delRes.message || '删除失败', icon: 'none' })
        }
      } catch (e) {
        console.error('[video] confirmDelete', e)
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    }
  })
}


function getStatusText(status: string) {
  const map: Record<string, string> = { completed: '完成', processing: '处理中', failed: '失败', pending: '待处理' }
  return map[status] || status
}

function formatDate(time: string | null) {
  if (!time) return '--'
  return new Date(time).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '--'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

</script>

<style lang="scss" scoped>
.video-page { min-height: 100vh; background: #f6f7fb; padding: 0 30rpx 50rpx; }
.hero { background: linear-gradient(135deg, #2d3436, #636e72); border-radius: 20rpx; padding: 36rpx 30rpx; color: #fff; margin-bottom: 24rpx; }
.hero-title { display: block; font-size: 42rpx; font-weight: 700; }
.hero-desc { display: block; font-size: 26rpx; opacity: .86; margin-top: 10rpx; }

// 筛选栏
.filter-bar { display: flex; gap: 12rpx; margin-bottom: 24rpx; }
.filter-item { padding: 10rpx 22rpx; background: #fff; border-radius: 20rpx; font-size: 24rpx; color: #999; }
.filter-item.active { background: rgba(102,126,234,0.1); color: #667eea; font-weight: 600; }

// 视频列表
.video-list { }
.video-card { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 14rpx; }
.video-cover { position: relative; width: 140rpx; height: 100rpx; border-radius: 10rpx; overflow: hidden; margin-right: 18rpx; flex-shrink: 0; }
.cover-placeholder { width: 100%; height: 100%; background: linear-gradient(135deg, #1f2937, #374151); display: flex; align-items: center; justify-content: center; }
.video-duration { position: absolute; bottom: 6rpx; right: 6rpx; background: rgba(0,0,0,0.6); color: #fff; font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; }
.video-status-badge { position: absolute; top: 6rpx; left: 6rpx; font-size: 16rpx; padding: 2rpx 8rpx; border-radius: 4rpx; background: rgba(25,190,107,0.8); color: #fff; }
.video-status-badge.processing { background: rgba(255,153,0,0.8); }
.video-status-badge.failed { background: rgba(250,53,52,0.8); }
.video-status-badge.pending { background: rgba(153,153,153,0.8); }
.video-info { flex: 1; }
.video-name { display: block; font-size: 26rpx; color: #333; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 340rpx; }
.video-meta { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 8rpx; }
.meta-item { display: flex; align-items: center; gap: 4rpx; font-size: 20rpx; color: #999; }
.video-actions { flex-shrink: 0; margin-left: 12rpx; }

.empty { display: flex; flex-direction: column; align-items: center; padding: 80rpx 24rpx; }
.empty-text { margin-top: 16rpx; color: #999; font-size: 28rpx; }
.empty-hint { margin-top: 8rpx; color: #ccc; font-size: 24rpx; }

// 播放弹窗
.player-popup { width: 640rpx; background: #fff; border-radius: 16rpx; overflow: hidden; }
.player-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; border-bottom: 1rpx solid #f1f1f1; }
.player-title { font-size: 28rpx; font-weight: 600; color: #333; max-width: 500rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.player-body { padding: 0; }
.player-video { width: 640rpx; height: 360rpx; }
.player-placeholder { display: flex; flex-direction: column; align-items: center; padding: 80rpx 40rpx; }
.player-hint { margin-top: 16rpx; font-size: 26rpx; color: #999; }
.player-detail { margin-top: 10rpx; font-size: 22rpx; color: #ccc; }
</style>
