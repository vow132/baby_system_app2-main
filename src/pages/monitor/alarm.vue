<template>
  <view class="alarm-page">
    <view class="hero">
      <text class="hero-title">预警规则</text>
      <text class="hero-desc">心率、呼吸、哭声与姿态阈值设置</text>
    </view>

    <view class="summary-card">
      <view>
        <text class="summary-title">看护告警策略</text>
        <text class="summary-desc">规则会用于看护页状态提示、事件记录和家长推送提醒。</text>
      </view>
      <text class="summary-badge">{{ enabledCount }}/{{ visibleRules.length }} 开启</text>
    </view>

    <view class="rule-list">
      <view class="rule-card" v-for="rule in visibleRules" :key="rule.id">
        <view class="rule-head">
          <view class="rule-title-wrap">
            <view class="rule-icon" :style="{ background: getMetricColor(rule.metric) }">
              <u-icon :name="getMetricIcon(rule.metric)" size="22" color="#fff" />
            </view>
            <view>
              <text class="rule-name">{{ rule.rule_name || getMetricName(rule.metric) }}</text>
              <text class="rule-desc">{{ getMetricDesc(rule.metric) }}</text>
            </view>
          </view>
          <u-switch :modelValue="!!rule.push_enabled" @change="value => updateRule(rule.id, { push_enabled: value })" />
        </view>

        <view class="threshold-row">
          <view>
            <text class="threshold-label">告警阈值</text>
            <text class="threshold-help">{{ getThresholdHelp(rule.metric) }}</text>
          </view>
          <view class="stepper">
            <text class="step-btn" @click="changeValue(rule, -1)">-</text>
            <text class="step-value">{{ rule.level_value ?? '--' }}{{ getMetricUnit(rule.metric) }}</text>
            <text class="step-btn" @click="changeValue(rule, 1)">+</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getAlarmRules, updateAlarmRule, type AlarmRule } from '@/api/alarm'

const LOCAL_RULE_KEY = 'monitor_alarm_rules'

type EditableAlarmRule = AlarmRule & {
  metric: string
  level_value: number
  push_enabled: boolean | number
  localOnly?: boolean
}

const defaultRules: EditableAlarmRule[] = [
  { id: -1, metric: 'heart_rate', rule_name: '心率预警', level_value: 130, push_enabled: true, localOnly: true },
  { id: -2, metric: 'breath_rate', rule_name: '呼吸预警', level_value: 45, push_enabled: true, localOnly: true },
  { id: -3, metric: 'cry_level', rule_name: '哭声预警', level_value: 80, push_enabled: true, localOnly: true },
  { id: -4, metric: 'pose_status', rule_name: '姿态预警', level_value: 3, push_enabled: true, localOnly: true },
]

const rules = ref<EditableAlarmRule[]>([])
const loading = ref(false)
const selectedMetric = ref('')

const visibleRules = computed(() => selectedMetric.value ? rules.value.filter(rule => rule.metric === selectedMetric.value) : rules.value)
const enabledCount = computed(() => visibleRules.value.filter(rule => !!rule.push_enabled).length)

onLoad((options) => {
  selectedMetric.value = String(options?.metric || '')
})

onShow(loadRules)

async function loadRules() {
  loading.value = true
  try {
    const res = await getAlarmRules()
    if (res.code === 0 && Array.isArray(res.data) && res.data.length) {
      rules.value = normalizeRules(res.data)
      return
    }
  } catch (e) {
    console.error('[alarm] loadRules', e)
  } finally {
    loading.value = false
  }
  rules.value = loadLocalRules()
}

function normalizeRules(source: AlarmRule[]): EditableAlarmRule[] {
  return source.map((rule, index) => ({
    id: rule.id,
    metric: rule.metric || defaultRules[index]?.metric || 'heart_rate',
    rule_name: rule.rule_name || getMetricName(rule.metric),
    level_value: Number(rule.level_value ?? defaultRules[index]?.level_value ?? 0),
    push_enabled: rule.push_enabled ?? true,
    enabled: rule.enabled,
    updated_at: rule.updated_at,
  }))
}

function loadLocalRules() {
  const saved = uni.getStorageSync(LOCAL_RULE_KEY)
  if (Array.isArray(saved) && saved.length) return normalizeRules(saved)
  return defaultRules.map(rule => ({ ...rule }))
}

function saveLocalRules() {
  uni.setStorageSync(LOCAL_RULE_KEY, rules.value)
}

async function updateRule(ruleId: number, data: { level_value?: number; push_enabled?: boolean }) {
  const target = rules.value.find(item => item.id === ruleId)
  if (!target) return

  Object.assign(target, data)
  saveLocalRules()

  if (target.localOnly || target.id < 0) {
    uni.showToast({ title: '已保存', icon: 'none' })
    return
  }

  try {
    const res = await updateAlarmRule(ruleId, data)
    uni.showToast({ title: res.code === 0 ? '已保存' : (res.message || '保存失败'), icon: 'none' })
  } catch (e) {
    console.error('[alarm] updateRule', e)
    uni.showToast({ title: '已本地保存，待后端同步', icon: 'none' })
  }
}

function changeValue(rule: EditableAlarmRule, delta: number) {
  const step = getMetricStep(rule.metric)
  const next = Math.max(0, Number(rule.level_value || 0) + delta * step)
  updateRule(rule.id, { level_value: next })
}

function getMetricName(metric?: string) {
  const map: Record<string, string> = {
    heart_rate: '心率预警',
    breath_rate: '呼吸预警',
    cry_level: '哭声预警',
    pose_status: '姿态预警',
  }
  return map[metric || ''] || '看护预警'
}

function getMetricDesc(metric?: string) {
  const map: Record<string, string> = {
    heart_rate: '心率超过阈值时提醒家长查看宝宝状态',
    breath_rate: '呼吸频率异常时触发看护提醒',
    cry_level: '哭声音量或持续强度过高时推送提醒',
    pose_status: '趴睡、坐起、站立等姿态风险变化时提醒',
  }
  return map[metric || ''] || '用于看护页告警展示和消息推送'
}

function getThresholdHelp(metric?: string) {
  const map: Record<string, string> = {
    heart_rate: '单位：次/分钟',
    breath_rate: '单位：次/分钟',
    cry_level: '单位：强度分',
    pose_status: '等级：1-5',
  }
  return map[metric || ''] || '超过阈值触发提醒'
}

function getMetricUnit(metric?: string) {
  const map: Record<string, string> = {
    heart_rate: '',
    breath_rate: '',
    cry_level: '',
    pose_status: '级',
  }
  return map[metric || ''] || ''
}

function getMetricStep(metric?: string) {
  const map: Record<string, number> = {
    heart_rate: 5,
    breath_rate: 2,
    cry_level: 5,
    pose_status: 1,
  }
  return map[metric || ''] || 5
}

function getMetricIcon(metric?: string) {
  const map: Record<string, string> = {
    heart_rate: 'heart-fill',
    breath_rate: 'reload',
    cry_level: 'volume-fill',
    pose_status: 'warning-fill',
  }
  return map[metric || ''] || 'bell-fill'
}

function getMetricColor(metric?: string) {
  const map: Record<string, string> = {
    heart_rate: 'linear-gradient(135deg, #ef4444, #f97316)',
    breath_rate: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    cry_level: 'linear-gradient(135deg, #f59e0b, #f97316)',
    pose_status: 'linear-gradient(135deg, #8b5cf6, #6d5dfc)',
  }
  return map[metric || ''] || 'linear-gradient(135deg, #64748b, #475569)'
}
</script>

<style lang="scss" scoped>
.alarm-page { min-height: 100vh; background: #f5f6fa; padding: 24rpx 30rpx 50rpx; }
.hero { padding: 34rpx 30rpx; border-radius: 22rpx; background: linear-gradient(135deg, #ef4444, #f97316); color: #fff; margin-bottom: 24rpx; }
.hero-title { display: block; font-size: 42rpx; font-weight: 800; }
.hero-desc { display: block; margin-top: 10rpx; font-size: 26rpx; opacity: .88; }
.summary-card { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; background: #fff; border-radius: 18rpx; padding: 24rpx; margin-bottom: 20rpx; }
.summary-title { display: block; color: #252b3a; font-size: 30rpx; font-weight: 700; }
.summary-desc { display: block; color: #8a94a6; font-size: 23rpx; line-height: 1.45; margin-top: 8rpx; }
.summary-badge { flex-shrink: 0; color: #ef4444; background: #fff1f2; padding: 8rpx 16rpx; border-radius: 999rpx; font-size: 23rpx; font-weight: 700; }
.rule-list { display: flex; flex-direction: column; gap: 18rpx; }
.rule-card { background: #fff; border-radius: 20rpx; padding: 26rpx; }
.rule-head, .threshold-row { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }
.rule-title-wrap { display: flex; align-items: center; gap: 18rpx; min-width: 0; }
.rule-icon { width: 58rpx; height: 58rpx; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rule-name { display: block; color: #252b3a; font-size: 31rpx; font-weight: 700; }
.rule-desc { display: block; color: #8a94a6; font-size: 24rpx; margin-top: 8rpx; line-height: 1.4; }
.threshold-row { margin-top: 24rpx; padding-top: 22rpx; border-top: 1rpx solid #f0f2f7; }
.threshold-label { display: block; color: #666; font-size: 26rpx; }
.threshold-help { display: block; color: #a2a9b8; font-size: 22rpx; margin-top: 6rpx; }
.stepper { display: flex; align-items: center; background: #f7f8fc; border-radius: 999rpx; overflow: hidden; flex-shrink: 0; }
.step-btn { width: 64rpx; height: 56rpx; line-height: 56rpx; text-align: center; color: #5677fc; font-size: 34rpx; font-weight: 700; }
.step-value { min-width: 86rpx; text-align: center; color: #252b3a; font-size: 28rpx; font-weight: 700; }
</style>
