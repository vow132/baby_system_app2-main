<template>
  <view class="learning-page">
    <view class="hero">
      <text class="hero-title">AI学习进度</text>
      <text class="hero-desc">了解AI如何越来越懂你的宝宝</text>
    </view>

    <!-- 总体进度 -->
    <view class="progress-card">
      <view class="progress-header">
        <text class="progress-title">交互总量</text>
        <text class="progress-total">{{ progress?.total_interactions || 0 }} 次</text>
      </view>
      <view class="progress-ring">
        <view class="ring-container">
          <view class="ring-bg" />
          <view class="ring-fill" :style="{ '--progress': overallProgress + '%' }" />
          <view class="ring-text">
            <text class="ring-value">{{ Math.round(overallProgress) }}%</text>
            <text class="ring-label">学习进度</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 知识领域 -->
    <view class="section">
      <text class="section-title">知识领域</text>
      <view class="area-list">
        <view class="area-card" v-for="area in knowledgeAreas" :key="area.area">
          <view class="area-header">
            <view class="area-icon" :style="{ background: getAreaColor(area.area) }">
              <u-icon :name="getAreaIcon(area.area)" size="16" color="#fff" />
            </view>
            <text class="area-name">{{ getAreaLabel(area.area) }}</text>
            <text class="area-pct">{{ Math.round(area.progress * 100) }}%</text>
          </view>
          <view class="area-bar">
            <view class="area-bar-fill" :style="{ width: area.progress * 100 + '%', background: getAreaColor(area.area) }" />
          </view>
        </view>
        <view class="empty" v-if="knowledgeAreas.length === 0">
          <text>暂无学习数据，随着交互增加会逐步积累</text>
        </view>
      </view>
    </view>

    <!-- 个性化推荐 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">个性化推荐</text>
        <text class="section-action" @click="loadRecommendations">刷新</text>
      </view>
      <view class="recommend-list">
        <view class="recommend-card" v-for="item in recommendations" :key="item.id" @click="openRecommend(item)">
          <view class="recommend-icon">
            <u-icon :name="getRecommendIcon(item.type)" size="22" :color="getTypeColor(item.type)" />
          </view>
          <view class="recommend-info">
            <text class="recommend-title">{{ item.title }}</text>
            <text class="recommend-desc">{{ item.description || '暂无描述' }}</text>
            <view class="recommend-meta">
              <text class="recommend-type">{{ getTypeLabel(item.type) }}</text>
              <text class="recommend-score">相关度 {{ Math.round(item.relevance_score * 100) }}%</text>
            </view>
          </view>
          <u-icon name="arrow-right" size="14" color="#ccc" />
        </view>
        <view class="empty" v-if="recommendations.length === 0">
          <text>暂无推荐内容</text>
        </view>
      </view>
    </view>

    <!-- 最后更新 -->
    <view class="update-info" v-if="progress?.last_updated">
      <text class="update-text">最后更新：{{ formatDate(progress.last_updated) }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBabyStore } from '@/stores'
import { getLearningProgress, getRecommendations, type LearningProgress, type Recommendation } from '@/api/learning'

const babyStore = useBabyStore()

const progress = ref<LearningProgress | null>(null)
const recommendations = ref<Recommendation[]>([])

const knowledgeAreas = computed(() => progress.value?.knowledge_areas || [])

const overallProgress = computed(() => {
  if (!knowledgeAreas.value.length) return 0
  const total = knowledgeAreas.value.reduce((sum, a) => sum + a.progress, 0)
  return (total / knowledgeAreas.value.length) * 100
})

onShow(async () => {
  if (!babyStore.currentBaby) await babyStore.fetchBabyList()
  loadData()
})

async function loadData() {
  if (!babyStore.currentBaby) return
  const [progressRes, recRes] = await Promise.all([
    getLearningProgress(babyStore.currentBaby.id),
    getRecommendations({ baby_id: babyStore.currentBaby.id, limit: 10 }),
  ])
  if (progressRes.code === 0 && progressRes.data) progress.value = progressRes.data
  if (recRes.code === 0 && recRes.data) recommendations.value = recRes.data
}

async function loadRecommendations() {
  if (!babyStore.currentBaby) return
  const res = await getRecommendations({ baby_id: babyStore.currentBaby.id, limit: 10 })
  if (res.code === 0 && res.data) recommendations.value = res.data
}

function getAreaLabel(area: string) {
  const map: Record<string, string> = {
    sleep: '睡眠规律', cry: '哭闹识别', emotion: '情绪理解',
    routine: '作息习惯', preference: '偏好学习', interaction: '互动模式',
  }
  return map[area] || area
}

function getAreaIcon(area: string) {
  const map: Record<string, string> = {
    sleep: 'moon', cry: 'volume-up', emotion: 'heart',
    routine: 'calendar', preference: 'star', interaction: 'chat',
  }
  return map[area] || 'star'
}

function getAreaColor(area: string) {
  const map: Record<string, string> = {
    sleep: '#667eea', cry: '#fa3534', emotion: '#e91e63',
    routine: '#ff9900', preference: '#19be6b', interaction: '#9b59b6',
  }
  return map[area] || '#667eea'
}

function getTypeLabel(type: string) {
  const map: Record<string, string> = { article: '文章', video: '视频', activity: '活动', tip: '小贴士' }
  return map[type] || type
}

function getRecommendIcon(type: string) {
  const map: Record<string, string> = { article: 'book', video: 'play-circle', activity: 'gift', tip: 'info-circle' }
  return map[type] || 'star'
}

function getTypeColor(type: string) {
  const map: Record<string, string> = { article: '#667eea', video: '#fa3534', activity: '#ff9900', tip: '#19be6b' }
  return map[type] || '#667eea'
}


function openRecommend(item: Recommendation) {
  if (item.content_url) {
    uni.navigateTo({ url: `/pages/webview/index?url=${encodeURIComponent(item.content_url)}` })
  } else {
    uni.showToast({ title: '内容详情待接入', icon: 'none' })
  }
}

function formatDate(time: string | null) {
  if (!time) return '--'
  return new Date(time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<style lang="scss" scoped>
.learning-page { min-height: 100vh; background: #f6f7fb; padding: 0 30rpx 50rpx; }
.hero { background: linear-gradient(135deg, #9b59b6, #8e44ad); border-radius: 20rpx; padding: 36rpx 30rpx; color: #fff; margin-bottom: 24rpx; }
.hero-title { display: block; font-size: 42rpx; font-weight: 700; }
.hero-desc { display: block; font-size: 26rpx; opacity: .86; margin-top: 10rpx; }

// 进度卡片
.progress-card { background: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 26rpx; box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.05); }
.progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.progress-title { font-size: 30rpx; font-weight: 600; color: #333; }
.progress-total { font-size: 30rpx; font-weight: 700; color: #667eea; }
.progress-ring { display: flex; justify-content: center; }
.ring-container { position: relative; width: 180rpx; height: 180rpx; }
.ring-bg { position: absolute; inset: 0; border-radius: 50%; border: 16rpx solid #f0f0f0; }
.ring-fill { position: absolute; inset: 0; border-radius: 50%; border: 16rpx solid #667eea; clip-path: inset(0 0 0 0); border-bottom-color: transparent; border-right-color: transparent; transform: rotate(-45deg); }
.ring-text { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ring-value { font-size: 36rpx; font-weight: 700; color: #667eea; }
.ring-label { font-size: 20rpx; color: #999; margin-top: 4rpx; }

// 知识领域
.section { margin-bottom: 26rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-title { display: block; font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; }
.section-action { color: #667eea; font-size: 26rpx; }
.area-list { background: #fff; border-radius: 16rpx; padding: 20rpx 24rpx; }
.area-card { margin-bottom: 22rpx; }
.area-card:last-child { margin-bottom: 0; }
.area-header { display: flex; align-items: center; margin-bottom: 10rpx; }
.area-icon { width: 40rpx; height: 40rpx; border-radius: 10rpx; display: flex; align-items: center; justify-content: center; margin-right: 12rpx; }
.area-name { flex: 1; font-size: 26rpx; color: #333; font-weight: 500; }
.area-pct { font-size: 26rpx; color: #667eea; font-weight: 600; }
.area-bar { height: 8rpx; background: #f0f0f0; border-radius: 4rpx; overflow: hidden; }
.area-bar-fill { height: 100%; border-radius: 4rpx; transition: width 0.5s ease; }

// 推荐
.recommend-list { background: #fff; border-radius: 16rpx; overflow: hidden; }
.recommend-card { display: flex; align-items: center; padding: 22rpx 24rpx; border-bottom: 1rpx solid #f1f1f1; }
.recommend-card:last-child { border-bottom: none; }
.recommend-icon { width: 56rpx; height: 56rpx; border-radius: 14rpx; background: #f8f9fc; display: flex; align-items: center; justify-content: center; margin-right: 18rpx; flex-shrink: 0; }
.recommend-info { flex: 1; }
.recommend-title { display: block; font-size: 28rpx; color: #333; font-weight: 600; }
.recommend-desc { display: block; font-size: 22rpx; color: #999; margin-top: 6rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 400rpx; }
.recommend-meta { display: flex; gap: 12rpx; margin-top: 8rpx; }
.recommend-type { font-size: 20rpx; color: #667eea; background: rgba(102,126,234,0.1); padding: 2rpx 10rpx; border-radius: 6rpx; }
.recommend-score { font-size: 20rpx; color: #999; }

.empty { padding: 36rpx 24rpx; text-align: center; color: #999; font-size: 26rpx; }

.update-info { text-align: center; margin-top: 20rpx; }
.update-text { font-size: 22rpx; color: #ccc; }
</style>
