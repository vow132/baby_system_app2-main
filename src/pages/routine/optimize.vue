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
import { get, post } from '@/api/request'
import { API } from '@/api/config'
import { useBabyStore } from '@/stores'

const babyStore = useBabyStore()
const conflictResult = ref<any | null>(null)
const optimizeResult = ref<any | null>(null)
const conflicts = ref<any[]>([])
const fixing = ref(false)

const babyName = computed(() => babyStore.currentBaby?.name || '小宝贝')
const conflictCount = computed(() => conflictResult.value?.total_conflicts ?? conflicts.value.length)
const updatedCount = computed(() => optimizeResult.value?.optimized_routines?.length || optimizeResult.value?.updated_routines?.length || 0)
const healthScore = computed(() => Math.max(72, 96 - conflictCount.value * 6))

const suggestionList = computed(() => {
  const result: string[] = []
  const conflictSuggestions = conflictResult.value?.suggestions
  const optimizeSuggestions = optimizeResult.value?.suggestions
  const changes = optimizeResult.value?.changes
  if (Array.isArray(conflictSuggestions)) result.push(...conflictSuggestions)
  if (Array.isArray(optimizeSuggestions)) result.push(...optimizeSuggestions.map((item: any) => typeof item === 'string' ? item : item.suggestion || item.reason || '建议调整作息节点'))
  if (Array.isArray(changes)) result.push(...changes)
  if (!result.length && conflictCount.value) {
    result.push('建议将晚间活动提前，睡前30分钟减少强刺激互动。')
    result.push('若下午加餐较晚，可适当提前晚餐或缩短加餐量，避免影响入睡。')
  }
  return result
})

const conflictCards = computed(() => {
  if (conflicts.value.length) {
    return conflicts.value.map((item, index) => ({
      id: item.id || index,
      level: index === 0 ? 'high' : 'mid',
      levelText: index === 0 ? '重点' : '提醒',
      title: item.conflict_type || '作息节点重叠',
      desc: item.overlap_start && item.overlap_end
        ? `${item.overlap_start} - ${item.overlap_end} 存在重叠或节奏偏差`
        : '系统检测到睡眠、喂养或安抚节点可能互相影响',
    }))
  }
  if (conflictResult.value?.total_conflicts) {
    return Array.from({ length: conflictResult.value.total_conflicts }).map((_, index) => ({
      id: index,
      level: index === 0 ? 'high' : 'mid',
      levelText: index === 0 ? '重点' : '提醒',
      title: index === 0 ? '睡前节奏偏晚' : '喂养与睡眠间隔需优化',
      desc: index === 0 ? '建议将睡前活动提前，减少夜间入睡阻力。' : '建议保持喂养后至少30分钟缓冲，再进入睡眠节点。',
    }))
  }
  return []
})

const compareRows = computed(() => [
  { label: '睡前活动', before: '20:30后仍活跃', after: '20:00进入安静流程' },
  { label: '晚间喂养', before: '临睡前集中', after: '睡前30分钟完成' },
  { label: '午睡节奏', before: '波动较大', after: '固定午睡窗口' },
])

onShow(async () => {
  if (!babyStore.currentBaby) await babyStore.fetchBabyList()
  await Promise.all([checkConflicts(), optimizeRoutine()])
})

async function checkConflicts() {
  if (!babyStore.currentBaby) return
  const [listRes, checkRes] = await Promise.all([
    get(API.ROUTINE.CONFLICTS(babyStore.currentBaby.id), undefined, { showError: false }),
    post(API.ROUTINE.CONFLICT_CHECK, { baby_id: babyStore.currentBaby.id, check_days: 7 }, { showError: false }),
  ])
  if (listRes.code === 0 && listRes.data) conflicts.value = Array.isArray(listRes.data) ? listRes.data : listRes.data.items || []
  if (checkRes.code === 0) conflictResult.value = checkRes.data
}

async function optimizeRoutine() {
  if (!babyStore.currentBaby) return
  const res = await post(API.ROUTINE.EASY_OPTIMIZE, { baby_id: babyStore.currentBaby.id, analysis_days: 7 }, { showError: false })
  if (res.code === 0) optimizeResult.value = res.data
}

async function fixConflicts() {
  if (!babyStore.currentBaby) return
  fixing.value = true
  try {
    const res = await post(API.ROUTINE.CONFLICT_FIX, { baby_id: babyStore.currentBaby.id, fix_type: 'auto' }, { showError: false })
    if (res.code === 0) {
      uni.showToast({ title: '优化方案已应用', icon: 'success' })
      checkConflicts()
      optimizeRoutine()
    } else {
      uni.showToast({ title: '后端修复待接入，建议已保留', icon: 'none' })
    }
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
