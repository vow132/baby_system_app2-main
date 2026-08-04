<template>
  <view class="advice-page">
    <view class="hero">
      <view class="hero-main">
        <text class="hero-title">作息建议</text>
        <text class="hero-desc">{{ babyName }} · 近7天睡眠、喂养、安抚数据分析</text>
      </view>
      <view class="score-ring">
        <text class="score">{{ healthScore }}</text>
        <text class="score-label">分</text>
      </view>
    </view>

    <view class="summary-card">
      <view class="summary-item">
        <text class="summary-value">{{ conflictCount }}</text>
        <text class="summary-label">待优化</text>
      </view>
      <view class="summary-item">
        <text class="summary-value">{{ suggestionList.length }}</text>
        <text class="summary-label">建议</text>
      </view>
      <view class="summary-item">
        <text class="summary-value">{{ updatedCount }}</text>
        <text class="summary-label">可更新</text>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <view>
          <text class="section-title">冲突提示</text>
          <text class="section-desc">系统识别最近7天可能影响作息的节点</text>
        </view>
        <text class="section-action" @click="checkConflicts">重新检测</text>
      </view>

      <view class="conflict-list" v-if="conflictCards.length">
        <view class="conflict-card" v-for="item in conflictCards" :key="item.id">
          <view class="conflict-level" :class="item.level">{{ item.levelText }}</view>
          <view class="conflict-main">
            <text class="conflict-title">{{ item.title }}</text>
            <text class="conflict-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>
      <view class="empty-box" v-else>
        <u-icon name="checkmark-circle" size="40" color="#19be6b" />
        <text>暂未发现明显作息冲突</text>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <view>
          <text class="section-title">优化建议</text>
          <text class="section-desc">面向家长确认的下一周期EASY调整</text>
        </view>
        <text class="section-action" @click="optimizeRoutine">生成建议</text>
      </view>

      <view class="suggestion-list">
        <view class="suggestion-card" v-for="(item, index) in suggestionList" :key="index">
          <view class="suggestion-icon">
            <u-icon name="info-circle" size="20" color="#fff" />
          </view>
          <view class="suggestion-main">
            <text class="suggestion-title">建议 {{ index + 1 }}</text>
            <text class="suggestion-text">{{ item }}</text>
          </view>
        </view>
        <view class="empty-box" v-if="!suggestionList.length">
          <u-icon name="order" size="40" color="#cbd5e1" />
          <text>点击“生成建议”，查看可执行的调整方案</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <view>
          <text class="section-title">优化前后对比</text>
          <text class="section-desc">确认后可自动更新下一周EASY计划</text>
        </view>
      </view>

      <view class="compare-list">
        <view class="compare-row" v-for="item in compareRows" :key="item.label">
          <text class="compare-label">{{ item.label }}</text>
          <view class="compare-values">
            <text class="before">{{ item.before }}</text>
            <u-icon name="arrow-right" size="16" color="#cbd5e1" />
            <text class="after">{{ item.after }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-actions">
      <u-button text="查看作息日程" shape="circle" @click="goToRoutine" />
      <u-button type="primary" text="应用优化方案" shape="circle" :loading="fixing" @click="fixConflicts" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  applyGrowthHabit,
  getGrowthCoach,
  getGrowthEasy,
  getGrowthHabit,
  type EasyAnalysis,
  type GrowthCoach,
  type HabitAnalysis,
} from '@/api/egolife'
import { useBabyStore } from '@/stores'

const babyStore = useBabyStore()
const easyResult = ref<EasyAnalysis | null>(null)
const habitResult = ref<HabitAnalysis | null>(null)
const coachResult = ref<GrowthCoach | null>(null)
const fixing = ref(false)

const babyName = computed(() => babyStore.currentBaby?.name || '小宝贝')
const ageGroup = computed(() => habitResult.value?.age_group || easyResult.value?.age_group || getAgeGroup())
const deviations = computed(() => {
  const value = habitResult.value?.deviations
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  const significant = Array.isArray(value.significant_samples) ? value.significant_samples : []
  if (significant.length) return significant
  const byType = Array.isArray(value.by_type) ? value.by_type : []
  return byType.filter(item => Number(item.early_count || 0) > 0 || Number(item.late_count || 0) > 0)
})
const suggestions = computed(() => Array.isArray(habitResult.value?.suggestions) ? habitResult.value!.suggestions! : [])
const conflictCount = computed(() => deviations.value.length)
const updatedCount = computed(() => suggestions.value.filter(item => !!item.entry_id).length)
const healthScore = computed(() => {
  const coverage = Number(easyResult.value?.summary?.avg_coverage_pct)
  return Number.isFinite(coverage) ? Math.max(0, Math.min(100, Math.round(coverage))) : 0
})

const suggestionList = computed(() => {
  const result: string[] = []
  suggestions.value.forEach(item => {
    if (item.reason) result.push(item.reason)
  })
  const summaryTips = easyResult.value?.summary?.summary_tips
  if (Array.isArray(summaryTips)) result.push(...summaryTips.filter(Boolean))
  result.push(...extractCoachLines(coachResult.value))
  return Array.from(new Set(result)).slice(0, 8)
})

const conflictCards = computed(() => deviations.value.map((item: any, index) => ({
  id: item.id || item.entry_id || index,
  level: index === 0 ? 'high' : 'mid',
  levelText: index === 0 ? '重点' : '提醒',
  title: item.activity || item.type || item.deviation_type || '作息偏差',
  desc: item.reason
    || item.message
    || [item.expected_time || item.expected, item.actual_time || item.actual].filter(Boolean).join(' → ')
    || '实际行为与当前日程存在偏差',
})))

const compareRows = computed(() => {
  if (!suggestions.value.length) {
    return [{ label: '暂无调整', before: '继续积累行为数据', after: '数据充足后生成建议' }]
  }
  return suggestions.value.slice(0, 5).map(item => ({
    label: item.activity || '日程节点',
    before: item.old_time_range || '当前计划',
    after: item.new_time_range || '建议计划',
  }))
})

onShow(async () => {
  if (!babyStore.currentBaby) await babyStore.fetchBabyList()
  await loadAnalysis()
})

function getAgeGroup() {
  const month = babyStore.currentBaby?.current_age_months ?? 11
  if (month <= 3) return '0-3个月'
  if (month <= 6) return '4-6个月'
  if (month <= 12) return '7-12个月'
  if (month <= 24) return '1-2岁'
  if (month <= 36) return '2-3岁'
  return '3-4岁'
}

function extractCoachLines(value: any): string[] {
  if (!value) return []
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(extractCoachLines)
  const preferred = ['lines', 'tips', 'suggestions', 'coach_lines', 'message', 'summary']
  return preferred.flatMap(key => extractCoachLines(value[key])).filter(Boolean)
}

async function loadAnalysis() {
  if (!babyStore.currentBaby) return
  const babyId = babyStore.currentBaby.id
  const [easy, coach, habit] = await Promise.allSettled([
    getGrowthEasy(babyId, { period: 'week' }),
    getGrowthCoach(babyId),
    getGrowthHabit(babyId, { period: 'week' }),
  ])
  easyResult.value = easy.status === 'fulfilled' ? easy.value : null
  coachResult.value = coach.status === 'fulfilled' ? coach.value : null
  habitResult.value = habit.status === 'fulfilled' ? habit.value : null
}

async function optimizeRoutine() {
  await loadAnalysis()
  uni.showToast({ title: suggestionList.value.length ? '建议已更新' : '暂无新建议', icon: 'none' })
}

async function fixConflicts() {
  if (!babyStore.currentBaby || !suggestions.value.length || fixing.value) return
  fixing.value = true
  try {
    const preview = await applyGrowthHabit(babyStore.currentBaby.id, ageGroup.value, true)
    const applyCount = preview.suggestion_count ?? preview.suggestions?.length ?? preview.applied?.length ?? 0
    const skippedCount = preview.skipped?.length || 0
    const confirmed = await new Promise<boolean>((resolve) => {
      uni.showModal({
        title: '应用优化方案',
        content: `预计更新${applyCount}条日程，跳过${skippedCount}条。确认写入个人日程吗？`,
        confirmText: '确认应用',
        success: result => resolve(result.confirm),
        fail: () => resolve(false),
      })
    })
    if (!confirmed) return
    const result = await applyGrowthHabit(babyStore.currentBaby.id, ageGroup.value, false)
    uni.showToast({ title: `已更新${result.applied?.length || 0}条日程`, icon: 'success' })
    await loadAnalysis()
  } finally {
    fixing.value = false
  }
}

function goToRoutine() {
  uni.navigateTo({ url: '/pages/routine/index' })
}
</script>

<style lang="scss" scoped>
.advice-page {
  min-height: 100vh;
  background: #f6f7fb;
  padding: 24rpx 30rpx 150rpx;
}

.hero {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 24rpx;
  padding: 34rpx 30rpx;
  color: #fff;
  margin-bottom: 20rpx;
}

.hero-main { flex: 1; }
.hero-title { display: block; font-size: 42rpx; font-weight: 800; }
.hero-desc { display: block; font-size: 24rpx; line-height: 1.45; opacity: .86; margin-top: 8rpx; }
.score-ring {
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background: rgba(255,255,255,.18);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.score { font-size: 34rpx; font-weight: 800; }
.score-label { font-size: 20rpx; opacity: .8; }

.summary-card {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
  margin-bottom: 24rpx;
}
.summary-item {
  background: #fff;
  border-radius: 18rpx;
  padding: 22rpx 10rpx;
  text-align: center;
}
.summary-value { display: block; font-size: 38rpx; font-weight: 800; color: #1f2937; }
.summary-label { display: block; font-size: 22rpx; color: #94a3b8; margin-top: 4rpx; }

.section {
  background: #fff;
  border-radius: 22rpx;
  padding: 26rpx;
  margin-bottom: 24rpx;
}
.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 18rpx;
}
.section-title { display: block; font-size: 32rpx; color: #1f2937; font-weight: 800; }
.section-desc { display: block; font-size: 23rpx; color: #94a3b8; margin-top: 6rpx; line-height: 1.4; }
.section-action { font-size: 25rpx; color: #667eea; padding-top: 4rpx; flex-shrink: 0; }

.conflict-list, .suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.conflict-card {
  display: flex;
  align-items: flex-start;
  background: #f8fafc;
  border-radius: 18rpx;
  padding: 20rpx;
}
.conflict-level {
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  font-size: 21rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}
.conflict-level.high { color: #fa3534; background: #fff1f2; }
.conflict-level.mid { color: #ff9900; background: #fff7ed; }
.conflict-main { flex: 1; }
.conflict-title { display: block; font-size: 28rpx; color: #1f2937; font-weight: 700; }
.conflict-desc { display: block; font-size: 23rpx; color: #64748b; line-height: 1.45; margin-top: 6rpx; }

.suggestion-card {
  display: flex;
  align-items: flex-start;
  background: #f8fafc;
  border-radius: 18rpx;
  padding: 20rpx;
}
.suggestion-icon {
  width: 52rpx;
  height: 52rpx;
  border-radius: 16rpx;
  background: #667eea;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  flex-shrink: 0;
}
.suggestion-main { flex: 1; }
.suggestion-title { display: block; font-size: 25rpx; color: #667eea; font-weight: 700; }
.suggestion-text { display: block; font-size: 25rpx; color: #334155; line-height: 1.5; margin-top: 6rpx; }

.compare-list {
  background: #f8fafc;
  border-radius: 18rpx;
  overflow: hidden;
}
.compare-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  border-bottom: 1rpx solid #edf2f7;
}
.compare-row:last-child { border-bottom: none; }
.compare-label { font-size: 25rpx; color: #64748b; }
.compare-values {
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 23rpx;
}
.before { color: #94a3b8; }
.after { color: #19be6b; font-weight: 700; }

.empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 44rpx 20rpx;
  color: #94a3b8;
  font-size: 25rpx;
  text-align: center;
  line-height: 1.5;
}
.empty-box text { margin-top: 12rpx; }

.bottom-actions {
  position: fixed;
  left: 30rpx;
  right: 30rpx;
  bottom: calc(24rpx + env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18rpx;
}
</style>
