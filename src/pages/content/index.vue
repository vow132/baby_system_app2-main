<template>
  <view class="content-page">
    <view class="hero">
      <view>
        <text class="hero-title">给宝宝播放</text>
        <text class="hero-desc">声音将从已绑定的婴儿床设备播放</text>
      </view>
      <u-icon name="volume-fill" size="30" color="#fff" />
    </view>

    <view v-if="!currentBaby" class="guide-card">
      <u-icon name="account-fill" size="34" color="#667eea" />
      <text class="guide-title">请先添加宝宝</text>
      <text class="guide-desc">添加宝宝后才能选择对应的婴儿床播放内容</text>
      <button class="primary-btn" @click="goToBabyList">去添加宝宝</button>
    </view>

    <template v-else>
      <view class="target-card" @click="showBabySwitcher">
        <image class="baby-avatar" :src="currentBaby.avatar_url || '/static/logo.png'" mode="aspectFill" />
        <view class="target-main">
          <text class="target-label">当前播放给</text>
          <text class="target-name">{{ currentBaby.name }}</text>
          <view class="device-line">
            <view class="status-dot" :class="{ online: deviceOnline }" />
            <text>{{ targetDeviceText }}</text>
          </view>
        </view>
        <view class="switch-hint" v-if="babyStore.babyList.length > 1">
          <text>切换宝宝</text>
          <u-icon name="arrow-right" size="15" color="#667eea" />
        </view>
      </view>

      <scroll-view v-if="babyStore.babyList.length > 1" scroll-x class="baby-switcher" show-scrollbar="false">
        <view
          v-for="baby in babyStore.babyList"
          :key="baby.id"
          class="baby-chip"
          :class="{ active: baby.id === currentBaby.id }"
          @click="switchBaby(baby)"
        >
          <text>{{ baby.name }}</text>
        </view>
      </scroll-view>

      <view class="status-banner" :class="{ danger: configurationError }" v-if="statusError">
        <u-icon :name="configurationError ? 'warning-fill' : 'info-circle'" size="18"
          :color="configurationError ? '#e85d5d' : '#d98200'" />
        <text class="status-message">{{ statusError }}</text>
        <text class="status-link" @click="handleStatusAction">{{ statusActionText }}</text>
      </view>

      <view class="quick-tabs">
        <view v-for="tab in quickTabs" :key="tab.value" class="quick-tab"
          :class="{ active: quickFilter === tab.value }" @click="quickFilter = tab.value">
          <u-icon :name="tab.icon" size="17" :color="quickFilter === tab.value ? '#667eea' : '#888'" />
          <text>{{ tab.label }}</text>
        </view>
      </view>

      <scroll-view scroll-x class="category-tabs" show-scrollbar="false">
        <view v-for="tab in categoryTabs" :key="tab.value" class="category-tab"
          :class="{ active: activeCategory === tab.value }" @click="activeCategory = tab.value">
          {{ tab.label }}
        </view>
      </scroll-view>

      <view class="search-bar">
        <u-search v-model="searchText" placeholder="搜索儿歌、故事或早教内容" shape="round" :showAction="false" />
      </view>

      <view class="loading-card" v-if="libraryLoading">
        <u-loading-icon mode="circle" color="#667eea" />
        <text>正在准备内容库…</text>
      </view>
      <view class="guide-card compact" v-else-if="libraryError">
        <u-icon name="reload" size="30" color="#d98200" />
        <text class="guide-title">内容库暂时加载失败</text>
        <text class="guide-desc">{{ libraryError }}</text>
        <button class="secondary-btn" @click="loadContentLibrary(pageGeneration)">重新加载</button>
      </view>
      <view class="content-list" v-else>
        <view v-for="item in filteredContent" :key="item.id" class="content-card"
          :class="{ current: isCurrentContent(item.id), disabled: controlling || !item.playable }"
          @click="handleContentClick(item)">
          <view class="content-cover" :style="{ background: item.coverBg }">
            <u-icon :name="item.icon" size="29" color="#fff" />
          </view>
          <view class="content-info">
            <text class="content-title">{{ item.title }}</text>
            <text class="content-desc">{{ item.description }}</text>
            <view class="content-meta">
              <text class="meta-tag">{{ getCategoryLabel(item.category) }}</text>
              <text>{{ formatSeconds(item.durationSec) }}</text>
              <text>{{ formatAgeRange(item.ageRange) }}</text>
              <text v-if="item.playCount">已播 {{ item.playCount }} 次</text>
            </view>
          </view>
          <view class="card-actions">
            <view class="favorite-btn" @click.stop="toggleFavorite(item)">
              <u-icon :name="item.isFavorite ? 'star-fill' : 'star'" size="23"
                :color="item.isFavorite ? '#ff9900' : '#aaa'" />
            </view>
            <view class="play-btn">
              <u-icon :name="getContentActionIcon(item)" size="24"
                :color="isCurrentContent(item.id) ? '#667eea' : '#777'" />
              <text>{{ getContentActionText(item) }}</text>
            </view>
          </view>
        </view>

        <view class="guide-card compact" v-if="filteredContent.length === 0">
          <u-icon name="search" size="32" color="#bbb" />
          <text class="guide-title">{{ searchText ? '没有找到相关内容' : emptyFilterText }}</text>
          <text class="guide-desc">可以更换分类或查看全部内容</text>
          <button class="secondary-btn" @click="resetFilters">查看全部</button>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <text class="section-title">最近播放</text>
          <text class="section-link" v-if="historyError" @click="loadInteractionHistory(pageGeneration)">重试</text>
        </view>
        <view class="loading-card small" v-if="historyLoading"><text>正在加载记录…</text></view>
        <view class="history-error" v-else-if="historyError">{{ historyError }}</view>
        <view class="history-list" v-else-if="playHistory.length">
          <view class="history-item" v-for="item in playHistory.slice(0, 10)" :key="item.sessionId">
            <view class="hist-dot" :class="item.category" />
            <view class="hist-body">
              <text class="hist-title">{{ item.title }}</text>
              <text class="hist-sub">{{ getHistoryStateLabel(item.state) }} · {{ item.time }}</text>
            </view>
          </view>
        </view>
        <view class="empty-history" v-else>设备播放后会自动记录在这里</view>
      </view>
    </template>

    <view class="player-bar" v-if="showPlayer && playingItem && currentSession">
      <view class="player-title-row">
        <view>
          <text class="player-kicker">正在给 {{ currentBaby?.name }} 播放</text>
          <text class="player-title">{{ playingItem.title }}</text>
        </view>
        <view class="close-btn" v-if="isTerminalSession" @click="dismissPlayer">
          <u-icon name="close" size="20" color="#888" />
        </view>
      </view>
      <text class="player-status" :class="{ error: currentSession.actual_state === 'failed' }">
        {{ playerStatusText }}
      </text>
      <view class="progress-track"><view class="progress-fill" :style="{ transform: `scaleX(${playerProgress / 100})` }" /></view>
      <view class="progress-time">
        <text>{{ formatSeconds(currentSession.position_sec) }}</text>
        <text>{{ formatSeconds(currentSession.duration_sec) }}</text>
      </view>

      <view class="timer-row" v-if="!isTerminalSession">
        <text class="timer-label">{{ timerLabel }}</text>
        <view v-for="minutes in timerOptions" :key="minutes" class="timer-chip" @click="setTimer(minutes)">
          {{ minutes }}分钟
        </view>
        <view class="timer-chip cancel" v-if="currentSession.stop_at" @click="setTimer(null)">取消</view>
      </view>

      <view class="player-actions" v-if="!isTerminalSession">
        <button class="control-btn stop" :disabled="controlling" @click="stopCurrent">
          <view class="stop-icon" aria-hidden="true"><view class="stop-icon-square" /></view>
          <text>停止</text>
        </button>
        <button class="control-btn primary" :disabled="controlling" @click="togglePause">
          <u-icon :name="currentSession.desired_state === 'paused' ? 'play-circle-fill' : 'pause-circle-fill'"
            size="22" color="#fff" />
          <text>{{ currentSession.desired_state === 'paused' ? '继续播放' : '暂停播放' }}</text>
        </button>
      </view>
      <view class="player-actions" v-else-if="currentSession.actual_state === 'failed'">
        <button class="control-btn primary wide" @click="retryCurrent">重新播放</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { useBabyStore } from '@/stores'
import { getDeviceList, type DeviceInfo } from '@/api/device'
import type { BabyInfo } from '@/api/baby'
import {
  getPlaybackPollDelay,
  isPlaybackFinishedForParent,
  isTerminalPlaybackState,
  normalizePlaybackProgress,
} from './playback-utils'
import {
  controlInteractionPlayback,
  getInteractionHistory,
  getInteractionLibrary,
  getInteractionPlaybackStatus,
  setInteractionFavorite,
  setInteractionPlaybackTimer,
  type InteractionContent,
  type PlaybackAction,
  type PlaybackActualState,
  type PlaybackSession,
} from '@/api/interaction'

interface ContentItem {
  id: string | number
  title: string
  description: string
  category: string
  icon: string
  coverBg: string
  durationSec: number
  ageRange: string
  playable: boolean
  isFavorite: boolean
  playCount: number
  lastPlayedAt: string | null
}

interface PlayRecord {
  sessionId: string | number
  title: string
  category: string
  time: string
  contentId: string | number
  state: PlaybackActualState
}

type QuickFilter = 'all' | 'favorite' | 'recent' | 'frequent'

const babyStore = useBabyStore()
const devices = ref<DeviceInfo[]>([])
const quickFilter = ref<QuickFilter>('all')
const activeCategory = ref('all')
const searchText = ref('')
const contentList = ref<ContentItem[]>([])
const playHistory = ref<PlayRecord[]>([])
const currentSession = ref<PlaybackSession | null>(null)
const playingItem = ref<ContentItem | null>(null)
const dismissedSessionId = ref<number | null>(null)
const controlling = ref(false)
const favoriteBusyId = ref<string | number | null>(null)
const libraryLoading = ref(false)
const historyLoading = ref(false)
const libraryError = ref('')
const historyError = ref('')
const statusError = ref('')
const configurationError = ref(false)
const consecutivePollErrors = ref(0)
let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollInFlightGeneration: number | null = null
let statusPollingBlocked = false
let pageActive = false
let pageGeneration = 0
let playbackEpoch = 0

const quickTabs = [
  { label: '全部', value: 'all' as QuickFilter, icon: 'grid' },
  { label: '收藏', value: 'favorite' as QuickFilter, icon: 'star' },
  { label: '最近', value: 'recent' as QuickFilter, icon: 'clock' },
  { label: '常播', value: 'frequent' as QuickFilter, icon: 'heart' },
]
const categoryTabs = [
  { label: '全部分类', value: 'all' },
  { label: '儿歌', value: 'song' },
  { label: '故事', value: 'story' },
  { label: '早教', value: 'education' },
  { label: '娱乐', value: 'fun' },
]
const timerOptions = [15, 30, 60] as const
const currentBaby = computed(() => babyStore.currentBaby)
const currentDevice = computed(() => {
  const babyId = currentBaby.value?.id
  return devices.value.find(item => item.baby_id === babyId) || null
})
const isTerminalSession = computed(() =>
  currentSession.value
    ? isPlaybackFinishedForParent(
      currentSession.value.actual_state,
      currentSession.value.desired_state,
    )
    : true,
)
const showPlayer = computed(() =>
  !!currentSession.value && currentSession.value.session_id !== dismissedSessionId.value,
)
const deviceOnline = computed(() => {
  if (currentSession.value) return currentSession.value.device_online
  return Number(currentDevice.value?.online_status || 0) === 1
})
const targetDeviceText = computed(() => {
  const name = currentSession.value?.device_name || currentDevice.value?.device_name
  if (!currentDevice.value && !currentSession.value) return '尚未绑定婴儿床设备'
  return `${name || '宝宝的智能婴儿床'} · ${deviceOnline.value ? '在线' : '离线'}`
})
const playerProgress = computed(() =>
  normalizePlaybackProgress(Number(currentSession.value?.progress_percent || 0)),
)
const playerStatusText = computed(() => {
  const session = currentSession.value
  if (!session) return ''
  if (session.desired_state === 'stopped') {
    if (session.actual_state === 'stopped') return '已停止播放'
    return session.device_online
      ? '停止指令已发送，等待设备确认'
      : '已停止播放，设备连接后将保持停止'
  }
  if (!session.device_online && session.actual_state !== 'completed') return '设备离线，已排队等待连接'
  if (session.acknowledged_revision < session.revision) return '已发送，等待设备接收'
  const labels: Record<PlaybackActualState, string> = {
    pending: '设备正在准备',
    downloading: '设备正在下载音频',
    playing: '设备正在播放',
    paused: '已暂停',
    stopped: '已停止',
    completed: '播放完成',
    failed: session.error_message || '播放失败，请重试',
  }
  return labels[session.actual_state]
})
const timerLabel = computed(() => {
  const seconds = Number(currentSession.value?.timer_remaining_sec ?? 0)
  if (!currentSession.value?.stop_at || seconds <= 0) return '定时停止'
  return `将在 ${Math.ceil(seconds / 60)} 分钟后停止`
})
const statusActionText = computed(() => configurationError.value ? '去处理' : '重试')
const emptyFilterText = computed(() => ({
  favorite: '还没有收藏内容',
  recent: '还没有最近播放',
  frequent: '还没有常播内容',
  all: '暂无可播放内容',
}[quickFilter.value]))

const filteredContent = computed(() => {
  let list = [...contentList.value]
  if (quickFilter.value === 'favorite') list = list.filter(item => item.isFavorite)
  if (quickFilter.value === 'recent') {
    list = list.filter(item => item.lastPlayedAt)
      .sort((a, b) => String(b.lastPlayedAt).localeCompare(String(a.lastPlayedAt)))
  }
  if (quickFilter.value === 'frequent') {
    list = list.filter(item => item.playCount > 0)
      .sort((a, b) => b.playCount - a.playCount)
  }
  if (activeCategory.value !== 'all') list = list.filter(item => item.category === activeCategory.value)
  const keyword = searchText.value.trim().toLowerCase()
  if (keyword) {
    list = list.filter(item =>
      item.title.toLowerCase().includes(keyword) || item.description.toLowerCase().includes(keyword))
  }
  return list
})

onShow(async () => {
  pageActive = true
  await babyStore.fetchBabyList()
  await refreshPage()
})
onHide(deactivatePage)
onUnload(deactivatePage)

function deactivatePage() {
  pageActive = false
  pageGeneration += 1
  playbackEpoch += 1
  stopPolling()
}

async function refreshPage() {
  stopPolling()
  const generation = ++pageGeneration
  playbackEpoch += 1
  statusError.value = ''
  configurationError.value = false
  statusPollingBlocked = false
  consecutivePollErrors.value = 0
  if (!currentBaby.value) {
    contentList.value = []
    playHistory.value = []
    currentSession.value = null
    return
  }
  await Promise.allSettled([
    loadDevices(generation),
    loadContentLibrary(generation),
    loadInteractionHistory(generation),
    loadPlaybackStatus(generation),
  ])
}

async function loadDevices(generation: number) {
  try {
    const res = await getDeviceList()
    if (generation === pageGeneration) devices.value = Array.isArray(res.data) ? res.data : []
  } catch {
    if (generation === pageGeneration) devices.value = []
  }
}

function normalizeContent(item: InteractionContent, index = 0): ContentItem {
  const category = item.category || item.type || 'fun'
  return {
    id: item.id,
    title: item.title || item.name || '未命名内容',
    description: item.description || '适合宝宝的互动内容',
    category,
    icon: getCategoryIcon(category),
    coverBg: getCategoryBg(category, index),
    durationSec: Number(item.duration_sec || item.duration || 0),
    ageRange: item.age_range || '0-48月',
    playable: item.playable !== false,
    isFavorite: item.is_favorite === true,
    playCount: Number(item.play_count || 0),
    lastPlayedAt: item.last_played_at || null,
  }
}

async function loadContentLibrary(generation: number) {
  const baby = currentBaby.value
  if (!baby) return
  libraryLoading.value = true
  libraryError.value = ''
  try {
    const res = await getInteractionLibrary({ baby_id: baby.id })
    if (generation !== pageGeneration || baby.id !== currentBaby.value?.id) return
    const list = res.data?.items || res.data?.library || []
    contentList.value = list.map((item, index) => normalizeContent(item, index))
    if (currentSession.value) applySession(currentSession.value)
  } catch (error: any) {
    if (generation === pageGeneration) libraryError.value = error?.message || '请检查网络后重试'
  } finally {
    if (generation === pageGeneration) libraryLoading.value = false
  }
}

async function loadInteractionHistory(generation: number) {
  const baby = currentBaby.value
  if (!baby) return
  historyLoading.value = true
  historyError.value = ''
  try {
    const res = await getInteractionHistory({ baby_id: baby.id, page: 1, page_size: 20 })
    if (generation !== pageGeneration || baby.id !== currentBaby.value?.id) return
    const list = res.data?.items || res.data?.history || []
    playHistory.value = list.map((item: any) => ({
      sessionId: item.session_id || item.id,
      title: item.title || item.content_title || '互动内容',
      category: item.category || 'fun',
      time: formatHistoryTime(item.created_at || item.finished_at),
      contentId: item.content_id,
      state: item.actual_state || 'pending',
    }))
  } catch (error: any) {
    if (generation === pageGeneration) historyError.value = error?.message || '播放记录加载失败'
  } finally {
    if (generation === pageGeneration) historyLoading.value = false
  }
}

async function loadPlaybackStatus(generation: number) {
  const baby = currentBaby.value
  if (!baby || pollInFlightGeneration === generation || generation !== pageGeneration) return
  const requestEpoch = playbackEpoch
  pollInFlightGeneration = generation
  try {
    const res = await getInteractionPlaybackStatus(baby.id)
    if (
      generation !== pageGeneration
      || requestEpoch !== playbackEpoch
      || baby.id !== currentBaby.value?.id
    ) return
    statusError.value = ''
    configurationError.value = false
    statusPollingBlocked = false
    consecutivePollErrors.value = 0
    applySession(res.data?.session || null)
  } catch (error: unknown) {
    if (generation !== pageGeneration || requestEpoch !== playbackEpoch) return
    const statusCode = getErrorStatusCode(error)
    const retryable = isRetryablePlaybackError(error)
    statusError.value = statusCode === 404
      ? '8123 后端尚未部署播放状态接口，请更新后端后重试'
      : error instanceof Error ? error.message : '暂时无法获取设备状态'
    configurationError.value = statusCode === 409
    statusPollingBlocked = !retryable
    consecutivePollErrors.value = retryable ? consecutivePollErrors.value + 1 : 0
  } finally {
    if (pollInFlightGeneration === generation) pollInFlightGeneration = null
    if (
      generation === pageGeneration
      && requestEpoch === playbackEpoch
      && pageActive
      && !configurationError.value
      && !statusPollingBlocked
    ) scheduleNextPoll(generation)
  }
}

function getErrorStatusCode(error: unknown): number {
  if (!error || typeof error !== 'object') return 0
  const value = Number((error as { statusCode?: unknown }).statusCode)
  return Number.isFinite(value) ? value : 0
}

function isRetryablePlaybackError(error: unknown): boolean {
  const statusCode = getErrorStatusCode(error)
  return statusCode === 0 || statusCode === 408 || statusCode === 429 || (statusCode >= 500 && statusCode !== 501)
}

function scheduleNextPoll(generation: number) {
  stopPolling()
  const delay = getPlaybackPollDelay(consecutivePollErrors.value)
  pollTimer = setTimeout(() => loadPlaybackStatus(generation), delay)
}

function stopPolling() {
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = null
}

function applySession(session: PlaybackSession | null) {
  currentSession.value = session
  if (!session) {
    playingItem.value = null
    return
  }
  playingItem.value = contentList.value.find(item => String(item.id) === String(session.content.id))
    || normalizeContent(session.content)
  if (dismissedSessionId.value !== session.session_id) dismissedSessionId.value = null
}

function createRequestId(action: PlaybackAction) {
  return `${action}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function sendControl(action: PlaybackAction, item?: ContentItem) {
  const baby = currentBaby.value
  if (!baby || controlling.value) return
  controlling.value = true
  const generation = pageGeneration
  const controlEpoch = ++playbackEpoch
  try {
    const res = await controlInteractionPlayback({
      baby_id: baby.id,
      action,
      content_id: action === 'play' && item ? Number(item.id) : undefined,
      session_id: action === 'play' ? undefined : currentSession.value?.session_id,
      client_request_id: createRequestId(action),
    })
    if (
      generation !== pageGeneration
      || controlEpoch !== playbackEpoch
      || baby.id !== currentBaby.value?.id
    ) return
    applySession(res.data)
    statusError.value = ''
    configurationError.value = false
    consecutivePollErrors.value = 0
    if (action === 'play' && item) {
      item.playCount += 1
      item.lastPlayedAt = new Date().toISOString()
    }
    uni.showToast({
      title: action === 'play' ? `已发送到${baby.name}的设备` : '控制指令已发送',
      icon: 'none',
    })
    await loadInteractionHistory(generation)
    scheduleNextPoll(generation)
  } catch (error: any) {
    uni.showToast({ title: error?.message || '设备控制失败', icon: 'none', duration: 2500 })
  } finally {
    controlling.value = false
    if (
      generation === pageGeneration
      && controlEpoch === playbackEpoch
      && pageActive
      && !statusPollingBlocked
    ) scheduleNextPoll(generation)
  }
}

async function toggleFavorite(item: ContentItem) {
  const baby = currentBaby.value
  if (!baby || favoriteBusyId.value !== null) return
  favoriteBusyId.value = item.id
  const previous = item.isFavorite
  item.isFavorite = !previous
  try {
    await setInteractionFavorite(baby.id, item.id, item.isFavorite)
    uni.showToast({ title: item.isFavorite ? '已加入收藏' : '已取消收藏', icon: 'none' })
  } catch (error: any) {
    item.isFavorite = previous
    uni.showToast({ title: error?.message || '收藏操作失败', icon: 'none' })
  } finally {
    favoriteBusyId.value = null
  }
}

async function setTimer(minutes: 15 | 30 | 60 | null) {
  const baby = currentBaby.value
  const session = currentSession.value
  if (!baby || !session || controlling.value) return
  controlling.value = true
  const generation = pageGeneration
  const controlEpoch = ++playbackEpoch
  try {
    const res = await setInteractionPlaybackTimer({
      baby_id: baby.id,
      session_id: session.session_id,
      timer_minutes: minutes,
    })
    if (
      generation !== pageGeneration
      || controlEpoch !== playbackEpoch
      || baby.id !== currentBaby.value?.id
    ) return
    applySession(res.data)
    uni.showToast({
      title: minutes ? `将在 ${minutes} 分钟后停止` : '已取消定时停止',
      icon: 'none',
    })
  } catch (error: any) {
    uni.showToast({ title: error?.message || '定时设置失败', icon: 'none' })
  } finally {
    controlling.value = false
    if (
      generation === pageGeneration
      && controlEpoch === playbackEpoch
      && pageActive
      && !statusPollingBlocked
    ) scheduleNextPoll(generation)
  }
}

function handleContentClick(item: ContentItem) {
  if (controlling.value) return
  if (!item.playable) {
    uni.showToast({ title: '音频资源尚未准备好', icon: 'none' })
    return
  }
  if (!currentDevice.value && !currentSession.value) {
    uni.showToast({ title: '请先为宝宝绑定婴儿床设备', icon: 'none' })
    return
  }
  if (!isCurrentContent(item.id) || isTerminalSession.value) {
    sendControl('play', item)
  } else if (currentSession.value?.desired_state === 'paused') {
    sendControl('resume')
  } else if (currentSession.value?.actual_state === 'playing') {
    sendControl('pause')
  } else {
    uni.showToast({ title: playerStatusText.value, icon: 'none' })
  }
}

function togglePause() {
  if (!currentSession.value || controlling.value) return
  sendControl(currentSession.value.desired_state === 'paused' ? 'resume' : 'pause')
}
function stopCurrent() {
  if (!currentSession.value || controlling.value) return
  sendControl('stop')
}
function retryCurrent() {
  if (playingItem.value) sendControl('play', playingItem.value)
}
function dismissPlayer() {
  if (currentSession.value) dismissedSessionId.value = currentSession.value.session_id
}

function switchBaby(baby: BabyInfo) {
  if (baby.id === currentBaby.value?.id) return
  babyStore.setCurrentBaby(baby)
  contentList.value = []
  playHistory.value = []
  currentSession.value = null
  playingItem.value = null
  refreshPage()
}

function showBabySwitcher() {
  if (babyStore.babyList.length <= 1) return
  uni.showActionSheet({
    itemList: babyStore.babyList.map(item => item.name),
    success: ({ tapIndex }) => {
      const baby = babyStore.babyList[tapIndex]
      if (baby) switchBaby(baby)
    },
  })
}

function handleStatusAction() {
  if (configurationError.value) {
    uni.navigateTo({ url: '/pages/device/list' })
    return
  }
  statusError.value = ''
  configurationError.value = false
  statusPollingBlocked = false
  consecutivePollErrors.value = 0
  loadPlaybackStatus(pageGeneration)
}
function goToBabyList() { uni.navigateTo({ url: '/pages/baby/list' }) }
function resetFilters() {
  quickFilter.value = 'all'
  activeCategory.value = 'all'
  searchText.value = ''
}

function isCurrentContent(id: string | number) {
  return String(currentSession.value?.content.id || '') === String(id)
}
function getContentActionIcon(item: ContentItem) {
  if (!isCurrentContent(item.id) || isTerminalSession.value) return 'play-circle-fill'
  return currentSession.value?.desired_state === 'paused' ? 'play-circle-fill' : 'pause-circle-fill'
}
function getContentActionText(item: ContentItem) {
  if (!isCurrentContent(item.id) || isTerminalSession.value) return '播放'
  if (currentSession.value?.desired_state === 'paused') return '继续'
  if (currentSession.value?.actual_state === 'playing') return '暂停'
  return '等待'
}
function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    music: '音乐', song: '儿歌', story: '故事', education: '早教', fun: '娱乐',
  }
  return labels[category] || category
}
function getCategoryIcon(category: string) {
  const icons: Record<string, string> = {
    music: 'play-circle', song: 'play-circle', story: 'file-text', education: 'star', fun: 'gift',
  }
  return icons[category] || 'gift'
}
function getCategoryBg(category: string, index = 0) {
  const palette: Record<string, string[]> = {
    music: ['#667eea', '#764ba2'],
    song: ['#667eea', '#764ba2'],
    story: ['#19be6b', '#0e9c5a'],
    education: ['#5677fc', '#667eea'],
    fun: index % 2 ? ['#e91e63', '#c2185b'] : ['#ff9900', '#f5a623'],
  }
  const pair = palette[category] || palette.fun
  return `linear-gradient(135deg,${pair[0]},${pair[1]})`
}
function getHistoryStateLabel(state: PlaybackActualState) {
  return ({
    pending: '等待设备',
    downloading: '下载中',
    playing: '播放中',
    paused: '已暂停',
    stopped: '已停止',
    completed: '已完成',
    failed: '播放失败',
  } as Record<PlaybackActualState, string>)[state]
}
function formatSeconds(value: number) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0))
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
function formatAgeRange(value: string) {
  const match = String(value || '').match(/(\d+)\D+(\d+)\s*月/)
  if (!match) return value || '适合宝宝'
  const min = Number(match[1])
  const max = Number(match[2])
  if (max < 12) return `适合 ${min}～${max} 个月`
  const minText = min === 0 ? '新生儿' : `${Math.max(1, Math.floor(min / 12))}岁`
  const maxText = Number.isInteger(max / 12) ? `${max / 12}岁` : `${Math.floor(max / 12)}岁+`
  return `适合 ${minText}～${maxText}`
}
function formatHistoryTime(value?: string | null) {
  if (!value) return '--:--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style lang="scss" scoped>
.content-page {
  min-height: 100vh;
  background: #f6f7fb;
  padding: 0 28rpx 420rpx;
}
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
  padding: 34rpx 30rpx;
  color: #fff;
  border-radius: 0 0 24rpx 24rpx;
  background: linear-gradient(135deg, #ff9f43, #f57c33);
}
.hero-title { display: block; font-size: 40rpx; font-weight: 700; }
.hero-desc { display: block; margin-top: 8rpx; font-size: 24rpx; opacity: .92; }
.target-card {
  display: flex;
  align-items: center;
  min-height: 112rpx;
  padding: 22rpx;
  margin-bottom: 16rpx;
  border: 2rpx solid rgba(102,126,234,.12);
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 8rpx 24rpx rgba(55,65,100,.06);
}
.baby-avatar {
  width: 82rpx;
  height: 82rpx;
  margin-right: 18rpx;
  border: 4rpx solid #eef0ff;
  border-radius: 50%;
}
.target-main { flex: 1; min-width: 0; }
.target-label { display: block; color: #999; font-size: 21rpx; }
.target-name { display: block; margin-top: 2rpx; color: #2e3347; font-size: 31rpx; font-weight: 700; }
.device-line { display: flex; align-items: center; gap: 8rpx; margin-top: 7rpx; color: #7c8192; font-size: 22rpx; }
.status-dot { width: 13rpx; height: 13rpx; border-radius: 50%; background: #bbb; }
.status-dot.online { background: #19be6b; box-shadow: 0 0 0 5rpx rgba(25,190,107,.12); }
.switch-hint { display: flex; align-items: center; gap: 4rpx; color: #667eea; font-size: 22rpx; }
.baby-switcher { width: 100%; margin-bottom: 16rpx; white-space: nowrap; }
.baby-chip {
  display: inline-flex;
  align-items: center;
  min-height: 88rpx;
  padding: 0 26rpx;
  margin-right: 12rpx;
  color: #777;
  border: 2rpx solid #eee;
  border-radius: 34rpx;
  background: #fff;
  font-size: 24rpx;
}
.baby-chip.active { color: #667eea; border-color: #aeb9ff; background: #f1f3ff; font-weight: 600; }
.status-banner {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 18rpx 20rpx;
  margin-bottom: 16rpx;
  color: #a86700;
  border-radius: 14rpx;
  background: #fff5df;
  font-size: 23rpx;
}
.status-banner.danger { color: #b84646; background: #fff0f0; }
.status-message { flex: 1; }
.status-link { padding: 12rpx 4rpx; color: #667eea; font-weight: 600; }
.quick-tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; margin-bottom: 16rpx; }
.quick-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7rpx;
  min-height: 88rpx;
  color: #777;
  border-radius: 16rpx;
  background: #fff;
  font-size: 23rpx;
}
.quick-tab.active { color: #667eea; background: #eef0ff; font-weight: 600; }
.category-tabs { width: 100%; margin-bottom: 16rpx; white-space: nowrap; }
.category-tab {
  display: inline-flex;
  align-items: center;
  min-height: 88rpx;
  padding: 0 22rpx;
  margin-right: 10rpx;
  color: #888;
  border-radius: 30rpx;
  background: #fff;
  font-size: 22rpx;
}
.category-tab.active { color: #fff; background: #667eea; }
.search-bar { margin-bottom: 18rpx; }
.content-card {
  display: flex;
  align-items: center;
  min-height: 128rpx;
  padding: 20rpx;
  margin-bottom: 14rpx;
  border: 2rpx solid transparent;
  border-radius: 18rpx;
  background: #fff;
  box-shadow: 0 5rpx 18rpx rgba(56,63,88,.05);
}
.content-card.current { border-color: #aeb9ff; background: #fafaff; }
.content-card.disabled { opacity: .58; }
.content-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 96rpx;
  height: 96rpx;
  margin-right: 18rpx;
  border-radius: 16rpx;
}
.content-info { flex: 1; min-width: 0; }
.content-title { display: block; color: #2f3446; font-size: 28rpx; font-weight: 650; }
.content-desc {
  display: block;
  overflow: hidden;
  margin-top: 5rpx;
  color: #9599a8;
  font-size: 21rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.content-meta { display: flex; flex-wrap: wrap; gap: 9rpx; margin-top: 10rpx; color: #a3a6b2; font-size: 19rpx; }
.meta-tag { padding: 2rpx 9rpx; color: #667eea; border-radius: 6rpx; background: #eef0ff; }
.card-actions { display: flex; flex-direction: column; align-items: center; gap: 6rpx; margin-left: 12rpx; }
.favorite-btn { display: flex; align-items: center; justify-content: center; width: 88rpx; height: 88rpx; }
.play-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  min-width: 88rpx;
  min-height: 88rpx;
  color: #666;
  font-size: 20rpx;
}
.guide-card, .loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56rpx 30rpx;
  color: #999;
  border-radius: 20rpx;
  background: #fff;
}
.guide-card.compact { padding: 40rpx 24rpx; }
.guide-title { margin-top: 14rpx; color: #3f4353; font-size: 28rpx; font-weight: 650; }
.guide-desc { max-width: 560rpx; margin-top: 9rpx; color: #9599a8; font-size: 23rpx; text-align: center; }
.primary-btn, .secondary-btn {
  min-width: 240rpx;
  min-height: 88rpx;
  margin-top: 24rpx;
  padding: 0 30rpx;
  border: none;
  border-radius: 44rpx;
  font-size: 25rpx;
  line-height: 88rpx;
}
.primary-btn { color: #fff; background: #667eea; }
.secondary-btn { color: #667eea; background: #eef0ff; }
.loading-card { gap: 14rpx; font-size: 23rpx; }
.loading-card.small { padding: 24rpx; }
.section { margin-top: 30rpx; }
.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14rpx; }
.section-title { color: #303545; font-size: 29rpx; font-weight: 650; }
.section-link { padding: 12rpx; color: #667eea; font-size: 23rpx; }
.history-list { overflow: hidden; border-radius: 17rpx; background: #fff; }
.history-item { display: flex; align-items: center; min-height: 88rpx; padding: 14rpx 22rpx; border-bottom: 1rpx solid #f1f2f6; }
.history-item:last-child { border-bottom: none; }
.hist-dot { width: 13rpx; height: 13rpx; margin-right: 16rpx; border-radius: 50%; background: #ff9900; }
.hist-dot.song, .hist-dot.music { background: #667eea; }
.hist-dot.story { background: #19be6b; }
.hist-body { flex: 1; }
.hist-title { display: block; color: #3d4150; font-size: 25rpx; }
.hist-sub { display: block; margin-top: 3rpx; color: #a4a7b2; font-size: 20rpx; }
.history-error, .empty-history { padding: 30rpx; color: #a0a3ae; border-radius: 16rpx; background: #fff; font-size: 23rpx; text-align: center; }
.history-error { color: #b36c35; background: #fff7ed; }
.player-bar {
  position: fixed;
  right: 20rpx;
  bottom: calc(20rpx + env(safe-area-inset-bottom));
  left: 20rpx;
  z-index: 100;
  padding: 24rpx;
  border: 2rpx solid rgba(102,126,234,.15);
  border-radius: 24rpx;
  background: rgba(255,255,255,.98);
  box-shadow: 0 10rpx 36rpx rgba(37,43,74,.18);
}
.player-title-row { display: flex; align-items: flex-start; justify-content: space-between; }
.close-btn { display: flex; align-items: center; justify-content: center; width: 88rpx; height: 88rpx; margin: -20rpx -20rpx 0 0; }
.player-kicker { display: block; color: #9a9dab; font-size: 20rpx; }
.player-title { display: block; margin-top: 3rpx; color: #2f3446; font-size: 29rpx; font-weight: 700; }
.player-status { display: block; margin-top: 7rpx; color: #667eea; font-size: 21rpx; }
.player-status.error { color: #e85d5d; }
.progress-track { overflow: hidden; height: 8rpx; margin-top: 16rpx; border-radius: 4rpx; background: #e9ebf3; }
.progress-fill { width: 100%; height: 100%; border-radius: 4rpx; background: #667eea; transform-origin: left center; transition: transform .25s ease-out; }
.progress-time { display: flex; justify-content: space-between; margin-top: 5rpx; color: #a4a7b2; font-size: 18rpx; }
.timer-row { display: flex; align-items: center; gap: 8rpx; margin-top: 15rpx; overflow-x: auto; }
.timer-label { flex: 1; min-width: 150rpx; color: #6f7383; font-size: 20rpx; }
.timer-chip {
  flex-shrink: 0;
  min-height: 88rpx;
  padding: 0 14rpx;
  color: #667eea;
  border-radius: 44rpx;
  background: #eef0ff;
  font-size: 19rpx;
  line-height: 88rpx;
}
.timer-chip.cancel { color: #888; background: #f1f2f5; }
.player-actions { display: flex; gap: 14rpx; margin-top: 18rpx; }
.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  flex: 1;
  min-height: 88rpx;
  margin: 0;
  border: none;
  border-radius: 44rpx;
  font-size: 24rpx;
  line-height: 1;
}
.control-btn.stop { color: #666; background: #f0f1f4; }
.stop-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36rpx;
  height: 36rpx;
  border: 3rpx solid #666;
  border-radius: 50%;
  box-sizing: border-box;
}
.stop-icon-square {
  width: 13rpx;
  height: 13rpx;
  border-radius: 2rpx;
  background: #666;
}
.control-btn.primary { color: #fff; background: #667eea; }
.control-btn.wide { width: 100%; }
.control-btn[disabled] { opacity: .55; }
button::after { border: none; }
</style>
