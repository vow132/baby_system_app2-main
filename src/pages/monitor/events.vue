<template>
  <view class="events-page">
    <view class="filter-bar">
      <u-tabs :list="categoryTabs" :current="currentCategory" @change="onCategoryChange" />
    </view>
    
    <view class="event-list">
      <view class="event-item" v-for="event in filteredEvents" :key="event.source_ref || `${event.source_table}:${event.id}`" @click="goToDetail(event)">
        <view class="event-left">
          <view class="level-badge" :class="getLevelClass(event.event_level)">
            {{ getLevelText(event.event_level) }}
          </view>
          <view class="event-info">
            <text class="event-type">{{ getEventName(event.event_type) }}</text>
            <text class="event-time">{{ formatDateTime(event.detected_at) }}</text>
          </view>
        </view>
        <view class="event-right">
          <view class="event-status" :class="{ handled: event.parent_handled }">
            {{ event.can_confirm === false ? '状态记录' : (event.parent_handled ? '已处理' : '待处理') }}
          </view>
          <u-icon name="arrow-right" size="28" color="#ccc" />
        </view>
      </view>
      
      <u-loadmore :status="loadStatus" />

      <view class="empty" v-if="events.length === 0 && !loading">
        <u-icon name="info-circle" size="44" color="#cfd6e3" />
        <text>暂无监测事件</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onReachBottom } from '@dcloudio/uni-app'
import { getEvents, type MonitoringEvent } from '@/api/monitor'
import { useBabyStore } from '@/stores'

const babyStore = useBabyStore()

const events = ref<MonitoringEvent[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)
const currentCategory = ref(0)
const categoryFilter = ref<string | null>(null)

// event_type → 中文分类映射
const typeToCategory: Record<string, string> = {
  sleeping: '睡眠', awake: '清醒', playing: '玩耍', crying: '哭闹', danger: '危险',
}

const filteredEvents = computed(() => {
  if (!categoryFilter.value) return events.value
  return events.value.filter(e => typeToCategory[e.event_type || ''] === categoryFilter.value)
})

const categoryTabs = [
  { name: '全部' },
  { name: '睡眠' },
  { name: '清醒' },
  { name: '玩耍' },
  { name: '哭闹' },
  { name: '危险' },
]

const loadStatus = computed(() => {
  if (!hasMore.value) return 'nomore'
  return 'loading'
})

onLoad((options) => {
  if (options?.category) {
    const idx = categoryTabs.findIndex(t => t.name === options.category)
    if (idx > 0) {
      currentCategory.value = idx
      categoryFilter.value = options.category
    }
  }
  loadEvents()
})

onReachBottom(() => {
  if (hasMore.value) {
    page.value++
    loadEvents()
  }
})

async function loadEvents() {
  if (!babyStore.currentBaby) return

  loading.value = true
  try {
    const res = await getEvents({
      baby_id: babyStore.currentBaby.id,
      page: page.value,
      page_size: pageSize,
    })

    if (res.code === 0 && res.data) {
      if (page.value === 1) {
        events.value = res.data.items
      } else {
        events.value.push(...res.data.items)
      }
      hasMore.value = res.data.items.length === pageSize
    }
  } catch (e) {
    console.error('[events] loadEvents', e)
  } finally {
    loading.value = false
  }
}

function onCategoryChange(item: any) {
  const idx = typeof item === 'number' ? item : item.index ?? 0
  currentCategory.value = idx
  categoryFilter.value = idx === 0 ? null : categoryTabs[idx].name
  page.value = 1
  hasMore.value = true
  loadEvents()
}

function getEventName(eventType: string | null) {
  const map: Record<string, string> = {
    sleeping: '睡眠', awake: '清醒', playing: '玩耍', crying: '哭闹', danger: '危险',
    deep_sleep: '熟睡', side_prone_sleep: '侧睡趴睡', just_woke: '刚睡醒',
    sit_up: '坐起', roll_over: '翻身', stand_up: '站立', happy_play: '高兴玩耍',
    cry: '哭闹', cry_level1: '哭闹1级', cry_level2: '哭闹2级', cry_level3: '哭闹3级',
    danger_action: '危险动作', apnea: '呼吸暂停', near_bed_edge: '靠近床边',
    climb_over: '翻床', body_outside: '探出床外', stand_danger: '站立危险',
  }
  return map[eventType || ''] || eventType || '未知'
}

function getLevelText(level: number | null) {
  const levels = ['信息', '低', '中', '高', '紧急']
  return levels[level || 0] || '信息'
}

function getLevelClass(level: number | null) {
  const classes = ['level-info', 'level-low', 'level-mid', 'level-high', 'level-urgent']
  return classes[level || 0] || 'level-info'
}

function formatDateTime(time: string | null) {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN')
}

function goToDetail(event: MonitoringEvent) {
  const source = encodeURIComponent(event.source_table || 'monitoring_events')
  uni.navigateTo({ url: `/pages/monitor/detail?id=${event.id}&source_table=${source}` })
}
</script>

<style lang="scss" scoped>
.events-page {
  min-height: 100vh;
  background: #f8f8f8;
}

.filter-bar {
  background: #fff;
  padding: 0 20rpx;
}

.event-list {
  padding: 20rpx 30rpx;

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
    padding: 80rpx 24rpx;
    color: #a2a9b8;
    font-size: 26rpx;
  }
  
  .event-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fff;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 16rpx;
    
    .event-left {
      display: flex;
      align-items: center;
      flex: 1;

      .level-badge {
        flex-shrink: 0;
        padding: 6rpx 14rpx;
        border-radius: 8rpx;
        font-size: 22rpx;
        background: #f0f0f0;
        color: #666;

        &.level-info   { background: rgba(153, 153, 153, 0.12); color: #999; }
        &.level-low    { background: rgba(25, 190, 107, 0.12); color: #19be6b; }
        &.level-mid    { background: rgba(255, 153, 0, 0.12); color: #ff9900; }
        &.level-high   { background: rgba(250, 53, 52, 0.12); color: #fa3534; }
        &.level-urgent { background: rgba(255, 0, 0, 0.12); color: #ff0000; }
      }

      .event-info {
        margin-left: 20rpx;
        
        .event-type {
          display: block;
          font-size: 30rpx;
          color: #333;
        }
        
        .event-time {
          font-size: 24rpx;
          color: #999;
        }
      }
    }
    
    .event-right {
      display: flex;
      align-items: center;
      
      .event-status {
        padding: 8rpx 16rpx;
        border-radius: 8rpx;
        font-size: 24rpx;
        margin-right: 16rpx;
        background: #fff3e0;
        color: #ff9900;
        
        &.handled {
          background: #e8f5e9;
          color: #19be6b;
        }
      }
    }
  }
}
</style>
