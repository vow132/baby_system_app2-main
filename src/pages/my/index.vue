<template>
  <view class="profile-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <text class="nav-title">我的</text>
        <view class="nav-right" @click="goToSettings">
          <u-icon name="setting" size="22" color="#fff" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll-area" :style="{ paddingTop: (statusBarHeight + 56) + 'px' }">
      <!-- 当前用户 -->
      <view class="user-card">
        <view class="user-main" @click="goToSettings">
          <image class="user-avatar" :src="currentUserAvatar" mode="aspectFill" />
          <view class="user-info">
            <text class="user-name">{{ currentUserName }}</text>
            <text class="user-family">{{ currentUserHint }}</text>
          </view>
        </view>
      </view>

      <!-- 当前宝宝 -->
      <view class="baby-card" @click="goToCurrentBaby">
        <view class="baby-left">
          <image class="baby-avatar" :src="currentBabyAvatar" mode="aspectFill" />
          <view class="baby-info">
            <text class="baby-label">当前宝宝</text>
            <text class="baby-name">{{ currentBabyName }}</text>
            <text class="baby-desc">{{ currentBabyHint }}</text>
          </view>
        </view>
        <u-icon name="arrow-right" size="18" color="#cbd5e1" />
      </view>

      <!-- AI陪伴（核心入口） -->
      <view class="ai-card" @click="goToAI">
        <view class="ai-left">
          <view class="ai-icon">
            <u-icon name="mic-fill" size="28" color="#fff" />
          </view>
          <view class="ai-text">
            <text class="ai-title">AI语音陪伴</text>
            <text class="ai-desc">录制家人声音，AI学你说话陪伴宝宝</text>
          </view>
        </view>
        <u-icon name="arrow-right" size="18" color="#c4b5fd" />
      </view>

      <!-- 设备管理 -->
      <view class="section-card">
        <view class="section-head">
          <text class="section-title">设备</text>
        </view>
        <view class="menu-list">
          <view class="menu-item" @click="goToDeviceList">
            <view class="menu-icon" style="background: linear-gradient(135deg, #64748b, #475569);">
              <u-icon name="grid-fill" size="20" color="#fff" />
            </view>
            <text class="menu-label">设备管理</text>
            <u-icon name="arrow-right" size="16" color="#ddd" />
          </view>
        </view>
      </view>

      <!-- 宝宝与家庭 -->
      <view class="section-card">
        <view class="section-head">
          <text class="section-title">宝宝与家庭</text>
        </view>
        <view class="menu-list">
          <view class="menu-item" @click="goToBabyManage">
            <view class="menu-icon" style="background: linear-gradient(135deg, #f43f5e, #ec4899);">
              <u-icon name="heart-fill" size="20" color="#fff" />
            </view>
            <text class="menu-label">宝宝管理</text>
            <u-icon name="arrow-right" size="16" color="#ddd" />
          </view>
          <view class="menu-item" @click="goToFamily">
            <view class="menu-icon" style="background: linear-gradient(135deg, #667eea, #764ba2);">
              <u-icon name="home-fill" size="20" color="#fff" />
            </view>
            <text class="menu-label">家庭管理</text>
            <u-icon name="arrow-right" size="16" color="#ddd" />
          </view>
        </view>
      </view>

      <!-- 系统 -->
      <view class="section-card">
        <view class="section-head">
          <text class="section-title">系统</text>
        </view>
        <view class="menu-list">
          <view class="menu-item" @click="goToSettings">
            <view class="menu-icon" style="background: linear-gradient(135deg, #6b7280, #4b5563);">
              <u-icon name="setting-fill" size="20" color="#fff" />
            </view>
            <text class="menu-label">设置</text>
            <u-icon name="arrow-right" size="16" color="#ddd" />
          </view>
          <view class="menu-item logout" @click="handleLogout">
            <view class="menu-icon" style="background: linear-gradient(135deg, #fa3534, #dc2626);">
              <u-icon name="close" size="20" color="#fff" />
            </view>
            <text class="menu-label">退出登录</text>
            <u-icon name="arrow-right" size="16" color="#ddd" />
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore, useFamilyStore, useBabyStore } from '@/stores'

const userStore = useUserStore()
const familyStore = useFamilyStore()
const babyStore = useBabyStore()
const statusBarHeight = ref(44)

const currentUserName = computed(() => userStore.userInfo?.nickname || '未设置昵称')
const currentUserAvatar = computed(() => userStore.userInfo?.avatar_url || '/static/logo.png')
const currentUserRole = computed(() => {
  const userId = userStore.userInfo?.id
  const member = familyStore.members.find(item => item.user_id === userId)
  return getRoleText(member?.member_role)
})
const currentUserHint = computed(() => {
  const familyName = familyStore.familyInfo?.family_name || '未加入家庭'
  return `${currentUserRole.value} · ${familyName}`
})
const currentBabyName = computed(() => babyStore.currentBaby?.name || '添加宝宝')
const currentBabyAvatar = computed(() => babyStore.currentBaby?.avatar_url || '/static/logo.png')
const currentBabyHint = computed(() => {
  if (!babyStore.currentBaby) return '点击添加宝宝'
  return familyStore.familyName || '宝宝资料'
})

onMounted(() => {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 44
})

onShow(() => {
  // 登录检查
  if (!userStore.isLoggedIn) {
    uni.redirectTo({ url: '/pages/login/login' })
    return
  }
  loadProfileData()
})

async function loadProfileData() {
  await Promise.allSettled([
    userStore.fetchUserInfo(),
    familyStore.fetchFamilyInfo(),
    babyStore.fetchBabyList(),
  ])
  if (familyStore.hasFamily) {
    familyStore.fetchMembers()
  }
}

function getRoleText(role?: string | null) {
  const map: Record<string, string> = {
    parent: '家长',
    grandparent: '祖辈',
    nanny: '保姆',
    caregiver: '看护人',
    creator: '家长',
    other: '家庭成员',
  }
  return map[role || ''] || '家庭成员'
}

function goToCurrentBaby() {
  const babies = babyStore.babyList
  // 如果有多个宝宝，弹出选择器
  if (babies.length > 1) {
    const itemList = babies.map(baby => `${baby.name}${baby.current_age_months ? ` (${baby.current_age_months}个月)` : ''}`)
    uni.showActionSheet({
      itemList,
      success: (res) => {
        const selectedBaby = babies[res.tapIndex]
        if (selectedBaby && selectedBaby.id !== babyStore.currentBaby?.id) {
          babyStore.setCurrentBaby(selectedBaby)
          uni.showToast({ title: `已切换到 ${selectedBaby.name}`, icon: 'none', duration: 1500 })
        }
      },
    })
    return
  }
  // 只有一个宝宝或没有宝宝，跳转到宝宝详情或管理页
  if (babyStore.currentBaby?.id) {
    uni.navigateTo({ url: `/pages/baby/detail?id=${babyStore.currentBaby.id}` })
    return
  }
  uni.navigateTo({ url: '/pages/my/baby-manage' })
}

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    confirmColor: '#fa3534',
    success: (res) => {
      if (res.confirm) userStore.logout()
    }
  })
}

// 导航
function goToAI() { uni.navigateTo({ url: '/pages/ai/index' }) }
function goToSettings() { uni.navigateTo({ url: '/pages/my/settings' }) }
function goToFamily() { uni.navigateTo({ url: '/pages/my/family' }) }
function goToBabyManage() { uni.navigateTo({ url: '/pages/my/baby-manage' }) }
function goToDeviceList() { uni.navigateTo({ url: '/pages/device/list' }) }
function goToOnboarding() { uni.navigateTo({ url: '/pages/onboarding/index?reconfig=1' }) }
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background: #f5f6fa;
}

.nav-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  .nav-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12rpx 30rpx;
  }

  .nav-title {
    font-size: 34rpx;
    font-weight: 600;
    color: #fff;
  }

  .nav-right {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.15);
    border-radius: 50%;
  }
}

.scroll-area {
  height: 100vh;
  box-sizing: border-box;
}

// 用户卡片
.user-card {
  margin: 24rpx 30rpx 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(102,126,234,0.1);

  .user-main {
    display: flex;
    align-items: center;
  }

  .user-avatar {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    margin-right: 24rpx;
    border: 4rpx solid #e0e7ff;
  }

  .user-info {
    .user-name {
      display: block;
      font-size: 34rpx;
      font-weight: 600;
      color: #1a1a2e;
    }

    .user-family {
      display: block;
      font-size: 26rpx;
      color: #999;
      margin-top: 6rpx;
    }
  }
}

.baby-card {
  margin: 20rpx 30rpx 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2rpx 14rpx rgba(0,0,0,0.04);

  .baby-left {
    display: flex;
    align-items: center;
    min-width: 0;
    flex: 1;
  }

  .baby-avatar {
    width: 78rpx;
    height: 78rpx;
    border-radius: 50%;
    margin-right: 20rpx;
    border: 3rpx solid #fff7ed;
    flex-shrink: 0;
  }

  .baby-info {
    min-width: 0;
    flex: 1;
  }

  .baby-label {
    display: block;
    font-size: 22rpx;
    color: #94a3b8;
    margin-bottom: 4rpx;
  }

  .baby-name {
    display: block;
    font-size: 30rpx;
    font-weight: 600;
    color: #1a1a2e;
  }

  .baby-desc {
    display: block;
    font-size: 24rpx;
    color: #999;
    margin-top: 4rpx;
  }
}

// AI陪伴卡
.ai-card {
  margin: 24rpx 30rpx 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4rpx 24rpx rgba(102,126,234,0.2);

  .ai-left {
    display: flex;
    align-items: center;
    flex: 1;
  }

  .ai-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
  }

  .ai-text {
    .ai-title {
      display: block;
      font-size: 30rpx;
      font-weight: 600;
      color: #fff;
    }

    .ai-desc {
      display: block;
      font-size: 22rpx;
      color: rgba(255,255,255,0.7);
      margin-top: 6rpx;
    }
  }
}

// 通用 section
.section-card {
  margin: 24rpx 30rpx 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);

  .section-head {
    margin-bottom: 12rpx;
  }

  .section-title {
    font-size: 26rpx;
    color: #999;
    padding-left: 4rpx;
  }
}

.menu-list {
  .menu-item {
    display: flex;
    align-items: center;
    padding: 22rpx 4rpx;
    border-bottom: 1rpx solid #f5f5f5;

    &:last-child { border-bottom: none; }

    &.logout .menu-label { color: #fa3534; }

    &:active { background: #f8f9fc; }
  }

  .menu-icon {
    width: 52rpx;
    height: 52rpx;
    border-radius: 14rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 20rpx;
    flex-shrink: 0;
  }

  .menu-label {
    flex: 1;
    font-size: 28rpx;
    color: #333;
  }
}
</style>
