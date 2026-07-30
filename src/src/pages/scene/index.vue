<template>
  <view class="scene-page">
    <view class="top-bar">
      <view>
        <text class="title">场景联动</text>
        <text class="sub">2.2 场景分级响应 · 实时守护</text>
      </view>
      <view class="mode-wrap">
        <view class="mode-badge" :class="{ active: autoMode }">
          <view class="mode-dot" />
          <text class="mode-text">{{ autoMode ? "自动识别中" : "手动模式" }}</text>
        </view>
        <u-switch v-model="autoMode" size="20" activeColor="#3b82f6" @change="onModeChange" />
      </view>
    </view>

    <view class="status-card" :class="currentScene.levelKey">
      <view class="status-main">
        <view class="scene-orb" :class="currentScene.levelKey">
          <view class="orb-ring" />
          <u-icon :name="currentScene.icon" size="32" color="#fff" />
        </view>
        <view class="scene-copy">
          <view class="scene-line">
            <text class="scene-name">{{ currentScene.name }}</text>
            <text class="level-tag" :class="currentScene.levelKey">{{ currentScene.levelText }}</text>
          </view>
          <text class="scene-status">{{ currentScene.status }}</text>
        </view>
      </view>

      <view class="vital-row">
        <view class="vital-item">
          <view class="vital-icon-wrap" style="background: #fef2f2">
            <u-icon name="heart-fill" size="18" color="#ef4444" />
          </view>
          <view class="vital-info">
            <text class="vital-value">{{ currentScene.vitals.heart }}</text>
            <text class="vital-key">心率 bpm</text>
          </view>
        </view>
        <view class="vital-item">
          <view class="vital-icon-wrap" style="background: #f0f9ff">
            <u-icon name="volume-fill" size="18" color="#0ea5e9" />
          </view>
          <view class="vital-info">
            <text class="vital-value">{{ currentScene.vitals.breath }}</text>
            <text class="vital-key">呼吸</text>
          </view>
        </view>
        <view class="vital-item">
          <view class="vital-icon-wrap" style="background: #f1f5f9">
            <u-icon name="eye-fill" size="18" color="#64748b" />
          </view>
          <view class="vital-info">
            <text class="vital-value">{{ currentScene.vitals.confidence }}</text>
            <text class="vital-key">置信度</text>
          </view>
        </view>
      </view>

      <view class="trigger-line" @click="showDetailPopup">
        <view class="trigger-dot" :class="currentScene.levelKey" />
        <text>{{ currentScene.trigger }}</text>
        <u-icon name="arrow-right" size="12" color="#98a2b3" />
      </view>
    </view>

    <!-- 自动识别结果面板 -->
    <view v-if="autoMode" class="classify-card">
      <view class="classify-header">
        <u-icon name="scan" size="18" color="#3b82f6" />
        <text class="classify-title">实时识别</text>
      </view>
      <view v-if="classifyResult" class="classify-content">
        <view class="classify-item">
          <text class="classify-label">场景</text>
          <text class="classify-value">{{ classifyResult.scene_type }}</text>
        </view>
        <view class="classify-item">
          <text class="classify-label">置信度</text>
          <text class="classify-value">{{ (classifyResult.confidence * 100).toFixed(1) }}%</text>
        </view>
        <view class="classify-item">
          <text class="classify-label">触发因素</text>
          <text class="classify-value">{{ classifyResult.triggers?.join(', ') || '—' }}</text>
        </view>
      </view>
      <view v-else class="classify-empty">
        <text>等待识别...</text>
      </view>
    </view>

    <view class="action-row">
      <view class="action-btn primary" @click="triggerRandomScene">
        <u-icon name="reload" size="16" color="#fff" />
        <text>模拟</text>
      </view>
      <view class="action-btn danger" @click="triggerScene('danger_apnea')">
        <u-icon name="warning-fill" size="16" color="#b91c1c" />
        <text>高危</text>
      </view>
    </view>

    <view class="panel compact">
      <view class="section-head">
        <text class="panel-title">响应动作</text>
        <text class="section-note">{{ notificationText }}</text>
      </view>
      <view class="response-grid">
        <view class="response-item">
          <view class="response-icon light">
            <u-icon name="star-fill" size="20" color="#fff" />
          </view>
          <text class="response-label">灯语</text>
          <text class="response-value">{{ currentScene.actions.light }}</text>
        </view>
        <view class="response-item">
          <view class="response-icon sound">
            <u-icon name="play-circle-fill" size="20" color="#fff" />
          </view>
          <text class="response-label">屏幕动画</text>
          <text class="response-value">{{ currentScene.actions.sound }}</text>
        </view>
        <view class="response-item">
          <view class="response-icon notice">
            <u-icon name="bell-fill" size="20" color="#fff" />
          </view>
          <text class="response-label">App提醒</text>
          <text class="response-value">{{ currentScene.actions.app }}</text>
        </view>
      </view>
    </view>

    <view class="panel">
      <view class="section-head">
        <text class="panel-title">场景分类速览</text>
        <text class="section-note">5类 · 12场景</text>
      </view>
      <view class="category-grid">
        <view
          v-for="item in categoryList"
          :key="item.key"
          class="category-item"
          :class="[item.key, { active: item.key === activeCategoryKey }]"
          @click="activeCategoryKey = item.key"
        >
          <view class="category-icon" :class="item.key">
            <u-icon :name="item.icon" size="22" color="#fff" />
          </view>
          <text class="category-name">{{ item.name }}</text>
          <text class="category-note">{{ item.note }}</text>
        </view>
      </view>
    </view>

    <view class="panel">
      <view class="section-head">
        <text class="panel-title">{{ activeCategory.name }}</text>
        <text class="section-note">{{ activeCategoryScenes.length }}个场景</text>
      </view>
      <view class="detail-grid">
        <view
          v-for="scene in activeCategoryScenes"
          :key="scene.key"
          class="detail-item"
          :class="{ active: scene.key === currentSceneKey }"
          @click="triggerScene(scene.key)"
        >
          <view class="detail-icon-wrap" :class="scene.levelKey">
            <u-icon :name="scene.icon" size="20" color="#fff" />
          </view>
          <text class="detail-name">{{ scene.name }}</text>
        </view>
      </view>
    </view>

    <view class="panel">
      <view class="section-head">
        <text class="panel-title">场景变更记录</text>
        <text class="section-note">近{{ visibleHistory.length }}条</text>
      </view>
      <view v-for="record in visibleHistory" :key="record.id" class="record-item">
        <view class="record-icon" :style="{ background: record.color + '18' }">
          <u-icon :name="record.icon" size="18" :color="record.color" />
        </view>
        <text class="record-scene">{{ record.scene }}</text>
        <text class="record-time">{{ record.time }}</text>
      </view>
      <view v-if="visibleHistory.length === 0" class="record-empty">
        <u-icon name="clock" size="28" color="#d0d5dd" />
        <text>暂无变更记录</text>
      </view>
    </view>

    <view class="config-entry" @click="goConfig">
      <u-icon name="setting" size="16" color="#475467" />
      <text>场景联动配置</text>
      <u-icon name="arrow-right" size="14" color="#98a2b3" />
    </view>

    <u-popup
      :show="popupVisible"
      mode="center"
      round="18"
      :closeable="false"
      :custom-style="{ width: '640rpx', padding: 0 }"
      @close="closePopup"
    >
      <view class="popup-card" :class="currentScene.levelKey">
        <view class="popup-banner" :class="currentScene.levelKey">
          <view class="popup-icon" :class="currentScene.levelKey">
            <u-icon :name="currentScene.icon" size="32" color="#fff" />
          </view>
          <view class="popup-copy">
            <text class="popup-title">{{ popupTitle }}</text>
            <text class="popup-sub">{{ currentScene.status }}</text>
          </view>
        </view>

        <view class="popup-actions">
          <view class="popup-action">
            <view class="pa-icon light">
              <u-icon name="star-fill" size="16" color="#fff" />
            </view>
            <text class="pa-label">灯语</text>
            <text class="pa-value">{{ currentScene.actions.light }}</text>
          </view>
          <view class="popup-action">
            <view class="pa-icon sound">
              <u-icon name="play-circle-fill" size="16" color="#fff" />
            </view>
            <text class="pa-label">屏幕动画</text>
            <text class="pa-value">{{ currentScene.actions.sound }}</text>
          </view>
          <view class="popup-action">
            <view class="pa-icon notice">
              <u-icon name="bell-fill" size="16" color="#fff" />
            </view>
            <text class="pa-label">App提醒</text>
            <text class="pa-value">{{ currentScene.actions.app }}</text>
          </view>
        </view>

        <view class="popup-footer">
          <view class="popup-btn primary" @click="handlePrimaryAction">
            <u-icon :name="primaryAction.icon" size="18" color="#fff" />
            <text>{{ primaryAction.text }}</text>
          </view>
          <view class="popup-btn" @click="closePopup">
            <u-icon name="checkmark-circle" size="18" color="#475467" />
            <text>知道了</text>
          </view>
        </view>
      </view>
    </u-popup>
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useBabyStore } from "@/stores"
import {
  getPassiveEventTypes,
  getResponseHistory,
  triggerResponse,
  getSceneClassify,
  executeSceneResponse,
  type PassiveEventType,
  type MonitoringEvent,
  type SceneClassifyResult,
} from "@/api/monitor"

type LevelKey = "silent" | "normal" | "urgent" | "emergency"
type CategoryKey = "sleep" | "wake" | "cry" | "danger" | "happy"

interface SceneActionMap {
  light: string
  sound: string
  app: string
}

interface SceneItem {
  key: string
  category: CategoryKey
  name: string
  icon: string
  levelKey: LevelKey
  levelText: string
  status: string
  trigger: string
  notice: string
  actions: SceneActionMap
  vitals: { heart: string; breath: string; confidence: string }
  eventTypeId?: number
}

interface CategoryEntry {
  key: CategoryKey
  name: string
  note: string
  icon: string
}

interface HistoryItem {
  id: number
  scene: string
  icon: string
  color: string
  time: string
}

// ====== 兜底数据（后端不可用时使用） ======
const fallbackCategories: CategoryEntry[] = [
  { key: "sleep", name: "熟睡", note: "记录", icon: "clock-fill" },
  { key: "wake", name: "苏醒", note: "建议", icon: "eye-fill" },
  { key: "cry", name: "哭闹", note: "分级", icon: "volume-fill" },
  { key: "danger", name: "危险动作", note: "告警", icon: "warning-fill" },
  { key: "happy", name: "高兴玩耍", note: "留存", icon: "heart-fill" },
]

const fallbackScenes: SceneItem[] = [
  { key: "sleep", category: "sleep", name: "熟睡", icon: "clock-fill", levelKey: "silent", levelText: "静默", status: "安静睡眠中", trigger: "呼吸稳定，位移小，环境低噪声", notice: "次日报告", actions: { light: "低亮", sound: "安静", app: "日报" }, vitals: { heart: "102", breath: "平稳", confidence: "93%" } },
  { key: "wake", category: "wake", name: "苏醒", icon: "eye-fill", levelKey: "normal", levelText: "建议", status: "宝宝醒啦", trigger: "睁眼，伸展，轻微哼声", notice: "轻提醒", actions: { light: "晨光", sound: "问候", app: "EASY" }, vitals: { heart: "112", breath: "正常", confidence: "89%" } },
  { key: "cry1", category: "cry", name: "哭闹1级", icon: "volume", levelKey: "silent", levelText: "静默", status: "轻微哼唧", trigger: "40-55dB，体征平稳", notice: "静默", actions: { light: "无", sound: "轻哄", app: "观察" }, vitals: { heart: "118", breath: "平稳", confidence: "90%" } },
  { key: "cry2", category: "cry", name: "哭闹2级", icon: "volume-fill", levelKey: "normal", levelText: "建议", status: "有明确需求", trigger: "55-70dB，伴随动作", notice: "弹窗", actions: { light: "亮屏", sound: "安抚", app: "通话" }, vitals: { heart: "126", breath: "偏快", confidence: "92%" } },
  { key: "cry3", category: "cry", name: "哭闹3级", icon: "error-circle-fill", levelKey: "urgent", levelText: "高优先", status: "持续大哭", trigger: ">75dB，心率上升", notice: "强提醒", actions: { light: "橙闪", sound: "强哄", app: "强提醒" }, vitals: { heart: "136", breath: "急促", confidence: "95%" } },
  { key: "danger_apnea", category: "danger", name: "呼吸暂停", icon: "warning-fill", levelKey: "emergency", levelText: "紧急", status: "立即介入", trigger: "呼吸<10次/分，心率异常", notice: "紧急联系人", actions: { light: "全红", sound: "蜂鸣", app: "联系人" }, vitals: { heart: "48", breath: "异常", confidence: "97%" } },
  { key: "danger_roll", category: "danger", name: "床边翻身", icon: "warning-fill", levelKey: "emergency", levelText: "紧急", status: "坠床风险", trigger: "床边区域翻身角度过大", notice: "强弹窗", actions: { light: "红框", sound: "指令", app: "预警" }, vitals: { heart: "132", breath: "偏快", confidence: "94%" } },
  { key: "danger_climb", category: "danger", name: "翻床", icon: "warning-fill", levelKey: "emergency", levelText: "紧急", status: "翻越风险", trigger: "躯干高度超过围栏阈值", notice: "录像推送", actions: { light: "红闪", sound: "警示", app: "录像" }, vitals: { heart: "139", breath: "异常", confidence: "96%" } },
  { key: "danger_reach", category: "danger", name: "探出床外", icon: "warning-fill", levelKey: "emergency", levelText: "紧急", status: "身体越界", trigger: "头部或上半身投影越界", notice: "紧急弹窗", actions: { light: "锁定", sound: "喊话", app: "弹窗" }, vitals: { heart: "141", breath: "异常", confidence: "96%" } },
  { key: "danger_stand", category: "danger", name: "站立", icon: "warning", levelKey: "urgent", levelText: "关注", status: "注意防跌", trigger: "坐卧转站立，头高超阈值", notice: "提醒", actions: { light: "警示", sound: "坐下", app: "床垫" }, vitals: { heart: "128", breath: "偏快", confidence: "92%" } },
  { key: "happy_smile", category: "happy", name: "互动表情", icon: "heart-fill", levelKey: "silent", levelText: "记录", status: "捕捉到笑容", trigger: "微笑持续并伴随笑声", notice: "成长记录", actions: { light: "彩虹", sound: "短乐", app: "微笑" }, vitals: { heart: "110", breath: "平稳", confidence: "88%" } },
  { key: "happy_milestone", category: "happy", name: "教育", icon: "photo-fill", levelKey: "silent", levelText: "记录", status: "里程碑动作", trigger: "翻身/独坐/精准抓握达阈值", notice: "成长卡片", actions: { light: "庆祝", sound: "掌声", app: "卡片" }, vitals: { heart: "114", breath: "平稳", confidence: "90%" } },
]

// ====== 状态 ======
const babyStore = useBabyStore()
const currentSceneKey = ref<string>("sleep")
const activeCategoryKey = ref<CategoryKey>("sleep")
const simRunning = ref<boolean>(true)
const popupVisible = ref<boolean>(false)
const dataReady = ref(false)

// 自动模式状态
const autoMode = ref<boolean>(false)
const classifyResult = ref<SceneClassifyResult | null>(null)
let classifyTimer: ReturnType<typeof setInterval> | null = null

// 远端数据
const remoteCategoryList = ref<CategoryEntry[]>([])
const remoteSceneList = ref<SceneItem[]>([])
const responseHistory = ref<HistoryItem[]>([])

let timer: ReturnType<typeof setInterval> | null = null

// ====== 数据选择：远端优先 ======
const categoryList = computed(() => remoteCategoryList.value.length ? remoteCategoryList.value : fallbackCategories)
const scenes = computed(() => remoteSceneList.value.length ? remoteSceneList.value : fallbackScenes)
const sceneMap = computed(() => Object.fromEntries(scenes.value.map((item) => [item.key, item])) as Record<string, SceneItem>)
const currentScene = computed(() => sceneMap.value[currentSceneKey.value] ?? scenes.value[0])
const activeCategory = computed(() => categoryList.value.find((item) => item.key === activeCategoryKey.value) ?? categoryList.value[0])
const activeCategoryScenes = computed(() => scenes.value.filter((item) => item.category === activeCategoryKey.value))
const visibleHistory = computed(() => responseHistory.value.slice(0, 3))
const notificationText = computed(() => currentScene.value.notice)
const popupTitle = computed(() => {
  if (currentScene.value.levelKey === "emergency") return "紧急响应"
  if (currentScene.value.levelKey === "urgent") return "需要关注"
  return "建议响应"
})
const primaryAction = computed(() => {
  if (currentScene.value.levelKey === "emergency") return { text: "查看画面", icon: "camera" }
  if (currentScene.value.levelKey === "urgent") return { text: "去处理", icon: "checkmark-circle" }
  return { text: "查看建议", icon: "calendar" }
})

// ====== 工具函数 ======
function isSuccess(code: number) {
  return code === 0 || code === 200
}

function levelColor(level: LevelKey) {
  if (level === "emergency") return "#dc2626"
  if (level === "urgent") return "#f59e0b"
  if (level === "normal") return "#16a34a"
  return "#2563eb"
}

function shouldPopup(scene: SceneItem) {
  return scene.levelKey === "normal" || scene.levelKey === "urgent" || scene.levelKey === "emergency"
}

function recordHistory(scene: SceneItem) {
  const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  responseHistory.value.unshift({
    id: Date.now(),
    scene: scene.name,
    icon: scene.icon,
    color: levelColor(scene.levelKey),
    time,
  })
  if (responseHistory.value.length > 20) responseHistory.value.pop()
}

function priorityToLevel(priority: number): LevelKey {
  if (priority >= 9) return "emergency"
  if (priority >= 6) return "urgent"
  if (priority >= 3) return "normal"
  return "silent"
}

function priorityToLevelText(priority: number): string {
  if (priority >= 9) return "紧急"
  if (priority >= 6) return "高优先"
  if (priority >= 3) return "建议"
  return "静默"
}

function mapCategory(backendCategory: string | null): CategoryKey {
  if (!backendCategory) return "sleep"
  const lower = backendCategory.toLowerCase()
  if (lower.includes("wake") || lower.includes("awake")) return "wake"
  if (lower.includes("cry")) return "cry"
  if (lower.includes("danger") || lower.includes("risk")) return "danger"
  if (lower.includes("happy") || lower.includes("play")) return "happy"
  return "sleep"
}

function categoryIcon(cat: CategoryKey): string {
  const map: Record<CategoryKey, string> = { sleep: "clock-fill", wake: "eye-fill", cry: "volume-fill", danger: "warning-fill", happy: "heart-fill" }
  return map[cat] || "clock-fill"
}

function categoryNote(cat: CategoryKey): string {
  const map: Record<CategoryKey, string> = { sleep: "记录", wake: "建议", cry: "分级", danger: "告警", happy: "留存" }
  return map[cat] || ""
}

function categoryName(cat: CategoryKey): string {
  const map: Record<CategoryKey, string> = { sleep: "熟睡", wake: "苏醒", cry: "哭闹", danger: "危险动作", happy: "高兴玩耍" }
  return map[cat] || cat
}

/** 把后端 PassiveEventType 转成前端 SceneItem */
function eventTypeToScene(et: PassiveEventType): SceneItem {
  const cat = mapCategory(et.category)
  return {
    key: et.event_code || `et-${et.id}`,
    category: cat,
    name: et.event_name || et.event_code,
    icon: categoryIcon(cat),
    levelKey: priorityToLevel(et.priority),
    levelText: priorityToLevelText(et.priority),
    status: et.trigger_desc || et.event_name,
    trigger: et.trigger_desc || "",
    notice: et.app_response || "",
    actions: {
      light: et.screen_response || "—",
      sound: et.sound_response || "—",
      app: et.app_response || "—",
    },
    vitals: { heart: "—", breath: "—", confidence: "—" },
    eventTypeId: et.id,
  }
}

// ====== API 调用 ======
async function fetchEventTypes() {
  try {
    const res = await getPassiveEventTypes()
    if (!isSuccess(res.code) || !Array.isArray(res.data)) return

    const types: PassiveEventType[] = res.data
    // 去重分类
    const catMap = new Map<CategoryKey, CategoryEntry>()
    const sceneArr: SceneItem[] = []

    for (const et of types) {
      const cat = mapCategory(et.category)
      if (!catMap.has(cat)) {
        catMap.set(cat, { key: cat, name: categoryName(cat), note: categoryNote(cat), icon: categoryIcon(cat) })
      }
      sceneArr.push(eventTypeToScene(et))
    }

    remoteCategoryList.value = Array.from(catMap.values())
    remoteSceneList.value = sceneArr
    dataReady.value = true
  } catch {
    // 后端不可用时使用 fallback 数据
  }
}

async function fetchHistory() {
  if (!babyStore.currentBaby?.id) return
  try {
    const res = await getResponseHistory({ baby_id: babyStore.currentBaby.id, page: 1, page_size: 10 })
    if (!isSuccess(res.code) || !res.data?.items) return

    responseHistory.value = (res.data.items as MonitoringEvent[]).map((ev) => {
      const scene = sceneMap.value[ev.event_type_id?.toString()] || scenes.value.find(s => s.eventTypeId === ev.event_type_id)
      return {
        id: ev.id,
        scene: scene?.name || ev.event_type_id?.toString() || "未知场景",
        icon: scene?.icon || "info-circle",
        color: levelColor(priorityToLevel(ev.event_level ?? 3)),
        time: ev.detected_at ? new Date(ev.detected_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "--:--",
      }
    })
  } catch {
    // 后端不可用时不报错
  }
}

// ====== 场景切换 ======
async function triggerScene(sceneKey: string) {
  const next = sceneMap.value[sceneKey]
  if (!next) return

  currentSceneKey.value = sceneKey
  activeCategoryKey.value = next.category
  popupVisible.value = shouldPopup(next)

  if (next.levelKey === "urgent" || next.levelKey === "emergency") {
    try { uni.vibrateLong() } catch {}
  }

  // 记录本地历史（即时响应）
  recordHistory(next)

  // 如果关联了事件类型ID，调用后端触发
  if (next.eventTypeId && babyStore.currentBaby?.id) {
    try {
      const res = await triggerResponse({ event_type_id: next.eventTypeId, baby_id: babyStore.currentBaby.id })
      if (isSuccess(res.code)) {
        return
      }
    } catch {
      // 后端触发失败，历史已本地记录，不影响体验
    }
  }
}

function triggerRandomScene() {
  const index = Math.floor(Math.random() * scenes.value.length)
  triggerScene(scenes.value[index].key)
}

function showDetailPopup() {
  popupVisible.value = true
}

function closePopup() {
  popupVisible.value = false
}

function handlePrimaryAction() {
  popupVisible.value = false
  uni.showToast({ title: primaryAction.value.text, icon: "none" })
}

function goConfig() {
  uni.navigateTo({ url: "/pages/scene/config" })
}

// ====== 自动模式 ======
function onModeChange(val: boolean) {
  if (val) {
    startAutoClassify()
  } else {
    stopAutoClassify()
  }
}

async function startAutoClassify() {
  if (!babyStore.currentBaby?.id) return
  // 立即执行一次
  await fetchClassifyResult()
  // 定时轮询（每3秒）
  classifyTimer = setInterval(fetchClassifyResult, 3000)
}

function stopAutoClassify() {
  classifyResult.value = null
  if (classifyTimer) {
    clearInterval(classifyTimer)
    classifyTimer = null
  }
}

async function fetchClassifyResult() {
  if (!babyStore.currentBaby?.id) return
  try {
    const res = await getSceneClassify(babyStore.currentBaby.id)
    if (isSuccess(res.code) && res.data) {
      classifyResult.value = res.data
      // 自动触发场景
      const sceneKey = mapSceneTypeToKey(res.data.scene_type)
      if (sceneKey) {
        // 自动模式使用 executeSceneResponse 接口
        await executeSceneResponse({
          baby_id: babyStore.currentBaby.id,
          scene_type: res.data.scene_type,
          response_mode: 'auto'
        })
        // 同时更新前端显示
        triggerScene(sceneKey)
      }
    }
  } catch {
    // 静默处理
  }
}

function mapSceneTypeToKey(sceneType: string): string | null {
  const map: Record<string, string> = {
    'sleep': 'sleep',
    'wake': 'wake',
    'cry1': 'cry1',
    'cry2': 'cry2',
    'cry3': 'cry3',
    'danger_apnea': 'danger_apnea',
    'danger_roll': 'danger_roll',
    'danger_climb': 'danger_climb',
    'danger_reach': 'danger_reach',
    'danger_stand': 'danger_stand',
    'happy_smile': 'happy_smile',
    'happy_milestone': 'happy_milestone',
  }
  return map[sceneType] || null
}

// ====== 模拟轮询 ======
function startSim() {
  stopSim()
  if (!simRunning.value) return
  timer = setInterval(() => {
    triggerRandomScene()
  }, 6000)
}

function stopSim() {
  if (timer) { clearInterval(timer); timer = null }
}

watch(simRunning, (running) => {
  running ? startSim() : stopSim()
})

onMounted(async () => {
  await fetchEventTypes()
  await fetchHistory()
  triggerScene(currentSceneKey.value)
  startSim()
})

onBeforeUnmount(() => {
  stopSim()
  stopAutoClassify()
})
</script>

<style lang="scss" scoped>
.scene-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 24rpx 24rpx 48rpx;
  color: #0f172a;
}

/* ====== 顶部栏 ====== */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding: 0 4rpx;
}

.title {
  display: block;
  font-size: 42rpx;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: 1rpx;
}

.sub {
  display: block;
  margin-top: 4rpx;
  font-size: 23rpx;
  color: #64748b;
  font-weight: 500;
}

/* ====== 模式切换 ====== */
.mode-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.mode-badge {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 18rpx;
  border-radius: 24rpx;
  background: #f1f5f9;
}

.mode-badge.active {
  background: #eff6ff;
}

.mode-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #94a3b8;
}

.mode-badge.active .mode-dot {
  background: #3b82f6;
  box-shadow: 0 0 8rpx rgba(59, 130, 246, 0.4);
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.mode-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #64748b;
}

.mode-badge.active .mode-text {
  color: #1d4ed8;
}

/* ====== 识别结果卡片 ====== */
.classify-card {
  margin-top: 16rpx;
  border-radius: 20rpx;
  border: 1.5rpx solid #dbeafe;
  background: linear-gradient(135deg, #eff6ff, #fff);
  padding: 20rpx;
}

.classify-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 16rpx;
}

.classify-title {
  font-size: 28rpx;
  font-weight: 800;
  color: #0f172a;
}

.classify-content {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}

.classify-item {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.classify-label {
  font-size: 20rpx;
  color: #94a3b8;
}

.classify-value {
  font-size: 24rpx;
  font-weight: 700;
  color: #0f172a;
}

.classify-empty {
  text-align: center;
  padding: 24rpx;
  color: #94a3b8;
  font-size: 24rpx;
}

/* ====== 状态卡片 ====== */
.status-card {
  border-radius: 24rpx;
  border: 1.5rpx solid #dbeafe;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  padding: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(59, 130, 246, 0.06);
}

.status-card.normal {
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border-color: #bbf7d0;
  box-shadow: 0 2rpx 16rpx rgba(34, 197, 94, 0.06);
}

.status-card.urgent {
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border-color: #fde68a;
  box-shadow: 0 2rpx 16rpx rgba(245, 158, 11, 0.06);
}

.status-card.emergency {
  background: linear-gradient(135deg, #fef2f2, #fecaca);
  border-color: #fca5a5;
  box-shadow: 0 2rpx 16rpx rgba(239, 68, 68, 0.06);
}

.status-main {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.scene-orb {
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  box-shadow: 0 8rpx 24rpx rgba(37, 99, 235, 0.3);
}

.orb-ring {
  position: absolute;
  inset: -8rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(59, 130, 246, 0.25);
  animation: breathe-ring 2.5s ease-in-out infinite;
}

@keyframes breathe-ring {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.12); opacity: 0.15; }
}

.scene-orb.normal {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  box-shadow: 0 8rpx 24rpx rgba(22, 163, 74, 0.3);
}
.scene-orb.normal .orb-ring { border-color: rgba(34, 197, 94, 0.25); }

.scene-orb.urgent {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  box-shadow: 0 8rpx 24rpx rgba(245, 158, 11, 0.3);
  animation: urgent-bounce 1.2s ease-in-out infinite;
}
.scene-orb.urgent .orb-ring { border-color: rgba(251, 191, 36, 0.25); }

@keyframes urgent-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}

.scene-orb.emergency {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: 0 8rpx 24rpx rgba(220, 38, 38, 0.4);
  animation: emergency-pulse 0.8s ease-in-out infinite;
}
.scene-orb.emergency .orb-ring { border-color: rgba(239, 68, 68, 0.35); }

@keyframes emergency-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 8rpx 24rpx rgba(220, 38, 38, 0.4); }
  50% { transform: scale(1.08); box-shadow: 0 12rpx 36rpx rgba(220, 38, 38, 0.6); }
}

.scene-copy {
  min-width: 0;
  flex: 1;
}

.scene-line {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.scene-name {
  font-size: 40rpx;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: 1rpx;
}

.level-tag {
  border-radius: 12rpx;
  padding: 5rpx 14rpx;
  font-size: 20rpx;
  font-weight: 700;
  color: #1d4ed8;
  background: #dbeafe;
  flex-shrink: 0;
}

.level-tag.normal {
  background: #dcfce7;
  color: #15803d;
}

.level-tag.urgent {
  background: #fef3c7;
  color: #b45309;
}

.level-tag.emergency {
  background: #fee2e2;
  color: #b91c1c;
}

.scene-status {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #475569;
  font-weight: 600;
}

/* ====== 生命体征 ====== */
.vital-row {
  margin-top: 20rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10rpx;
}

.vital-item {
  height: 96rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(4rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.6);
}

.vital-icon-wrap {
  width: 44rpx;
  height: 44rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.vital-info {
  display: flex;
  flex-direction: column;
}

.vital-value {
  font-size: 28rpx;
  font-weight: 900;
  color: #0f172a;
  line-height: 1;
}

.vital-key {
  font-size: 19rpx;
  color: #94a3b8;
  font-weight: 500;
  margin-top: 2rpx;
}

/* ====== 触发信息 ====== */
.trigger-line {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 12rpx 16rpx;
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.5);
  color: #64748b;
  font-size: 22rpx;
}

.trigger-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #3b82f6;
  flex-shrink: 0;
}

.trigger-dot.normal { background: #22c55e; }
.trigger-dot.urgent { background: #f59e0b; }
.trigger-dot.emergency { background: #ef4444; }

/* ====== 操作按钮 ====== */
.action-row {
  margin-top: 14rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}

.action-btn {
  height: 74rpx;
  border-radius: 16rpx;
  border: 1.5rpx solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 26rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  box-shadow: 0 1rpx 4rpx rgba(0,0,0,0.04);
}

.action-btn.primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-color: #2563eb;
  color: #fff;
  box-shadow: 0 4rpx 12rpx rgba(37, 99, 235, 0.25);
}

.action-btn.danger {
  background: #fff1f2;
  border-color: #fecdd3;
  color: #be123c;
}

/* ====== 面板通用 ====== */
.panel {
  margin-top: 16rpx;
  border-radius: 20rpx;
  border: 1rpx solid #e2e8f0;
  background: #fff;
  padding: 20rpx;
  box-shadow: 0 1rpx 6rpx rgba(0,0,0,0.03);
}

.panel.compact {
  padding-bottom: 16rpx;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14rpx;
}

.panel-title {
  display: block;
  font-size: 29rpx;
  font-weight: 800;
  color: #0f172a;
}

.section-note {
  font-size: 21rpx;
  color: #94a3b8;
  font-weight: 500;
}

/* ====== 响应动作 ====== */
.response-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10rpx;
}

.response-item {
  border: 1.5rpx solid #f1f5f9;
  border-radius: 16rpx;
  background: #f8fafc;
  padding: 18rpx 8rpx 14rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.response-icon {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.12);
}

.response-icon.light { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
.response-icon.sound { background: linear-gradient(135deg, #38bdf8, #0ea5e9); }
.response-icon.notice { background: linear-gradient(135deg, #34d399, #10b981); }

.response-label {
  font-size: 20rpx;
  color: #94a3b8;
  font-weight: 500;
}

.response-value {
  font-size: 24rpx;
  font-weight: 800;
  color: #0f172a;
}

/* ====== 场景分类 ====== */
.category-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10rpx;
}

.category-item {
  min-width: 0;
  border: 2rpx solid transparent;
  border-radius: 18rpx;
  background: #f8fafc;
  padding: 16rpx 4rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  transition: all 0.2s;
}

.category-item.active {
  border-color: #3b82f6;
  background: linear-gradient(180deg, #eff6ff, #fff);
  box-shadow: 0 2rpx 8rpx rgba(59, 130, 246, 0.12);
}

.category-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.15);
}

.category-icon.sleep { background: linear-gradient(135deg, #818cf8, #6366f1); }
.category-icon.wake { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
.category-icon.cry { background: linear-gradient(135deg, #fb7185, #e11d48); }
.category-icon.danger { background: linear-gradient(135deg, #ef4444, #dc2626); }
.category-icon.happy { background: linear-gradient(135deg, #34d399, #10b981); }

.category-name {
  font-size: 23rpx;
  font-weight: 800;
  color: #0f172a;
  white-space: nowrap;
}

.category-note {
  font-size: 19rpx;
  color: #94a3b8;
  font-weight: 500;
}

/* ====== 详情网格 ====== */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10rpx;
}

.detail-item {
  min-height: 128rpx;
  border: 2rpx solid #f1f5f9;
  border-radius: 16rpx;
  background: #fff;
  padding: 16rpx 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  transition: all 0.2s;
}

.detail-item.active {
  border-color: #3b82f6;
  background: linear-gradient(180deg, #eff6ff, #fafbff);
  box-shadow: 0 2rpx 8rpx rgba(59, 130, 246, 0.1);
}

.detail-icon-wrap {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 8rpx rgba(0,0,0,0.1);
}

.detail-icon-wrap.silent { background: linear-gradient(135deg, #818cf8, #6366f1); }
.detail-icon-wrap.normal { background: linear-gradient(135deg, #34d399, #10b981); }
.detail-icon-wrap.urgent { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
.detail-icon-wrap.emergency { background: linear-gradient(135deg, #ef4444, #dc2626); }

.detail-name {
  text-align: center;
  font-size: 23rpx;
  font-weight: 800;
  color: #0f172a;
}

/* ====== 变更记录 ====== */
.record-item {
  margin-top: 10rpx;
  padding: 12rpx 8rpx;
  border-radius: 12rpx;
  background: #f8fafc;
  display: grid;
  grid-template-columns: 44rpx 1fr auto;
  align-items: center;
  gap: 10rpx;
}

.record-icon {
  width: 44rpx;
  height: 44rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.record-scene {
  font-size: 25rpx;
  font-weight: 700;
  color: #0f172a;
}

.record-time {
  font-size: 21rpx;
  color: #94a3b8;
  font-weight: 500;
}

.record-empty {
  margin-top: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  color: #94a3b8;
  font-size: 22rpx;
}

/* ====== 配置入口 ====== */
.config-entry {
  margin-top: 16rpx;
  height: 78rpx;
  border-radius: 16rpx;
  border: 1.5rpx solid #e2e8f0;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  font-size: 25rpx;
  font-weight: 700;
  color: #475569;
  box-shadow: 0 1rpx 4rpx rgba(0,0,0,0.03);
}

/* ====== 弹窗 ====== */
.popup-card {
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.popup-card.emergency { background: #fffbff; }
.popup-card.urgent { background: #fffffe; }

.popup-banner {
  padding: 32rpx 28rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.popup-banner.normal {
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
}

.popup-banner.urgent {
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
}

.popup-banner.emergency {
  background: linear-gradient(135deg, #fef2f2, #fecaca);
}

.popup-icon {
  width: 90rpx;
  height: 90rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 6rpx 18rpx rgba(0,0,0,0.15);
}

.popup-icon.silent { background: linear-gradient(135deg, #818cf8, #6366f1); }
.popup-icon.normal { background: linear-gradient(135deg, #34d399, #10b981); }
.popup-icon.urgent { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
.popup-icon.emergency { background: linear-gradient(135deg, #ef4444, #dc2626); }

.popup-copy {
  flex: 1;
  min-width: 0;
}

.popup-title {
  display: block;
  font-size: 36rpx;
  font-weight: 900;
  color: #0f172a;
}

.popup-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 25rpx;
  color: #475569;
  font-weight: 600;
}

.popup-actions {
  padding: 0 28rpx;
  margin-top: 24rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10rpx;
}

.popup-action {
  border-radius: 16rpx;
  background: #f8fafc;
  border: 1.5rpx solid #f1f5f9;
  padding: 18rpx 8rpx 14rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.pa-icon {
  width: 42rpx;
  height: 42rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pa-icon.light { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
.pa-icon.sound { background: linear-gradient(135deg, #38bdf8, #0ea5e9); }
.pa-icon.notice { background: linear-gradient(135deg, #34d399, #10b981); }

.pa-label {
  font-size: 20rpx;
  color: #94a3b8;
  font-weight: 500;
}

.pa-value {
  font-size: 24rpx;
  font-weight: 800;
  color: #0f172a;
}

.popup-footer {
  padding: 24rpx 28rpx 28rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}

.popup-btn {
  height: 80rpx;
  border-radius: 16rpx;
  background: #f1f5f9;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  font-size: 26rpx;
  font-weight: 800;
}

.popup-btn.primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
  box-shadow: 0 4rpx 12rpx rgba(37, 99, 235, 0.25);
}
</style>
