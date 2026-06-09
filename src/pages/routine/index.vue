<template>
  <view class="routine-page">
    <view class="baby-hero">
      <view class="baby-avatar">
        <u-icon name="star-fill" size="34" color="#fff" />
      </view>
      <view class="baby-main">
        <text class="baby-name">{{ babyName }}</text>
        <text class="baby-age">{{ selectedAge }}个月 · {{ currentTemplate.title }}</text>
      </view>
      <view class="hero-tag">EASY作息</view>
    </view>

    <view class="section">
      <view class="section-head">
        <view>
          <text class="section-title">月龄模板</text>
          <text class="section-desc">来自《0-48月龄分段作息表》</text>
        </view>
      </view>
      <scroll-view scroll-x class="age-scroll">
        <view class="age-tabs">
          <view
            class="age-tab"
            v-for="template in ageTemplates"
            :key="template.key"
            :class="{ active: template.key === selectedTemplateKey }"
            @click="selectTemplate(template.key)"
          >
            <text class="age-title">{{ template.title }}</text>
            <text class="age-focus">{{ template.focus }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="generate-card">
      <view class="generate-text">
        <text class="generate-title">今日EASY日程</text>
        <text class="generate-desc">结合月龄模板、历史行为和当前目标自动生成</text>
      </view>
      <u-button type="primary" text="生成今日计划" shape="circle" size="small" :loading="generating" @click="generateEasyPlan" />
    </view>

    <view class="section">
      <view class="section-head">
        <view>
          <text class="section-title">作息日程展示</text>
          <text class="section-desc">{{ scheduleSource }}</text>
        </view>
        <text class="section-action" @click="savePlanToBackend">保存提醒</text>
      </view>

      <view class="timeline">
        <view class="timeline-item" v-for="item in displaySchedule" :key="item.time + item.activity">
          <view class="time-block">
            <text class="time-text">{{ item.time }}</text>
          </view>
          <view class="timeline-line">
            <view class="dot" :class="item.type" />
          </view>
          <view class="activity-card">
            <view class="activity-head">
              <text class="activity-name">{{ item.activity }}</text>
              <text class="activity-type" :class="item.type">{{ getTypeText(item.type) }}</text>
            </view>
            <text class="activity-tip">{{ item.appTip }}</text>
            <view class="remind-row">
              <u-icon name="bell" size="14" color="#ff9900" />
              <text>{{ item.reminder }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <view>
          <text class="section-title">引导提醒UI</text>
          <text class="section-desc">按节点推送喂养、睡眠和活动提醒</text>
        </view>
      </view>
      <view class="reminder-list">
        <view class="reminder-card" v-for="item in nextReminders" :key="item.time">
          <view class="reminder-icon" :class="item.type">
            <u-icon :name="getTypeIcon(item.type)" size="20" color="#fff" />
          </view>
          <view class="reminder-main">
            <text class="reminder-title">{{ item.time }} · {{ item.activity }}</text>
            <text class="reminder-desc">{{ item.appTip }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBabyStore } from '@/stores'
import { get, post } from '@/api/request'
import { API } from '@/api/config'

interface ScheduleItem {
  time: string
  activity: string
  type: 'eat' | 'sleep' | 'active' | 'care'
  appTip: string
  reminder: string
}

interface AgeTemplate {
  key: string
  min: number
  max: number
  title: string
  focus: string
  schedule: ScheduleItem[]
}

const babyStore = useBabyStore()
const selectedAge = ref(11)
const selectedTemplateKey = ref('7-12')
const generatedSchedule = ref<ScheduleItem[]>([])
const backendSchedule = ref<ScheduleItem[]>([])
const generating = ref(false)
const scheduleSource = ref('默认展示月龄标准模板，可点击生成今日计划')

const ageTemplates: AgeTemplate[] = [
  {
    key: '0-3',
    min: 0,
    max: 3,
    title: '0-3个月',
    focus: '按需喂养 + 多睡养发育',
    schedule: [
      row('6:00-7:00', '晨起喂养 / 换尿布', 'eat', '晨起先换尿布，再按需喂养', '提前10分钟提醒准备奶具和尿布'),
      row('7:00-9:30', '晨间睡眠', 'sleep', '上午睡眠建议2-3小时，保持安静环境', '入睡节点推送白噪音和小夜灯建议'),
      row('9:30-10:00', '喂养 / 拍嗝', 'eat', '喂养后竖抱拍嗝5-10分钟', '到点提醒拍嗝，避免立即平放'),
      row('13:00-15:30', '午后睡眠', 'sleep', '午后长睡眠助力生长激素分泌', '睡前提醒降低灯光和噪音'),
      row('20:30-次日6:00', '夜间睡眠', 'sleep', '夜间总睡眠10-12小时，夜奶后帮助再次入睡', '夜醒时提示轻安抚，不强光刺激'),
    ],
  },
  {
    key: '4-6',
    min: 4,
    max: 6,
    title: '4-6个月',
    focus: '规律喂养 + 睡眠固化',
    schedule: [
      row('6:30-7:00', '晨起喂养 + 换尿布', 'eat', '晨起喂养后喂温水5-10ml', '提醒检查臀部皮肤'),
      row('9:30-11:30', '感官训练 + 互动', 'active', '彩色卡、摇铃、健身架，俯趴3-5分钟', '每30分钟提醒变换互动'),
      row('12:00-14:30', '午间睡眠', 'sleep', '午睡2.5-3小时，采用仰卧姿势', '入睡前推送睡眠环境检查'),
      row('15:00-17:00', '大运动训练 + 互动', 'active', '练习翻身、扶坐，避免强迫独坐', '活动节点提醒亲子训练'),
      row('21:00-次日6:30', '夜间睡眠', 'sleep', '夜间睡眠10-11小时，逐步固化睡眠', '夜奶过多时提示逐步减少'),
    ],
  },
  {
    key: '7-12',
    min: 7,
    max: 12,
    title: '7-12个月',
    focus: '辅食添加 + 规律作息 + 自主能力萌芽',
    schedule: [
      row('7:00-7:30', '晨起喂养 + 自主活动', 'eat', '晨起先喂温水10-15ml，配方奶150-180ml', '提前10分钟提醒晨起喂养和活动准备'),
      row('7:30-8:30', '早餐（辅食 + 奶）', 'eat', '高铁米粉 + 蔬菜泥/水果泥 + 奶，培养固定早餐时间', '推送早餐搭配和进食提醒'),
      row('8:30-10:30', '大运动训练 + 户外互动', 'active', '7-9个月练爬行，10-12个月练扶站/扶走', '提醒户外活动约1小时，晒太阳促进钙吸收'),
      row('10:30-11:00', '上午加餐', 'eat', '水果泥/酸奶30-50g，避免影响午餐', '推送加餐量和食材建议'),
      row('11:00-13:30', '午餐 + 午间睡眠', 'sleep', '主食+蔬菜+肉类50-80g，午睡2-2.5小时', '午餐后提醒切换午睡环境'),
      row('13:30-14:00', '起床 + 喂温水', 'care', '起床后缓慢活动，喂温水10-15ml', '推送起床缓冲提醒'),
      row('14:00-16:00', '精细动作训练 + 互动', 'active', '抓握球、串珠、叠杯，多说话读绘本', '每30分钟提醒变换互动内容'),
      row('16:00-16:30', '下午加餐', 'eat', '小饼干/蔬菜泥30-50g，避免影响晚餐', '推送加餐提醒'),
      row('16:30-18:30', '户外探索 + 家庭互动', 'active', '自然探索、躲猫猫、拍手歌，激发好奇心', '推送亲子互动建议'),
      row('18:30-19:30', '晚餐（辅食 + 奶）', 'eat', '清淡易消化，睡前2小时结束晚餐', '推送晚餐搭配和结束时间'),
      row('19:30-20:30', '睡前仪式', 'care', '洗澡 + 绘本阅读，水温37-38℃，阅读15分钟', '提醒进入低刺激睡前流程'),
      row('20:30-21:00', '夜间喂养 + 哄睡', 'sleep', '夜间喂养150-180ml，培养自主入睡', '推送睡前安抚和灯光建议'),
      row('21:00-次日7:00', '夜间睡眠', 'sleep', '夜间睡眠9-10小时，10个月后逐步断夜奶', '夜醒时提示轻安抚，避免过度干预'),
    ],
  },
  {
    key: '13-24',
    min: 13,
    max: 24,
    title: '1-2岁',
    focus: '多睡多餐、规律作息',
    schedule: [
      row('6:30-7:00', '起床 + 晨间互动', 'care', '起床后喂温水并更换干爽纸尿裤', '推送晨起护理提醒'),
      row('7:30-8:30', '早餐时间', 'eat', '辅食软烂易吸收，控制进食20分钟内', '推送早餐建议'),
      row('10:30-12:30', '上午午睡', 'sleep', '午睡1.5-2小时，睡前避免过度兴奋', '到点提醒降低灯光'),
      row('14:00-16:00', '户外活动 + 感官探索', 'active', '户外1-1.5小时，注意防晒保暖', '推送户外活动建议'),
      row('20:30-次日6:30', '夜间睡眠', 'sleep', '夜间睡眠10-11小时，排查频繁夜醒原因', '夜醒提醒尿布/饥饿检查'),
    ],
  },
  {
    key: '25-36',
    min: 25,
    max: 36,
    title: '2-3岁',
    focus: '规律作息 + 自主能力培养',
    schedule: [
      row('7:00-7:30', '起床 + 自主洗漱', 'care', '鼓励自主刷牙，起床后喝温水', '推送洗漱提醒'),
      row('8:30-10:30', '认知学习 + 户外活动', 'active', '颜色、数字、拼图和户外探索', '推送认知游戏建议'),
      row('11:00-13:30', '上午午睡', 'sleep', '午睡控制1.5小时，避免影响夜间睡眠', '提醒午睡时长'),
      row('17:30-19:00', '户外运动 + 自主探索', 'active', '散步、滑梯、踢球约1小时', '推送运动安全提醒'),
      row('21:30-次日7:00', '夜间睡眠', 'sleep', '夜间睡眠9-10小时，培养自主入睡', '睡前提醒关闭刺激内容'),
    ],
  },
  {
    key: '37-48',
    min: 37,
    max: 48,
    title: '3-4岁',
    focus: '规律作息 + 独立能力 + 社交启蒙',
    schedule: [
      row('7:30-8:00', '起床 + 独立洗漱', 'care', '刷牙2分钟，整理床铺，喝温水150ml', '推送独立洗漱提醒'),
      row('9:00-11:30', '学习启蒙 + 户外社交', 'active', '儿歌、汉字、英文单词和户外社交', '推送启蒙活动建议'),
      row('12:00-14:30', '午餐 + 午睡', 'sleep', '午餐均衡，午睡1-1.5小时', '推送午睡时长提醒'),
      row('15:00-17:00', '兴趣培养 + 动手训练', 'active', '绘画、黏土、剪纸、扣扣子', '推送动手能力训练'),
      row('21:30-22:00', '自主入睡', 'sleep', '培养独立入睡，不依赖陪伴', '推送晚安流程'),
    ],
  },
]

const currentTemplate = computed(() => ageTemplates.find(item => item.key === selectedTemplateKey.value) || ageTemplates[2])
const babyName = computed(() => babyStore.currentBaby?.name || '小宝贝')
const displaySchedule = computed(() => generatedSchedule.value.length ? generatedSchedule.value : backendSchedule.value.length ? backendSchedule.value : currentTemplate.value.schedule)
const nextReminders = computed(() => displaySchedule.value.slice(0, 4))

onShow(async () => {
  if (!babyStore.currentBaby) await babyStore.fetchBabyList()
  selectedAge.value = getBabyAgeMonth()
  selectedTemplateKey.value = getTemplateKeyByAge(selectedAge.value)
  loadTodayRoutine()
})

function row(time: string, activity: string, type: ScheduleItem['type'], appTip: string, reminder: string): ScheduleItem {
  return { time, activity, type, appTip, reminder }
}

function getBabyAgeMonth() {
  const baby = babyStore.currentBaby
  if (baby?.current_age_months != null) return baby.current_age_months
  if (baby?.birth_date) {
    const birth = new Date(baby.birth_date)
    const now = new Date()
    return Math.max(0, (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth())
  }
  return 11
}

function getTemplateKeyByAge(age: number) {
  return ageTemplates.find(item => age >= item.min && age <= item.max)?.key || '7-12'
}

function selectTemplate(key: string) {
  selectedTemplateKey.value = key
  const tpl = ageTemplates.find(item => item.key === key)
  if (tpl) selectedAge.value = Math.min(Math.max(selectedAge.value, tpl.min), tpl.max)
  generatedSchedule.value = []
  scheduleSource.value = '已切换月龄标准模板，可点击生成今日计划'
}

async function loadTodayRoutine() {
  if (!babyStore.currentBaby) return
  try {
    const res = await get(API.ROUTINE.TODAY(babyStore.currentBaby.id))
    if (res.code === 0 && Array.isArray(res.data) && res.data.length) {
      backendSchedule.value = res.data.map((item: any) => row(
        item.time_slot?.slice(0, 5) || '--:--',
        item.activity_name || item.template_name || '作息安排',
        normalizeType(item.activity_type),
        item.description || '今日已生成作息节点',
        item.reminder_enabled ? `提前${item.reminder_before_min || 10}分钟提醒` : '节点提醒'
      ))
      scheduleSource.value = '已读取后端今日作息'
    }
  } catch (error) {
    backendSchedule.value = []
  }
}

async function generateEasyPlan() {
  if (!babyStore.currentBaby) {
    uni.showToast({ title: '请先添加宝宝', icon: 'none' })
    return
  }
  generating.value = true
  try {
    const res = await post(API.ROUTINE.EASY_OPTIMIZE, {
      baby_id: babyStore.currentBaby.id,
      age_month: selectedAge.value,
      analysis_days: 7,
    })
    const optimized = (res.code === 0 && res.data?.optimized_routines) ? res.data.optimized_routines : []
    if (optimized.length) {
      generatedSchedule.value = optimized.map((item: any) => row(
        item.time_slot?.slice(0, 5) || '--:--',
        item.activity_name || item.template_name || 'EASY节点',
        normalizeType(item.activity_type),
        item.description || 'AI优化节点',
        item.reminder_enabled ? `提前${item.reminder_before_min || 10}分钟提醒` : '节点提醒'
      ))
      scheduleSource.value = '已结合历史行为生成AI优化日程'
    } else {
      generatedSchedule.value = currentTemplate.value.schedule
      scheduleSource.value = '后端优化待完善，当前使用月龄标准模板生成'
    }
    uni.showToast({ title: '已生成今日计划', icon: 'success' })
  } finally {
    generating.value = false
  }
}

async function savePlanToBackend() {
  if (!babyStore.currentBaby) return
  const today = new Date().toISOString().split('T')[0]
  const target = displaySchedule.value
  let success = 0
  for (const item of target) {
    const startTime = normalizeStartTime(item.time)
    if (!startTime) continue
    const res = await post(API.ROUTINE.CREATE, {
      baby_id: babyStore.currentBaby.id,
      template_name: `${currentTemplate.value.title}EASY作息`,
      activity_name: item.activity,
      activity_type: item.type,
      time_slot: startTime,
      duration_min: estimateDuration(item.time),
      description: item.appTip,
      effective_date: today,
      reminder_enabled: 1,
      reminder_before_min: 10,
    }, { showError: false })
    if (res.code === 0) success += 1
  }
  uni.showToast({ title: success ? `已保存${success}个提醒` : '后端待接入，已保留页面计划', icon: 'none' })
  loadTodayRoutine()
}

function normalizeStartTime(time: string) {
  const match = time.match(/\d{1,2}:\d{2}/)
  if (!match) return ''
  const [h, m] = match[0].split(':')
  return `${h.padStart(2, '0')}:${m}`
}

function estimateDuration(time: string) {
  const matches = time.match(/\d{1,2}:\d{2}/g)
  if (!matches || matches.length < 2) return 30
  const [start, end] = matches
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let minutes = (eh * 60 + em) - (sh * 60 + sm)
  if (minutes <= 0) minutes += 24 * 60
  return Math.min(minutes, 240)
}

function normalizeType(type: string): ScheduleItem['type'] {
  if (['eat', 'feeding'].includes(type)) return 'eat'
  if (['sleep'].includes(type)) return 'sleep'
  if (['active', 'play'].includes(type)) return 'active'
  return 'care'
}

function getTypeText(type: ScheduleItem['type']) {
  const map = { eat: '喂养', sleep: '睡眠', active: '活动', care: '护理' }
  return map[type]
}

function getTypeIcon(type: ScheduleItem['type']) {
  const map = { eat: 'heart-fill', sleep: 'moon', active: 'star-fill', care: 'checkmark-circle' }
  return map[type]
}
</script>

<style lang="scss" scoped>
.routine-page {
  min-height: 100vh;
  background: #f6f7fb;
  padding: 24rpx 30rpx 60rpx;
}

.baby-hero {
  display: flex;
  align-items: center;
  padding: 30rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #ff9900, #f5a623);
  color: #fff;
  margin-bottom: 24rpx;
}

.baby-avatar {
  width: 86rpx;
  height: 86rpx;
  border-radius: 26rpx;
  background: rgba(255,255,255,.22);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 22rpx;
}

.baby-main {
  flex: 1;
}

.baby-name {
  display: block;
  font-size: 38rpx;
  font-weight: 800;
}

.baby-age {
  display: block;
  font-size: 24rpx;
  opacity: .9;
  margin-top: 8rpx;
}

.hero-tag {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,.2);
  font-size: 24rpx;
}

.section {
  background: #fff;
  border-radius: 22rpx;
  padding: 26rpx;
  margin-bottom: 24rpx;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 800;
  color: #1f2937;
}

.section-desc {
  display: block;
  font-size: 23rpx;
  color: #9ca3af;
  margin-top: 6rpx;
}

.section-action {
  color: #ff9900;
  font-size: 26rpx;
  padding-top: 4rpx;
}

.age-scroll {
  white-space: nowrap;
}

.age-tabs {
  display: flex;
  gap: 16rpx;
}

.age-tab {
  width: 220rpx;
  min-height: 112rpx;
  border-radius: 18rpx;
  background: #f8fafc;
  padding: 20rpx;
  border: 2rpx solid transparent;
  flex-shrink: 0;
  white-space: normal;
}

.age-tab.active {
  border-color: #ff9900;
  background: #fff7ed;
}

.age-title {
  display: block;
  font-size: 28rpx;
  color: #1f2937;
  font-weight: 700;
}

.age-focus {
  display: block;
  font-size: 22rpx;
  color: #94a3b8;
  line-height: 1.35;
  margin-top: 8rpx;
}

.generate-card {
  display: flex;
  align-items: center;
  background: #1f2937;
  color: #fff;
  border-radius: 22rpx;
  padding: 26rpx;
  margin-bottom: 24rpx;
}

.generate-text {
  flex: 1;
  margin-right: 20rpx;
}

.generate-title {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
}

.generate-desc {
  display: block;
  font-size: 22rpx;
  color: rgba(255,255,255,.72);
  line-height: 1.45;
  margin-top: 8rpx;
}

.timeline-item {
  display: flex;
  align-items: stretch;
}

.time-block {
  width: 132rpx;
  padding-top: 24rpx;
  flex-shrink: 0;
}

.time-text {
  font-size: 23rpx;
  color: #64748b;
  line-height: 1.35;
}

.timeline-line {
  width: 34rpx;
  position: relative;
  display: flex;
  justify-content: center;
}

.timeline-line::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2rpx;
  background: #e5e7eb;
}

.dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  margin-top: 30rpx;
  z-index: 1;
}

.dot.eat { background: #19be6b; }
.dot.sleep { background: #667eea; }
.dot.active { background: #ff9900; }
.dot.care { background: #9b59b6; }

.activity-card {
  flex: 1;
  background: #f8fafc;
  border-radius: 18rpx;
  padding: 22rpx;
  margin: 10rpx 0 12rpx;
}

.activity-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14rpx;
}

.activity-name {
  flex: 1;
  font-size: 28rpx;
  color: #1f2937;
  font-weight: 800;
  line-height: 1.35;
}

.activity-type {
  padding: 5rpx 12rpx;
  border-radius: 999rpx;
  font-size: 21rpx;
  flex-shrink: 0;
}

.activity-type.eat { color: #19be6b; background: #ecfdf5; }
.activity-type.sleep { color: #667eea; background: #eef2ff; }
.activity-type.active { color: #ff9900; background: #fff7ed; }
.activity-type.care { color: #9b59b6; background: #f3e8ff; }

.activity-tip {
  display: block;
  color: #64748b;
  font-size: 23rpx;
  line-height: 1.5;
  margin-top: 12rpx;
}

.remind-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 14rpx;
  color: #ff9900;
  font-size: 22rpx;
}

.reminder-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.reminder-card {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border-radius: 18rpx;
  padding: 20rpx;
}

.reminder-icon {
  width: 58rpx;
  height: 58rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 18rpx;
  flex-shrink: 0;
}

.reminder-icon.eat { background: #19be6b; }
.reminder-icon.sleep { background: #667eea; }
.reminder-icon.active { background: #ff9900; }
.reminder-icon.care { background: #9b59b6; }

.reminder-main {
  flex: 1;
}

.reminder-title {
  display: block;
  font-size: 27rpx;
  color: #1f2937;
  font-weight: 700;
}

.reminder-desc {
  display: block;
  font-size: 22rpx;
  color: #94a3b8;
  line-height: 1.4;
  margin-top: 6rpx;
}
</style>
