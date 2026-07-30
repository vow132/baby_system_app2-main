<template>
  <view class="webview-page">
    <web-view v-if="targetUrl" :src="targetUrl" />
    <view v-else class="empty-state">
      <view class="empty-icon">
        <u-icon name="link" size="34" color="#667eea" />
      </view>
      <text class="empty-title">内容链接不可用</text>
      <text class="empty-desc">推荐内容暂时没有可打开的页面。</text>
      <u-button type="primary" text="返回" shape="circle" @click="goBack" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const targetUrl = ref('')

onLoad((options) => {
  const rawUrl = typeof options?.url === 'string' ? options.url : ''
  try {
    const decoded = decodeURIComponent(rawUrl)
    if (/^https?:\/\//.test(decoded)) {
      targetUrl.value = decoded
    }
  } catch {
    targetUrl.value = ''
  }
})

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}
</script>

<style lang="scss" scoped>
.webview-page {
  min-height: 100vh;
  background: #f6f7fb;
}

.empty-state {
  min-height: 100vh;
  padding: 180rpx 48rpx 60rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 28rpx;
  background: #eef2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28rpx;
}

.empty-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a2e;
}

.empty-desc {
  margin: 14rpx 0 44rpx;
  font-size: 26rpx;
  color: #8a94a6;
}
</style>
