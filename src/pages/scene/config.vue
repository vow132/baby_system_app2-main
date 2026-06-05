<template>
  <view class="config-page">
    <view class="hero">
      <text class="hero-title">场景联动配置</text>
      <text class="hero-sub">按分级管理每个场景的灯光、声音和小程序响应</text>
    </view>

    <view class="group-card" v-for="group in groupedConfigs" :key="group.key">
      <text class="group-title">{{ group.title }}</text>

      <view class="scene-card" v-for="scene in group.items" :key="scene.key">
        <view class="scene-head">
          <view class="sh-left">
            <text class="scene-name">{{ scene.name }}</text>
            <text class="scene-level" :class="scene.levelKey">{{ scene.levelText }}</text>
          </view>
          <u-switch v-model="scene.enabled" size="18" activeColor="#175cd3" @change="saveConfig" />
        </view>

        <view class="action-grid" v-if="scene.enabled">
          <view class="action-item" v-for="action in scene.actions" :key="action.key">
            <text class="action-label">{{ action.label }}</text>
            <u-switch v-model="action.on" size="16" activeColor="#175cd3" @change="saveConfig" />
          </view>
        </view>
      </view>
    </view>

    <view class="save-bar">
      <u-button type="primary" text="保存配置" :loading="saving" @click="saveConfig" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import { onShow } from "@dcloudio/uni-app"
import { getPassiveEventTypes, updatePassiveEventType, type PassiveEventType } from "@/api/monitor"

type LevelKey = "silent" | "normal" | "urgent" | "emergency"
type GroupKey = "sleep" | "cry" | "danger" | "growth"

interface ActionConfig {
  key: string
  label: string
  on: boolean
}

interface SceneConfig {
  key: string
  eventTypeId?: number
  group: GroupKey
  name: string
  levelKey: LevelKey
  levelText: string
  enabled: boolean
  actions: ActionConfig[]
}

const saving = ref(false)
const storageKey = "scene_config_v2"

const sceneConfigs = reactive<SceneConfig[]>([
  {
    key: "sleep",
    group: "sleep",
    name: "熟睡",
    levelKey: "silent",
    levelText: "静默记录",
    enabled: true,
    actions: [
      { key: "light", label: "夜间低亮度", on: true },
      { key: "sound", label: "白噪音维持", on: false },
      { key: "app", label: "次日睡眠日报", on: true }
    ]
  },
  {
    key: "side_sleep",
    group: "sleep",
    name: "侧睡/趴睡提醒",
    levelKey: "urgent",
    levelText: "需要关注",
    enabled: true,
    actions: [
      { key: "light", label: "微光渐亮", on: true },
      { key: "sound", label: "翻身引导语音", on: true },
      { key: "app", label: "推送姿势告警", on: true }
    ]
  },
  {
    key: "wake",
    group: "sleep",
    name: "苏醒",
    levelKey: "normal",
    levelText: "建议响应",
    enabled: true,
    actions: [
      { key: "light", label: "晨光模式", on: true },
      { key: "sound", label: "晨起问候音", on: true },
      { key: "app", label: "EASY建议", on: true }
    ]
  },
  {
    key: "cry1",
    group: "cry",
    name: "哭闹1级",
    levelKey: "silent",
    levelText: "静默记录",
    enabled: true,
    actions: [
      { key: "sound", label: "低音量安抚", on: true },
      { key: "app", label: "静默通知", on: true }
    ]
  },
  {
    key: "cry2",
    group: "cry",
    name: "哭闹2级",
    levelKey: "normal",
    levelText: "建议响应",
    enabled: true,
    actions: [
      { key: "light", label: "亮屏提示", on: true },
      { key: "sound", label: "摇篮曲+安抚音", on: true },
      { key: "app", label: "双向通话入口", on: true }
    ]
  },
  {
    key: "cry3",
    group: "cry",
    name: "哭闹3级",
    levelKey: "urgent",
    levelText: "高优先级",
    enabled: true,
    actions: [
      { key: "light", label: "橙色警示", on: true },
      { key: "sound", label: "停止背景音", on: true },
      { key: "app", label: "强提醒弹窗", on: true }
    ]
  },
  {
    key: "danger_apnea",
    group: "danger",
    name: "呼吸暂停",
    levelKey: "emergency",
    levelText: "最高级告警",
    enabled: true,
    actions: [
      { key: "light", label: "全红预警", on: true },
      { key: "sound", label: "蜂鸣警报", on: true },
      { key: "app", label: "紧急联系人", on: true }
    ]
  },
  {
    key: "danger_roll",
    group: "danger",
    name: "床边翻身",
    levelKey: "emergency",
    levelText: "最高级告警",
    enabled: true,
    actions: [
      { key: "light", label: "床边红框", on: true },
      { key: "sound", label: "急促指令音", on: true },
      { key: "app", label: "坠床预警", on: true }
    ]
  },
  {
    key: "danger_climb",
    group: "danger",
    name: "翻床",
    levelKey: "emergency",
    levelText: "最高级告警",
    enabled: true,
    actions: [
      { key: "light", label: "高频闪烁", on: true },
      { key: "sound", label: "高优先级警示", on: true },
      { key: "app", label: "录像并推送", on: true }
    ]
  },
  {
    key: "danger_reach",
    group: "danger",
    name: "探出床外",
    levelKey: "emergency",
    levelText: "最高级告警",
    enabled: true,
    actions: [
      { key: "light", label: "红色锁定", on: true },
      { key: "sound", label: "远程喊话", on: true },
      { key: "app", label: "紧急弹窗", on: true }
    ]
  },
  {
    key: "danger_stand",
    group: "danger",
    name: "站立",
    levelKey: "urgent",
    levelText: "需要关注",
    enabled: true,
    actions: [
      { key: "light", label: "警示灯语", on: true },
      { key: "sound", label: "坐下提醒", on: true },
      { key: "app", label: "床垫高度提醒", on: true }
    ]
  },
  {
    key: "happy_smile",
    group: "growth",
    name: "互动表情",
    levelKey: "silent",
    levelText: "激励记录",
    enabled: true,
    actions: [
      { key: "light", label: "彩虹氛围灯", on: true },
      { key: "sound", label: "欢快反馈音", on: true },
      { key: "app", label: "心情统计", on: true }
    ]
  },
  {
    key: "happy_milestone",
    group: "growth",
    name: "教育里程碑",
    levelKey: "silent",
    levelText: "激励记录",
    enabled: true,
    actions: [
      { key: "light", label: "庆祝灯效", on: true },
      { key: "sound", label: "掌声夸奖", on: true },
      { key: "app", label: "成长卡片", on: true }
    ]
  }
])

function isSuccess(code: number) {
  return code === 0 || code === 200
}

function backendGroup(category?: string | null): GroupKey {
  const value = (category || "").toLowerCase()
  if (value.includes("cry")) return "cry"
  if (value.includes("danger") || value.includes("risk")) return "danger"
  if (value.includes("play") || value.includes("wake") || value.includes("happy")) return "growth"
  return "sleep"
}

function priorityToLevel(priority?: number | null): LevelKey {
  const value = priority ?? 0
  if (value >= 9) return "emergency"
  if (value >= 6) return "urgent"
  if (value >= 3) return "normal"
  return "silent"
}

function priorityToLevelText(priority?: number | null) {
  const value = priority ?? 0
  if (value >= 9) return "最高级告警"
  if (value >= 6) return "高优先级"
  if (value >= 3) return "建议响应"
  return "静默记录"
}

function responseAction(key: string, label: string, value?: string | null): ActionConfig {
  return {
    key,
    label: value || label,
    on: Boolean(value)
  }
}

function eventTypeToConfig(item: PassiveEventType): SceneConfig {
  return {
    key: item.event_code || `event-${item.id}`,
    eventTypeId: item.id,
    group: backendGroup(item.category),
    name: item.event_name || item.event_code || `事件${item.id}`,
    levelKey: priorityToLevel(item.priority),
    levelText: priorityToLevelText(item.priority),
    enabled: item.is_active !== 0,
    actions: [
      responseAction("light", "灯光/屏幕响应", item.screen_response),
      responseAction("sound", "声音响应", item.sound_response),
      responseAction("app", "小程序推送", item.app_response)
    ]
  }
}

const groupedConfigs = computed(() => {
  const groups: Array<{ key: GroupKey; title: string; items: SceneConfig[] }> = [
    { key: "sleep", title: "睡眠类", items: [] },
    { key: "cry", title: "哭闹类", items: [] },
    { key: "danger", title: "危险动作", items: [] },
    { key: "growth", title: "互动成长", items: [] }
  ]
  sceneConfigs.forEach((item) => {
    const group = groups.find((entry) => entry.key === item.group)
    if (group) group.items.push(item)
  })
  return groups
})

async function syncBackendConfig() {
  const updates = sceneConfigs
    .filter((scene) => scene.eventTypeId)
    .map((scene) => updatePassiveEventType(scene.eventTypeId!, {
      is_active: scene.enabled ? 1 : 0,
      screen_response: scene.actions.find((action) => action.key === "light" && action.on)?.label || "",
      sound_response: scene.actions.find((action) => action.key === "sound" && action.on)?.label || "",
      app_response: scene.actions.find((action) => action.key === "app" && action.on)?.label || ""
    }))

  if (updates.length) {
    await Promise.all(updates)
  }
}

function saveConfig() {
  saving.value = true
  const payload = sceneConfigs.map((scene) => ({
    key: scene.key,
    eventTypeId: scene.eventTypeId,
    enabled: scene.enabled,
    actions: scene.actions.reduce<Record<string, boolean>>((acc, action) => {
      acc[action.key] = action.on
      return acc
    }, {})
  }))
  uni.setStorageSync(storageKey, JSON.stringify(payload))
  syncBackendConfig().catch(() => {
    // The local copy is kept when the server is unavailable.
  })
  setTimeout(() => {
    saving.value = false
    uni.showToast({ title: "配置已保存", icon: "success" })
  }, 350)
}

function loadConfig() {
  const raw = uni.getStorageSync(storageKey)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as Array<{ key: string; eventTypeId?: number; enabled: boolean; actions: Record<string, boolean> }>
    sceneConfigs.forEach((scene) => {
      const saved = parsed.find((entry) => entry.key === scene.key)
      if (!saved) return
      scene.eventTypeId = saved.eventTypeId || scene.eventTypeId
      scene.enabled = saved.enabled
      scene.actions.forEach((action) => {
        if (saved.actions[action.key] !== undefined) {
          action.on = Boolean(saved.actions[action.key])
        }
      })
    })
  } catch {
    uni.removeStorageSync(storageKey)
  }
}

async function loadRemoteConfig() {
  try {
    const res = await getPassiveEventTypes(undefined, true)
    if (!isSuccess(res.code) || !Array.isArray(res.data)) return
    sceneConfigs.splice(0, sceneConfigs.length, ...res.data.map(eventTypeToConfig))
  } catch {
    // Keep local/fallback config while the server is unavailable.
  }
}

onShow(() => {
  loadConfig()
  loadRemoteConfig()
})
</script>

<style lang="scss" scoped>
.config-page {
  min-height: 100vh;
  background: #f2f4f7;
  padding: 20rpx 24rpx 120rpx;
}

.hero {
  border-radius: 18rpx;
  background: linear-gradient(140deg, #175cd3, #1849a9);
  color: #ffffff;
  padding: 24rpx;
}

.hero-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
}

.hero-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 23rpx;
  line-height: 1.45;
  opacity: 0.92;
}

.group-card {
  margin-top: 12rpx;
  border-radius: 16rpx;
  background: #ffffff;
  border: 1rpx solid #eaecf0;
  padding: 16rpx;
}

.group-title {
  display: block;
  font-size: 26rpx;
  color: #344054;
  font-weight: 700;
  margin-bottom: 8rpx;
}

.scene-card {
  border-top: 1rpx solid #f2f4f7;
  padding: 12rpx 0;
}

.scene-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10rpx;
}

.sh-left {
  min-width: 0;
}

.scene-name {
  display: block;
  font-size: 25rpx;
  color: #101828;
  font-weight: 700;
}

.scene-level {
  display: inline-block;
  margin-top: 4rpx;
  padding: 3rpx 10rpx;
  border-radius: 999rpx;
  font-size: 19rpx;
  color: #175cd3;
  background: #d1e9ff;
}

.scene-level.normal {
  color: #027a48;
  background: #d1fadf;
}

.scene-level.urgent {
  color: #b54708;
  background: #fef0c7;
}

.scene-level.emergency {
  color: #b42318;
  background: #fee4e2;
}

.action-grid {
  margin-top: 10rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10rpx;
}

.action-item {
  border: 1rpx solid #eaecf0;
  border-radius: 10rpx;
  padding: 10rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8rpx;
}

.action-label {
  font-size: 22rpx;
  line-height: 1.4;
  color: #344054;
}

.save-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 1rpx solid #eaecf0;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
}
</style>
