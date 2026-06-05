<template>
  <view class="baby-list-page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">宝宝管理</text>
      <text class="page-subtitle">管理您的宝宝信息</text>
    </view>
    
    <view class="baby-list">
      <!-- 宝宝卡片 -->
      <view class="baby-card" v-for="baby in babyStore.babyList" :key="baby.id" @click="goToDetail(baby.id)">
        <view class="card-main">
          <image class="baby-avatar" :src="baby.avatar_url || '/static/logo.png'" mode="aspectFill" />
          <view class="baby-info">
            <view class="info-row">
              <text class="baby-name">{{ baby.name }}</text>
              <view class="gender-tag" :class="baby.gender === 1 ? 'boy' : baby.gender === 2 ? 'girl' : ''">
                <u-icon :name="baby.gender === 1 ? 'man' : baby.gender === 2 ? 'woman' : 'question'" size="20" color="#fff" />
              </view>
            </view>
            <text class="baby-age">{{ getAgeText(baby) }}</text>
            <text class="baby-birth" v-if="baby.birth_date">{{ formatBirthDate(baby.birth_date) }}</text>
          </view>
        </view>
        <view class="card-arrow">
          <u-icon name="arrow-right" size="32" color="#ccc" />
        </view>
      </view>
      
      <!-- 添加宝宝 -->
      <view class="add-card" @click="goToDetail()">
        <view class="add-icon">
          <u-icon name="plus" size="48" color="#667eea" />
        </view>
        <text class="add-text">添加宝宝</text>
        <text class="add-desc">记录新成员的成长</text>
      </view>
    </view>
    
    <!-- 空状态 -->
    <view class="empty-state" v-if="babyStore.babyList.length === 0">
      <u-icon name="heart" size="80" color="#ddd" />
      <text class="empty-text">还没有添加宝宝</text>
      <text class="empty-desc">点击上方按钮添加您的第一个宝宝</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { useBabyStore } from '@/stores'

const babyStore = useBabyStore()
const loading = ref(false)

onShow(async () => {
  loading.value = true
  try {
    await babyStore.fetchBabyList()
  } finally {
    loading.value = false
  }
})

function getGenderText(gender: number | null) {
  return gender === 1 ? '男' : gender === 2 ? '女' : '未知'
}

function getAgeText(baby: any) {
  if (baby.current_age_months) {
    const years = Math.floor(baby.current_age_months / 12)
    const months = baby.current_age_months % 12
    if (years > 0) {
      return `${years}岁${months}个月`
    }
    return `${months}个月`
  }
  if (baby.birth_date) {
    const birth = new Date(baby.birth_date)
    const now = new Date()
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12
    if (years > 0) {
      return `${years}岁${remainingMonths}个月`
    }
    return `${remainingMonths}个月`
  }
  return '年龄未知'
}

function formatBirthDate(date: string) {
  const d = new Date(date)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function goToDetail(id?: number) {
  const url = id ? `/pages/baby/detail?id=${id}` : '/pages/baby/detail'
  uni.navigateTo({ url })
}
</script>

<style lang="scss" scoped>
.baby-list-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 200rpx, #f8f9fc 200rpx);
  padding-bottom: 40rpx;
}

.page-header {
  padding: 40rpx 30rpx 60rpx;
  
  .page-title {
    display: block;
    font-size: 40rpx;
    font-weight: 600;
    color: #fff;
    margin-bottom: 12rpx;
  }
  
  .page-subtitle {
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.8);
  }
}

.baby-list {
  padding: 0 30rpx;
}

.baby-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
  
  .card-main {
    display: flex;
    align-items: center;
    flex: 1;
  }
  
  .baby-avatar {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    margin-right: 24rpx;
    border: 2rpx solid #f0f0f0;
  }
  
  .baby-info {
    flex: 1;
    
    .info-row {
      display: flex;
      align-items: center;
      margin-bottom: 8rpx;
    }
    
    .baby-name {
      font-size: 32rpx;
      font-weight: 600;
      color: #333;
      margin-right: 12rpx;
    }
    
    .gender-tag {
      width: 36rpx;
      height: 36rpx;
      border-radius: 50%;
      background: #999;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &.boy {
        background: #5677fc;
      }
      
      &.girl {
        background: #f43f5e;
      }
    }
    
    .baby-age {
      display: block;
      font-size: 28rpx;
      color: #667eea;
      font-weight: 500;
      margin-bottom: 4rpx;
    }
    
    .baby-birth {
      font-size: 24rpx;
      color: #999;
    }
  }
}

.add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 50rpx;
  border: 2rpx dashed #667eea;
  
  .add-icon {
    width: 88rpx;
    height: 88rpx;
    border-radius: 50%;
    background: rgba(102, 126, 234, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16rpx;
  }
  
  .add-text {
    font-size: 30rpx;
    font-weight: 500;
    color: #667eea;
    margin-bottom: 8rpx;
  }
  
  .add-desc {
    font-size: 24rpx;
    color: #999;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 30rpx;
  
  .empty-text {
    display: block;
    font-size: 30rpx;
    color: #666;
    margin-top: 30rpx;
    margin-bottom: 12rpx;
  }
  
  .empty-desc {
    font-size: 24rpx;
    color: #999;
  }
}
</style>
