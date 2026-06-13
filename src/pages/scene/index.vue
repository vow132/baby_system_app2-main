<template>
  <view class="scene-page">
    <view class="top-bar">
      <view>
        <text class="title">场景联动</text>
        <text class="sub">实时守护 · 多模态融合监测</text>
      </view>
      <view class="mode-wrap">
        <view class="mode-badge active">
          <view class="mode-dot" />
          <text class="mode-text">实时监测中</text>
        </view>
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
            <text class="level-tag" :class="currentScene.levelKey">{{ riskLabel || currentScene.levelText }}</text>
          </view>
          <text class="scene-status">{{ currentScene.status }}</text>
          <text v-if="durationText" class="scene-duration">持续 {{ durationText }}</text>
        </view>
      </view>

      <view class="vital-row">
        <view class="vital-item">
          <view class="vital-icon-wrap" style="background: #fef2f2">
            <u-icon name="heart-fill" size="18" color="#ef4444" />
          </view>
          <view class="vital-info">
            <text class="vital-value">{{ snapshotVitals.heart }}</text>
            <text class="vital-key">心率 bpm</text>
          </view>
        </view>
        <view class="vital-item">
          <view class="vital-icon-wrap" style="background: #f0f9ff">
            <u-icon name="volume-fill" size="18" color="#0ea5e9" />
          </view>
          <view class="vital-info">
            <text class="vital-value">{{ snapshotVitals.breath }}</text>
            <text class="vital-key">呼吸</text>
          </view>
        </view>
        <view class="vital-item">
          <view class="vital-icon-wrap" style="background: #f1f5f9">
            <u-icon name="man-add-fill" size="18" color="#64748b" />
          </view>
          <view class="vital-info">
            <text class="vital-value">{{ snapshotVitals.pose }}</text>
            <text class="vital-key">姿态</text>
          </view>
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
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { useBabyStore } from "@/stores"
import {
  getPassiveEventTypes,
  getResponseHistory,
  getBabyStatus,
  type PassiveEventType,
  type MonitoringEvent,
} from "@/api/monitor"
import { getDeviceList, type DeviceInfo } from "@/api/device"

type LevelKey = "silent" | "normal" | "urgent" | "emergency"
type CategoryKey = "sleep" | "wake" | "cry" | "danger" | "happy"

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
  vitals: { heart: string; breath: string; pose: string }
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
  { key: "sleep", name: "熟睡", note: "记录", icon: "moon-fill" },
  { key: "wake", name: "苏醒", note: "建议", icon: "sun-fill" },
  { key: "cry", name: "哭闹", note: "分级", icon: "volume-fill" },
  { key: "danger", name: "危险动作", note: "告警", icon: "warning-fill" },
  { key: "happy", name: "高兴玩耍", note: "留存", icon: "heart-fill" },
]

const fallbackScenes: SceneItem[] = [
  { key: "sleep", category: "sleep", name: "熟睡", icon: "moon-fill", levelKey: "silent", levelText: "静默", status: "安静睡眠中", trigger: "呼吸稳定，位移小，环境低噪声", notice: "次日报告", vitals: { heart: "--", breath: "--", pose: "--" } },
  { key: "wake", category: "wake", name: "苏醒", icon: "sun-fill", levelKey: "normal", levelText: "建议", status: "宝宝醒啦", trigger: "睁眼，伸展，轻微哼声", notice: "推送：宝宝醒啦", vitals: { heart: "--", breath: "--", pose: "--" } },
  { key: "cry1", category: "cry", name: "哭闹1级", icon: "volume", levelKey: "silent", levelText: "静默", status: "轻微哼唧", trigger: "40-55dB，体征平稳", notice: "静默提示，可先观察", vitals: { heart: "--", breath: "--", pose: "--" } },
  { key: "cry2", category: "cry", name: "哭闹2级", icon: "volume-fill", levelKey: "normal", levelText: "建议", status: "有明确需求", trigger: "55-70dB，伴随动作", notice: "标准推送弹窗 + 一键通话", vitals: { heart: "--", breath: "--", pose: "--" } },
  { key: "cry3", category: "cry", name: "哭闹3级", icon: "error-circle-fill", levelKey: "urgent", levelText: "高优先", status: "持续大哭", trigger: ">75dB，心率上升", notice: "强震动 + 强制弹窗", vitals: { heart: "--", breath: "--", pose: "--" } },
  { key: "danger_apnea", category: "danger", name: "呼吸暂停", icon: "warning-fill", levelKey: "emergency", levelText: "紧急", status: "立即介入", trigger: "呼吸<10次/分，心率异常", notice: "最高级告警 + 拨打紧急联系人", vitals: { heart: "--", breath: "--", pose: "--" } },
  { key: "danger_roll", category: "danger", name: "床边翻身", icon: "warning-fill", levelKey: "emergency", levelText: "紧急", status: "坠床风险", trigger: "床边区域翻身角度过大", notice: "坠床风险预警推送", vitals: { heart: "--", breath: "--", pose: "--" } },
  { key: "danger_climb", category: "danger", name: "翻床", icon: "warning-fill", levelKey: "emergency", levelText: "紧急", status: "翻越风险", trigger: "躯干高度超过围栏阈值", notice: "瞬时视频推送 + 保存录像", vitals: { heart: "--", breath: "--", pose: "--" } },
  { key: "danger_reach", category: "danger", name: "探出床外", icon: "warning-fill", levelKey: "emergency", levelText: "紧急", status: "身体越界", trigger: "头部或上半身投影越界", notice: "紧急弹窗 + 开启麦克风远程喊话", vitals: { heart: "--", breath: "--", pose: "--" } },
  { key: "danger_stand", category: "danger", name: "站立", icon: "warning", levelKey: "urgent", levelText: "关注", status: "注意防跌", trigger: "坐卧转站立，头高超阈值", notice: "推送提醒 + 建议调低床垫", vitals: { heart: "--", breath: "--", pose: "--" } },
  { key: "happy_smile", category: "happy", name: "互动表情", icon: "heart-fill", levelKey: "silent", levelText: "记录", status: "捕捉到笑容", trigger: "微笑持续并伴随笑声", notice: "静默记录快乐心情", vitals: { heart: "--", breath: "--", pose: "--" } },
  { key: "happy_milestone", category: "happy", name: "里程碑", icon: "photo-fill", levelKey: "silent", levelText: "记录", status: "里程碑动作", trigger: "翻身/独坐/精准抓握达阈值", notice: "解锁新成就卡片", vitals: { heart: "--", breath: "--", pose: "--" } },
]

// status_type + status_level → scene key 映射
function mapStatusToSceneKey(statusType: string, statusLevel: number): string {
  if (statusType === "sleeping") return "sleep"
  if (statusType === "awake") return "wake"
  if (statusType === "playing") return "happy_smile"
  if (statusType === "crying") {
    if (statusLevel >= 3) return "cry3"
    if (statusLevel >= 2) return "cry2"
    return "cry1"
  }
  if (statusType === "danger") {
    if (statusLevel >= 3) return "danger_apnea"
    if (statusLevel >= 2) return "danger_roll"
    return "danger_stand"
  }
  return "sleep"
}

// ====== 状态 ======
const babyStore = useBabyStore()
const currentSceneKey = ref<string>("sleep")
const activeCategoryKey = ref<CategoryKey>("sleep")
const riskLabel = ref<string>("")
const snapshotData = ref<{ heart_rate: number | null; breath_rate: number | null; pose_status: string | null } | null>(null)
const durationSec = ref<number | null>(null)

// 远端数据
const remoteCategoryList = ref<CategoryEntry[]>([])
const remoteSceneList = ref<SceneItem[]>([])
const responseHistory = ref<HistoryItem[]>([])
const devices = ref<DeviceInfo[]>([])

let pollTimer: ReturnType<typeof setInterval> | null = null

// ====== 计算属性 ======
const categoryList = computed(() => remoteCategoryList.value.length ? remoteCategoryList.value : fallbackCategories)
const scenes = computed(() => remoteSceneList.value.length ? remoteSceneList.value : fallbackScenes)
const sceneMap = computed(() => Object.fromEntries(scenes.value.map((item) => [item.key, item])) as Record<string, SceneItem>)
const currentScene = computed(() => sceneMap.value[currentSceneKey.value] ?? scenes.value[0])
const activeCategory = computed(() => categoryList.value.find((item) => item.key === activeCategoryKey.value) ?? categoryList.value[0])
const activeCategoryScenes = computed(() => scenes.value.filter((item) => item.category === activeCategoryKey.value))
const visibleHistory = computed(() => responseHistory.value.slice(0, 5))

const snapshotVitals = computed(() => {
  if (snapshotData.value) {
    return {
      heart: snapshotData.value.heart_rate != null ? String(snapshotData.value.heart_rate) : "--",
      breath: snapshotData.value.breath_rate != null ? String(snapshotData.value.breath_rate) : "--",
      pose: getPoseText(snapshotData.value.pose_status),
    }
  }
  return currentScene.value.vitals
})

const durationText = computed(() => {
  if (!durationSec.value) return ""
  const sec = durationSec.value
  if (sec < 60) return `${sec}秒`
  if (sec < 3600) return `${Math.floor(sec / 60)}分${sec % 60}秒`
  return `${Math.floor(sec / 3600)}小时${Math.floor((sec % 3600) / 60)}分`
})

// ====== 工具函数 ======
function isSuccess(code: number) { return code === 0 || code === 200 }

function levelColor(level: LevelKey) {
  if (level === "emergency") return "#dc2626"
  if (level === "urgent") return "#f59e0b"
  if (level === "normal") return "#16a34a"
  return "#2563eb"
}

function getPoseText(pose: string | null): string {
  if (!pose) return "--"
  const map: Record<string, string> = { supine: "平躺", prone: "俯卧", left: "左侧卧", right: "右侧卧", sit: "坐姿" }
  return map[pose] || pose
}

function recordHistory(scene: SceneItem) {
  const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  responseHistory.value.unshift({ id: Date.now(), scene: scene.name, icon: scene.icon, color: levelColor(scene.levelKey), time })
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
  const map: Record<CategoryKey, string> = { sleep: "moon-fill", wake: "sun-fill", cry: "volume-fill", danger: "warning-fill", happy: "heart-fill" }
  return map[cat] || "moon-fill"
}

function categoryNote(cat: CategoryKey): string {
  const map: Record<CategoryKey, string> = { sleep: "记录", wake: "建议", cry: "分级", danger: "告警", happy: "留存" }
  return map[cat] || ""
}

function categoryName(cat: CategoryKey): string {
  const map: Record<CategoryKey, string> = { sleep: "熟睡", wake: "苏醒", cry: "哭闹", danger: "危险动作", happy: "高兴玩耍" }
  return map[cat] || cat
}

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
    vitals: { heart: "--", breath: "--", pose: "--" },
    eventTypeId: et.id,
  }
}

// ====== API 调用 ======
async function fetchEventTypes() {
  try {
    const res = await getPassiveEventTypes()
    if (!isSuccess(res.code) || !Array.isArray(res.data)) return
    const types: PassiveEventType[] = res.data
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
  } catch { /* fallback */ }
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
  } catch { /* silent */ }
}

async function fetchBabyStatus() {
  const device = devices.value[0]
  if (!device?.device_sn) return
  try {
    const res = await getBabyStatus(device.device_sn)
    if (!isSuccess(res.code) || !res.data) return
    const data = res.data
    // 根据 status_type + status_level 更新场景
    const newKey = mapStatusToSceneKey(data.status_type, data.status_level)
    if (newKey !== currentSceneKey.value) {
      const oldScene = sceneMap.value[currentSceneKey.value]
      currentSceneKey.value = newKey
      const newScene = sceneMap.value[newKey]
      if (newScene) {
        activeCategoryKey.value = newScene.category
        // 高风险时振动提醒
        if (data.status_level >= 2) {
          try { uni.vibrateLong() } catch {}
        }
        recordHistory(newScene)
      }
    }
    riskLabel.value = data.risk_label || ""
    durationSec.value = data.duration_sec ?? null
    if (data.sensor_snapshot) {
      snapshotData.value = {
        heart_rate: data.sensor_snapshot.heart_rate,
        breath_rate: data.sensor_snapshot.breath_rate,
        pose_status: data.sensor_snapshot.pose_status,
      }
    }
  } catch { /* silent */ }
}

// ====== 场景切换 ======
function triggerSceneLocal(sceneKey: string) {
  const next = sceneMap.value[sceneKey]
  if (!next) return
  currentSceneKey.value = sceneKey
  activeCategoryKey.value = next.category
  recordHistory(next)
}

// ====== 轮询 ======
function startPolling() {
  stopPolling()
  pollTimer = setInterval(fetchBabyStatus, 5000)
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

async function loadDevices() {
  try {
    const res = await getDeviceList()
    if (isSuccess(res.code) && Array.isArray(res.data)) {
      devices.value = res.data
    }
  } catch { /* silent */ }
}

// ====== 生命周期 ======
onMounted(async () => {
  await Promise.allSettled([fetchEventTypes(), fetchHistory(), loadDevices()])
  await fetchBabyStatus()
  startPolling()
})

onBeforeUnmount(() => {
  stopPolling()
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

.scene-duration {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #94a3b8;
  font-weight: 500;
}

/* ====== 操作按钮 ====== */
/* ====== 面板通用 ====== */
.panel {
  margin-top: 16rpx;
  border-radius: 20rpx;
  border: 1rpx solid #e2e8f0;
  background: #fff;
  padding: 20rpx;
  box-shadow: 0 1rpx 6rpx rgba(0,0,0,0.03);
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
</style>
