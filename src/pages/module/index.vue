<template>
  <view class="module-page">
    <view class="hero" :style="{ background: `linear-gradient(135deg, ${module.color}, ${module.color}cc)` }">
      <view class="hero-icon">
        <u-icon :name="module.icon" size="32" color="#fff" />
      </view>
      <view class="hero-content">
        <text class="hero-title">{{ module.title }}</text>
        <text class="hero-subtitle">{{ module.subtitle }}</text>
        <text class="hero-summary">{{ module.summary }}</text>
      </view>
    </view>

    <view class="section-header">
      <text class="section-title">功能子模块</text>
      <text class="section-count">{{ module.submodules.length }} 项</text>
    </view>

    <view class="submodule-list">
      <view class="submodule-card" v-for="item in module.submodules" :key="item.code">
        <view class="card-head">
          <view class="code-pill" :style="{ color: module.color, background: module.bgColor }">{{ item.code }}</view>
          <view class="title-wrap">
            <text class="sub-title">{{ item.title }}</text>
            <text class="sub-desc">{{ item.desc }}</text>
          </view>
        </view>

        <view class="component-box">
          <text class="component-label">页面/组件</text>
          <text class="component-text">{{ item.components }}</text>
        </view>

        <view class="status-row">
          <u-icon name="checkmark-circle" size="16" :color="module.color" />
          <text class="status-text">{{ item.status }}</text>
        </view>

        <view class="action-row">
          <view
            class="action-btn"
            v-for="action in item.actions"
            :key="action.path + action.label"
            :style="{ borderColor: module.color, color: module.color }"
            @click="navigateTo(action.path)"
          >
            <text>{{ action.label }}</text>
            <u-icon name="arrow-right" size="14" :color="module.color" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getBusinessModule } from '@/common/businessModules'

const moduleId = ref('dialog')
const module = computed(() => getBusinessModule(moduleId.value))

onLoad((query) => {
  moduleId.value = String(query?.id || 'dialog')
})

function navigateTo(path: string) {
  const tabPages = ['/pages/index/index', '/pages/monitor/index', '/pages/baby/list', '/pages/my/index']
  if (tabPages.includes(path)) {
    uni.switchTab({ url: path })
  } else {
    uni.navigateTo({ url: path })
  }
}
</script>

<style lang="scss" scoped>
.module-page {
  min-height: 100vh;
  background: #f6f7fb;
  padding: 24rpx 30rpx 60rpx;
}

.hero {
  display: flex;
  align-items: center;
  padding: 34rpx 30rpx;
  border-radius: 20rpx;
  color: #fff;
  margin-bottom: 28rpx;
}

.hero-icon {
  width: 86rpx;
  height: 86rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, .18);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 22rpx;
  flex-shrink: 0;
}

.hero-content {
  flex: 1;
}

.hero-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
}

.hero-subtitle {
  display: block;
  font-size: 24rpx;
  opacity: .86;
  margin-top: 4rpx;
}

.hero-summary {
  display: block;
  font-size: 24rpx;
  line-height: 1.5;
  opacity: .9;
  margin-top: 12rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
}

.section-title {
  font-size: 32rpx;
  color: #222;
  font-weight: 700;
}

.section-count {
  font-size: 24rpx;
  color: #999;
}

.submodule-card {
  background: #fff;
  border-radius: 18rpx;
  padding: 24rpx;
  margin-bottom: 18rpx;
  box-shadow: 0 4rpx 18rpx rgba(15, 23, 42, .04);
}

.card-head {
  display: flex;
  align-items: flex-start;
}

.code-pill {
  min-width: 72rpx;
  height: 48rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
  margin-right: 18rpx;
}

.title-wrap {
  flex: 1;
}

.sub-title {
  display: block;
  font-size: 30rpx;
  color: #222;
  font-weight: 700;
}

.sub-desc {
  display: block;
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
  margin-top: 8rpx;
}

.component-box {
  background: #f8fafc;
  border-radius: 14rpx;
  padding: 18rpx;
  margin-top: 20rpx;
}

.component-label {
  display: block;
  font-size: 22rpx;
  color: #94a3b8;
  margin-bottom: 6rpx;
}

.component-text {
  display: block;
  font-size: 24rpx;
  color: #334155;
  line-height: 1.5;
}

.status-row {
  display: flex;
  align-items: center;
  margin-top: 18rpx;
}

.status-text {
  font-size: 23rpx;
  color: #64748b;
  margin-left: 8rpx;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 18rpx;
}

.action-btn {
  height: 58rpx;
  padding: 0 20rpx;
  border: 1rpx solid;
  border-radius: 29rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 24rpx;
  background: #fff;
}
</style>
