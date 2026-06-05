<template>
  <view class="content-page">
    <view class="hero">
      <text class="hero-title">互动内容库</text>
      <text class="hero-desc">儿歌、故事、早教、娱乐，陪伴每一刻</text>
    </view>

    <!-- 分类Tab -->
    <view class="tab-bar">
      <view class="tab-item" v-for="tab in tabs" :key="tab.value"
        :class="{ active: activeTab === tab.value }"
        @click="switchTab(tab.value)">
        <u-icon :name="tab.icon" size="18" :color="activeTab === tab.value ? '#667eea' : '#999'" />
        <text class="tab-text">{{ tab.label }}</text>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <u-search v-model="searchText" placeholder="搜索内容" shape="round" :showAction="false" @search="onSearch" @clear="onSearch" />
    </view>

    <!-- 内容列表 -->
    <view class="content-list">
      <view class="content-card" v-for="item in filteredContent" :key="item.id" @click="playContent(item)">
        <view class="content-cover" :style="{ background: item.coverBg }">
          <u-icon :name="item.icon" size="28" color="#fff" />
        </view>
        <view class="content-info">
          <text class="content-title">{{ item.title }}</text>
          <text class="content-desc">{{ item.description }}</text>
          <view class="content-meta">
            <text class="meta-tag">{{ getCategoryLabel(item.category) }}</text>
            <text class="meta-duration">{{ item.duration }}</text>
            <text class="meta-age">{{ item.ageRange }}</text>
            <text class="meta-count" v-if="getPlayCount(item.id)">已播{{ getPlayCount(item.id) }}次</text>
          </view>
        </view>
        <view class="content-action">
          <u-icon :name="currentPlaying === item.id ? 'pause-circle-fill' : 'play-circle-fill'"
            size="36" :color="currentPlaying === item.id ? '#667eea' : '#ccc'" />
        </view>
      </view>

      <view class="empty" v-if="filteredContent.length === 0">
        <u-icon name="music" size="48" color="#ddd" />
        <text class="empty-text">{{ searchText ? '未找到匹配内容' : '暂无内容' }}</text>
      </view>
    </view>

    <!-- 互动记录 -->
    <view class="section">
      <view class="section-head">
        <text class="section-title">互动记录</text>
        <text class="section-clear" v-if="playHistory.length" @click="clearHistory">清空</text>
      </view>

      <view class="history-list" v-if="playHistory.length">
        <view class="history-item" v-for="item in playHistory.slice(0, 10)" :key="item.time">
          <view class="hist-dot" :class="item.category" />
          <view class="hist-body">
            <text class="hist-title">{{ item.title }}</text>
            <text class="hist-cat">{{ getCategoryLabel(item.category) }}</text>
          </view>
          <text class="hist-time">{{ item.time }}</text>
        </view>
      </view>

      <view class="empty-sm" v-else>
        <text>暂无互动记录，播放内容后自动记录</text>
      </view>
    </view>

    <!-- 正在播放 -->
    <view class="player-bar" v-if="playingItem">
      <view class="player-info">
        <view class="player-cover" :style="{ background: playingItem.coverBg }">
          <u-icon :name="playingItem.icon" size="16" color="#fff" />
        </view>
        <view class="player-text">
          <text class="player-title">{{ playingItem.title }}</text>
          <text class="player-status">正在播放...</text>
        </view>
      </view>
      <view class="player-controls">
        <u-icon name="pause-circle-fill" size="36" color="#667eea" @click="stopPlay" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBabyStore } from '@/stores'
import { getInteractionHistory, getInteractionLibrary, playInteractionContent } from '@/api/interaction'

const babyStore = useBabyStore()

interface ContentItem {
  id: string | number
  title: string
  description: string
  category: string
  icon: string
  coverBg: string
  duration: string
  ageRange: string
  contentUrl: string | null
}

interface PlayRecord {
  title: string
  category: string
  time: string
  contentId: string | number
}

const activeTab = ref('all')
const searchText = ref('')
const currentPlaying = ref<string | number | null>(null)
const playingItem = ref<ContentItem | null>(null)
const playHistory = ref<PlayRecord[]>([])
const playCounts = ref<Record<string, number>>({})

const tabs = [
  { label: '全部', value: 'all', icon: 'grid' },
  { label: '儿歌', value: 'song', icon: 'music' },
  { label: '故事', value: 'story', icon: 'book' },
  { label: '早教', value: 'education', icon: 'star' },
  { label: '娱乐', value: 'fun', icon: 'gift' },
]

const contentList = ref<ContentItem[]>([])

onShow(async () => {
  await babyStore.fetchBabyList()
  loadContentLibrary()
  loadInteractionHistory()
})

async function loadContentLibrary() {
  if (!babyStore.currentBaby) return
  try {
    const res = await getInteractionLibrary({ baby_id: babyStore.currentBaby.id })
    if (res.code !== 0 || !res.data) {
      contentList.value = []
      return
    }
    const rawList = Array.isArray(res.data)
      ? res.data
      : ((res.data as any).items || (res.data as any).library || [])
    if (!rawList.length) {
      contentList.value = []
      return
    }
    contentList.value = rawList.map((item: any, index: number) => {
      const category = item.category || item.type || 'fun'
      return {
        id: item.id,
        title: item.title || item.name || '未命名内容',
        description: item.description || item.summary || '互动内容',
        category,
        icon: getCategoryIcon(category),
        coverBg: getCategoryBg(category, index),
        duration: item.duration || (item.duration_sec ? `${item.duration_sec}s` : '--'),
        ageRange: item.age_range || item.ageRange || '0-48月',
        contentUrl: item.content_url || item.contentUrl || null,
      }
    })
  } catch (e) {
    console.error('[content] loadContentLibrary', e)
    contentList.value = []
    uni.showToast({ title: '内容库加载失败', icon: 'none' })
  }
}

async function loadInteractionHistory() {
  loadLocalHistory()
  if (!babyStore.currentBaby) return

  try {
    const res = await getInteractionHistory({
      baby_id: babyStore.currentBaby.id,
      page: 1,
      page_size: 20,
    })
    if (res.code !== 0 || !res.data) return

    const rawList = Array.isArray(res.data)
      ? res.data
      : ((res.data as any).items || (res.data as any).list || (res.data as any).history || [])
    if (!rawList.length) return

    playHistory.value = rawList.map((item: any) => normalizeHistoryItem(item)).filter(Boolean)
  } catch {
    // 后端历史不可用时继续使用本地记录。
  }
}

function loadLocalHistory() {
  try {
    const saved = uni.getStorageSync('interaction_history')
    if (saved) playHistory.value = JSON.parse(saved)
    const counts = uni.getStorageSync('interaction_counts')
    if (counts) playCounts.value = JSON.parse(counts)
  } catch {}
}

function normalizeHistoryItem(item: any): PlayRecord {
  const content = item.content || item.interaction_content || {}
  const contentId = item.content_id || item.contentId || content.id || item.id
  const title = item.title || item.content_title || content.title || content.name || '互动内容'
  const category = item.category || content.category || 'fun'
  const playedAt = item.played_at || item.created_at || item.time || item.updated_at
  return {
    title,
    category,
    time: formatHistoryTime(playedAt),
    contentId,
  }
}

function formatHistoryTime(value: string | null | undefined) {
  if (!value) return '--:--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function saveLocalHistory() {
  uni.setStorageSync('interaction_history', JSON.stringify(playHistory.value))
  uni.setStorageSync('interaction_counts', JSON.stringify(playCounts.value))
}

function clearHistory() {
  playHistory.value = []
  playCounts.value = {}
  uni.removeStorageSync('interaction_history')
  uni.removeStorageSync('interaction_counts')
}

function getPlayCount(id: string | number): number {
  return playCounts.value[String(id)] || 0
}

function getCategoryLabel(category: string) {
  const map: Record<string, string> = { song: '儿歌', story: '故事', education: '早教', fun: '娱乐' }
  return map[category] || category
}

function getCategoryIcon(category: string) {
  const map: Record<string, string> = { song: 'music', story: 'book', education: 'star', fun: 'gift' }
  return map[category] || 'gift'
}

function getCategoryBg(category: string, index = 0) {
  const palette: Record<string, string[]> = {
    song: ['#667eea', '#764ba2'],
    story: ['#19be6b', '#0e9c5a'],
    education: ['#5677fc', '#667eea'],
    fun: index % 2 ? ['#e91e63', '#c2185b'] : ['#ff9900', '#f5a623'],
  }
  const pair = palette[category] || palette.fun
  return `linear-gradient(135deg,${pair[0]},${pair[1]})`
}

async function playContent(item: ContentItem) {
  if (currentPlaying.value === item.id) {
    stopPlay()
    return
  }
  currentPlaying.value = item.id
  playingItem.value = item

  // 记录互动（本地记录保证不丢，后端可选）
  const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  playHistory.value.unshift({
    title: item.title,
    category: item.category,
    time: now,
    contentId: item.id,
  })
  if (playHistory.value.length > 50) playHistory.value.pop()

  const key = String(item.id)
  playCounts.value[key] = (playCounts.value[key] || 0) + 1
  saveLocalHistory()

  // 尝试调用后端（后端未就绪时静默忽略）
  if (babyStore.currentBaby) {
    try {
      await playInteractionContent({
        baby_id: babyStore.currentBaby.id,
        content_type: item.category,
        content_name: item.title,
        content_data: JSON.stringify({
          content_id: item.id,
          content_url: item.contentUrl,
        }),
      })
    } catch {
      // 后端未就绪，本地已记录，不报错
    }
  }
}

function stopPlay() {
  currentPlaying.value = null
  playingItem.value = null
}

const filteredContent = computed(() => {
  let list = contentList.value
  if (activeTab.value !== 'all') {
    list = list.filter(item => item.category === activeTab.value)
  }
  if (searchText.value.trim()) {
    const kw = searchText.value.trim().toLowerCase()
    list = list.filter(item =>
      item.title.toLowerCase().includes(kw) || item.description.toLowerCase().includes(kw)
    )
  }
  return list
})

function switchTab(value: string) { activeTab.value = value }
function onSearch() {}
</script>

<style lang="scss" scoped>
.content-page { min-height: 100vh; background: #f6f7fb; padding: 0 30rpx 170rpx; }
.hero { background: linear-gradient(135deg, #ff9900, #f5a623); border-radius: 20rpx; padding: 36rpx 30rpx; color: #fff; margin-bottom: 24rpx; }
.hero-title { display: block; font-size: 42rpx; font-weight: 700; }
.hero-desc { display: block; font-size: 26rpx; opacity: .86; margin-top: 10rpx; }

// Tab栏
.tab-bar { display: flex; gap: 10rpx; margin-bottom: 20rpx; overflow-x: auto; }
.tab-item { display: flex; align-items: center; gap: 6rpx; padding: 14rpx 22rpx; background: #fff; border-radius: 30rpx; flex-shrink: 0; }
.tab-item.active { background: rgba(102,126,234,0.1); }
.tab-text { font-size: 26rpx; color: #999; }
.tab-item.active .tab-text { color: #667eea; font-weight: 600; }

.search-bar { margin-bottom: 20rpx; }

// 内容列表
.content-card { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 22rpx; margin-bottom: 16rpx; }
.content-cover { width: 100rpx; height: 100rpx; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; margin-right: 20rpx; flex-shrink: 0; }
.content-info { flex: 1; }
.content-title { display: block; font-size: 28rpx; color: #333; font-weight: 600; }
.content-desc { display: block; font-size: 22rpx; color: #999; margin-top: 6rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 380rpx; }
.content-meta { display: flex; gap: 10rpx; margin-top: 10rpx; align-items: center; }
.meta-tag { font-size: 20rpx; color: #667eea; background: rgba(102,126,234,0.1); padding: 2rpx 10rpx; border-radius: 6rpx; }
.meta-duration, .meta-age { font-size: 20rpx; color: #bbb; }
.meta-count { font-size: 20rpx; color: #19be6b; }
.content-action { flex-shrink: 0; margin-left: 16rpx; }

// 互动记录
.section { margin-top: 30rpx; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-title { font-size: 30rpx; font-weight: 600; color: #333; }
.section-clear { font-size: 24rpx; color: #999; }

.history-list { background: #fff; border-radius: 16rpx; overflow: hidden; }
.history-item { display: flex; align-items: center; padding: 22rpx 24rpx; border-bottom: 1rpx solid #f5f5f5; }
.history-item:last-child { border-bottom: none; }
.hist-dot { width: 14rpx; height: 14rpx; border-radius: 50%; margin-right: 16rpx; flex-shrink: 0; }
.hist-dot.song { background: #667eea; }
.hist-dot.story { background: #19be6b; }
.hist-dot.education { background: #5677fc; }
.hist-dot.fun { background: #ff9900; }
.hist-body { flex: 1; }
.hist-title { display: block; font-size: 27rpx; color: #333; font-weight: 500; }
.hist-cat { font-size: 22rpx; color: #bbb; margin-top: 4rpx; }
.hist-time { font-size: 22rpx; color: #ccc; }

.empty, .empty-sm { display: flex; flex-direction: column; align-items: center; padding: 40rpx 24rpx; }
.empty-text { margin-top: 16rpx; color: #999; font-size: 26rpx; }
.empty-sm text { color: #bbb; font-size: 24rpx; }

// 播放器栏
.player-bar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 16rpx 30rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); background: #fff; box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.08); z-index: 100; }
.player-info { display: flex; align-items: center; flex: 1; }
.player-cover { width: 56rpx; height: 56rpx; border-radius: 10rpx; display: flex; align-items: center; justify-content: center; margin-right: 16rpx; }
.player-title { display: block; font-size: 26rpx; color: #333; font-weight: 600; }
.player-status { display: block; font-size: 20rpx; color: #667eea; }
.player-controls { flex-shrink: 0; }
</style>
