<template>
  <view class="growth-page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <text class="nav-title">成长</text>
      </view>
    </view>

    <scroll-view scroll-y class="scroll-area" :style="{ paddingTop: (statusBarHeight + 70) + 'px' }">
      <view class="baby-overview">
        <view class="baby-main">
          <image class="baby-avatar" :src="babyAvatar" mode="aspectFill" />
          <view class="baby-info">
            <text class="baby-name">{{ babyName }}</text>
            <text class="baby-age">{{ ageText }} · {{ stageText }}</text>
          </view>
        </view>
        <view class="baby-tag">成长中</view>
      </view>

      <scroll-view v-if="babyStore.babyList.length > 1" scroll-x class="baby-switcher" show-scrollbar="false">
        <view
          class="baby-chip"
          :class="{ active: babyStore.currentBaby?.id === baby.id }"
          v-for="baby in babyStore.babyList"
          :key="baby.id"
          @click="selectBaby(baby)"
        >
          <image class="chip-avatar" :src="baby.avatar_url || '/static/logo.png'" mode="aspectFill" />
          <view class="chip-copy">
            <text class="chip-name">{{ baby.name }}</text>
            <text class="chip-age">{{ getBabyAgeText(baby) }}</text>
          </view>
        </view>
      </scroll-view>

      <view class="section">
        <view class="section-head">
          <view>
            <text class="section-title">记忆与学习</text>
            <text class="section-desc">沉淀成长记录、精彩瞬间和个性化建议</text>
          </view>
        </view>

        <view class="feature-list">
          <view
            class="feature-item"
            v-for="item in featureCards"
            :key="item.key"
            @click="navigateTo(item.url)"
          >
            <view class="feature-icon" :style="{ background: item.bg }">
              <u-icon :name="item.icon" size="25" color="#fff" />
            </view>
            <view class="feature-copy">
              <view class="feature-title-row">
                <text class="feature-title">{{ item.title }}</text>
              </view>
              <text class="feature-subtitle">{{ item.subtitle }}</text>
              <text class="feature-desc">{{ item.desc }}</text>
            </view>
            <u-icon name="arrow-right" size="18" color="#c8ced8" />
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <view>
            <text class="section-title">本周成长摘要</text>
            <text class="section-desc">来自Baby-EgoLife周报、提醒与育儿建议</text>
          </view>
          <text class="section-action" @click="navigateTo('/pages/milestone/report')">详情</text>
        </view>

        <view class="summary-panel">
          <view class="summary-score">
            <text class="score-value">{{ growthScore }}</text>
            <text class="score-label">EASY覆盖率</text>
          </view>
          <view class="summary-list">
            <view v-for="item in weeklySummary" :key="item.title" class="summary-row">
              <text class="summary-row-title">{{ item.title }}</text>
              <text class="summary-row-desc">{{ item.desc }}</text>
            </view>
            <view v-if="!weeklySummary.length" class="empty-summary">
              <text>暂无本周摘要，继续记录后会自动生成</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section two-column">
        <view class="preview-card" @click="navigateTo('/pages/moment/index')">
          <view class="preview-head">
            <text class="preview-title">最近瞬间</text>
            <u-icon name="camera-fill" size="22" color="#f43f5e" />
          </view>
          <view class="moment-preview">
            <view class="moment-placeholder">
              <u-icon name="photo" size="34" color="#f9a8c7" />
            </view>
            <text class="preview-desc">按天/月沉淀照片与视频，支持分享下载</text>
          </view>
        </view>

        <view class="preview-card" @click="navigateTo('/pages/memory/index')">
          <view class="preview-head">
            <text class="preview-title">成长档案</text>
            <u-icon name="clock-fill" size="22" color="#667eea" />
          </view>
          <view class="timeline-preview">
            <view class="timeline-row" v-for="item in memoryPreview" :key="item">
              <view class="timeline-dot" />
              <text>{{ item }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBabyStore } from '@/stores'
import type { BabyInfo } from '@/api/baby'
import { formatBabyAge } from '@/utils/age'
import { getGrowthCoach, getGrowthMeta, getGrowthProfile, getGrowthReminders, getGrowthReport } from '@/api/egolife'

const babyStore = useBabyStore()
const statusBarHeight = ref(44)

const weeklySummary = ref<{ title: string; desc: string; color: string }[]>([])
const memoryPreview = ref<string[]>([])
const growthScore = ref('--')
const growthStage = ref('')

const featureCards = [
  {
    key: 'memory',
    title: '成长档案',
    subtitle: '长记忆数据库',
    desc: '时间轴浏览事件、语音、雷达记录，为对话和报告提供长期记忆。',
    icon: 'clock-fill',
    bg: 'linear-gradient(135deg, #667eea, #764ba2)',
    url: '/pages/memory/index',
  },
  {
    key: 'assets',
    title: '成长素材',
    subtitle: '关键事件自动固化',
    desc: '查看微笑、坐起、翻身等关键片段，后续接入 GIF 与短视频生成。',
    icon: 'photo-fill',
    bg: 'linear-gradient(135deg, #10b981, #059669)',
    url: '/pages/milestone/assets',
  },
  {
    key: 'moment',
    title: '温馨瞬间',
    subtitle: '历史相册',
    desc: '按日期浏览宝宝照片和视频成长集，支持预览、分享和下载。',
    icon: 'camera-fill',
    bg: 'linear-gradient(135deg, #f43f5e, #ec4899)',
    url: '/pages/moment/index',
  },
  {
    key: 'report',
    title: 'AI报告',
    subtitle: '成长日报与周报',
    desc: '查看日报、周报和历史报告，让家长快速理解近期状态变化。',
    icon: 'file-text-fill',
    bg: 'linear-gradient(135deg, #f59e0b, #f97316)',
    url: '/pages/milestone/report',
  },
  {
    key: 'learning',
    title: '学习进度',
    subtitle: '可持续学习架构',
    desc: '展示个性化推荐、家庭习惯学习和策略优化进度。',
    icon: 'star-fill',
    bg: 'linear-gradient(135deg, #14b8a6, #0f766e)',
    url: '/pages/learning/index',
  },
]

const babyName = computed(() => babyStore.currentBaby?.name || '小宝贝')
const babyAvatar = computed(() => babyStore.currentBaby?.avatar_url || '/static/logo.png')
const ageMonth = computed(() => babyStore.currentBaby?.current_age_months ?? 11)
const ageText = computed(() => formatBabyAge(babyStore.currentBaby))
const stageText = computed(() => {
  if (growthStage.value) return growthStage.value
  const month = ageMonth.value
  if (month <= 3) return '0-3月龄'
  if (month <= 6) return '4-6月龄'
  if (month <= 12) return '7-12月龄'
  if (month <= 24) return '13-24月龄'
  if (month <= 36) return '25-36月龄'
  return '37-48月龄'
})

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 44
})

onShow(async () => {
  await babyStore.fetchBabyList()
  await loadGrowthSummary()
})

function navigateTo(url: string) {
  uni.navigateTo({ url })
}

function selectBaby(baby: BabyInfo) {
  babyStore.setCurrentBaby(baby)
  weeklySummary.value = []
  memoryPreview.value = []
  loadGrowthSummary()
}

async function loadGrowthSummary() {
  if (!babyStore.currentBaby) return
  const babyId = babyStore.currentBaby.id
  const [report, reminders, coach, profile, meta] = await Promise.allSettled([
    getGrowthReport(babyId, { period: 'week' }),
    getGrowthReminders(babyId),
    getGrowthCoach(babyId),
    getGrowthProfile(babyId),
    getGrowthMeta(babyId),
  ])
  const profileData = profile.status === 'fulfilled' ? profile.value : null
  const metaData = meta.status === 'fulfilled' ? meta.value : null
  growthStage.value = profileData?.profile?.resolved_age_group
    || profileData?.profile?.age_group
    || profileData?.identity?.age_group
    || metaData?.default_age_group
    || ''
  const reportData = report.status === 'fulfilled' ? report.value : null
  const easyCoverage = Number(reportData?.easy?.avg_coverage_pct ?? reportData?.easy?.coverage_pct)
  growthScore.value = Number.isFinite(easyCoverage) ? String(Math.round(easyCoverage)) : '--'

  const rows: { title: string; desc: string; color: string }[] = []
  const highlights = Array.isArray(reportData?.highlights) ? reportData.highlights : []
  const insights = Array.isArray(reportData?.insights) ? reportData.insights : []
  ;[...highlights, ...insights].slice(0, 3).forEach((item: any, index) => {
    const text = typeof item === 'string' ? item : item?.text || item?.description || item?.title
    if (text) rows.push({ title: index === 0 ? '本周亮点' : '成长洞察', desc: text, color: '#ff8a00' })
  })
  if (coach.status === 'fulfilled') {
    const coachLines = [coach.value?.coach_lines, coach.value?.lines, coach.value?.tips, coach.value?.suggestions, coach.value?.current?.tip]
      .flatMap(value => Array.isArray(value) ? value : value ? [value] : [])
      .map((item: any) => typeof item === 'string' ? item : item?.text || item?.message || '')
      .filter(Boolean)
    if (coachLines[0]) rows.push({ title: '育儿建议', desc: coachLines[0], color: '#667eea' })
  }
  weeklySummary.value = rows.slice(0, 4)

  if (reminders.status === 'fulfilled') {
    memoryPreview.value = (reminders.value.items || []).slice(0, 3)
      .map(item => `${item.time_range || item.start_hhmm} · ${item.activity}`)
  }
}

function getBabyAgeText(baby: BabyInfo) {
  return formatBabyAge(baby)
}

function calcAgeMonth(birthDate?: string | null) {
  if (!birthDate) return 0
  const birth = new Date(birthDate.replace(/-/g, '/'))
  if (Number.isNaN(birth.getTime())) return 0
  const now = new Date()
  return Math.max(0, (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth())
}
</script>

<style lang="scss" scoped>
.growth-page {
  min-height: 100vh;
  background: #f5f6fb;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(135deg, #ff9f0a, #ff7a1a);
}

.nav-content {
  height: 104rpx;
  display: flex;
  align-items: center;
  padding: 0 40rpx;
}

.nav-title {
  color: #fff;
  font-size: 34rpx;
  font-weight: 700;
}

.scroll-area {
  height: 100vh;
  box-sizing: border-box;
}

.baby-overview {
  margin: 0 30rpx 24rpx;
  padding: 30rpx;
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 12rpx 32rpx rgba(28, 35, 53, 0.06);
}

.baby-main {
  display: flex;
  align-items: center;
  min-width: 0;
}

.baby-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 28rpx;
  background: #fff7e8;
  margin-right: 22rpx;
}

.baby-info {
  min-width: 0;
}

.baby-name {
  display: block;
  font-size: 38rpx;
  color: #252b3a;
  font-weight: 800;
}

.baby-age {
  display: block;
  margin-top: 8rpx;
  color: #8a93a5;
  font-size: 26rpx;
}

.baby-tag {
  flex-shrink: 0;
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  color: #ff8a00;
  background: #fff3df;
  font-size: 24rpx;
  font-weight: 600;
}

.baby-switcher {
  margin: -6rpx 0 24rpx;
  white-space: nowrap;
}

.baby-chip {
  display: inline-flex;
  align-items: center;
  min-width: 190rpx;
  max-width: 260rpx;
  margin-left: 30rpx;
  padding: 12rpx 18rpx 12rpx 12rpx;
  border-radius: 22rpx;
  background: #fff;
  box-shadow: 0 8rpx 26rpx rgba(28, 35, 53, 0.05);
  vertical-align: middle;

  &:last-child {
    margin-right: 30rpx;
  }

  &.active {
    background: #fff7e8;
    box-shadow: inset 0 0 0 2rpx rgba(255, 138, 0, 0.2);
  }
}

.chip-avatar {
  width: 58rpx;
  height: 58rpx;
  border-radius: 18rpx;
  margin-right: 14rpx;
  background: #fff7e8;
  flex-shrink: 0;
}

.chip-copy {
  min-width: 0;
}

.chip-name,
.chip-age {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-name {
  color: #252b3a;
  font-size: 26rpx;
  font-weight: 700;
}

.chip-age {
  margin-top: 2rpx;
  color: #98a1b2;
  font-size: 22rpx;
}

.section {
  margin: 0 30rpx 24rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(28, 35, 53, 0.05);
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 22rpx;
  gap: 20rpx;
}

.section-title {
  display: block;
  color: #252b3a;
  font-size: 32rpx;
  line-height: 1.25;
  font-weight: 800;
}

.section-desc {
  display: block;
  margin-top: 8rpx;
  color: #9aa3b5;
  font-size: 24rpx;
  line-height: 1.4;
}

.section-action {
  color: #ff8a00;
  font-size: 26rpx;
  padding-top: 4rpx;
  white-space: nowrap;
}

.summary-row {
  padding: 10rpx 0;
}

.summary-row-title {
  display: block;
  color: #374151;
  font-size: 25rpx;
  font-weight: 700;
}

.summary-row-desc {
  display: block;
  margin-top: 4rpx;
  color: #7c8798;
  font-size: 23rpx;
  line-height: 1.45;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.feature-item {
  display: flex;
  align-items: center;
  padding: 22rpx;
  border-radius: 20rpx;
  background: #f8f9fd;
}

.feature-icon {
  width: 76rpx;
  height: 76rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.feature-copy {
  flex: 1;
  min-width: 0;
}

.feature-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.feature-title {
  color: #252b3a;
  font-size: 30rpx;
  font-weight: 800;
}

.feature-subtitle {
  display: block;
  margin-top: 6rpx;
  color: #667085;
  font-size: 24rpx;
  font-weight: 600;
}

.feature-desc {
  display: block;
  margin-top: 8rpx;
  color: #9aa3b5;
  font-size: 23rpx;
  line-height: 1.45;
}

.summary-panel {
  display: flex;
  align-items: stretch;
  gap: 20rpx;
}

.summary-score {
  width: 190rpx;
  border-radius: 22rpx;
  background: linear-gradient(135deg, #fff3df, #fff8ed);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24rpx 16rpx;
  flex-shrink: 0;
}

.score-value {
  color: #ff8a00;
  font-size: 56rpx;
  font-weight: 900;
  line-height: 1;
}

.score-label {
  margin-top: 12rpx;
  color: #9a6a25;
  font-size: 22rpx;
  text-align: center;
  line-height: 1.35;
}

.summary-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16rpx;
}

.empty-summary {
  color: #98a2b3;
  font-size: 24rpx;
  text-align: center;
  padding: 16rpx 0;
}

.summary-row {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
}

.summary-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  margin-top: 10rpx;
  flex-shrink: 0;
}

.summary-title {
  display: block;
  color: #2f3645;
  font-size: 26rpx;
  font-weight: 700;
}

.summary-desc {
  display: block;
  color: #98a2b3;
  font-size: 23rpx;
  line-height: 1.4;
  margin-top: 4rpx;
}

.two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18rpx;
  background: transparent;
  padding: 0;
  box-shadow: none;
}

.preview-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  min-height: 220rpx;
  box-shadow: 0 12rpx 32rpx rgba(28, 35, 53, 0.05);
}

.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
}

.preview-title {
  color: #252b3a;
  font-size: 28rpx;
  font-weight: 800;
}

.moment-preview {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.moment-placeholder {
  height: 96rpx;
  border-radius: 18rpx;
  background: #fff1f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-desc {
  color: #98a2b3;
  font-size: 23rpx;
  line-height: 1.45;
}

.timeline-preview {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.timeline-row {
  display: flex;
  align-items: center;
  color: #667085;
  font-size: 23rpx;
}

.timeline-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #667eea;
  margin-right: 12rpx;
  flex-shrink: 0;
}
</style>
