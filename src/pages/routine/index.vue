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

    <view class="feeding-entry" @click="goFeeding()">
      <view>
        <text class="feeding-entry-title">喂养打卡</text>
        <text class="feeding-entry-desc">今日已记录 {{ todayFeedingCount }} 次 · 打卡后同步智能作息分析</text>
      </view>
      <u-icon name="arrow-right" size="18" color="#f97316" />
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
            v-for="template in displayAgeTemplates"
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
      <u-button type="primary" text="使用该月龄计划" shape="circle" size="small" :loading="generating" @click="generateEasyPlan" />
    </view>

    <view class="section">
      <view class="section-head">
        <view>
          <text class="section-title">作息日程展示</text>
          <text class="section-desc">{{ scheduleSource }}</text>
        </view>
        <view class="section-actions">
          <text class="section-action secondary" @click="openCreateSchedule">新增日程</text>
          <text class="section-action" @click="savePlanToBackend">设为我的计划</text>
        </view>
      </view>

      <view class="timeline">
        <view v-if="!displaySchedule.length" class="empty-schedule">
          暂无该月龄日程，请检查Baby-EgoLife服务后重试
        </view>
        <view class="timeline-item" v-for="item in displaySchedule" :key="`${item.personal ? 'personal' : 'global'}-${item.id || item.time}-${item.activity}`">
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
            <view class="schedule-actions">
              <text
                v-if="item.type === 'eat'"
                class="checkin-action"
                :class="{ done: isFeedingChecked(item) }"
                @click.stop="handleFeedingSchedule(item)"
              >{{ feedingCheckinText(item) }}</text>
              <text @click.stop="openEditSchedule(item)">{{ item.personal ? '编辑' : '复制并编辑' }}</text>
              <text v-if="item.personal" class="danger" @click.stop="removeScheduleItem(item)">删除</text>
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

    <view v-if="scheduleFormVisible" class="schedule-form-mask" @click="closeScheduleForm">
      <view class="schedule-form-card" @click.stop>
        <view class="schedule-form-head">
          <view>
            <text class="schedule-form-title">{{ scheduleFormTitle }}</text>
            <text class="schedule-form-desc">{{ scheduleFormDescription }}</text>
          </view>
          <text class="schedule-form-close" @click="closeScheduleForm">×</text>
        </view>

        <view class="schedule-field">
          <text class="schedule-field-label">时间范围</text>
          <view class="schedule-time-row">
            <view
              class="schedule-time-control"
              hover-class="schedule-time-control--active"
              @click="openScheduleTimePicker('start')"
            >
              <view class="schedule-time-picker">
                <text class="schedule-time-caption">开始：</text>
                <text class="schedule-time-value">{{ scheduleForm.startTime }}</text>
                <u-icon name="arrow-down" size="13" color="#94a3b8" />
              </view>
            </view>
            <view
              class="schedule-time-control"
              hover-class="schedule-time-control--active"
              @click="openScheduleTimePicker('end')"
            >
              <view class="schedule-time-picker">
                <text class="schedule-time-caption">结束：</text>
                <text class="schedule-time-value">{{ scheduleForm.endTime }}</text>
                <u-icon name="arrow-down" size="13" color="#94a3b8" />
              </view>
            </view>
          </view>
          <text class="schedule-field-hint">{{ scheduleTimeHint }}</text>
        </view>

        <view class="schedule-field">
          <text class="schedule-field-label">活动名称</text>
          <input
            v-model="scheduleForm.activity"
            class="schedule-input"
            :disabled="scheduleFormMode !== 'create'"
            placeholder="例如 上午加餐"
            maxlength="40"
          />
          <text v-if="scheduleFormMode !== 'create'" class="schedule-field-hint">已有日程暂不修改名称，避免产生重复模板</text>
        </view>

        <view class="schedule-field">
          <text class="schedule-field-label">日程类型</text>
          <picker
            :range="scheduleTypeOptions"
            range-key="label"
            :value="scheduleTypeIndex"
            :disabled="scheduleFormMode !== 'create'"
            @change="handleScheduleTypeChange"
          >
            <view class="schedule-input schedule-picker">
              <text>{{ scheduleTypeOptions[scheduleTypeIndex].label }}</text>
              <u-icon name="arrow-down" size="14" color="#94a3b8" />
            </view>
          </picker>
        </view>

        <view class="schedule-field">
          <text class="schedule-field-label">照护建议</text>
          <textarea v-model="scheduleForm.appTip" class="schedule-textarea" placeholder="填写该日程的照护建议" maxlength="160" />
        </view>

        <view class="schedule-field">
          <text class="schedule-field-label">提醒内容</text>
          <textarea v-model="scheduleForm.reminder" class="schedule-textarea compact" placeholder="填写到点提醒内容" maxlength="120" />
        </view>

        <view class="schedule-form-actions">
          <button class="schedule-form-button cancel" @click="closeScheduleForm">取消</button>
          <button class="schedule-form-button confirm" :loading="savingSchedule" :disabled="savingSchedule" @click="submitScheduleForm">
            {{ scheduleFormMode === 'clone' ? '复制并保存' : '保存日程' }}
          </button>
        </view>
      </view>
    </view>

    <u-datetime-picker
      :show="scheduleTimePickerVisible"
      v-model="scheduleTimePickerValue"
      mode="time"
      :title="scheduleTimePickerTarget === 'start' ? '选择开始时间' : '选择结束时间'"
      confirm-color="#ff8a00"
      :close-on-click-overlay="false"
      @confirm="confirmScheduleTime"
      @cancel="cancelScheduleTime"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBabyStore } from '@/stores'
import {
  createEgoSchedule,
  deleteEgoSchedule,
  getEgoEvents,
  getEgoSchedule,
  getGrowthReminders,
  getScheduleAgeGroups,
  updateEgoSchedule,
  type EgoLifeEvent,
  type GrowthReminder,
  type ScheduleEntry,
} from '@/api/egolife'

interface ScheduleItem {
  id?: number
  ageGroup?: string
  time: string
  activity: string
  type: 'eat' | 'sleep' | 'active' | 'care'
  sourceType?: string
  appTip: string
  appPush?: string
  reminder: string
  personal?: boolean
  raw?: ScheduleEntry
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
const globalScheduleEntries = ref<ScheduleEntry[]>([])
const personalScheduleEntries = ref<ScheduleEntry[]>([])
const reminderItems = ref<GrowthReminder[]>([])
const feedingEvents = ref<EgoLifeEvent[]>([])
const availableAgeGroups = ref<string[]>([])
const generating = ref(false)
const savingSchedule = ref(false)
const scheduleFormVisible = ref(false)
const scheduleFormMode = ref<'create' | 'edit' | 'clone'>('create')
const editingSchedule = ref<ScheduleItem | null>(null)
const scheduleTimePickerVisible = ref(false)
const scheduleTimePickerTarget = ref<'start' | 'end'>('start')
const scheduleTimePickerValue = ref('09:00')
const scheduleForm = ref({
  startTime: '09:00',
  endTime: '09:30',
  activity: '',
  type: 'care' as ScheduleItem['type'],
  appTip: '',
  reminder: '',
})
const scheduleTypeOptions: Array<{ label: string; value: ScheduleItem['type'] }> = [
  { label: '喂养', value: 'eat' },
  { label: '睡眠', value: 'sleep' },
  { label: '活动', value: 'active' },
  { label: '护理', value: 'care' },
]
const scheduleSource = ref('正在读取Baby-EgoLife日程')
const scheduleCacheKey = computed(() => `egolife_schedule_${babyStore.currentBaby?.id || 0}_${selectedTemplateKey.value}`)

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
const displayAgeTemplates = computed(() => availableAgeGroups.value.length
  ? ageTemplates.filter(item => availableAgeGroups.value.includes(item.title))
  : ageTemplates)
const displaySchedule = computed(() => generatedSchedule.value.length ? generatedSchedule.value : backendSchedule.value)
const scheduleTypeIndex = computed(() => Math.max(0, scheduleTypeOptions.findIndex(item => item.value === scheduleForm.value.type)))
const scheduleFormTitle = computed(() => {
  if (scheduleFormMode.value === 'clone') return '复制为个人日程'
  if (scheduleFormMode.value === 'edit') return '编辑个人日程'
  return '新增个人日程'
})
const scheduleFormDescription = computed(() => scheduleFormMode.value === 'clone'
  ? '公共模板不会被修改，将为当前宝宝创建一条可编辑的个人日程'
  : `保存到${currentTemplate.value.title}个人计划`)
const scheduleTimeHint = computed(() => {
  if (scheduleForm.value.startTime === scheduleForm.value.endTime) return '开始和结束时间不能相同'
  if (clockToMinutes(scheduleForm.value.endTime) < clockToMinutes(scheduleForm.value.startTime)) return '结束时间早于开始时间，将按次日计算'
  return `保存为 ${buildScheduleTimeRange()}`
})
const nextReminders = computed(() => reminderItems.value.slice(0, 4).map(item => row(
  item.time_range || item.start_hhmm || '--:--',
  item.activity || '作息提醒',
  normalizeType(item.type),
  item.app_tip || item.message || '请按宝宝当前状态灵活调整',
  item.reminder || item.app_push || item.message || '节点提醒',
)))

const todayFeedingEvents = computed(() => {
  const today = localDateKey(new Date())
  return feedingEvents.value.filter(item => getEventDateKey(item) === today)
})
const todayFeedingCount = computed(() => todayFeedingEvents.value.length)
const feedingCheckinMatches = computed(() => {
  const matches = new Map<string, EgoLifeEvent>()
  const schedules = displaySchedule.value.filter(item => item.type === 'eat')
  const usedSchedules = new Set<string>()
  const events = todayFeedingEvents.value.slice().sort((a, b) => getEventMinutes(a) - getEventMinutes(b))

  for (const event of events) {
    const eventMinutes = getEventMinutes(event)
    if (eventMinutes < 0) continue
    const text = getEventText(event)
    let bestItem: ScheduleItem | undefined
    let bestScore = Number.POSITIVE_INFINITY
    for (const item of schedules) {
      const key = getScheduleKey(item)
      if (usedSchedules.has(key)) continue
      const startMinutes = getScheduleStartMinutes(item)
      if (startMinutes < 0) continue
      const exactScheduleId = !!item.id && text.includes(`计划ID=${item.id}`)
      const exactPlan = exactScheduleId || (!!item.activity && text.includes(item.activity))
      const distance = Math.abs(eventMinutes - startMinutes)
      if (!exactPlan && distance > 120) continue
      const score = exactPlan ? -1000 + distance : distance
      if (score < bestScore) {
        bestItem = item
        bestScore = score
      }
    }
    if (bestItem) {
      const key = getScheduleKey(bestItem)
      usedSchedules.add(key)
      matches.set(key, event)
    }
  }
  return matches
})
onShow(async () => {
  if (!babyStore.currentBaby) await babyStore.fetchBabyList()
  selectedAge.value = getBabyAgeMonth()
  selectedTemplateKey.value = getTemplateKeyByAge(selectedAge.value)
  generatedSchedule.value = []
  await Promise.all([loadAgeGroups(), loadTodayRoutine(), loadGrowthReminderList(), loadFeedingEvents()])
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
  scheduleSource.value = '正在读取所选月龄日程'
  loadTodayRoutine()
  loadGrowthReminderList()
}

async function loadAgeGroups() {
  if (!babyStore.currentBaby) return
  try {
    availableAgeGroups.value = await getScheduleAgeGroups(babyStore.currentBaby.id)
  } catch {
    availableAgeGroups.value = []
  }
}

function mapScheduleEntry(item: ScheduleEntry): ScheduleItem {
  return {
    id: item.id,
    ageGroup: item.age_group,
    time: item.time_range || '--:--',
    activity: item.activity || '作息安排',
    type: normalizeType(item.type),
    sourceType: item.type,
    appTip: item.appTip || item.app_tip || '请结合宝宝当前状态灵活调整',
    appPush: item.app_push,
    reminder: item.reminder || item.app_push || '节点提醒',
    personal: !!(item.family_id || item.device_sn || item.baby_id),
    raw: item,
  }
}

function mergeScheduleEntries(items: ScheduleEntry[]): ScheduleEntry[] {
  const validItems = items.filter((item) => {
    const timeRange = String(item.time_range || '').trim()
    const activity = String(item.activity || '').trim()
    return !!activity && /^(?:[01]?\d|2[0-3]):[0-5]\d-.+/.test(timeRange)
  })
  const globals = validItems.filter(item => !(item.family_id || item.device_sn || item.baby_id))
  const personals = validItems.filter(item => !!(item.family_id || item.device_sn || item.baby_id))
  globalScheduleEntries.value = globals
  personalScheduleEntries.value = personals

  // Personal copies replace matching public templates; other public entries stay visible.
  const unmatchedGlobals = globals.slice()
  personals.forEach((personal) => {
    const index = unmatchedGlobals.findIndex(global => scheduleSignature(global) === scheduleSignature(personal))
    if (index >= 0) unmatchedGlobals.splice(index, 1)
  })
  return [...personals, ...unmatchedGlobals]
    .sort((a, b) => (a.time_range || '').localeCompare(b.time_range || ''))
}

async function loadTodayRoutine() {
  if (!babyStore.currentBaby) return
  globalScheduleEntries.value = []
  personalScheduleEntries.value = []
  try {
    const result = await getEgoSchedule(babyStore.currentBaby.id, {
      age_group: currentTemplate.value.title,
      grouped: false,
    })
    backendSchedule.value = mergeScheduleEntries(result.items).map(mapScheduleEntry)
    uni.setStorageSync(scheduleCacheKey.value, backendSchedule.value)
    scheduleSource.value = backendSchedule.value.some(item => item.personal)
      ? '已读取宝宝个性化日程'
      : '已读取Baby-EgoLife月龄日程'
  } catch {
    const cached = uni.getStorageSync(scheduleCacheKey.value)
    backendSchedule.value = Array.isArray(cached) ? cached : []
    scheduleSource.value = backendSchedule.value.length ? '网络异常，显示上次同步日程' : '日程加载失败，请稍后重试'
  }
}

async function loadGrowthReminderList() {
  if (!babyStore.currentBaby) return
  try {
    const data = await getGrowthReminders(babyStore.currentBaby.id)
    reminderItems.value = Array.isArray(data?.items) ? data.items : []
  } catch {
    reminderItems.value = []
  }
}

async function loadFeedingEvents() {
  if (!babyStore.currentBaby) return
  try {
    const data = await getEgoEvents(babyStore.currentBaby.id, { page: 1, page_size: 100 })
    const items = data?.events || data?.items || []
    feedingEvents.value = items.filter(isFeedingEvent)
  } catch {
    feedingEvents.value = []
  }
}

function isFeedingEvent(item: EgoLifeEvent) {
  const type = String(item.event_type || item.type || '').toLowerCase()
  return type === 'eat' || type === 'feed' || type === 'feeding'
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getEventDate(item: EgoLifeEvent): Date | null {
  const timestamp = item.timestamp || item.occurred_at
  if (timestamp) {
    const parsed = new Date(timestamp)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  const rawDate = String(item.date || '')
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const parsed = new Date(`${rawDate}T00:00:00`)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  const dayMatch = `${rawDate} ${item.event_id || ''}`.match(/DAY(\d{1,3})/i)
  if (dayMatch) {
    const parsed = new Date(new Date().getFullYear(), 0, Number(dayMatch[1]))
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return null
}

function getEventDateKey(item: EgoLifeEvent) {
  const date = getEventDate(item)
  return date ? localDateKey(date) : ''
}

function getEventMinutes(item: EgoLifeEvent) {
  const date = getEventDate(item)
  if (date && (item.timestamp || item.occurred_at)) return date.getHours() * 60 + date.getMinutes()
  const raw = String(item.start_time || item.event_id || '')
  const match = raw.match(/(?:^|-)(\d{2})(\d{2})(?:\d{2})?(?:-|$)/) || raw.match(/^(\d{2})(\d{2})/)
  return match ? Number(match[1]) * 60 + Number(match[2]) : -1
}

function getScheduleStartMinutes(item: ScheduleItem) {
  const value = normalizeStartTime(item.time)
  return value ? clockToMinutes(value) : -1
}

function getEventText(item: EgoLifeEvent) {
  const evidence = Array.isArray(item.evidence) ? item.evidence.join('；') : ''
  return [item.note, item.raw_text, item.text, evidence].filter(Boolean).join('；')
}

function getScheduleKey(item: ScheduleItem) {
  return `${item.personal ? 'personal' : 'global'}-${item.id || item.time}-${item.activity}`
}

function isFeedingChecked(item: ScheduleItem) {
  return feedingCheckinMatches.value.has(getScheduleKey(item))
}

function feedingCheckinText(item: ScheduleItem) {
  const event = feedingCheckinMatches.value.get(getScheduleKey(item))
  return event ? `${formatEventClock(event)} 已打卡` : '去打卡'
}

function formatEventClock(item: EgoLifeEvent) {
  const minutes = getEventMinutes(item)
  if (minutes < 0) return '今日'
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}
async function generateEasyPlan() {
  if (!babyStore.currentBaby) {
    uni.showToast({ title: '请先添加宝宝', icon: 'none' })
    return
  }
  generating.value = true
  try {
    await loadTodayRoutine()
    generatedSchedule.value = backendSchedule.value.map(item => ({ ...item }))
    if (!generatedSchedule.value.length) {
      uni.showToast({ title: '该月龄暂无可用计划', icon: 'none' })
      return
    }
    scheduleSource.value = `已选择${currentTemplate.value.title}计划，确认后可设为我的计划`
    uni.showToast({ title: '已选择月龄计划', icon: 'success' })
  } finally {
    generating.value = false
  }
}

function scheduleSignature(item: Pick<ScheduleEntry, 'activity' | 'type'>) {
  return `${String(item.type || '').trim()}|${String(item.activity || '').trim()}`
}

function getMissingPersonalEntries() {
  const personalCounts = new Map<string, number>()
  personalScheduleEntries.value.forEach((item) => {
    const key = scheduleSignature(item)
    personalCounts.set(key, (personalCounts.get(key) || 0) + 1)
  })
  return globalScheduleEntries.value.filter((item) => {
    const key = scheduleSignature(item)
    const remaining = personalCounts.get(key) || 0
    if (!remaining) return true
    personalCounts.set(key, remaining - 1)
    return false
  })
}

async function savePlanToBackend() {
  if (!babyStore.currentBaby || !displaySchedule.value.length) return
  const sourceEntries = getMissingPersonalEntries()
  if (personalScheduleEntries.value.length && !sourceEntries.length) {
    uni.showToast({ title: '当前宝宝已有个人计划，请直接编辑', icon: 'none' })
    return
  }
  if (!sourceEntries.length) {
    uni.showToast({ title: '当前没有可保存的有效日程', icon: 'none' })
    return
  }
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '设为我的计划',
      content: `将保存${sourceEntries.length}个日程节点，是否继续？`,
      success: result => resolve(result.confirm),
      fail: () => resolve(false),
    })
  })
  if (!confirmed) return

  let success = 0
  for (const item of sourceEntries) {
    try {
      await createEgoSchedule(babyStore.currentBaby.id, {
        age_group: item.age_group || currentTemplate.value.title,
        time_range: item.time_range,
        activity: item.activity,
        type: item.type,
        appTip: item.appTip || item.app_tip,
        app_push: item.app_push || item.reminder,
        reminder: item.reminder,
        sleep_duration_hours: item.sleep_duration_hours,
      })
      success += 1
    } catch {
      // Continue saving remaining entries; a retry only submits nodes still missing.
    }
  }
  generatedSchedule.value = []
  uni.showToast({
    title: success ? `已保存${success}个日程节点` : '保存失败，请稍后重试',
    icon: success ? 'success' : 'none',
  })
  await Promise.all([loadTodayRoutine(), loadGrowthReminderList()])
}

function resetScheduleForm() {
  scheduleForm.value = {
    startTime: '09:00',
    endTime: '09:30',
    activity: '',
    type: 'care',
    appTip: '',
    reminder: '',
  }
}

function openCreateSchedule() {
  if (!babyStore.currentBaby) {
    uni.showToast({ title: '请先添加宝宝', icon: 'none' })
    return
  }
  editingSchedule.value = null
  scheduleFormMode.value = 'create'
  resetScheduleForm()
  scheduleFormVisible.value = true
}

function openEditSchedule(item: ScheduleItem) {
  if (!babyStore.currentBaby || !item.raw) return
  editingSchedule.value = item
  scheduleFormMode.value = item.personal ? 'edit' : 'clone'
  const selectedTime = parseScheduleTimeRange(item.time)
  scheduleForm.value = {
    startTime: selectedTime.startTime,
    endTime: selectedTime.endTime,
    activity: item.activity,
    type: item.type,
    appTip: item.appTip,
    reminder: item.reminder,
  }
  scheduleFormVisible.value = true
}

function closeScheduleForm() {
  if (savingSchedule.value) return
  scheduleTimePickerVisible.value = false
  scheduleFormVisible.value = false
  editingSchedule.value = null
}

function normalizeClock(value: string) {
  const [hour = '0', minute = '0'] = String(value || '').split(':')
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}

function parseScheduleTimeRange(value: string) {
  const times = String(value || '').match(/\d{1,2}:\d{2}/g) || []
  return {
    startTime: times[0] ? normalizeClock(times[0]) : '09:00',
    endTime: times[1] ? normalizeClock(times[1]) : '09:30',
  }
}

function clockToMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

function buildScheduleTimeRange() {
  const { startTime, endTime } = scheduleForm.value
  return clockToMinutes(endTime) < clockToMinutes(startTime)
    ? `${startTime}-次日${endTime}`
    : `${startTime}-${endTime}`
}

function handleStartTimeChange(event: any) {
  scheduleForm.value.startTime = normalizeClock(String(event?.detail?.value || '09:00'))
}

function handleEndTimeChange(event: any) {
  scheduleForm.value.endTime = normalizeClock(String(event?.detail?.value || '09:30'))
}
function openScheduleTimePicker(target: 'start' | 'end') {
  scheduleTimePickerTarget.value = target
  scheduleTimePickerValue.value = target === 'start'
    ? scheduleForm.value.startTime
    : scheduleForm.value.endTime
  scheduleTimePickerVisible.value = true
}

function confirmScheduleTime({ value }: { value: string }) {
  const selectedTime = normalizeClock(value || scheduleTimePickerValue.value)
  if (scheduleTimePickerTarget.value === 'start') {
    scheduleForm.value.startTime = selectedTime
  } else {
    scheduleForm.value.endTime = selectedTime
  }
  scheduleTimePickerValue.value = selectedTime
  scheduleTimePickerVisible.value = false
}

function cancelScheduleTime() {
  scheduleTimePickerVisible.value = false
}

function handleScheduleTypeChange(event: any) {
  if (scheduleFormMode.value !== 'create') return
  const index = Number(event?.detail?.value || 0)
  scheduleForm.value.type = scheduleTypeOptions[index]?.value || 'care'
}

function serializeScheduleType(type: ScheduleItem['type'], originalType?: string) {
  if (originalType && normalizeType(originalType) === type) return originalType
  const map: Record<ScheduleItem['type'], string> = {
    eat: 'eat',
    sleep: 'sleep',
    active: 'active',
    care: 'awake',
  }
  return map[type]
}

function getScheduleSaveError(error: any) {
  const raw = String(error?.message || '日程保存失败')
  if (/404|Not Found/i.test(raw)) return '8122没有找到POST /schedule，请联系后端检查新增日程接口是否已部署。'
  if (/500|Internal Server Error/i.test(raw)) return '8122新增日程时发生服务器内部错误，请将本次操作交给后端查看日志。'
  if (/request:fail|网络|timeout|超时/i.test(raw)) return '无法连接8122，请检查网络和测试服务是否运行。'
  const cleaned = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned.length > 100 ? `${cleaned.slice(0, 100)}…` : cleaned
}

async function submitScheduleForm() {
  if (!babyStore.currentBaby || savingSchedule.value) return
  const babyId = babyStore.currentBaby.id
  const activity = scheduleForm.value.activity.trim()
  if (scheduleForm.value.startTime === scheduleForm.value.endTime) {
    uni.showToast({ title: '开始和结束时间不能相同', icon: 'none' })
    return
  }
  const timeRange = buildScheduleTimeRange()
  if (!activity) {
    uni.showToast({ title: '请填写活动名称', icon: 'none' })
    return
  }

  const current = editingSchedule.value
  const original = current?.raw
  const payload = {
    age_group: original?.age_group || currentTemplate.value.title,
    time_range: timeRange,
    activity,
    type: serializeScheduleType(scheduleForm.value.type, original?.type),
    appTip: scheduleForm.value.appTip.trim(),
    app_push: scheduleForm.value.reminder.trim(),
    reminder: scheduleForm.value.reminder.trim(),
    sleep_duration_hours: original?.sleep_duration_hours,
  }
  const savedMode = scheduleFormMode.value

  savingSchedule.value = true
  try {
    if (savedMode === 'edit' && current?.id) {
      await updateEgoSchedule(babyId, current.id, payload)
    } else {
      await createEgoSchedule(babyId, payload)
    }
    scheduleFormVisible.value = false
    editingSchedule.value = null
    generatedSchedule.value = []
    await Promise.all([loadTodayRoutine(), loadGrowthReminderList()])
    uni.showToast({
      title: savedMode === 'clone' ? '已复制为个人日程' : '日程已保存',
      icon: 'success',
    })
  } catch (error: any) {
    console.error('[routine] schedule save failed', error)
    uni.showModal({
      title: savedMode === 'edit' ? '编辑失败' : '新增失败',
      content: getScheduleSaveError(error),
      showCancel: false,
    })
  } finally {
    savingSchedule.value = false
  }
}

function removeScheduleItem(item: ScheduleItem) {
  if (!babyStore.currentBaby || !item.id) return
  uni.showModal({
    title: '删除日程',
    content: `确定删除“${item.activity}”吗？`,
    confirmColor: '#ef4444',
    success: async result => {
      if (!result.confirm) return
      await deleteEgoSchedule(babyStore.currentBaby!.id, item.id!)
      await Promise.all([loadTodayRoutine(), loadGrowthReminderList()])
      uni.showToast({ title: '已删除', icon: 'success' })
    },
  })
}

function handleFeedingSchedule(item: ScheduleItem) {
  if (isFeedingChecked(item)) {
    uni.showToast({ title: `${feedingCheckinText(item)}，无需重复记录`, icon: 'none' })
    return
  }
  goFeeding(item)
}

function goFeeding(item?: ScheduleItem) {
  const params = [`from=routine`, `date=${encodeURIComponent(localDateKey(new Date()))}`]
  if (item) {
    const time = normalizeStartTime(item.time)
    if (time) params.push(`time=${encodeURIComponent(time)}`)
    params.push(`activity=${encodeURIComponent(item.activity)}`)
    if (item.id) params.push(`schedule_id=${encodeURIComponent(String(item.id))}`)
  }
  uni.navigateTo({ url: `/pages/feeding/index?${params.join('&')}` })
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
  const map = { eat: 'heart-fill', sleep: 'clock', active: 'star-fill', care: 'checkmark-circle' }
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

.section-actions {
  display: flex;
  align-items: center;
  gap: 18rpx;
  flex-shrink: 0;
}

.section-action {
  color: #ff9900;
  font-size: 26rpx;
  padding-top: 4rpx;
}

.section-action.secondary {
  color: #667eea;
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
.feeding-entry {
  margin: 0 0 24rpx;
  padding: 24rpx 28rpx;
  border-radius: 20rpx;
  background: #fff7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.feeding-entry-title {
  display: block;
  color: #c2410c;
  font-size: 29rpx;
  font-weight: 800;
}

.feeding-entry-desc {
  display: block;
  margin-top: 6rpx;
  color: #9a6b4f;
  font-size: 23rpx;
}

.empty-schedule {
  padding: 48rpx 20rpx;
  color: #9aa3b5;
  text-align: center;
  font-size: 25rpx;
}

.schedule-actions {
  display: flex;
  justify-content: flex-end;
  gap: 24rpx;
  margin-top: 16rpx;
  color: #667eea;
  font-size: 24rpx;
}

.schedule-actions .danger {
  color: #ef4444;
}

.schedule-actions .checkin-action {
  margin-right: auto;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  color: #fff;
  background: #f97316;
}

.schedule-actions .checkin-action.done {
  color: #15803d;
  background: #dcfce7;
}

.schedule-form-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  background: rgba(15, 23, 42, .46);
}

.schedule-form-card {
  width: 100%;
  max-height: 88vh;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 30rpx 30rpx calc(30rpx + env(safe-area-inset-bottom));
  border-radius: 30rpx 30rpx 0 0;
  background: #fff;
}

.schedule-form-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 26rpx;
}

.schedule-form-title {
  display: block;
  color: #1f2937;
  font-size: 34rpx;
  font-weight: 800;
}

.schedule-form-desc {
  display: block;
  margin-top: 8rpx;
  color: #94a3b8;
  font-size: 22rpx;
  line-height: 1.45;
}

.schedule-form-close {
  padding: 0 6rpx;
  color: #94a3b8;
  font-size: 44rpx;
  line-height: 1;
}

.schedule-field {
  margin-bottom: 22rpx;
}

.schedule-field-label {
  display: block;
  margin-bottom: 10rpx;
  color: #475569;
  font-size: 25rpx;
  font-weight: 700;
}

.schedule-field-hint {
  display: block;
  margin-top: 8rpx;
  color: #94a3b8;
  font-size: 21rpx;
}

.schedule-time-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.schedule-time-row picker {
  flex: 1;
}

.schedule-time-picker {
  display: flex;
  align-items: center;
  min-width: 0;
  height: 82rpx;
  box-sizing: border-box;
  padding: 0 18rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 16rpx;
  background: #f8fafc;
}

.schedule-time-caption {
  margin-right: 12rpx;
  color: #94a3b8;
  font-size: 22rpx;
}

.schedule-time-value {
  flex: 1;
  color: #1f2937;
  font-size: 28rpx;
  font-weight: 700;
}

.schedule-time-separator {
  color: #94a3b8;
  font-size: 23rpx;
}

.schedule-time-row {
  gap: 16rpx;
}

.schedule-time-control {
  flex: 1;
  min-width: 0;
}

.schedule-time-control--active .schedule-time-picker {
  border-color: #ff9900;
  background: #fff7ed;
}

.schedule-time-picker {
  height: 86rpx;
  padding: 0 16rpx;
}

.schedule-time-caption {
  flex-shrink: 0;
  margin-right: 0;
  color: #64748b;
}
.schedule-input,
.schedule-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 2rpx solid #e5e7eb;
  border-radius: 16rpx;
  background: #f8fafc;
  color: #1f2937;
  font-size: 26rpx;
}

.schedule-input {
  height: 82rpx;
  padding: 0 22rpx;
}

.schedule-input[disabled] {
  color: #64748b;
  background: #f1f5f9;
}

.schedule-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.schedule-textarea {
  height: 150rpx;
  padding: 20rpx 22rpx;
  line-height: 1.5;
}

.schedule-textarea.compact {
  height: 120rpx;
}

.schedule-form-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}

.schedule-form-button {
  flex: 1;
  height: 84rpx;
  border-radius: 18rpx;
  font-size: 27rpx;
  line-height: 84rpx;
}

.schedule-form-button::after {
  border: 0;
}

.schedule-form-button.cancel {
  color: #64748b;
  background: #f1f5f9;
}

.schedule-form-button.confirm {
  color: #fff;
  background: linear-gradient(135deg, #ff9900, #f97316);
}
</style>
