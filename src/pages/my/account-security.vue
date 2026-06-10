<template>
  <view class="security-page">
    <view class="section">
      <view class="section-title">账号信息</view>
      <view class="setting-item">
        <view class="item-main">
          <text class="item-label">当前手机号</text>
          <text class="item-desc">{{ userStore.userInfo?.phone || '未绑定手机号' }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">账号与安全</view>
      <view class="setting-item" @click="openPasswordPanel">
        <view class="item-icon password">
          <u-icon name="lock" size="18" color="#fff" />
        </view>
        <view class="item-main">
          <text class="item-label">修改密码</text>
          <text class="item-desc">定期更新密码，保护账号安全</text>
        </view>
        <u-icon name="arrow-right" size="18" color="#cbd5e1" />
      </view>
      <view class="setting-item" @click="openPhonePanel">
        <view class="item-icon phone">
          <u-icon name="phone" size="18" color="#fff" />
        </view>
        <view class="item-main">
          <text class="item-label">{{ hasBoundPhone ? '更换手机号' : '绑定手机号' }}</text>
          <text class="item-desc">用于登录、找回密码和接收重要通知</text>
        </view>
        <u-icon name="arrow-right" size="18" color="#cbd5e1" />
      </view>
    </view>

    <view class="section danger-section">
      <view class="section-title">危险操作</view>
      <view class="setting-item danger" @click="openCancelPanel">
        <view class="item-icon danger-icon">
          <u-icon name="trash" size="18" color="#fff" />
        </view>
        <view class="item-main">
          <text class="item-label">注销账号</text>
          <text class="item-desc">注销后账号将无法继续登录，请谨慎操作</text>
        </view>
        <u-icon name="arrow-right" size="18" color="#fca5a5" />
      </view>
    </view>

    <u-popup :show="passwordPanelVisible" mode="bottom" round="20" @close="passwordPanelVisible = false">
      <view class="panel">
        <text class="panel-title">修改密码</text>
        <view class="form-group">
          <text class="form-label">当前密码</text>
          <u-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入当前密码" border="surround" clearable />
        </view>
        <view class="form-group">
          <text class="form-label">新密码</text>
          <u-input v-model="passwordForm.newPassword" type="password" placeholder="设置新密码(6-32位)" border="surround" clearable />
        </view>
        <view class="form-group">
          <text class="form-label">确认新密码</text>
          <u-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" border="surround" clearable />
        </view>
        <view class="panel-actions">
          <u-button text="取消" plain @click="passwordPanelVisible = false" />
          <u-button type="primary" text="确认修改" :loading="loading" @click="handleChangePassword" />
        </view>
      </view>
    </u-popup>

    <u-popup :show="phonePanelVisible" mode="bottom" round="20" @close="phonePanelVisible = false">
      <view class="panel">
        <text class="panel-title">{{ hasBoundPhone ? '更换手机号' : '绑定手机号' }}</text>
        <view class="current-phone-card" v-if="hasBoundPhone">
          <text class="current-phone-label">当前手机号</text>
          <text class="current-phone-value">{{ maskedCurrentPhone }}</text>
        </view>
        <view class="form-block" v-if="hasBoundPhone">
          <text class="block-title">第一步：验证当前手机号</text>
          <view class="form-group">
            <text class="form-label">验证码</text>
            <view class="code-row">
              <u-input v-model="phoneForm.oldCode" type="number" maxlength="6" placeholder="请输入验证码" border="surround" clearable />
              <u-button
                class="code-btn"
                :text="oldPhoneCountdown > 0 ? `${oldPhoneCountdown}s` : '获取验证码'"
                :disabled="loading || oldPhoneCountdown > 0"
                @click="sendCurrentPhoneCode"
              />
            </view>
          </view>
        </view>

        <view class="form-block">
          <text class="block-title">{{ hasBoundPhone ? '第二步：绑定新手机号' : '绑定新手机号' }}</text>
        <view class="form-group">
          <text class="form-label">新手机号</text>
          <u-input v-model="phoneForm.phone" type="number" maxlength="11" placeholder="请输入手机号" border="surround" clearable />
        </view>
        <view class="form-group">
          <text class="form-label">验证码</text>
          <view class="code-row">
            <u-input v-model="phoneForm.code" type="number" maxlength="6" placeholder="请输入验证码" border="surround" clearable />
            <u-button
              class="code-btn"
              :text="newPhoneCountdown > 0 ? `${newPhoneCountdown}s` : '获取验证码'"
              :disabled="loading || newPhoneCountdown > 0"
              @click="sendNewPhoneCode"
            />
          </view>
        </view>
        </view>
        <view class="panel-actions">
          <u-button text="取消" plain @click="phonePanelVisible = false" />
          <u-button type="primary" :text="hasBoundPhone ? '确认更换' : '确认绑定'" :loading="loading" @click="handleBindPhone" />
        </view>
      </view>
    </u-popup>

    <u-popup :show="cancelPanelVisible" mode="bottom" round="20" @close="cancelPanelVisible = false">
      <view class="panel">
        <text class="panel-title danger-title">注销账号</text>
        <view class="warning-box">
          <text>注销后当前账号将无法登录。若你是家庭唯一管理员，请先转让家庭管理员或处理家庭、宝宝和设备数据。</text>
        </view>
        <view class="family-block" v-if="familyStore.hasFamily">
          <text class="family-block-title">家庭管理员前置处理</text>
          <text class="family-block-desc">转让管理员、解散家庭、退出家庭等操作请前往家庭管理完成。</text>
          <u-button text="去家庭管理" plain @click="goFamilyManagement" />
        </view>
        <view class="form-group">
          <text class="form-label">请输入“确认注销”</text>
          <u-input v-model="cancelForm.confirmText" placeholder="确认注销" border="surround" clearable />
        </view>
        <view class="form-group">
          <text class="form-label">登录密码（如后端要求）</text>
          <u-input v-model="cancelForm.password" type="password" placeholder="请输入登录密码" border="surround" clearable />
        </view>
        <view class="panel-actions">
          <u-button text="取消" plain @click="cancelPanelVisible = false" />
          <u-button type="error" text="确认注销" :loading="loading" @click="handleCancelAccount" />
        </view>
      </view>
    </u-popup>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useFamilyStore, useUserStore } from '@/stores'
import { bindPhone, cancelAccount, changePassword, changePhone, sendSmsCode } from '@/api/auth'

const userStore = useUserStore()
const familyStore = useFamilyStore()
const loading = ref(false)
const passwordPanelVisible = ref(false)
const phonePanelVisible = ref(false)
const cancelPanelVisible = ref(false)
const oldPhoneCountdown = ref(0)
const newPhoneCountdown = ref(0)
let oldPhoneTimer: ReturnType<typeof setInterval> | null = null
let newPhoneTimer: ReturnType<typeof setInterval> | null = null

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const phoneForm = reactive({
  phone: '',
  oldCode: '',
  code: '',
})

const cancelForm = reactive({
  confirmText: '',
  password: '',
})

const hasBoundPhone = computed(() => !!userStore.userInfo?.phone)
const maskedCurrentPhone = computed(() => maskPhone(userStore.userInfo?.phone || ''))

function isValidPhone(phone: string) {
  return /^1\d{10}$/.test(phone)
}

function maskPhone(phone: string) {
  if (!phone) return '未绑定'
  if (phone.length < 7) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

function openPasswordPanel() {
  passwordPanelVisible.value = true
}

function openPhonePanel() {
  phonePanelVisible.value = true
}

function openCancelPanel() {
  familyStore.fetchFamilyInfo()
  cancelPanelVisible.value = true
}

function goFamilyManagement() {
  cancelPanelVisible.value = false
  uni.navigateTo({ url: '/pages/my/family' })
}

onShow(() => {
  familyStore.fetchFamilyInfo()
})

function startCountdown(target: 'old' | 'new') {
  const countdownRef = target === 'old' ? oldPhoneCountdown : newPhoneCountdown
  const currentTimer = target === 'old' ? oldPhoneTimer : newPhoneTimer

  countdownRef.value = 60
  if (currentTimer) clearInterval(currentTimer)
  const timer = setInterval(() => {
    countdownRef.value -= 1
    if (countdownRef.value <= 0) {
      clearInterval(timer)
      if (target === 'old') oldPhoneTimer = null
      else newPhoneTimer = null
    }
  }, 1000)
  if (target === 'old') oldPhoneTimer = timer
  else newPhoneTimer = timer
}

async function handleChangePassword() {
  if (!passwordForm.oldPassword) {
    uni.showToast({ title: '请输入当前密码', icon: 'none' })
    return
  }
  if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
    uni.showToast({ title: '新密码至少6位', icon: 'none' })
    return
  }
  if (passwordForm.newPassword.length > 32) {
    uni.showToast({ title: '新密码不能超过32位', icon: 'none' })
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const res = await changePassword({
      old_password: passwordForm.oldPassword,
      new_password: passwordForm.newPassword,
    })
    if (res.code === 0) {
      uni.showToast({ title: '密码已修改', icon: 'success' })
      passwordPanelVisible.value = false
      passwordForm.oldPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
    } else {
      uni.showToast({ title: res.message || '修改失败', icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: e.message || '修改失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function sendCurrentPhoneCode() {
  const currentPhone = userStore.userInfo?.phone || ''
  if (!isValidPhone(currentPhone)) {
    uni.showToast({ title: '当前手机号不可用', icon: 'none' })
    return
  }
  if (oldPhoneCountdown.value > 0 || loading.value) return

  loading.value = true
  try {
    const res = await sendSmsCode({ phone: currentPhone, scene: 'change_phone_old' })
    if (res.code === 0) {
      uni.showToast({ title: '验证码已发送', icon: 'success' })
      startCountdown('old')
    } else {
      uni.showToast({ title: res.message || '验证码发送失败', icon: 'none' })
    }
  } finally {
    loading.value = false
  }
}

async function sendNewPhoneCode() {
  if (!isValidPhone(phoneForm.phone)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  if (newPhoneCountdown.value > 0 || loading.value) return

  loading.value = true
  try {
    const res = await sendSmsCode({
      phone: phoneForm.phone,
      scene: hasBoundPhone.value ? 'change_phone_new' : 'bind_phone',
    })
    if (res.code === 0) {
      uni.showToast({ title: '验证码已发送', icon: 'success' })
      startCountdown('new')
    } else {
      uni.showToast({ title: res.message || '验证码发送失败', icon: 'none' })
    }
  } finally {
    loading.value = false
  }
}

async function handleBindPhone() {
  if (hasBoundPhone.value && (!phoneForm.oldCode || phoneForm.oldCode.length !== 6)) {
    uni.showToast({ title: '请输入当前手机号验证码', icon: 'none' })
    return
  }
  if (!isValidPhone(phoneForm.phone)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  if (!phoneForm.code || phoneForm.code.length !== 6) {
    uni.showToast({ title: '请输入6位验证码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const res = hasBoundPhone.value
      ? await changePhone({
          old_phone_code: phoneForm.oldCode,
          new_phone: phoneForm.phone,
          new_phone_code: phoneForm.code,
        })
      : await bindPhone({ phone: phoneForm.phone, code: phoneForm.code })
    if (res.code === 0) {
      await userStore.fetchUserInfo()
      uni.showToast({ title: hasBoundPhone.value ? '手机号已更换' : '手机号已绑定', icon: 'success' })
      phonePanelVisible.value = false
      phoneForm.phone = ''
      phoneForm.oldCode = ''
      phoneForm.code = ''
    } else {
      uni.showToast({ title: res.message || (hasBoundPhone.value ? '更换失败' : '绑定失败'), icon: 'none' })
    }
  } finally {
    loading.value = false
  }
}

async function handleCancelAccount() {
  if (cancelForm.confirmText !== '确认注销') {
    uni.showToast({ title: '请输入确认文案', icon: 'none' })
    return
  }

  uni.showModal({
    title: '最终确认',
    content: '账号注销后将无法恢复，确定继续吗？',
    confirmColor: '#fa3534',
    success: async (modalRes) => {
      if (!modalRes.confirm) return
      loading.value = true
      try {
        const res = await cancelAccount({
          confirm_text: cancelForm.confirmText,
          password: cancelForm.password || undefined,
        })
        if (res.code === 0) {
          uni.showToast({ title: '账号已注销', icon: 'success' })
          userStore.logout()
        } else {
          uni.showToast({ title: res.message || '注销失败', icon: 'none' })
        }
      } finally {
        loading.value = false
      }
    },
  })
}

onUnmounted(() => {
  if (oldPhoneTimer) clearInterval(oldPhoneTimer)
  if (newPhoneTimer) clearInterval(newPhoneTimer)
})
</script>

<style lang="scss" scoped>
.security-page {
  min-height: 100vh;
  background: #f6f7fb;
  padding: 24rpx 30rpx 48rpx;
  box-sizing: border-box;
}

.section {
  margin-bottom: 24rpx;
}

.section-title {
  margin: 0 6rpx 14rpx;
  color: #98a2b3;
  font-size: 24rpx;
}

.setting-item {
  display: flex;
  align-items: center;
  min-height: 108rpx;
  padding: 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #f1f3f7;

  &:first-of-type {
    border-radius: 18rpx 18rpx 0 0;
  }

  &:last-child {
    border-bottom: none;
    border-radius: 0 0 18rpx 18rpx;
  }

  &:only-of-type {
    border-radius: 18rpx;
  }
}

.item-icon {
  width: 58rpx;
  height: 58rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;

  &.password {
    background: linear-gradient(135deg, #667eea, #4f46e5);
  }

  &.phone {
    background: linear-gradient(135deg, #0ea5e9, #2563eb);
  }

  &.danger-icon {
    background: linear-gradient(135deg, #fb7185, #dc2626);
  }
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-label {
  display: block;
  color: #1f2937;
  font-size: 30rpx;
  font-weight: 500;
}

.item-desc {
  display: block;
  margin-top: 8rpx;
  color: #98a2b3;
  font-size: 24rpx;
  line-height: 1.4;
}

.danger .item-label {
  color: #dc2626;
}

.panel {
  padding: 34rpx 34rpx calc(34rpx + env(safe-area-inset-bottom));
  background: #fff;
}

.panel-title {
  display: block;
  margin-bottom: 28rpx;
  color: #1f2937;
  font-size: 34rpx;
  font-weight: 700;
}

.danger-title {
  color: #dc2626;
}

.form-group {
  margin-bottom: 24rpx;
}

.form-block {
  margin-bottom: 28rpx;
}

.block-title {
  display: block;
  margin-bottom: 18rpx;
  color: #1f2937;
  font-size: 28rpx;
  font-weight: 600;
}

.current-phone-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 22rpx;
  margin-bottom: 28rpx;
  border-radius: 14rpx;
  background: #f8f9fc;
}

.current-phone-label {
  color: #667085;
  font-size: 25rpx;
}

.current-phone-value {
  color: #1f2937;
  font-size: 28rpx;
  font-weight: 600;
}

.form-label {
  display: block;
  margin-bottom: 12rpx;
  color: #667085;
  font-size: 25rpx;
}

.code-row {
  display: flex;
  align-items: center;
  gap: 16rpx;

  :deep(.u-input) {
    flex: 1;
  }
}

.code-btn {
  width: 180rpx;
  flex-shrink: 0;
}

.warning-box {
  padding: 22rpx;
  margin-bottom: 24rpx;
  border-radius: 14rpx;
  background: #fff1f2;
  color: #be123c;
  font-size: 25rpx;
  line-height: 1.55;
}

.family-block {
  padding: 22rpx;
  margin-bottom: 24rpx;
  border-radius: 14rpx;
  background: #f8faff;
  border: 1rpx solid #e4eaff;
}

.family-block-title,
.family-block-desc {
  display: block;
}

.family-block-title {
  color: #1f2937;
  font-size: 28rpx;
  font-weight: 600;
}

.family-block-desc {
  margin: 8rpx 0 18rpx;
  color: #667085;
  font-size: 24rpx;
  line-height: 1.45;
}

.panel-actions {
  display: flex;
  gap: 18rpx;
  margin-top: 34rpx;

  :deep(.u-button) {
    flex: 1;
  }
}
</style>
