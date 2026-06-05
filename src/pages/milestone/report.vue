<template>
  <view class="report-page">
    <view class="hero">
      <view>
        <text class="hero-title">AI成长报告</text>
        <text class="hero-desc">每天一句鼓励，每周一份成长总结</text>
      </view>
      <view class="hero-badge">{{ reportId ? '报告详情' : '本周' }}</view>
    </view>

    <view class="thinking-card" v-if="generating">
      <view class="thinking-dots">
        <view class="think-dot" v-for="i in 3" :key="i" :style="{ animationDelay: (i - 1) * 0.22 + 's' }" />
      </view>
      <text class="thinking-title">正在生成成长报告</text>
      <text class="thinking-desc">{{ fillerText }}</text>
    </view>

    <view v-else>
      <view class="today-card">
        <view class="today-head">
          <view>
            <text class="section-title">今日成长卡片</text>
            <text class="section-desc">{{ todayText }}</text>
          </view>
          <u-icon name="heart-fill" size="24" color="#9b59b6" />
        </view>
        <text class="encourage-text">{{ dailyEncouragement }}</text>
        <view class="today-tags">
          <text v-for="item in todayTags" :key="item">{{ item }}</text>
        </view>
      </view>

      <view class="overview-grid">
        <view class="overview-item" v-for="item in overviewStats" :key="item.label">
          <text class="overview-value">{{ item.value }}</text>
          <text class="overview-label">{{ item.label }}</text>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <view>
            <text class="section-title">AI分析摘要</text>
            <text class="section-desc">{{ reportRange }}</text>
          </view>
          <text class="section-action" v-if="!reportId" @click="generateReport">生成本周报告</text>
        </view>

        <view class="analysis-list">
          <view class="analysis-card" v-for="item in analysisCards" :key="item.title">
            <view class="analysis-icon" :style="{ background: item.color }">
              <u-icon :name="item.icon" size="18" color="#fff" />
            </view>
            <view class="analysis-copy">
              <text class="analysis-title">{{ item.title }}</text>
              <text class="analysis-desc">{{ item.desc }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section" v-if="suggestions.length">
        <view class="section-head compact">
          <text class="section-title">下周建议</text>
        </view>
        <view class="suggestion-list">
          <view class="suggestion-item" v-for="(item, index) in suggestions" :key="index">
            <u-icon name="checkmark-circle" size="18" color="#10b981" />
            <text>{{ item }}</text>
          </view>
        </view>
      </view>

      <view class="section" v-if="!reportId">
        <view class="section-head">
          <view>
            <text class="section-title">历史报告</text>
            <text class="section-desc">生成后的周报会保存到这里</text>
          </view>
        </view>

        <view class="report-list" v-if="reports.length > 0">
          <view class="report-item" v-for="item in reports" :key="item.id" @click="openReport(item.id)">
            <view class="report-main">
              <text class="report-title">{{ getReportTitle(item) }}</text>
              <text class="report-desc">{{ getReportDesc(item) }}</text>
            </view>
            <u-icon name="arrow-right" size="18" color="#c8ced8" />
          </view>
        </view>

        <view class="empty-state" v-else>
          <u-icon name="file-text" size="42" color="#d5dbea" />
          <text class="empty-title">暂无历史报告</text>
          <text class="empty-desc">生成本周报告后，可在这里回看宝宝的成长变化</text>
        </view>
      </view>

      <view class="detail-actions" v-if="reportId">
        <text @click="goBack">返回列表</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { get, post } from '@/api/request'
import { API } from '@/api/config'
import { useBabyStore } from '@/stores'

const babyStore = useBabyStore()
const reportId = ref<number | null>(null)
const currentReport = ref<any | null>(null)
const reports = ref<any[]>([])
const generating = ref(false)
const fillerText = ref('正在汇总成长事件、互动记录和作息数据')

const reportRange = computed(() => {
  if (!currentReport.value) return '数据积累后会生成更完整的分析'
  return `${formatDate(currentReport.value.week_start)} - ${formatDate(currentReport.value.week_end)}`
})

const todayText = computed(() => {
  const now = new Date()
  return `${now.getMonth() + 1}月${now.getDate()}日`
})

const dailyEncouragement = computed(() => {
  return currentReport.value?.daily_summary
    || currentReport.value?.summary
    || '今天也在一点点长大，新的记录会帮助我们更懂宝宝。'
})

const todayTags = computed(() => {
  if (!currentReport.value) return ['记录积累中', '待生成周报', '成长观察']
  return ['睡眠', '互动', '里程碑']
})

const overviewStats = computed(() => [
  { label: '睡眠记录', value: formatStat(currentReport.value?.total_sleep_min != null ? Math.round(currentReport.value.total_sleep_min / 60 * 10) / 10 : null, 'h') },
  { label: '互动记录', value: formatStat(currentReport.value?.recommendations?.length) },
  { label: '成长事件', value: formatStat(currentReport.value?.milestones?.length) },
])

const suggestions = computed(() => {
  const value = currentReport.value?.suggestions || currentReport.value?.advice || []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) return value.split(/\n|;|；/).map(item => item.trim()).filter(Boolean)
  return []
})

const analysisCards = computed(() => {
  const highlights = normalizeTextList(currentReport.value?.highlights)
  return [
    {
      title: '本周亮点',
      desc: highlights[0] || currentReport.value?.summary || '有新的成长记录后，这里会总结宝宝本周的进步。',
      icon: 'star-fill',
      color: '#f59e0b',
    },
    {
      title: '需要关注',
      desc: currentReport.value?.attention || '持续记录睡眠、互动和作息，系统会提示值得关注的变化。',
      icon: 'eye-fill',
      color: '#667eea',
    },
    {
      title: '下周建议',
      desc: suggestions.value[0] || '数据积累后会给出更贴合宝宝状态的作息和陪伴建议。',
      icon: 'checkmark-circle-fill',
      color: '#10b981',
    },
  ]
})

const fillerPhrases = [
  '正在汇总成长事件、互动记录和作息数据',
  '正在整理宝宝这一周的亮点',
  '正在匹配鼓励式报告模板',
  '正在生成适合家长阅读的总结',
]

onLoad((options) => {
  if (options?.id) reportId.value = Number(options.id)
  loadData()
})

async function generateReport() {
  if (!babyStore.currentBaby) await babyStore.fetchBabyList()
  if (!babyStore.currentBaby || generating.value) return

  generating.value = true
  let index = 0
  const timer = setInterval(() => {
    index = (index + 1) % fillerPhrases.length
    fillerText.value = fillerPhrases[index]
  }, 1600)

  try {
    await post(API.MILESTONE.REPORT_GENERATE, { baby_id: babyStore.currentBaby.id }, { showError: false })
    uni.showToast({ title: '报告已生成', icon: 'success' })
  } catch {
    await new Promise(resolve => setTimeout(resolve, 1800))
    uni.showToast({ title: '已提交生成任务', icon: 'none' })
  } finally {
    clearInterval(timer)
    generating.value = false
    await loadData()
  }
}

async function loadData() {
  if (reportId.value) {
    const res = await get(API.MILESTONE.REPORT_DETAIL(reportId.value), undefined, { showError: false })
    if (res.code === 0 && res.data) currentReport.value = res.data
    return
  }

  if (!babyStore.currentBaby) await babyStore.fetchBabyList()
  if (!babyStore.currentBaby) return

  const res = await get(`${API.MILESTONE.REPORT_LIST}?baby_id=${babyStore.currentBaby.id}&page=1&page_size=20`, undefined, { showError: false })
  if (res.code === 0 && res.data?.items) {
    reports.value = res.data.items
    currentReport.value = reports.value[0] || null
  }
}

function normalizeTextList(value: any) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) return value.split(/\n|;|；/).map(item => item.trim()).filter(Boolean)
  return []
}

function formatStat(value: any, unit = '') {
  if (value === undefined || value === null || value === '') return '待积累'
  return `${value}${unit}`
}

function formatDate(date: string | null | undefined) {
  if (!date) return '--'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '--'
  return parsed.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

function getReportTitle(item: any) {
  if (item.title) return item.title
  if (item.week_start || item.week_end) return `${formatDate(item.week_start)} - ${formatDate(item.week_end)} 成长周报`
  return '成长周报'
}

function getReportDesc(item: any) {
  return item.summary || item.ai_summary || '记录宝宝近期状态变化和成长亮点'
}

function openReport(id: number) {
  uni.navigateTo({ url: `/pages/milestone/report?id=${id}` })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.report-page {
  min-height: 100vh;
  background: #f5f6fb;
  padding: 24rpx 30rpx 50rpx;
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
  background: linear-gradient(135deg, #9b59b6, #667eea);
  border-radius: 26rpx;
  padding: 36rpx 32rpx;
  color: #fff;
  margin-bottom: 22rpx;
  box-shadow: 0 16rpx 38rpx rgba(102, 126, 234, 0.16);
}

.hero-title {
  display: block;
  font-size: 44rpx;
  font-weight: 900;
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
  flex-shrink: 0;
  padding: 9rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  font-size: 22rpx;
}

.thinking-card,
.today-card,
.section,
.overview-item {
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(28, 35, 53, 0.05);
}

.thinking-card {
  padding: 48rpx 30rpx;
  text-align: center;
}

.thinking-dots {
  display: flex;
  justify-content: center;
  gap: 18rpx;
  margin-bottom: 24rpx;
}

.think-dot {
  width: 22rpx;
  height: 22rpx;
  border-radius: 50%;
  background: #667eea;
  animation: thinkPulse 1.1s infinite both;
}

@keyframes thinkPulse {
  0%, 80%, 100% { transform: scale(.65); opacity: .45; }
  40% { transform: scale(1); opacity: 1; }
}

.thinking-title {
  display: block;
  color: #252b3a;
  font-size: 31rpx;
  font-weight: 850;
}

.thinking-desc {
  display: block;
  color: #98a2b3;
  font-size: 24rpx;
  margin-top: 12rpx;
}

.today-card,
.section {
  padding: 28rpx;
  margin-bottom: 24rpx;
}

.today-head,
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.section-head.compact {
  margin-bottom: 16rpx;
}

.section-title {
  display: block;
  color: #252b3a;
  font-size: 32rpx;
  font-weight: 850;
}

.section-desc {
  display: block;
  color: #98a2b3;
  font-size: 23rpx;
  margin-top: 8rpx;
  line-height: 1.45;
}

.section-action {
  color: #667eea;
  font-size: 25rpx;
  white-space: nowrap;
  font-weight: 700;
}

.encourage-text {
  display: block;
  color: #3b4252;
  font-size: 28rpx;
  line-height: 1.6;
}

.today-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 18rpx;
}

.today-tags text {
  color: #667eea;
  background: #eef2ff;
  border-radius: 999rpx;
  padding: 7rpx 15rpx;
  font-size: 22rpx;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
  margin-bottom: 24rpx;
}

.overview-item {
  min-height: 126rpx;
  padding: 20rpx 10rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.overview-value {
  color: #667eea;
  font-size: 30rpx;
  font-weight: 900;
  line-height: 1.2;
}

.overview-label {
  color: #98a2b3;
  font-size: 22rpx;
  margin-top: 8rpx;
}

.analysis-list,
.suggestion-list,
.report-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.analysis-card {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  background: #f8f9fd;
  border-radius: 20rpx;
  padding: 20rpx;
}

.analysis-icon {
  width: 52rpx;
  height: 52rpx;
  border-radius: 17rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.analysis-copy {
  flex: 1;
  min-width: 0;
}

.analysis-title {
  display: block;
  color: #252b3a;
  font-size: 27rpx;
  font-weight: 850;
}

.analysis-desc {
  display: block;
  color: #667085;
  font-size: 24rpx;
  line-height: 1.5;
  margin-top: 6rpx;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  background: #f8f9fd;
  border-radius: 18rpx;
  padding: 18rpx;
}

.suggestion-item text {
  flex: 1;
  color: #3b4252;
  font-size: 25rpx;
  line-height: 1.5;
}

.report-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  background: #f8f9fd;
  border-radius: 20rpx;
  padding: 22rpx;
}

.report-main {
  flex: 1;
  min-width: 0;
}

.report-title {
  display: block;
  color: #252b3a;
  font-size: 27rpx;
  font-weight: 850;
}

.report-desc {
  display: block;
  color: #98a2b3;
  font-size: 23rpx;
  line-height: 1.45;
  margin-top: 7rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  padding: 50rpx 28rpx;
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.empty-title {
  color: #667085;
  font-size: 28rpx;
  font-weight: 850;
  margin-top: 16rpx;
}

.empty-desc {
  color: #98a2b3;
  font-size: 24rpx;
  line-height: 1.5;
  margin-top: 8rpx;
}

.detail-actions {
  display: flex;
  justify-content: center;
  padding: 12rpx 0 30rpx;
}

.detail-actions text {
  color: #667eea;
  font-size: 27rpx;
  font-weight: 800;
}
</style>
