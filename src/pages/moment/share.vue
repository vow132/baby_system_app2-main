<template>
  <view class="share-page">
    <view v-if="loading" class="state-card">
      <u-icon name="photo" size="52" color="#e91e63" />
      <text class="state-title">温馨照片加载中...</text>
    </view>

    <view v-else-if="errorText || !moment" class="state-card">
      <u-icon name="info-circle" size="52" color="#98a2b3" />
      <text class="state-title">这份温馨时刻暂时无法查看</text>
      <text class="state-desc">{{ errorText || '分享已失效或不存在' }}</text>
      <view class="state-actions">
        <button v-if="shareToken" class="primary-button" @click="loadMoment">重新加载</button>
        <button class="secondary-button" @click="goHome">进入小程序</button>
      </view>
    </view>

    <view v-else class="moment-card">
      <view class="brand-row">
        <view>
          <text class="brand-title">宝宝的温馨时刻</text>
          <text class="brand-desc">一张值得珍藏的成长照片</text>
        </view>
        <u-icon name="heart-fill" size="28" color="#e91e63" />
      </view>

      <image
        class="shared-image"
        :src="resolvedImageUrl"
        mode="widthFix"
        @click="previewImage"
      />

      <view class="moment-content">
        <text class="moment-caption">{{ moment.caption || '宝宝的温馨照片' }}</text>
        <text class="moment-time">{{ formatDateTime(moment.captured_at || moment.created_at) }}</text>
        <text class="expiry-hint">此分享自生成起 7 天内有效</text>
      </view>

      <view class="share-actions">
        <button class="primary-button" open-type="share">继续分享</button>
        <button class="secondary-button" @click="goHome">进入小程序</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import { getPublicSharedMoment, type PublicMomentInfo } from '@/api/moment'
import {
  cacheRemoteImageToLocalFile,
  isHttpMediaAllowedForTesting,
  resolveMediaUrl,
  resolveRemoteMediaUrl,
} from '@/common/media'

const loading = ref(true)
const errorText = ref('')
const shareToken = ref('')
const moment = ref<PublicMomentInfo | null>(null)
const localSharedImageUrl = ref('')

const resolvedImageUrl = computed(() => {
  if (localSharedImageUrl.value) return localSharedImageUrl.value
  const remoteUrl = resolveMediaUrl(moment.value?.media_url, '')
  if (remoteUrl.startsWith('http://') && isHttpMediaAllowedForTesting()) return ''
  return remoteUrl
})

onLoad((options) => {
  shareToken.value = String(options?.token || '')
  loadMoment()
})

// #ifdef MP-WEIXIN
onShareAppMessage(() => {
  if (!moment.value) {
    return { title: '温馨时刻', path: '/pages/index/index' }
  }

  return {
    title: moment.value.caption || '宝宝的温馨照片',
    path: moment.value.share_path,
    ...(resolvedImageUrl.value ? { imageUrl: resolvedImageUrl.value } : {}),
  }
})
// #endif

async function loadMoment() {
  if (!shareToken.value) {
    loading.value = false
    errorText.value = '分享已失效或不存在'
    return
  }

  loading.value = true
  errorText.value = ''
  moment.value = null
  localSharedImageUrl.value = ''
  try {
    const res = await getPublicSharedMoment(shareToken.value)
    if (res.code !== 0 || !res.data) {
      throw new Error(res.message || '分享已失效或不存在')
    }
    moment.value = res.data
    await cacheSharedImage(res.data)
  } catch (error) {
    console.error('[moment-share] loadMoment', error)
    errorText.value = getShareErrorMessage(error)
  } finally {
    loading.value = false
  }
}

async function cacheSharedImage(item: PublicMomentInfo): Promise<void> {
  const remoteUrl = resolveRemoteMediaUrl(item.media_url)
  if (!remoteUrl.startsWith('http://') || !isHttpMediaAllowedForTesting()) return
  localSharedImageUrl.value = await cacheRemoteImageToLocalFile(remoteUrl)
}

function getShareErrorMessage(error: unknown): string {
  const message = String((error as any)?.message || '')
  if (message.includes('失效') || message.includes('不存在')) return '分享已失效或不存在'
  return '照片加载失败，请检查网络后重试'
}

function previewImage() {
  if (!resolvedImageUrl.value) return
  uni.previewImage({
    current: resolvedImageUrl.value,
    urls: [resolvedImageUrl.value],
  })
}

function goHome() {
  uni.reLaunch({ url: '/pages/index/index' })
}

function formatDateTime(time: string | null | undefined): string {
  if (!time) return '记录时间未标记'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return '记录时间未标记'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style lang="scss" scoped>
.share-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 36rpx 28rpx 60rpx;
  background: linear-gradient(180deg, #fff0f5 0%, #f7f8fc 42%, #f7f8fc 100%);
}

.moment-card,
.state-card {
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 16rpx 44rpx rgba(104, 34, 65, 0.1);
}

.state-card {
  min-height: 500rpx;
  padding: 70rpx 40rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.state-title {
  margin-top: 24rpx;
  color: #252b3a;
  font-size: 31rpx;
  font-weight: 800;
}

.state-desc {
  margin-top: 14rpx;
  color: #98a2b3;
  font-size: 25rpx;
  line-height: 1.6;
}

.state-actions {
  width: 100%;
  margin-top: 42rpx;
}

.brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
}

.brand-title,
.brand-desc {
  display: block;
}

.brand-title {
  color: #252b3a;
  font-size: 34rpx;
  font-weight: 900;
}

.brand-desc {
  margin-top: 8rpx;
  color: #98a2b3;
  font-size: 23rpx;
}

.shared-image {
  display: block;
  width: 100%;
  min-height: 360rpx;
  background: #f2f4f7;
}

.moment-content {
  padding: 28rpx 30rpx 8rpx;
}

.moment-caption,
.moment-time,
.expiry-hint {
  display: block;
}

.moment-caption {
  color: #252b3a;
  font-size: 32rpx;
  font-weight: 800;
  line-height: 1.55;
}

.moment-time {
  margin-top: 16rpx;
  color: #667085;
  font-size: 25rpx;
}

.expiry-hint {
  margin-top: 10rpx;
  color: #b0b7c3;
  font-size: 22rpx;
}

.share-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18rpx;
  padding: 30rpx;
}

.primary-button,
.secondary-button {
  height: 84rpx;
  margin: 14rpx 0 0;
  border-radius: 999rpx;
  font-size: 27rpx;
  font-weight: 800;
  line-height: 84rpx;
}

.primary-button {
  color: #fff;
  background: linear-gradient(135deg, #e91e63, #c2185b);
}

.secondary-button {
  color: #e91e63;
  background: #fff0f5;
}

.primary-button::after,
.secondary-button::after {
  border: 0;
}
</style>
