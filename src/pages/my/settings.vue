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
        <u-switch v-model="settings.notification" :loading="subscribeLoading" @change="handleNotificationChange" />
      </view>
      <view class="setting-item">
        <text class="setting-label">微信订阅状态</text>
        <text class="setting-value">{{ subscriptionHint }}</text>
      </view>
      <view class="setting-item">
        <text class="setting-label">哭声报警</text>
        <u-switch v-model="settings.cryAlert" @change="savePushSettings" />
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
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores'
import {
  confirmPushSubscriptions,
  getPushSettings,
  getPushSubscriptions,
  getPushTemplates,
  updatePushSettings,
} from '@/api/push'
import { bindCurrentWechatUser, hasRequestedSubscribe, requestSubscribe, SUBSCRIBE_TEMPLATES } from '@/utils/subscribe'

const userStore = useUserStore()

const settings = reactive({
  notification: hasRequestedSubscribe(),
  cryAlert: true,
  sms: false,
  quietHours: '',
})

const subscribeLoading = ref(false)
const subscriptionHint = ref('未订阅')
const templateIds = ref<string[]>([SUBSCRIBE_TEMPLATES.ALERT].filter(Boolean))
const CLEARABLE_CACHE_KEYS = ['interaction_history', 'interaction_counts'] as const

onShow(async () => {
  try {
    const [settingsRes, templateRes, subscriptionsRes] = await Promise.all([
      getPushSettings(),
      getPushTemplates(),
      getPushSubscriptions(),
    ])
    if (settingsRes.code === 0 && settingsRes.data) {
      settings.notification = settingsRes.data.channel_app ?? hasRequestedSubscribe()
      settings.cryAlert = settingsRes.data.cry_alert_enabled ?? true
      settings.sms = settingsRes.data.channel_sms ?? false
      settings.quietHours = settingsRes.data.quiet_hours ?? ''
    }
    const alertTemplate = templateRes.data?.cry_alert
    if (templateRes.code === 0) {
      templateIds.value = alertTemplate?.enabled && alertTemplate.template_id
        ? [alertTemplate.template_id]
        : []
    }
    const subscription = subscriptionsRes.data?.find(item => item.template_type === 'cry_alert')
    if (subscription?.status === 'ban') {
      subscriptionHint.value = '已在微信中永久拒绝'
    } else if (subscription?.needs_resubscribe) {
      subscriptionHint.value = '次数已用完，请重新订阅'
    } else if (subscription?.status === 'accept') {
      subscriptionHint.value = subscription.subscription_kind === 'one_time'
        ? `可发送 ${subscription.available_count} 次`
        : '已订阅'
    } else {
      subscriptionHint.value = '未订阅'
    }
  } catch { /* 接口未就绪时保持默认值 */ }
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

async function handleNotificationChange(value: boolean | string | number) {
  settings.notification = value === true || value === 1 || value === '1'
  if (!settings.notification) {
    await savePushSettings()
    return
  }
  if (templateIds.value.length === 0) {
    settings.notification = false
    uni.showToast({ title: '后台尚未配置微信消息模板', icon: 'none' })
    return
  }

  subscribeLoading.value = true
  let syncStage = '请求微信订阅'
  try {
    // 必须直接位于用户点击产生的事件链中，不能在 onShow 等生命周期自动调用。
    const results = await requestSubscribe(templateIds.value)
    const accepted = Object.values(results).some(status => status === 'accept')
    if (accepted) {
      syncStage = '绑定微信身份'
      await bindCurrentWechatUser()
    }
    const clientRequestId = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
    syncStage = '同步订阅记录'
    await confirmPushSubscriptions({
      client_request_id: clientRequestId,
      results: Object.entries(results).map(([template_id, status]) => ({ template_id, status })),
    })
    if (!accepted) {
      settings.notification = false
      subscriptionHint.value = Object.values(results).includes('ban')
        ? '已在微信中永久拒绝'
        : '未订阅'
      await updatePushSettings({ channel_app: false })
      uni.showToast({ title: '未获得微信订阅授权', icon: 'none' })
      return
    }
    subscriptionHint.value = '已订阅，本次授权可发送 1 次'
    syncStage = '保存推送设置'
    await savePushSettings()
    uni.showToast({ title: '已开启哭声通知', icon: 'success' })
  } catch (e) {
    settings.notification = false
    console.error('[settings] subscribe', e)
    const message = e instanceof Error && e.message
      ? e.message
      : '订阅状态同步失败，请重试'
    uni.showModal({
      title: '订阅同步失败',
      content: `${syncStage}失败：${message}`,
      showCancel: false,
    })
  } finally {
    subscribeLoading.value = false
  }
}

async function savePushSettings() {
  try {
    const res = await updatePushSettings({
      channel_app: settings.notification,
      cry_alert_enabled: settings.cryAlert,
      channel_sms: settings.sms,
      quiet_hours: settings.quietHours || null,
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
      if (!res.confirm || !nickname) return
      if (nickname.length > 20) {
        uni.showToast({ title: '昵称不能超过20个字符', icon: 'none' })
        return
      }
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
        CLEARABLE_CACHE_KEYS.forEach(key => uni.removeStorageSync(key))
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
