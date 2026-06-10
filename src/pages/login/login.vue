<template>
  <view class="login-page">
    <!-- 顶部背景 -->
    <view class="login-header">
      <view class="logo-wrapper">
        <view class="logo-circle">
          <u-icon name="heart-fill" size="60" color="#fff" />
        </view>
      </view>
      <text class="app-title">婴儿床监护</text>
      <text class="app-subtitle">守护宝宝每一刻</text>
    </view>
    
    <!-- 登录表单卡片 -->
    <view class="login-card">
      <!-- 切换标签 -->
      <view class="tab-bar">
        <view 
          class="tab-item" 
          :class="{ active: currentTab === 0 }"
          @click="currentTab = 0"
        >
          <text>登录</text>
          <view class="tab-line" v-if="currentTab === 0" />
        </view>
        <view 
          class="tab-item" 
          :class="{ active: currentTab === 1 }"
          @click="currentTab = 1"
        >
          <text>注册</text>
          <view class="tab-line" v-if="currentTab === 1" />
        </view>
      </view>
      
      <!-- 登录表单 -->
      <view v-if="currentTab === 0" class="form-wrapper">
        <view class="login-mode-switch">
          <view
            class="mode-item"
            :class="{ active: loginMode === 'password' }"
            @click="loginMode = 'password'"
          >
            密码登录
          </view>
          <view
            class="mode-item"
            :class="{ active: loginMode === 'code' }"
            @click="loginMode = 'code'"
          >
            验证码登录
          </view>
        </view>

        <view class="input-group">
          <view class="input-item">
            <u-icon name="phone" size="20" color="#999" />
            <input 
              v-model="loginForm.phone" 
              type="number" 
              placeholder="请输入手机号"
              maxlength="11"
            />
          </view>
          <view v-if="loginMode === 'password'" class="input-item">
            <u-icon name="lock" size="20" color="#999" />
            <input 
              v-model="loginForm.password" 
              type="text"
              :password="!showLoginPassword"
              placeholder="请输入密码"
            />
            <view class="password-toggle" @click="showLoginPassword = !showLoginPassword">
              <u-icon :name="showLoginPassword ? 'eye' : 'eye-off'" size="20" color="#999" />
            </view>
          </view>
          <view v-else class="input-item">
            <u-icon name="email" size="20" color="#999" />
            <input
              v-model="loginForm.code"
              type="number"
              placeholder="请输入验证码"
              maxlength="6"
            />
            <button
              class="code-btn"
              :disabled="loading || codeCountdown > 0"
              @click="sendLoginCode"
            >
              {{ codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码' }}
            </button>
          </view>
        </view>
        
        <button class="submit-btn" @click="handleLoginSubmit" :disabled="loading">
          <text v-if="!loading">登 录</text>
          <u-loading-icon v-else size="18" color="#fff" />
        </button>

        <view class="wechat-login-block">
          <view class="divider">
            <view class="divider-line" />
            <text>或</text>
            <view class="divider-line" />
          </view>
          <button class="wechat-btn" @click="handleWechatLogin" :disabled="loading">
            <u-icon name="weixin-fill" size="22" color="#19be6b" />
            <text>微信一键登录</text>
          </button>
        </view>
        
        <view class="extra-links">
          <text class="link" @click="goForgotPassword">忘记密码?</text>
        </view>
      </view>
      
      <!-- 注册表单 -->
      <view v-else class="form-wrapper">
        <view class="input-group">
          <view class="input-item">
            <u-icon name="phone" size="20" color="#999" />
            <input 
              v-model="registerForm.phone" 
              type="number" 
              placeholder="请输入手机号"
              maxlength="11"
            />
          </view>
          <view class="input-item">
            <u-icon name="lock" size="20" color="#999" />
            <input 
              v-model="registerForm.password" 
              type="text"
              :password="!showRegisterPassword"
              placeholder="设置密码(6-32位)"
              maxlength="32"
            />
            <view class="password-toggle" @click="showRegisterPassword = !showRegisterPassword">
              <u-icon :name="showRegisterPassword ? 'eye' : 'eye-off'" size="20" color="#999" />
            </view>
          </view>
          <view class="input-item">
            <u-icon name="lock-fill" size="20" color="#999" />
            <input 
              v-model="registerForm.confirmPassword" 
              type="text"
              :password="!showRegisterConfirmPassword"
              placeholder="请再次输入密码"
              maxlength="32"
            />
            <view class="password-toggle" @click="showRegisterConfirmPassword = !showRegisterConfirmPassword">
              <u-icon :name="showRegisterConfirmPassword ? 'eye' : 'eye-off'" size="20" color="#999" />
            </view>
          </view>
          <view class="input-item">
            <u-icon name="account" size="20" color="#999" />
            <input 
              v-model="registerForm.nickname" 
              type="text" 
              placeholder="请输入昵称(可选)"
              maxlength="20"
            />
          </view>
        </view>
        
        <button class="submit-btn" @click="handleRegister" :disabled="loading">
          <text v-if="!loading">注 册</text>
          <u-loading-icon v-else size="18" color="#fff" />
        </button>
      </view>
    </view>
    
    <!-- 底部协议 -->
    <view class="footer">
      <text class="agreement">登录即表示同意</text>
      <text class="agreement-link">《用户协议》</text>
      <text class="agreement">和</text>
      <text class="agreement-link">《隐私政策》</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted } from 'vue'
import { useUserStore, useFamilyStore } from '@/stores'
import { sendSmsCode } from '@/api/auth'

const userStore = useUserStore()
const familyStore = useFamilyStore()

const currentTab = ref(0)
const loading = ref(false)
const loginMode = ref<'password' | 'code'>('password')
const showLoginPassword = ref(false)
const showRegisterPassword = ref(false)
const showRegisterConfirmPassword = ref(false)
const codeCountdown = ref(0)
let codeTimer: ReturnType<typeof setInterval> | null = null

const loginForm = reactive({
  phone: '',
  password: '',
  code: ''
})

const registerForm = reactive({
  phone: '',
  password: '',
  confirmPassword: '',
  nickname: ''
})

function isValidPhone(phone: string) {
  return /^1\d{10}$/.test(phone)
}

function startCodeCountdown() {
  codeCountdown.value = 60
  if (codeTimer) clearInterval(codeTimer)
  codeTimer = setInterval(() => {
    codeCountdown.value -= 1
    if (codeCountdown.value <= 0 && codeTimer) {
      clearInterval(codeTimer)
      codeTimer = null
    }
  }, 1000)
}

function clearAccountScopedCache() {
  familyStore.clearFamilyState()
  uni.removeStorageSync('baby_bed_baby_list_cache')
  uni.removeStorageSync('baby_bed_current_baby_cache')
}

function goToInitialPage(hasFamily: boolean) {
  const url = hasFamily ? '/pages/index/index' : '/pages/onboarding/index?first=1'
  return new Promise<void>((resolve, reject) => {
    const callbacks = {
      success: () => resolve(),
      fail: (err: any) => {
        console.error('[login] navigate after login failed', { hasFamily, url }, err)
        reject(err)
      },
    }

    if (hasFamily) {
      uni.switchTab({ url, ...callbacks })
    } else {
      uni.reLaunch({ url, ...callbacks })
    }
  })
}

async function redirectAfterLogin() {
  clearAccountScopedCache()

  let hasFamily = false
  try {
    const familyRes = await familyStore.fetchFamilyInfo()
    hasFamily = familyRes.code === 0 && !!familyRes.data
  } catch (error) {
    console.warn('[login] fetch family after login failed, enter onboarding', error)
  }

  uni.hideToast()
  await goToInitialPage(hasFamily)
}

async function handleLoginSubmit() {
  if (loginMode.value === 'code') {
    await handleCodeLogin()
    return
  }
  await handleLogin()
}

async function handleLogin() {
  if (!isValidPhone(loginForm.phone)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  if (!loginForm.password) {
    uni.showToast({ title: '请输入密码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const res = await userStore.loginAction(loginForm.phone, loginForm.password)
    if (res.code === 0) {
      await redirectAfterLogin()
    } else {
      uni.showToast({ title: res.message || '登录失败', icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: e.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function sendLoginCode() {
  if (!isValidPhone(loginForm.phone)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  if (codeCountdown.value > 0 || loading.value) return

  loading.value = true
  try {
    const res = await sendSmsCode({ phone: loginForm.phone, scene: 'login' })
    if (res.code === 0) {
      uni.showToast({ title: '验证码已发送', icon: 'success' })
      startCodeCountdown()
    } else {
      uni.showToast({ title: res.message || '验证码发送失败', icon: 'none' })
    }
  } finally {
    loading.value = false
  }
}

async function handleCodeLogin() {
  if (!isValidPhone(loginForm.phone)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  if (!loginForm.code || loginForm.code.length !== 6) {
    uni.showToast({ title: '请输入6位验证码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const res = await userStore.codeLoginAction(loginForm.phone, loginForm.code)
    if (res.code === 0) {
      await redirectAfterLogin()
    } else {
      uni.showToast({ title: res.message || '验证码登录失败', icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: e.message || '验证码登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goForgotPassword() {
  uni.navigateTo({ url: '/pages/login/forgot-password' })
}

onUnmounted(() => {
  if (codeTimer) clearInterval(codeTimer)
})

function getWechatCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (res) => {
        if (res.code) {
          resolve(res.code)
        } else {
          reject(new Error('未获取到微信登录凭证'))
        }
      },
      fail: reject,
    })
  })
}

async function handleWechatLogin() {
  if (loading.value) return

  loading.value = true
  try {
    const code = await getWechatCode()
    const res = await userStore.wechatLoginAction(code)
    if (res.code === 0) {
      await redirectAfterLogin()
    } else {
      uni.showToast({ title: res.message || '微信登录失败', icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: e.message || '微信登录暂不可用', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (!isValidPhone(registerForm.phone)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  if (!registerForm.password || registerForm.password.length < 6) {
    uni.showToast({ title: '密码至少6位', icon: 'none' })
    return
  }
  if (registerForm.password.length > 32) {
    uni.showToast({ title: '密码不能超过32位', icon: 'none' })
    return
  }
  if (!registerForm.confirmPassword) {
    uni.showToast({ title: '请再次输入密码', icon: 'none' })
    return
  }
  if (registerForm.password !== registerForm.confirmPassword) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const res = await userStore.registerAction(
      registerForm.phone,
      registerForm.password,
      registerForm.nickname
    )
    if (res.code === 0) {
      await redirectAfterLogin()
    } else {
      uni.showToast({ title: res.message || '注册失败', icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: e.message || '注册失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
}

.login-header {
  padding: 80rpx 0 60rpx;
  text-align: center;
  
  .logo-wrapper {
    margin-bottom: 30rpx;
    
    .logo-circle {
      width: 120rpx;
      height: 120rpx;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      backdrop-filter: blur(10rpx);
    }
  }
  
  .app-title {
    display: block;
    font-size: 40rpx;
    font-weight: 600;
    color: #fff;
    margin-bottom: 12rpx;
  }
  
  .app-subtitle {
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.8);
  }
}

.login-card {
  flex: 1;
  background: #fff;
  border-radius: 40rpx 40rpx 0 0;
  padding: 40rpx;
  margin: 0 30rpx;
  min-height: 600rpx;
}

.tab-bar {
  display: flex;
  margin-bottom: 50rpx;
  
  .tab-item {
    flex: 1;
    text-align: center;
    padding: 20rpx 0;
    position: relative;
    
    text {
      font-size: 32rpx;
      color: #999;
      font-weight: 500;
    }
    
    &.active {
      text {
        color: #333;
        font-weight: 600;
      }
    }
    
    .tab-line {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60rpx;
      height: 4rpx;
      background: #5677fc;
      border-radius: 2rpx;
    }
  }
}

.form-wrapper {
  .login-mode-switch {
    display: flex;
    align-items: center;
    width: 360rpx;
    height: 64rpx;
    padding: 6rpx;
    margin: -18rpx auto 30rpx;
    border-radius: 34rpx;
    background: #f4f6fb;

    .mode-item {
      flex: 1;
      height: 52rpx;
      line-height: 52rpx;
      text-align: center;
      border-radius: 28rpx;
      font-size: 24rpx;
      color: #8b95a6;
    }

    .mode-item.active {
      color: #5677fc;
      background: #fff;
      box-shadow: 0 8rpx 20rpx rgba(86, 119, 252, 0.14);
      font-weight: 600;
    }
  }

  .input-group {
    margin-bottom: 50rpx;
    
    .input-item {
      display: flex;
      align-items: center;
      height: 100rpx;
      border-bottom: 1rpx solid #eee;
      padding: 0 20rpx;
      
      &:last-child {
        border-bottom: none;
      }
      
      input {
        flex: 1;
        margin-left: 20rpx;
        font-size: 28rpx;
        color: #333;
        min-width: 0;
      }

      .password-toggle {
        width: 58rpx;
        height: 58rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-left: 12rpx;
        flex-shrink: 0;
      }

      .code-btn {
        width: 172rpx;
        height: 56rpx;
        line-height: 56rpx;
        padding: 0;
        margin-left: 12rpx;
        border-radius: 28rpx;
        background: #eef2ff;
        color: #5677fc;
        font-size: 22rpx;
        flex-shrink: 0;

        &::after {
          border: none;
        }

        &:disabled {
          color: #a6afc5;
          background: #f3f5f9;
        }
      }
    }
  }
  
  .submit-btn {
    width: 100%;
    height: 90rpx;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 45rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    
    text {
      font-size: 32rpx;
      color: #fff;
      font-weight: 500;
    }
    
    &:disabled {
      opacity: 0.7;
    }
  }
  
  .extra-links {
    margin-top: 30rpx;
    text-align: center;
    
    .link {
      font-size: 26rpx;
      color: #5677fc;
    }
  }
}

.wechat-login-block {
  margin-top: 34rpx;
}

.divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;

  text {
    margin: 0 18rpx;
    font-size: 24rpx;
    color: #b8bfcc;
  }
}

.divider-line {
  width: 96rpx;
  height: 1rpx;
  background: #edf0f6;
}

.wechat-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 44rpx;
  border: 1rpx solid #e6eaf2;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    margin-left: 12rpx;
    font-size: 29rpx;
    color: #1f2937;
    font-weight: 500;
  }

  &::after {
    border: none;
  }

  &:disabled {
    opacity: 0.7;
  }
}

.footer {
  padding: 40rpx;
  text-align: center;
  
  .agreement {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.7);
  }
  
  .agreement-link {
    font-size: 24rpx;
    color: #fff;
  }
}
</style>
