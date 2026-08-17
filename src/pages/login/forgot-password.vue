<template>
  <view class="forgot-page">
    <view class="header">
      <text class="title">找回密码</text>
      <text class="subtitle">使用手机号验证码重设登录密码</text>
    </view>

    <view class="form-card">
      <view class="input-group">
        <view class="input-item">
          <u-icon name="phone" size="20" color="#999" />
          <input
            v-model="form.phone"
            type="number"
            placeholder="请输入手机号"
            maxlength="11"
          />
        </view>

        <view class="input-item">
          <u-icon name="email" size="20" color="#999" />
          <input
            v-model="form.code"
            type="number"
            placeholder="请输入验证码"
            maxlength="6"
          />
          <button
            class="code-btn"
            :disabled="loading || countdown > 0"
            @click="sendResetCode"
          >
            {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
          </button>
        </view>

        <view class="input-item">
          <u-icon name="lock" size="20" color="#999" />
          <input
            v-model="form.password"
            type="text"
            :password="!showPassword"
            placeholder="设置新密码(8-128位)"
            maxlength="128"
          />
          <view class="password-toggle" @click="showPassword = !showPassword">
            <u-icon :name="showPassword ? 'eye' : 'eye-off'" size="20" color="#999" />
          </view>
        </view>

        <view class="input-item">
          <u-icon name="lock-fill" size="20" color="#999" />
          <input
            v-model="form.confirmPassword"
            type="text"
            :password="!showConfirmPassword"
            placeholder="请再次输入新密码"
            maxlength="128"
          />
          <view class="password-toggle" @click="showConfirmPassword = !showConfirmPassword">
            <u-icon :name="showConfirmPassword ? 'eye' : 'eye-off'" size="20" color="#999" />
          </view>
        </view>
      </view>

      <button class="submit-btn" :disabled="loading" @click="handleResetPassword">
        <text v-if="!loading">重置密码</text>
        <u-loading-icon v-else size="18" color="#fff" />
      </button>

      <view class="back-login" @click="goBackLogin">返回登录</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, onUnmounted } from 'vue'
import { resetPassword, sendSmsCode } from '@/api/auth'

const loading = ref(false)
const countdown = ref(0)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const form = reactive({
  phone: '',
  code: '',
  password: '',
  confirmPassword: '',
})

function isValidPhone(phone: string) {
  return /^1\d{10}$/.test(phone)
}

function startCountdown() {
  countdown.value = 60
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

async function sendResetCode() {
  if (!isValidPhone(form.phone)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  if (countdown.value > 0 || loading.value) return

  loading.value = true
  try {
    const res = await sendSmsCode({ phone: form.phone, scene: 'reset_password' })
    if (res.code === 0) {
      uni.showToast({ title: '验证码已发送', icon: 'success' })
      startCountdown()
    } else {
      uni.showToast({ title: res.message || '验证码发送失败', icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '验证码发送失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function handleResetPassword() {
  if (!isValidPhone(form.phone)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  if (!form.code || form.code.length !== 6) {
    uni.showToast({ title: '请输入6位验证码', icon: 'none' })
    return
  }
  if (!form.password || form.password.length < 8) {
    uni.showToast({ title: '密码至少8位', icon: 'none' })
    return
  }
  if (form.password.length > 128) {
    uni.showToast({ title: '密码不能超过128位', icon: 'none' })
    return
  }
  if (form.password !== form.confirmPassword) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const res = await resetPassword({
      phone: form.phone,
      code: form.code,
      new_password: form.password,
    })
    if (res.code === 0) {
      uni.showToast({ title: '密码已重置', icon: 'success' })
      setTimeout(() => {
        uni.navigateBack()
      }, 800)
    } else {
      uni.showToast({ title: res.message || '密码重置失败', icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '密码重置失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goBackLogin() {
  uni.navigateBack()
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style lang="scss" scoped>
.forgot-page {
  min-height: 100vh;
  background: #f6f7fb;
  padding: 72rpx 40rpx 40rpx;
  box-sizing: border-box;
}

.header {
  margin-bottom: 42rpx;

  .title {
    display: block;
    color: #1f2937;
    font-size: 44rpx;
    font-weight: 700;
  }

  .subtitle {
    display: block;
    margin-top: 14rpx;
    color: #8b95a6;
    font-size: 26rpx;
  }
}

.form-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 20rpx 32rpx 36rpx;
}

.input-group {
  margin-bottom: 54rpx;
}

.input-item {
  display: flex;
  align-items: center;
  min-height: 104rpx;
  border-bottom: 1rpx solid #edf0f6;

  input {
    flex: 1;
    min-width: 0;
    margin-left: 20rpx;
    color: #333;
    font-size: 28rpx;
  }
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

.submit-btn {
  width: 100%;
  height: 90rpx;
  border: none;
  border-radius: 45rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    color: #fff;
    font-size: 32rpx;
    font-weight: 500;
  }

  &:disabled {
    opacity: 0.7;
  }
}

.back-login {
  margin-top: 32rpx;
  text-align: center;
  color: #5677fc;
  font-size: 26rpx;
}
</style>
