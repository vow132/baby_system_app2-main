<template>
  <view class="player-page">
    <view class="back-btn" @click="goBack">
      <u-icon name="arrow-left" size="20" color="#fff" />
      <text class="back-text">返回</text>
    </view>
    <video
      v-if="videoUrl"
      :src="videoUrl"
      autoplay
      controls
      class="full-video"
      @error="onError"
    />
    <view v-else class="loading-hint">
      <text class="loading-text">视频加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const videoUrl = ref('')

onLoad((options) => {
  if (options?.url) {
    videoUrl.value = decodeURIComponent(options.url)
    console.log('[video-player] url:', videoUrl.value)
  } else {
    uni.showToast({ title: '视频地址缺失', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  }
})

function goBack() {
  uni.navigateBack()
}

function onError(e: any) {
  console.error('[video-player] error:', e)
  uni.showToast({ title: '视频加载失败', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.player-page {
  width: 100vw;
  height: 100vh;
  background: #000;
  position: relative;
}
.back-btn {
  position: absolute;
  top: 80rpx;
  left: 30rpx;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(0, 0, 0, 0.5);
  padding: 12rpx 24rpx;
  border-radius: 32rpx;
}
.back-text {
  color: #fff;
  font-size: 28rpx;
}
.full-video {
  width: 100%;
  height: 100%;
}
.loading-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.loading-text {
  color: #999;
  font-size: 28rpx;
}
</style>
