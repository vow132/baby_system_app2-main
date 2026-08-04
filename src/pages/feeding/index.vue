<template>
  <view class="feeding-page">
    <view class="hero">
      <view>
        <text class="hero-title">喂养打卡</text>
        <text class="hero-desc">{{ babyName }} · 记录母乳、配方奶和辅食</text>
      </view>
      <view class="hero-count">{{ records.length }}条</view>
    </view>

    <view class="form-card">
      <view class="form-title">{{ editingId ? '修改喂养记录' : '新增喂养记录' }}</view>

      <view class="field">
        <text class="label">喂养类型</text>
        <view class="type-row">
          <text
            v-for="item in feedingTypes"
            :key="item.value"
            class="type-chip"
            :class="{ active: form.feeding_type === item.value }"
            @click="form.feeding_type = item.value"
          >{{ item.label }}</text>
        </view>
      </view>

      <view class="field two-fields">
        <view class="field-half">
          <text class="label">日期</text>
          <picker mode="date" :value="form.date" @change="form.date = String($event.detail.value)">
            <view class="picker-value">{{ form.date }}</view>
          </picker>
        </view>
        <view class="field-half">
          <text class="label">时间</text>
          <picker mode="time" :value="form.time" @change="form.time = String($event.detail.value)">
            <view class="picker-value">{{ form.time }}</view>
          </picker>
        </view>
      </view>

      <view v-if="['formula', 'mixed'].includes(form.feeding_type)" class="field">
        <text class="label">奶量（ml）</text>
        <input v-model="form.amount_ml" type="number" class="input" placeholder="例如 150" />
      </view>

      <view v-if="['breast', 'mixed'].includes(form.feeding_type)" class="field two-fields">
        <view class="field-half">
          <text class="label">喂养时长（分钟）</text>
          <input v-model="form.duration_minutes" type="number" class="input" placeholder="例如 15" />
        </view>
        <view class="field-half">
          <text class="label">哺乳侧</text>
          <picker :range="breastSideLabels" :value="breastSideIndex" @change="changeBreastSide">
            <view class="picker-value">{{ breastSideLabels[breastSideIndex] }}</view>
          </picker>
        </view>
      </view>

      <view v-if="form.feeding_type === 'solid'" class="field">
        <text class="label">辅食名称</text>
        <input v-model="form.food_name" class="input" placeholder="例如 高铁米粉、蔬菜泥" />
      </view>

      <view class="field switch-field">
        <text class="label">已经拍嗝</text>
        <switch :checked="form.burped" color="#f59e0b" @change="form.burped = !!$event.detail.value" />
      </view>

      <view class="field">
        <text class="label">备注</text>
        <textarea v-model="form.note" class="textarea" maxlength="200" placeholder="宝宝食欲、吐奶等情况（选填）" />
      </view>

      <view class="form-actions">
        <button v-if="editingId" class="cancel-btn" @click="resetForm">取消修改</button>
        <button class="submit-btn" :loading="saving" @click="submitRecord">
          {{ editingId ? '保存修改' : '完成打卡' }}
        </button>
      </view>
    </view>

    <view class="history-card">
      <view class="history-head">
        <text class="form-title">最近喂养</text>
        <text class="refresh" @click="loadRecords">刷新</text>
      </view>

      <view v-if="records.length" class="record-list">
        <view v-for="item in records" :key="item.id" class="record-item">
          <view class="record-time">
            <text>{{ formatRecordTime(item.occurred_at) }}</text>
            <text class="type-tag">{{ feedingTypeText(item.feeding_type) }}</text>
          </view>
          <view class="record-main">
            <text class="record-title">{{ recordSummary(item) }}</text>
            <text v-if="item.note" class="record-note">{{ item.note }}</text>
          </view>
          <view class="record-actions">
            <text @click="editRecord(item)">编辑</text>
            <text class="danger" @click="confirmDelete(item)">删除</text>
          </view>
        </view>
      </view>

      <view v-else class="empty">
        <u-icon name="heart-fill" size="38" color="#fbbf24" />
        <text>{{ endpointReady ? '还没有喂养记录' : '喂养接口尚未开放，请联系后端发布 /feeding-records' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  createFeedingRecord,
  deleteFeedingRecord,
  getFeedingRecords,
  updateFeedingRecord,
  type FeedingRecord,
  type FeedingRecordInput,
} from '@/api/egolife'
import { useBabyStore } from '@/stores'

type FeedingType = FeedingRecordInput['feeding_type']
type BreastSide = FeedingRecordInput['breast_side']

const babyStore = useBabyStore()
const records = ref<FeedingRecord[]>([])
const editingId = ref<string | number | null>(null)
const saving = ref(false)
const endpointReady = ref(true)

const feedingTypes: Array<{ label: string; value: FeedingType }> = [
  { label: '母乳', value: 'breast' },
  { label: '配方奶', value: 'formula' },
  { label: '混合', value: 'mixed' },
  { label: '辅食', value: 'solid' },
]
const breastSides: BreastSide[] = ['left', 'right', 'both']
const breastSideLabels = ['左侧', '右侧', '双侧']

const now = new Date()
const form = reactive({
  feeding_type: 'formula' as FeedingType,
  date: formatDate(now),
  time: formatClock(now),
  amount_ml: '',
  duration_minutes: '',
  breast_side: 'both' as BreastSide,
  burped: true,
  food_name: '',
  note: '',
})

const babyName = computed(() => babyStore.currentBaby?.name || '小宝贝')
const breastSideIndex = computed(() => Math.max(0, breastSides.indexOf(form.breast_side)))

onShow(async () => {
  if (!babyStore.currentBaby) await babyStore.fetchBabyList()
  await loadRecords()
})

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatClock(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function changeBreastSide(event: any) {
  form.breast_side = breastSides[Number(event.detail.value)] || 'both'
}

async function loadRecords() {
  if (!babyStore.currentBaby) return
  try {
    const data = await getFeedingRecords(babyStore.currentBaby.id, { page: 1, page_size: 30 })
    records.value = (Array.isArray(data) ? data : data?.items || [])
      .slice()
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    endpointReady.value = true
  } catch {
    records.value = []
    endpointReady.value = false
  }
}

function buildPayload(): FeedingRecordInput | null {
  const amount = form.amount_ml ? Number(form.amount_ml) : null
  const duration = form.duration_minutes ? Number(form.duration_minutes) : null
  if (['formula', 'mixed'].includes(form.feeding_type) && (!amount || amount <= 0)) {
    uni.showToast({ title: '请填写正确的奶量', icon: 'none' })
    return null
  }
  if (form.feeding_type === 'solid' && !form.food_name.trim()) {
    uni.showToast({ title: '请填写辅食名称', icon: 'none' })
    return null
  }
  const occurredAt = new Date(`${form.date}T${form.time}:00`)
  if (Number.isNaN(occurredAt.getTime())) {
    uni.showToast({ title: '请选择正确的喂养时间', icon: 'none' })
    return null
  }
  return {
    occurred_at: occurredAt.toISOString(),
    feeding_type: form.feeding_type,
    amount_ml: amount,
    duration_minutes: duration,
    breast_side: ['breast', 'mixed'].includes(form.feeding_type) ? form.breast_side : null,
    burped: form.burped,
    food_name: form.feeding_type === 'solid' ? form.food_name.trim() : null,
    note: form.note.trim() || null,
  }
}

async function submitRecord() {
  if (!babyStore.currentBaby || saving.value) return
  const payload = buildPayload()
  if (!payload) return
  saving.value = true
  try {
    if (editingId.value) {
      await updateFeedingRecord(babyStore.currentBaby.id, editingId.value, payload)
    } else {
      await createFeedingRecord(babyStore.currentBaby.id, payload)
    }
    uni.showToast({ title: editingId.value ? '记录已更新' : '打卡成功', icon: 'success' })
    resetForm()
    await loadRecords()
  } catch (error: any) {
    uni.showToast({ title: error?.message || '喂养接口尚未开放', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function editRecord(item: FeedingRecord) {
  editingId.value = item.id
  const date = new Date(item.occurred_at)
  form.feeding_type = item.feeding_type
  form.date = formatDate(date)
  form.time = formatClock(date)
  form.amount_ml = item.amount_ml == null ? '' : String(item.amount_ml)
  form.duration_minutes = item.duration_minutes == null ? '' : String(item.duration_minutes)
  form.breast_side = item.breast_side || 'both'
  form.burped = !!item.burped
  form.food_name = item.food_name || ''
  form.note = item.note || ''
  uni.pageScrollTo({ scrollTop: 0, duration: 200 })
}

function confirmDelete(item: FeedingRecord) {
  if (!babyStore.currentBaby) return
  uni.showModal({
    title: '删除喂养记录',
    content: '删除后将同步更新相关行为事件，是否继续？',
    confirmColor: '#ef4444',
    success: async result => {
      if (!result.confirm) return
      await deleteFeedingRecord(babyStore.currentBaby!.id, item.id)
      uni.showToast({ title: '已删除', icon: 'success' })
      await loadRecords()
    },
  })
}

function resetForm() {
  const current = new Date()
  editingId.value = null
  form.feeding_type = 'formula'
  form.date = formatDate(current)
  form.time = formatClock(current)
  form.amount_ml = ''
  form.duration_minutes = ''
  form.breast_side = 'both'
  form.burped = true
  form.food_name = ''
  form.note = ''
}

function feedingTypeText(type: FeedingType) {
  return feedingTypes.find(item => item.value === type)?.label || type
}

function formatRecordTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function recordSummary(item: FeedingRecord) {
  if (item.feeding_type === 'solid') return item.food_name || '辅食'
  const parts = [
    item.amount_ml ? `${item.amount_ml}ml` : '',
    item.duration_minutes ? `${item.duration_minutes}分钟` : '',
    item.burped ? '已拍嗝' : '',
  ].filter(Boolean)
  return parts.join(' · ') || feedingTypeText(item.feeding_type)
}
</script>

<style lang="scss" scoped>
.feeding-page { min-height: 100vh; background: #fff7ed; padding: 24rpx 30rpx 60rpx; }
.hero { display: flex; justify-content: space-between; align-items: center; padding: 34rpx 30rpx; border-radius: 24rpx; background: linear-gradient(135deg, #f59e0b, #f97316); color: #fff; margin-bottom: 22rpx; }
.hero-title { display: block; font-size: 42rpx; font-weight: 800; }
.hero-desc { display: block; margin-top: 8rpx; font-size: 25rpx; opacity: .9; }
.hero-count { padding: 10rpx 18rpx; border-radius: 999rpx; background: rgba(255,255,255,.2); font-size: 24rpx; }
.form-card, .history-card { background: #fff; border-radius: 24rpx; padding: 28rpx; margin-bottom: 22rpx; box-shadow: 0 10rpx 28rpx rgba(120,53,15,.06); }
.form-title { color: #292524; font-size: 31rpx; font-weight: 800; }
.field { margin-top: 24rpx; }
.label { display: block; margin-bottom: 10rpx; color: #57534e; font-size: 25rpx; font-weight: 600; }
.type-row { display: flex; flex-wrap: wrap; gap: 12rpx; }
.type-chip { padding: 12rpx 22rpx; border-radius: 999rpx; background: #f5f5f4; color: #78716c; font-size: 24rpx; }
.type-chip.active { background: #ffedd5; color: #ea580c; font-weight: 700; }
.two-fields { display: flex; gap: 18rpx; }
.field-half { flex: 1; min-width: 0; }
.input, .picker-value, .textarea { width: 100%; box-sizing: border-box; padding: 18rpx 20rpx; border-radius: 14rpx; background: #fafaf9; color: #292524; font-size: 27rpx; }
.textarea { min-height: 130rpx; }
.switch-field { display: flex; align-items: center; justify-content: space-between; }
.switch-field .label { margin-bottom: 0; }
.form-actions { display: flex; gap: 16rpx; margin-top: 28rpx; }
.submit-btn, .cancel-btn { flex: 1; border: none; border-radius: 16rpx; font-size: 27rpx; }
.submit-btn { background: linear-gradient(135deg, #f59e0b, #f97316); color: #fff; }
.cancel-btn { background: #f5f5f4; color: #78716c; }
.history-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18rpx; }
.refresh { color: #ea580c; font-size: 24rpx; }
.record-list { display: flex; flex-direction: column; gap: 14rpx; }
.record-item { padding: 20rpx; border-radius: 18rpx; background: #fffbeb; }
.record-time { display: flex; justify-content: space-between; color: #92400e; font-size: 23rpx; }
.type-tag { padding: 4rpx 12rpx; border-radius: 999rpx; background: #fed7aa; color: #c2410c; }
.record-main { margin-top: 10rpx; }
.record-title { display: block; color: #292524; font-size: 28rpx; font-weight: 700; }
.record-note { display: block; margin-top: 6rpx; color: #78716c; font-size: 24rpx; }
.record-actions { display: flex; justify-content: flex-end; gap: 24rpx; margin-top: 12rpx; color: #d97706; font-size: 23rpx; }
.record-actions .danger { color: #ef4444; }
.empty { display: flex; flex-direction: column; align-items: center; gap: 14rpx; padding: 48rpx 20rpx; color: #a8a29e; font-size: 25rpx; text-align: center; }
</style>
