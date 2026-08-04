<template>
  <view class="report-page">
    <view class="hero">
      <view>
        <text class="hero-title">AI成长报告</text>
        <text class="hero-desc">每天一句鼓励，按日、周、月沉淀成长总结</text>
      </view>
      <view class="hero-badge">{{ reportId ? '报告详情' : activeTypeMeta.label }}</view>
    </view>

    <view class="thinking-card" v-if="generating">
      <view class="thinking-dots">
        <view class="think-dot" v-for="i in 3" :key="i" :style="{ animationDelay: (i - 1) * 0.22 + 's' }" />
      </view>
      <text class="thinking-title">正在生成成长报告</text>
      <text class="thinking-desc">{{ fillerText }}</text>
    </view>

    <view v-else>
      <view class="type-tabs" v-if="!reportId">
        <view
          class="type-tab"
          v-for="item in reportTypes"
          :key="item.value"
          :class="{ active: activeReportType === item.value }"
          @click="switchReportType(item.value)"
        >
          <text>{{ item.label }}</text>
        </view>
      </view>

      <view class="today-card">
        <view class="today-head">
          <view>
            <text class="section-title">{{ currentCardTitle }}</text>
            <text class="section-desc">{{ reportRange }}</text>
          </view>
          <view class="status-badge" :class="{ temporary: isTemporaryReport }">{{ reportStatusText }}</view>
        </view>
        <text class="encourage-text">{{ encouragementText }}</text>
        <view class="today-tags">
          <text v-for="item in reportTags" :key="item">{{ item }}</text>
        </view>
      </view>

      <view class="section">
        <view class="section-head compact">
          <view>
            <text class="section-title">本期事件来源</text>
            <text class="section-desc">按 {{ activeTypeMeta.label }} 时间段过滤 events.raw_text</text>
          </view>
        </view>
        <view class="event-source-list">
          <view class="event-source-row" v-for="item in eventStats" :key="item.key">
            <view class="event-source-main">
              <view class="event-dot" :style="{ background: item.color }" />
              <text class="event-label">{{ item.label }}</text>
            </view>
            <text class="event-value">{{ item.value }}</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <view>
            <text class="section-title">AI分析摘要</text>
            <text class="section-desc">{{ reportRange }}</text>
            <text class="section-note" v-if="!reportId">截至当前时间，不保存到历史报告</text>
          </view>
          <text class="section-action" v-if="!reportId" @click="generateReport">{{ generateButtonText }}</text>
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
          <text class="section-title">{{ nextSuggestionTitle }}</text>
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
            <text class="section-desc">这里只展示系统定时生成并保存的{{ activeTypeMeta.label }}</text>
          </view>
        </view>

        <view class="report-list" v-if="reports.length > 0">
          <view class="report-item" v-for="item in reports" :key="getReportKey(item)" @click="openReport(getReportKey(item))">
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
          <text class="empty-desc">{{ emptyHistoryText }}</text>
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
import { getGrowthReport } from '@/api/egolife'

type ReportType = 'daily' | 'weekly' | 'monthly'

const babyStore = useBabyStore()
const reportId = ref<string | null>(null)
const activeReportType = ref<ReportType>('daily')
const currentReport = ref<any | null>(null)
const reports = ref<any[]>([])
const generating = ref(false)
const isTemporaryReport = ref(false)
const fillerText = ref('正在汇总成长事件、互动记录和作息数据')

const reportTypes: { value: ReportType; label: string; rangeLabel: string; nextLabel: string }[] = [
  { value: 'daily', label: '日报', rangeLabel: '今日', nextLabel: '明日建议' },
  { value: 'weekly', label: '周报', rangeLabel: '本周', nextLabel: '下周建议' },
  { value: 'monthly', label: '月报', rangeLabel: '本月', nextLabel: '下月建议' },
]

const activeTypeMeta = computed(() => reportTypes.find(item => item.value === activeReportType.value) || reportTypes[0])

const activePeriod = computed(() => getPeriodRange(activeReportType.value))

const reportRange = computed(() => {
  if (!currentReport.value) return `${formatDate(activePeriod.value.start)} - ${formatDate(activePeriod.value.end)}`
  const start = getReportStart(currentReport.value)
  const end = getReportEnd(currentReport.value)
  if (start && end) return `${formatDate(start)} - ${formatDate(end)}`
  if (start) return formatDate(start)
  return `${activeTypeMeta.value.rangeLabel}成长总结`
})

const currentCardTitle = computed(() => {
  if (activeReportType.value === 'daily') return '今日成长卡片'
  return `${activeTypeMeta.value.rangeLabel}成长总结`
})

const encouragementText = computed(() => {
  return currentReport.value?.daily_summary
    || currentReport.value?.encouragement
    || currentReport.value?.ai_summary
    || currentReport.value?.summary
    || `${activeTypeMeta.value.rangeLabel}也在一点点长大，新的记录会帮助我们更懂宝宝。`
})

const reportTags = computed(() => {
  if (!currentReport.value) return ['记录积累中', `待生成${activeTypeMeta.value.label}`, '成长观察']
  return [activeTypeMeta.value.label, isTemporaryReport.value ? '临时预览' : '已保存', '成长观察']
})

const reportStatusText = computed(() => {
  if (!currentReport.value) return '待生成'
  return isTemporaryReport.value ? '临时预览' : '已保存'
})

const eventStats = computed(() => {
  const report = currentReport.value || {}
  return [
    { key: 'sleep', label: '睡眠', value: formatEventCount(getEventCount(report, ['sleep_count', 'sleeping_count', 'sleep_events', 'sleep'])), color: '#667eea' },
    { key: 'cry', label: '哭闹', value: formatEventCount(getEventCount(report, ['cry_count', 'crying_count', 'cry_events', 'cry'])), color: '#f97316' },
    { key: 'danger', label: '危险', value: formatEventCount(getEventCount(report, ['danger_count', 'danger_events', 'danger'])), color: '#ef4444' },
    { key: 'play', label: '玩耍', value: formatEventCount(getEventCount(report, ['play_count', 'playing_count', 'play_events', 'playing'])), color: '#10b981' },
    { key: 'milestone', label: '里程碑', value: formatEventCount(getEventCount(report, ['milestone_count', 'milestones', 'milestone_events'])), color: '#9b59b6' },
  ]
})

const suggestions = computed(() => {
  const value = currentReport.value?.suggestions || currentReport.value?.advice || []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) return value.split(/\n|;|；/).map(item => item.trim()).filter(Boolean)
  return []
})

const analysisCards = computed(() => {
  const highlights = normalizeTextList(currentReport.value?.highlights)
  const period = activeTypeMeta.value.rangeLabel
  return [
    {
      title: `${period}亮点`,
      desc: highlights[0] || currentReport.value?.summary || `有新的成长记录后，这里会总结宝宝${period}的进步。`,
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
      title: nextSuggestionTitle.value,
      desc: suggestions.value[0] || '数据积累后会给出更贴合宝宝状态的作息和陪伴建议。',
      icon: 'checkmark-circle-fill',
      color: '#10b981',
    },
  ]
})

const generateButtonText = computed(() => '生成临时总结')
const nextSuggestionTitle = computed(() => activeTypeMeta.value.nextLabel)
const emptyHistoryText = computed(() => `系统定时生成${activeTypeMeta.value.label}后，可在这里回看宝宝的成长变化`)

const fillerPhrases = [
  '正在汇总成长事件、互动记录和作息数据',
  '正在整理宝宝当前周期的亮点',
  '正在匹配鼓励式报告模板',
  '正在生成适合家长阅读的总结',
]

onLoad((options) => {
  if (options?.id) reportId.value = String(options.id)
  if (isReportType(options?.type)) activeReportType.value = options.type
  loadData()
})

function switchReportType(type: ReportType) {
  if (activeReportType.value === type || generating.value) return
  activeReportType.value = type
  currentReport.value = null
  isTemporaryReport.value = false
  reports.value = []
  loadData()
}

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
    const period = activePeriod.value
    const res = await post(API.MILESTONE.REPORT_GENERATE, {
      baby_id: babyStore.currentBaby.id,
      report_type: activeReportType.value,
      period_start: toDateParam(period.start),
      period_end: toDateParam(period.end),
      temporary: true,
      save: false,
    }, { showError: false })
    if (res.code === 0 && res.data) {
      currentReport.value = res.data
      isTemporaryReport.value = true
      uni.showToast({ title: '已生成临时预览', icon: 'success' })
    } else {
      uni.showToast({ title: '已提交生成任务', icon: 'none' })
    }
  } catch {
    await new Promise(resolve => setTimeout(resolve, 1800))
    uni.showToast({ title: '已提交生成任务', icon: 'none' })
  } finally {
    clearInterval(timer)
    generating.value = false
  }
}

async function loadData() {
  if (reportId.value) {
    const res = await get(`/milestone/report/${encodeURIComponent(reportId.value)}`, undefined, { showError: false })
    if (res.code === 0 && res.data) {
      currentReport.value = res.data
      isTemporaryReport.value = false
      const type = normalizeReportType(res.data.report_type)
      if (type) activeReportType.value = type
    }
    return
  }

  if (!babyStore.currentBaby) await babyStore.fetchBabyList()
  if (!babyStore.currentBaby) return

  const babyId = babyStore.currentBaby.id
  const growthPeriod = activeReportType.value === 'weekly'
    ? 'week'
    : activeReportType.value === 'monthly' ? 'month' : null
  const [legacy, growth] = await Promise.allSettled([
    get(`${API.MILESTONE.REPORT_LIST}?baby_id=${babyId}&report_type=${activeReportType.value}&page=1&page_size=20`, undefined, { showError: false }),
    growthPeriod ? getGrowthReport(babyId, { period: growthPeriod }) : Promise.resolve(null),
  ])

  if (legacy.status === 'fulfilled' && legacy.value.code === 0 && legacy.value.data?.items) {
    reports.value = filterReportsByType(legacy.value.data.items)
  } else {
    reports.value = []
  }
  const legacyCurrent = reports.value[0] || null
  const growthCurrent = growth.status === 'fulfilled' ? normalizeGrowthReport(growth.value) : null
  currentReport.value = growthCurrent ? { ...(legacyCurrent || {}), ...growthCurrent } : legacyCurrent
  isTemporaryReport.value = false
}

function normalizeGrowthReport(report: any) {
  if (!report) return null
  const behavior = report.behavior || {}
  const trendTotals = (Array.isArray(report.daily_trend) ? report.daily_trend : []).reduce((total: Record<string, number>, item: any) => {
    ;['sleep', 'cry', 'danger', 'play'].forEach((key) => {
      total[key] = (total[key] || 0) + Number(item?.[key] || 0)
    })
    return total
  }, {})
  const highlights = normalizeTextList(report.highlights)
  const insights = normalizeTextList(report.insights)
  const habitSuggestions = Array.isArray(report.habit?.suggestions)
    ? report.habit.suggestions.map((item: any) => typeof item === 'string' ? item : item.reason || item.suggestion).filter(Boolean)
    : []
  return {
    summary: insights[0] || highlights[0] || report.summary,
    highlights,
    suggestions: habitSuggestions,
    attention: insights[1] || report.attention,
    sleep_count: trendTotals.sleep ?? behavior.sleep ?? behavior.sleeping,
    cry_count: trendTotals.cry ?? behavior.cry ?? behavior.crying,
    danger_count: trendTotals.danger ?? behavior.danger,
    play_count: trendTotals.play ?? behavior.play ?? behavior.playing,
    easy: report.easy,
    wow: report.wow,
    daily_trend: report.daily_trend,
  }
}

function normalizeTextList(value: any) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) return value.split(/\n|;|；/).map(item => item.trim()).filter(Boolean)
  return []
}

function formatStat(value: any, unit = '') {
  if (value === undefined || value === null || value === '') return '暂无'
  return `${value}${unit}`
}

function formatEventCount(value: any) {
  if (value === undefined || value === null || value === '') return '暂无'
  return `${value}条`
}

function formatDate(date: string | null | undefined) {
  if (!date) return '--'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '--'
  return parsed.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

function getReportTitle(item: any) {
  if (item.title) return item.title
  const type = normalizeReportType(item.report_type) || activeReportType.value
  const meta = reportTypes.find(reportType => reportType.value === type) || activeTypeMeta.value
  const start = getReportStart(item)
  const end = getReportEnd(item)
  if (start && end) return `${formatDate(start)} - ${formatDate(end)} 成长${meta.label}`
  if (start) return `${formatDate(start)} 成长${meta.label}`
  return `成长${meta.label}`
}

function getReportDesc(item: any) {
  return item.summary || item.ai_summary || item.daily_summary || '记录宝宝近期状态变化和成长亮点'
}

function getReportKey(item: any) {
  return String(item.id || item.report_id || '')
}

function openReport(id: string) {
  if (!id) return
  uni.navigateTo({ url: `/pages/milestone/report?id=${id}&type=${activeReportType.value}` })
}

function goBack() {
  uni.navigateBack()
}

function getEventCount(report: any, keys: string[]) {
  const direct = getCount(report, keys)
  if (direct != null) return direct
  const stats = report.event_stats || report.stats || report.event_counts || {}
  return getCount(stats, keys)
}

function getCount(report: any, keys: string[]) {
  if (!report) return null
  for (const key of keys) {
    const value = report[key]
    if (Array.isArray(value)) return value.length
    if (typeof value === 'number') return value
  }
  return null
}

function getReportStart(report: any) {
  return report.report_date || report.period_start || report.week_start || report.month_start || report.start_date
}

function getReportEnd(report: any) {
  return report.period_end || report.week_end || report.month_end || report.end_date
}

function getPeriodRange(type: ReportType) {
  const now = new Date()
  const start = new Date(now)

  if (type === 'daily') {
    start.setHours(0, 0, 0, 0)
  } else if (type === 'weekly') {
    const day = start.getDay() || 7
    start.setDate(start.getDate() - day + 1)
    start.setHours(0, 0, 0, 0)
  } else {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
  }

  return { start, end: now }
}

function toDateParam(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isReportType(value: any): value is ReportType {
  return value === 'daily' || value === 'weekly' || value === 'monthly'
}

function normalizeReportType(value: any): ReportType | null {
  if (isReportType(value)) return value
  if (value === 'day' || value === '日报') return 'daily'
  if (value === 'week' || value === '周报') return 'weekly'
  if (value === 'month' || value === '月报') return 'monthly'
  return null
}

function filterReportsByType(items: any[]) {
  return items.filter(item => {
    const type = normalizeReportType(item.report_type)
    return !type || type === activeReportType.value
  })
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

.type-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8rpx;
  padding: 8rpx;
  margin-bottom: 22rpx;
  background: #fff;
  border-radius: 22rpx;
  box-shadow: 0 10rpx 28rpx rgba(28, 35, 53, 0.04);
}

.type-tab {
  height: 68rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667085;
  font-size: 26rpx;
  font-weight: 800;
}

.type-tab.active {
  color: #fff;
  background: linear-gradient(135deg, #9b59b6, #667eea);
  box-shadow: 0 10rpx 22rpx rgba(102, 126, 234, 0.2);
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

.section-note {
  display: block;
  color: #b45309;
  font-size: 22rpx;
  line-height: 1.45;
  margin-top: 8rpx;
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

.status-badge {
  flex-shrink: 0;
  color: #667eea;
  background: #eef2ff;
  border-radius: 999rpx;
  padding: 9rpx 16rpx;
  font-size: 22rpx;
  font-weight: 800;
}

.status-badge.temporary {
  color: #b45309;
  background: #fff7ed;
}

.event-source-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.event-source-row {
  min-height: 58rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  background: #f8f9fd;
  border-radius: 18rpx;
  padding: 12rpx 18rpx;
}

.event-source-main {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}

.event-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.event-label {
  color: #252b3a;
  font-size: 25rpx;
  font-weight: 800;
}

.event-value {
  color: #98a2b3;
  font-size: 24rpx;
  font-weight: 700;
  white-space: nowrap;
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
