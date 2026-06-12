<template>
  <view class="settings-page">
    <view class="section">
      <view class="setting-item" @click="goToAccountSecurity">
        <text class="setting-label">账号与安全</text>
        <u-icon name="arrow-right" size="28" color="#ccc" />
      </view>
      <view class="setting-item">
        <text class="setting-label">账号</text>
        <text class="setting-value">{{ userStore.userInfo?.phone || '未绑定' }}</text>
      </view>
      <view class="setting-item" @click="editNickname">
        <text class="setting-label">昵称</text>
        <text class="setting-value">{{ userStore.nickname }}</text>
        <u-icon name="arrow-right" size="28" color="#ccc" />
      </view>
      <view class="setting-item" @click="chooseAvatar">
        <text class="setting-label">头像</text>
        <view class="avatar-preview">
          <image :src="userStore.avatar || defaultAvatar" mode="aspectFill" class="avatar-img" />
        </view>
        <u-icon name="arrow-right" size="28" color="#ccc" />
      </view>
    </view>
    
    <view class="section">
      <view class="setting-item">
        <text class="setting-label">消息通知</text>
        <u-switch v-model="settings.notification" @change="savePushSettings" />
      </view>
      <view class="setting-item">
        <text class="setting-label">短信提醒</text>
        <u-switch v-model="settings.sms" @change="savePushSettings" />
      </view>
      <view class="setting-item">
        <text class="setting-label">免打扰时段</text>
        <text class="setting-value" @click="editQuietHours">{{ settings.quietHours || '未设置' }}</text>
        <u-icon name="arrow-right" size="28" color="#ccc" @click="editQuietHours" />
      </view>
    </view>
    
    <view class="section">
      <view class="setting-item" @click="clearCache">
        <text class="setting-label">清除缓存</text>
        <u-icon name="arrow-right" size="28" color="#ccc" />
      </view>
      <view class="setting-item" @click="showAbout">
        <text class="setting-label">关于我们</text>
        <u-icon name="arrow-right" size="28" color="#ccc" />
      </view>
    </view>
    
    <view class="logout-btn">
      <u-button type="error" text="退出登录" @click="handleLogout" plain />
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useUserStore } from '@/stores'
import { updatePushSettings } from '@/api/push'
import { BASE_URL, API } from '@/api/config'

const userStore = useUserStore()

const settings = reactive({
  notification: true,
  sms: false,
  quietHours: '',
})

const defaultAvatar = 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=baby%20cute%20avatar%20icon%20cartoon%20style&image_size=square'

function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempFilePath = res.tempFilePaths[0]
      uni.showLoading({ title: '上传中...' })
      try {
        // 将图片转换为 base64
        const base64Data = await new Promise<string>((resolve, reject) => {
          uni.getFileSystemManager().readFile({
            filePath: tempFilePath,
            encoding: 'base64',
            success: (fileRes) => resolve(fileRes.data as string),
            fail: (err) => reject(err),
          })
        })

        // 获取图片类型（默认 png）
        const ext = tempFilePath.split('.').pop()?.toLowerCase() || 'png'
        const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
        const avatarUrl = `data:${mimeType};base64,${base64Data}`

        // 调用 PUT /auth/info 更新头像
        const result = await userStore.updateUserInfoAction({ avatar_url: avatarUrl })
        if (result.code === 0) {
          uni.showToast({ title: '头像修改成功', icon: 'success' })
        } else {
          uni.showToast({ title: result.message || '上传失败', icon: 'none' })
        }
      } catch (error) {
        console.error('[settings] chooseAvatar error:', error)
        uni.showToast({ title: '上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    fail: () => {
      uni.showToast({ title: '取消选择', icon: 'none' })
    },
  })
}

async function savePushSettings() {
  try {
    const res = await updatePushSettings({
      channel_app: settings.notification,
      channel_sms: settings.sms,
      quiet_hours: settings.quietHours,
    })
    if (res.code !== 0) uni.showToast({ title: res.message || '推送设置接口待接入', icon: 'none' })
  } catch (e) {
    console.error('[settings] savePushSettings', e)
    uni.showToast({ title: '推送设置保存失败', icon: 'none' })
  }
}

function editQuietHours() {
  uni.showModal({
    title: '免打扰时段',
    editable: true,
    placeholderText: '例如 22:00-08:00',
    success: async (res) => {
      if (res.confirm) {
        settings.quietHours = res.content || ''
        await savePushSettings()
      }
    },
  })
}

function editNickname() {
  uni.showModal({
    title: '修改昵称',
    editable: true,
    placeholderText: '请输入新昵称',
    content: userStore.nickname || '',
    success: async (res) => {
      const nickname = res.content?.trim()
      if (res.confirm && nickname) {
        try {
          const result = await userStore.updateUserInfoAction({ nickname })
          if (result.code === 0) {
            uni.showToast({ title: '修改成功', icon: 'success' })
          } else {
            uni.showToast({ title: result.message || '修改失败', icon: 'none' })
          }
        } catch (error: any) {
          uni.showToast({ title: error.message || '修改失败', icon: 'none' })
        }
      }
    }
  })
}

function goToAccountSecurity() {
  uni.navigateTo({ url: '/pages/my/account-security' })
}

function clearCache() {
  uni.showModal({
    title: '清除缓存',
    content: '确定要清除缓存吗？',
    success: (res) => {
      if (res.confirm) {
        const babyListCache = uni.getStorageSync('baby_bed_baby_list_cache')
        const currentBabyCache = uni.getStorageSync('baby_bed_current_baby_cache')
        uni.clearStorageSync()
        if (babyListCache) uni.setStorageSync('baby_bed_baby_list_cache', babyListCache)
        if (currentBabyCache) uni.setStorageSync('baby_bed_current_baby_cache', currentBabyCache)
        uni.showToast({ title: '清除成功', icon: 'success' })
      }
    }
  })
}

function showAbout() {
  uni.showModal({
    title: '关于我们',
    content: '婴儿床监护系统 v1.0.0\n\n守护宝宝每一刻',
    showCancel: false,
  })
}

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.settings-page {
  min-height: 100vh;
  background: #f8f8f8;
  padding: 20rpx 30rpx;
}

.section {
    background: #fff;
    border-radius: 16rpx;
    margin-bottom: 20rpx;
    
    .setting-item {
      display: flex;
      align-items: center;
      padding: 30rpx;
      border-bottom: 1rpx solid #f5f5f5;
      
      &:last-child {
        border-bottom: none;
      }
      
      .setting-label {
        flex: 1;
        font-size: 30rpx;
        color: #333;
      }
      
      .setting-value {
        font-size: 28rpx;
        color: #999;
        margin-right: 10rpx;
      }
      
      .avatar-preview {
        width: 60rpx;
        height: 60rpx;
        border-radius: 50%;
        overflow: hidden;
        margin-right: 10rpx;
        
        .avatar-img {
          width: 100%;
          height: 100%;
        }
      }
    }
  }

.logout-btn {
  margin-top: 60rpx;
}
</style>
