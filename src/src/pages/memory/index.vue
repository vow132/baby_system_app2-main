<template>
  <view class="archive-page">
    <view class="hero">
      <view>
        <text class="hero-title">成长档案</text>
        <text class="hero-desc">自动整理事件、对话、作息和监测记录</text>
      </view>
      <view class="hero-actions">
        <view class="hero-badge">持续学习中</view>
        <view class="export-btn" :class="{ disabled: exporting }" @click.stop="exportArchive">
          {{ exporting ? '导出中' : '导出' }}
        </view>
      </view>
    </view>

    <view class="overview-card">
      <view class="baby-row">
        <image class="baby-avatar" :src="babyAvatar" mode="aspectFill" />
        <view class="baby-copy">
          <text class="baby-name">{{ babyName }}的成长记忆</text>
          <text class="baby-desc">近7天已沉淀 {{ totalCount }} 条记录</text>
        </view>
      </view>
      <view class="stat-grid">
        <view class="stat-item" v-for="item in stats" :key="item.label">
          <text class="stat-value">{{ item.value }}</text>
          <text class="stat-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <view class="search-card">
      <u-input v-model="queryText" placeholder="搜索睡眠、哭声、翻身、喂奶等关键词" border="none" />
      <view class="search-btn" @click="loadArchive">
        <u-icon name="search" size="19" color="#fff" />
      </view>
    </view>

    <view class="filter-row">
      <view
        class="filter-chip"
        v-for="item in filters"
        :key="item.value"
        :class="{ active: activeFilter === item.value }"
        @click="activeFilter = item.value"
      >
        {{ item.label }}
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <view>
          <text class="section-title">近7天日程预览</text>
          <text class="section-desc">把每天的睡眠、喂养、活动和异常事件串起来看</text>
        </view>
        <text class="section-action" @click="goRoutine">作息</text>
      </view>
      <scroll-view scroll-x class="day-scroll" show-scrollbar="false">
        <view class="day-list">
          <view
            class="day-card"
            v-for="day in weekDays"
            :key="day.date"
            :class="{ active: selectedDate === day.date }"
            @click="selectedDate = day.date"
          >
            <text class="day-week">{{ day.week }}</text>
            <text class="day-date">{{ day.day }}</text>
            <view class="day-dots">
              <view v-for="type in day.types" :key="type" class="day-dot" :class="type" />
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="section">
      <view class="section-head">
        <view>
          <text class="section-title">记忆时间轴</text>
          <text class="section-desc">{{ activeFilterText }} · {{ selectedDayText }}</text>
        </view>
        <text class="section-action" @click="showManual = !showManual">补充</text>
      </view>

      <view class="manual-card" v-if="showManual">
        <u-input v-model="memoryText" placeholder="补充一条重要成长记录" border="none" />
        <view class="manual-bottom">
          <view class="manual-tags">
            <text
              v-for="tag in manualTags"
              :key="tag.value"
              class="manual-tag"
              :class="{ active: selectedTags.includes(tag.value) }"
              @click="toggleTag(tag.value)"
            >
              {{ tag.label }}
            </text>
          </view>
          <text class="save-btn" @click="storeMemory">保存</text>
        </view>
      </view>

      <view class="timeline">
        <view class="timeline-item" v-for="item in visibleTimeline" :key="item.id">
          <view class="timeline-icon" :class="item.type">
            <u-icon :name="item.icon" size="17" color="#fff" />
          </view>
          <view class="timeline-content">
            <view class="timeline-top">
              <text class="timeline-title">{{ item.title }}</text>
              <text class="timeline-time">{{ formatTime(item.time) }}</text>
            </view>
            <text class="timeline-summary">{{ item.summary }}</text>
            <view class="timeline-meta">
              <text class="meta-tag" v-for="tag in item.tags" :key="tag">{{ tag }}</text>
            </view>
          </view>
        </view>

        <view class="empty" v-if="visibleTimeline.length === 0">
          <u-icon name="file-text" size="46" color="#cfd6e3" />
          <text>这一天还没有符合条件的档案记录</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <view>
          <text class="section-title">宝宝画像标签</text>
          <text class="section-desc">系统会根据长期记录逐步形成个性化观察</text>
        </view>
      </view>
      <view class="profile-tags">
        <view class="profile-tag" v-for="tag in profileTags" :key="tag.name">
          <view class="profile-dot" :style="{ background: tag.color }" />
          <view class="profile-copy">
            <text class="profile-name">{{ tag.name }}</text>
            <text class="profile-desc">{{ tag.desc }}</text>
          </view>
          <text class="profile-state">{{ tag.state }}</text>
        </view>
        <view class="empty" v-if="profileTags.length === 0">
          <text>暂无宝宝画像标签，系统会根据长期记录逐步形成</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { get, post } from '@/api/request'
import { API } from '@/api/config'
import { exportBabyData } from '@/api/baby'
import { useBabyStore } from '@/stores'

type ArchiveType = 'all' | 'sensor' | 'voice' | 'routine' | 'milestone' | 'moment' | 'manual'

interface ArchiveItem {
  id: string
  type: ArchiveType
  title: string
  summary: string
  time: string | null
  tags: string[]
  icon: string
}

const babyStore = useBabyStore()
const queryText = ref('')
const memoryText = ref('')
const selectedTags = ref<string[]>(['manual'])
const timeline = ref<ArchiveItem[]>([])
const activeFilter = ref<ArchiveType>('all')
const selectedDate = ref('')
const showManual = ref(false)
const exporting = ref(false)

const filters: { label: string; value: ArchiveType }[] = [
  { label: '全部', value: 'all' },
  { label: '监测事件', value: 'sensor' },
  { label: '语音对话', value: 'voice' },
  { label: '作息记录', value: 'routine' },
  { label: '成长事件', value: 'milestone' },
  { label: '温馨瞬间', value: 'moment' },
]

const manualTags = [
  { label: '睡眠', value: 'sleep' },
  { label: '喂养', value: 'feeding' },
  { label: '活动', value: 'activity' },
  { label: '里程碑', value: 'milestone' },
]

const profileTags = ref<{ name: string; desc: string; state: string; color: string }[]>([])

const babyName = computed(() => babyStore.currentBaby?.name || '小宝贝')
const babyAvatar = computed(() => babyStore.currentBaby?.avatar_url || '/static/logo.png')

const visibleTimeline = computed(() => {
  const keyword = queryText.value.trim().toLowerCase()
  return timeline.value.filter(item => {
    const matchType = activeFilter.value === 'all' || item.type === activeFilter.value
    const matchDate = !selectedDate.value || formatDateKey(item.time) === selectedDate.value
    const haystack = `${item.title} ${item.summary} ${item.tags.join(' ')}`.toLowerCase()
    const matchKeyword = !keyword || haystack.includes(keyword)
    return matchType && matchDate && matchKeyword
  })
})

const totalCount = computed(() => timeline.value.length)
const stats = computed(() => [
  { label: '监测', value: timeline.value.filter(i => i.type === 'sensor').length },
  { label: '语音', value: timeline.value.filter(i => i.type === 'voice').length },
  { label: '作息', value: timeline.value.filter(i => i.type === 'routine').length },
  { label: '成长', value: timeline.value.filter(i => i.type === 'milestone' || i.type === 'moment').length },
])

const weekDays = computed(() => {
  const days = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(now.getDate() - i)
    const key = formatDateKey(date.toISOString())
    const dayItems = timeline.value.filter(item => formatDateKey(item.time) === key)
    days.push({
      date: key,
      week: i === 0 ? '今天' : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()],
      day: `${date.getMonth() + 1}/${date.getDate()}`,
      types: Array.from(new Set(dayItems.map(item => item.type))).slice(0, 4),
    })
  }
  if (!selectedDate.value && days.length) selectedDate.value = days[days.length - 1].date
  return days
})

const activeFilterText = computed(() => filters.find(item => item.value === activeFilter.value)?.label || '全部')
const selectedDayText = computed(() => {
  const day = weekDays.value.find(item => item.date === selectedDate.value)
  return day ? `${day.week} ${day.day}` : '近7天'
})

onShow(async () => {
  if (!babyStore.currentBaby) await babyStore.fetchBabyList()
  await loadArchive()
})

async function loadArchive() {
  if (!babyStore.currentBaby) return
  const babyId = babyStore.currentBaby.id
  const query = queryText.value.trim() || '全部'

  try {
    const results = await Promise.allSettled([
      post(API.VOICE.LTM_QUERY, { baby_id: babyId, query, limit: 30 }, { showError: false }),
      get(`${API.VOICE.HISTORY}?baby_id=${babyId}&page=1&page_size=20`, undefined, { showError: false }),
      get(`${API.SENSOR.EVENTS}?baby_id=${babyId}&page=1&page_size=20`, undefined, { showError: false }),
      get(`${API.ROUTINE.LIST}?baby_id=${babyId}&page=1&page_size=20`, undefined, { showError: false }),
    ])

    const ltmRes = results[0].status === 'fulfilled' ? results[0].value : null
    const chatRes = results[1].status === 'fulfilled' ? results[1].value : null
    const eventRes = results[2].status === 'fulfilled' ? results[2].value : null
    const routineRes = results[3].status === 'fulfilled' ? results[3].value : null

    const items: ArchiveItem[] = [
      ...normalizeMemories(ltmRes?.data),
      ...normalizeChats(chatRes?.data),
      ...normalizeEvents(eventRes?.data),
      ...normalizeRoutines(routineRes?.data),
    ]

    timeline.value = mergeById(items)
      .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
  } catch (e) {
    console.error('[memory] loadArchive', e)
  }
}

async function storeMemory() {
  if (!babyStore.currentBaby || !memoryText.value.trim()) {
    uni.showToast({ title: '请输入档案内容', icon: 'none' })
    return
  }
  try {
    const res = await post(API.VOICE.LTM_STORE, {
      baby_id: babyStore.currentBaby.id,
      content: memoryText.value.trim(),
      tags: selectedTags.value,
      source: 'manual',
    })
    if (res.code === 0) {
      uni.showToast({ title: '已加入成长档案', icon: 'success' })
      memoryText.value = ''
      showManual.value = false
      await loadArchive()
    } else {
      uni.showToast({ title: res.message || '保存失败', icon: 'none' })
    }
  } catch (e) {
    console.error('[memory] storeMemory', e)
    uni.showToast({ title: '保存请求失败', icon: 'none' })
  }
}

function normalizeMemories(data: any): ArchiveItem[] {
  const list = Array.isArray(data) ? data : data?.memories || data?.items || []
  return list.map((item: any, index: number) => ({
    id: `memory-${item.id || index}`,
    type: item.source === 'manual' ? 'manual' : normalizeType(item.source || item.type || 'voice'),
    title: item.source === 'manual' ? '家长补充记录' : '成长记忆',
    summary: item.content || item.content_text || item.summary || '已沉淀到宝宝成长档案',
    time: item.created_at || item.updated_at || new Date().toISOString(),
    tags: normalizeTags(item.tags || item.ltm_tags),
    icon: item.source === 'manual' ? 'edit-pen-fill' : 'file-text-fill',
  }))
}

function normalizeChats(data: any): ArchiveItem[] {
  const list = Array.isArray(data) ? data : data?.items || []
  return list.map((item: any, index: number) => ({
    id: `voice-${item.id || index}`,
    type: 'voice',
    title: '语音对话',
    summary: item.content_text || item.content || item.reply_text || '一次家庭语音互动记录',
    time: item.created_at || item.chat_time || new Date().toISOString(),
    tags: ['对话', ...(item.is_ltm_stored ? ['已入档'] : [])],
    icon: 'mic',
  }))
}

function normalizeEvents(data: any): ArchiveItem[] {
  const list = Array.isArray(data) ? data : data?.items || []
  return list.map((item: any, index: number) => ({
    id: `sensor-${item.id || index}`,
    type: 'sensor',
    title: getEventTitle(item.event_level),
    summary: item.snapshot_url || item.video_clip_url || item.gif_url
      ? '检测到监测事件，并关联了图像或视频素材'
      : '检测到宝宝状态变化，已记录到成长档案',
    time: item.detected_at || item.created_at || new Date().toISOString(),
    tags: ['监测', item.parent_handled ? '已处理' : '待查看'],
    icon: 'heart-fill',
  }))
}

function normalizeRoutines(data: any): ArchiveItem[] {
  const list = Array.isArray(data) ? data : data?.items || []
  return list.map((item: any, index: number) => ({
    id: `routine-${item.id || index}`,
    type: 'routine',
    title: getRoutineTitle(item.activity_type),
    summary: item.description || `${item.time_slot || '今日'} 的作息安排已记录`,
    time: item.created_at || new Date().toISOString(),
    tags: ['作息', getRoutineTitle(item.activity_type)],
    icon: 'calendar-fill',
  }))
}

function normalizeType(type: string): ArchiveType {
  if (['sensor', 'voice', 'routine', 'milestone', 'moment', 'manual'].includes(type)) return type as ArchiveType
  if (type === 'chat') return 'voice'
  return 'voice'
}

function normalizeTags(tags: string | string[] | null | undefined) {
  if (!tags) return ['记忆']
  if (Array.isArray(tags)) return tags.map(mapTagText)
  return String(tags).split(',').map(tag => mapTagText(tag.trim())).filter(Boolean)
}

function mapTagText(tag: string) {
  const map: Record<string, string> = {
    manual: '手动补充',
    sleep: '睡眠',
    routine: '作息',
    milestone: '里程碑',
    voice: '语音',
    sensor: '监测',
    feeding: '喂养',
    activity: '活动',
  }
  return map[tag] || tag
}

function mergeById(items: ArchiveItem[]) {
  const map = new Map<string, ArchiveItem>()
  items.forEach(item => {
    if (item.summary) map.set(item.id, item)
  })
  return Array.from(map.values())
}

function getEventTitle(level: number | null | undefined) {
  if (!level) return '状态监测记录'
  if (level >= 4) return '重要告警事件'
  if (level >= 2) return '需要关注的事件'
  return '状态监测记录'
}

function getRoutineTitle(type: string | null | undefined) {
  const map: Record<string, string> = {
    sleep: '睡眠作息',
    feeding: '喂养作息',
    activity: '活动安排',
    play: '活动安排',
  }
  return map[type || ''] || '作息记录'
}

function formatDateKey(time: string | null | undefined) {
  const date = time ? new Date(time) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatTime(time: string | null | undefined) {
  if (!time) return '刚刚'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return '刚刚'
  return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function toggleTag(tag: string) {
  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter(item => item !== tag)
    : [...selectedTags.value, tag]
}

function goRoutine() {
  uni.navigateTo({ url: '/pages/routine/index' })
}

async function exportArchive() {
  if (exporting.value) return
  if (!babyStore.currentBaby) {
    uni.showToast({ title: '请先选择宝宝', icon: 'none' })
    return
  }
  exporting.value = true
  uni.showLoading({ title: '生成中...' })
  try {
    const res = await exportBabyData(babyStore.currentBaby.id)
    if (res.code !== 0) {
      uni.showModal({
        title: '暂无法导出',
        content: res.message || '导出接口暂未接入或后端未返回下载结果，入口已保留。',
        showCancel: false,
      })
      return
    }
    const url = res.data?.download_url || res.data?.file_url || res.data?.url
    if (url) {
      uni.showModal({ title: '导出成功', content: '成长数据已生成，可在后续下载或复制链接。', showCancel: false })
    } else {
      uni.showModal({ title: '导出任务已提交', content: '后端生成完成后，可在消息中心或导出记录中查看结果。', showCancel: false })
    }
  } catch {
    uni.showModal({
      title: '暂无法导出',
      content: '导出接口暂未接通或网络异常，当前按钮已作为功能入口保留。',
      showCancel: false,
    })
  } finally {
    uni.hideLoading()
    exporting.value = false
  }
}
</script>

<style lang="scss" scoped>
.archive-page {
  min-height: 100vh;
  background: #f5f6fb;
  padding: 24rpx 30rpx 54rpx;
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
  padding: 36rpx 30rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #12b3c7, #0f8fac);
  color: #fff;
  margin-bottom: 24rpx;
}

.hero-title {
  display: block;
  font-size: 44rpx;
  font-weight: 800;
  line-height: 1.2;
}

.hero-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  line-height: 1.45;
  opacity: 0.9;
}

.hero-badge {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  font-size: 22rpx;
}

.hero-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 14rpx;
}

.export-btn {
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #0f8fac;
  font-size: 24rpx;
  font-weight: 700;

  &.disabled {
    opacity: 0.65;
  }
}

.overview-card,
.section,
.search-card {
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(28, 35, 53, 0.05);
}

.overview-card {
  padding: 28rpx;
  margin-bottom: 22rpx;
}

.baby-row {
  display: flex;
  align-items: center;
  margin-bottom: 26rpx;
}

.baby-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  background: #edf8fb;
  margin-right: 20rpx;
}

.baby-name {
  display: block;
  color: #252b3a;
  font-size: 32rpx;
  font-weight: 800;
}

.baby-desc {
  display: block;
  color: #98a2b3;
  font-size: 24rpx;
  margin-top: 8rpx;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
}

.stat-item {
  background: #f7f9fc;
  border-radius: 18rpx;
  padding: 18rpx 10rpx;
  text-align: center;
}

.stat-value {
  display: block;
  color: #0f8fac;
  font-size: 34rpx;
  font-weight: 900;
}

.stat-label {
  display: block;
  color: #8a93a5;
  font-size: 22rpx;
  margin-top: 6rpx;
}

.search-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 18rpx;
  margin-bottom: 18rpx;
}

.search-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  background: #2f9bf4;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.filter-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 14rpx;
  overflow-x: auto;
  margin-bottom: 22rpx;
}

.filter-chip {
  flex-shrink: 0;
  padding: 14rpx 22rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #667085;
  font-size: 24rpx;
  box-shadow: 0 8rpx 22rpx rgba(28, 35, 53, 0.04);
}

.filter-chip.active {
  color: #fff;
  background: #0f8fac;
  font-weight: 700;
}

.section {
  padding: 28rpx;
  margin-bottom: 24rpx;
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
  font-weight: 800;
}

.section-desc {
  display: block;
  color: #98a2b3;
  font-size: 23rpx;
  line-height: 1.45;
  margin-top: 8rpx;
}

.section-action {
  color: #2f9bf4;
  font-size: 26rpx;
  white-space: nowrap;
}

.day-scroll {
  width: 100%;
  white-space: nowrap;
}

.day-list {
  display: inline-flex;
  gap: 14rpx;
}

.day-card {
  width: 116rpx;
  border-radius: 20rpx;
  padding: 18rpx 10rpx;
  background: #f7f9fc;
  text-align: center;
}

.day-card.active {
  background: #e8f8fb;
  outline: 2rpx solid rgba(15, 143, 172, 0.25);
}

.day-week,
.day-date {
  display: block;
}

.day-week {
  color: #667085;
  font-size: 22rpx;
}

.day-date {
  color: #252b3a;
  font-size: 28rpx;
  font-weight: 800;
  margin-top: 6rpx;
}

.day-dots {
  display: flex;
  justify-content: center;
  gap: 6rpx;
  height: 14rpx;
  margin-top: 14rpx;
}

.day-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #cfd6e3;
}

.day-dot.sensor { background: #667eea; }
.day-dot.voice { background: #2f9bf4; }
.day-dot.routine { background: #f59e0b; }
.day-dot.milestone,
.day-dot.moment { background: #10b981; }
.day-dot.manual { background: #8b5cf6; }

.manual-card {
  background: #f7f9fc;
  border-radius: 20rpx;
  padding: 20rpx;
  margin-bottom: 18rpx;
}

.manual-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 16rpx;
}

.manual-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.manual-tag,
.meta-tag {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: #e9edf5;
  color: #667085;
  font-size: 22rpx;
}

.manual-tag.active {
  background: #dff6fb;
  color: #0f8fac;
  font-weight: 700;
}

.save-btn {
  flex-shrink: 0;
  color: #2f9bf4;
  font-size: 26rpx;
  font-weight: 700;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.timeline-item {
  display: flex;
  gap: 18rpx;
}

.timeline-icon {
  width: 58rpx;
  height: 58rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f8fac;
  flex-shrink: 0;
}

.timeline-icon.sensor { background: #667eea; }
.timeline-icon.voice { background: #2f9bf4; }
.timeline-icon.routine { background: #f59e0b; }
.timeline-icon.milestone,
.timeline-icon.moment { background: #10b981; }
.timeline-icon.manual { background: #8b5cf6; }

.timeline-content {
  flex: 1;
  min-width: 0;
  padding: 20rpx;
  border-radius: 20rpx;
  background: #f8f9fd;
}

.timeline-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.timeline-title {
  color: #252b3a;
  font-size: 28rpx;
  font-weight: 800;
}

.timeline-time {
  color: #98a2b3;
  font-size: 22rpx;
  flex-shrink: 0;
}

.timeline-summary {
  display: block;
  color: #667085;
  font-size: 24rpx;
  line-height: 1.5;
  margin-top: 10rpx;
}

.timeline-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 14rpx;
}

.empty {
  padding: 50rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  color: #98a2b3;
  font-size: 25rpx;
}

.profile-tags {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.profile-tag {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  border-radius: 20rpx;
  background: #f8f9fd;
}

.profile-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.profile-copy {
  flex: 1;
  min-width: 0;
}

.profile-name {
  display: block;
  color: #252b3a;
  font-size: 27rpx;
  font-weight: 800;
}

.profile-desc {
  display: block;
  color: #98a2b3;
  font-size: 23rpx;
  line-height: 1.45;
  margin-top: 6rpx;
}

.profile-state {
  flex-shrink: 0;
  color: #0f8fac;
  background: #e8f8fb;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}
</style>
