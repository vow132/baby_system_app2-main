<template>
  <view class="milestone-page">
    <!-- 里程碑时间线 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">成长里程碑</text>
        <text class="section-action" @click="addMilestone">记录</text>
      </view>
      
      <view class="milestone-list">
        <view class="milestone-item" v-for="m in milestones" :key="m.id">
          <view class="milestone-date">
            <text class="month">{{ getMonth(m.detected_at) }}</text>
            <text class="day">{{ getDay(m.detected_at) }}</text>
          </view>
          <view class="milestone-content">
            <text class="milestone-name">{{ m.milestone_name }}</text>
            <text class="milestone-desc">{{ m.milestone_desc || '宝宝又长大了' }}</text>
            <view class="milestone-tags">
              <text v-if="m.age_months" class="tag tag-age">{{ m.age_months }}个月</text>
              <text v-if="m.is_highlight" class="tag tag-highlight">精选</text>
            </view>
          </view>
          <image v-if="m.snapshot_url" class="milestone-img" :src="m.snapshot_url" mode="aspectFill" />
        </view>
        
        <view class="milestone-empty" v-if="milestones.length === 0">
          <u-icon name="star" size="80" color="#ccc" />
          <text>暂无成长记录</text>
          <text class="hint">记录宝宝的每一个精彩瞬间</text>
        </view>
      </view>
    </view>
    
    <!-- AI周报 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">AI周报</text>
        <text class="section-action" @click="generateReport">生成周报</text>
      </view>
      
      <view class="report-list">
        <view class="report-item" v-for="r in reports" :key="r.id" @click="viewReport(r.id)">
          <view class="report-date">
            <text>{{ formatDate(r.week_start) }} - {{ formatDate(r.week_end) }}</text>
          </view>
          <view class="report-stats">
            <text>睡眠 {{ Math.round((r.total_sleep_min || 0) / 60 * 10) / 10 }}h</text>
            <text>哭闹 {{ r.cry_count || 0 }}次</text>
            <text>里程碑 {{ r.milestones?.length || 0 }}个</text>
          </view>
          <u-icon name="arrow-right" size="28" color="#ccc" />
        </view>
        
        <view class="report-empty" v-if="reports.length === 0">
          <text>暂无周报</text>
        </view>
      </view>
    </view>

    <u-popup :show="showMilestoneForm" mode="bottom" round="20" @close="showMilestoneForm = false">
      <view class="popup-content">
        <view class="popup-header">
          <text class="popup-title">记录成长</text>
          <u-icon name="close" size="32" color="#999" @click="showMilestoneForm = false" />
        </view>

        <u-form :model="milestoneForm" labelPosition="top">
          <u-form-item label="里程碑名称" required>
            <u-input v-model="milestoneForm.milestone_name" placeholder="如：第一次翻身" />
          </u-form-item>
          <u-form-item label="里程碑编码" required>
            <u-input v-model="milestoneForm.milestone_code" placeholder="如：turn_over" />
          </u-form-item>
          <u-form-item label="事件类型ID" required>
            <u-input v-model="milestoneForm.event_type_id" type="number" placeholder="例如 1" />
          </u-form-item>
          <u-form-item label="记录日期">
            <u-input v-model="milestoneForm.detected_at" placeholder="例如 2026-05-20" />
          </u-form-item>
          <u-form-item label="月龄">
            <u-input v-model="milestoneForm.age_months" type="number" placeholder="例如 6" />
          </u-form-item>
          <u-form-item label="描述">
            <u-input v-model="milestoneForm.milestone_desc" placeholder="记录宝宝这一刻" />
          </u-form-item>
        </u-form>

        <view class="popup-footer">
          <u-button text="取消" shape="circle" @click="showMilestoneForm = false" />
          <u-button type="primary" text="保存" shape="circle" :loading="saving" @click="saveMilestone" />
        </view>
      </view>
    </u-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBabyStore } from '@/stores'
import { get, post } from '@/api/request'
import { API } from '@/api/config'

const babyStore = useBabyStore()

const milestones = ref<any[]>([])
const reports = ref<any[]>([])
const showMilestoneForm = ref(false)
const saving = ref(false)
const milestoneForm = reactive({
  event_type_id: '1',
  milestone_code: '',
  milestone_name: '',
  milestone_desc: '',
  detected_at: '',
  age_months: '',
})

onShow(() => {
  loadData()
})

async function loadData() {
  if (!babyStore.currentBaby) return
  
  const [mRes, rRes] = await Promise.all([
    get(`${API.MILESTONE.LIST}?baby_id=${babyStore.currentBaby.id}`),
    get(`${API.MILESTONE.REPORT_LIST}?baby_id=${babyStore.currentBaby.id}`),
  ])
  
  if (mRes.code === 0 && mRes.data?.items) {
    milestones.value = mRes.data.items
  }
  if (rRes.code === 0 && rRes.data?.items) {
    reports.value = rRes.data.items
  }
}

function getMonth(date: string | null) {
  if (!date) return ''
  return new Date(date).getMonth() + 1 + '月'
}

function getDay(date: string | null) {
  if (!date) return ''
  return new Date(date).getDate()
}

function formatDate(date: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

function addMilestone() {
  if (!milestoneForm.detected_at) {
    milestoneForm.detected_at = new Date().toISOString().split('T')[0]
  }
  showMilestoneForm.value = true
}

async function saveMilestone() {
  if (!babyStore.currentBaby) {
    uni.showToast({ title: '请先添加宝宝', icon: 'none' })
    return
  }
  if (!milestoneForm.milestone_name.trim()) {
    uni.showToast({ title: '请输入里程碑名称', icon: 'none' })
    return
  }
  if (!milestoneForm.milestone_code.trim()) {
    uni.showToast({ title: '请输入里程碑编码', icon: 'none' })
    return
  }
  if (!Number(milestoneForm.event_type_id)) {
    uni.showToast({ title: '请输入事件类型ID', icon: 'none' })
    return
  }
  if (milestoneForm.detected_at && !/^\d{4}-\d{2}-\d{2}$/.test(milestoneForm.detected_at)) {
    uni.showToast({ title: '日期格式应为 2026-05-20', icon: 'none' })
    return
  }

  saving.value = true
  try {
    const res = await post(API.MILESTONE.CREATE, {
      baby_id: babyStore.currentBaby.id,
      event_type_id: Number(milestoneForm.event_type_id),
      milestone_code: milestoneForm.milestone_code,
      milestone_name: milestoneForm.milestone_name,
      milestone_desc: milestoneForm.milestone_desc,
      detected_at: `${milestoneForm.detected_at}T00:00:00`,
      age_months: milestoneForm.age_months ? Number(milestoneForm.age_months) : undefined,
    })
    if (res.code === 0) {
      uni.showToast({ title: '记录成功', icon: 'success' })
      showMilestoneForm.value = false
      milestoneForm.event_type_id = '1'
      milestoneForm.milestone_code = ''
      milestoneForm.milestone_name = ''
      milestoneForm.milestone_desc = ''
      milestoneForm.detected_at = ''
      milestoneForm.age_months = ''
      loadData()
    }
  } finally {
    saving.value = false
  }
}

async function generateReport() {
  if (!babyStore.currentBaby) return
  
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  
  const res = await post(API.MILESTONE.REPORT_GENERATE, {
    baby_id: babyStore.currentBaby.id,
    week_start: weekStart.toISOString().split('T')[0],
    week_end: weekEnd.toISOString().split('T')[0],
  })
  
  if (res.code === 0) {
    uni.showToast({ title: '周报生成中', icon: 'success' })
    setTimeout(() => loadData(), 2000)
  } else {
    uni.showToast({ title: res.message || '生成失败', icon: 'none' })
  }
}

function viewReport(id: number) {
  uni.navigateTo({ url: `/pages/milestone/report?id=${id}` })
}
</script>

<style lang="scss" scoped>
.milestone-page {
  min-height: 100vh;
  background: #f8f8f8;
  padding: 20rpx 30rpx;
}

.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    
    .section-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
    
    .section-action {
      font-size: 26rpx;
      color: #5677fc;
    }
  }
}

.milestone-list {
  .milestone-item {
    display: flex;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #f5f5f5;
    
    &:last-child {
      border-bottom: none;
    }
    
    .milestone-date {
      width: 80rpx;
      text-align: center;
      
      .month {
        display: block;
        font-size: 24rpx;
        color: #999;
      }
      
      .day {
        display: block;
        font-size: 36rpx;
        font-weight: bold;
        color: #5677fc;
      }
    }
    
    .milestone-content {
      flex: 1;
      margin-left: 20rpx;
      
      .milestone-name {
        display: block;
        font-size: 30rpx;
        font-weight: bold;
        color: #333;
      }
      
      .milestone-desc {
        display: block;
        font-size: 26rpx;
        color: #666;
        margin: 8rpx 0;
      }
      
      .milestone-tags {
        display: flex;
        gap: 10rpx;

        .tag {
          display: inline-block;
          padding: 4rpx 12rpx;
          border-radius: 6rpx;
          font-size: 20rpx;

          &.tag-age {
            background: #f0f0f0;
            color: #666;
          }
          &.tag-highlight {
            background: rgba(255, 153, 0, 0.12);
            color: #ff9900;
          }
        }
      }
    }
    
    .milestone-img {
      width: 100rpx;
      height: 100rpx;
      border-radius: 8rpx;
    }
  }
  
  .milestone-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60rpx 0;
    color: #999;
    
    .hint {
      font-size: 24rpx;
      margin-top: 10rpx;
    }
  }
}

.report-list {
  .report-item {
    display: flex;
    align-items: center;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #f5f5f5;
    
    &:last-child {
      border-bottom: none;
    }
    
    .report-date {
      width: 180rpx;
      font-size: 26rpx;
      color: #333;
    }
    
    .report-stats {
      flex: 1;
      font-size: 24rpx;
      color: #666;
      
      text {
        margin-right: 16rpx;
      }
    }
  }
  
  .report-empty {
    text-align: center;
    padding: 30rpx;
    color: #999;
  }
}

.popup-content {
  padding: 30rpx;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;

  .popup-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333;
  }
}

.popup-footer {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;

  .u-button {
    flex: 1;
  }
}
</style>
