<template>
  <view class="ai-page">
    <!-- 顶部渐变卡片 -->
    <view class="hero">
      <text class="hero-title">音色管理</text>
      <text class="hero-desc">管理家人音色库，切换默认音色</text>
    </view>

    <!-- 音色库 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">音色库</text>
        <text class="section-action" @click="goVoiceOnboarding">录入新音色</text>
      </view>
      <view class="voice-list">
        <view class="voice-card" v-for="(voice, index) in voices" :key="voice.id || index" @click="setDefault(voice)">
          <view class="voice-avatar" :class="'role-' + voice.voice_role">
            <u-icon name="account" size="24" color="#fff" />
          </view>
          <view class="voice-main">
            <text class="voice-name">{{ voice.voice_name }}</text>
            <text class="voice-meta">{{ getVoiceRoleName(voice.voice_role) }} · {{ voice.voice_id }}</text>
          </view>
          <view class="voice-actions">
            <text v-if="voice.is_default" class="default-tag">默认</text>
            <text class="delete-btn" @click.stop="confirmDelete(voice)">删除</text>
          </view>
        </view>
        <view class="empty" v-if="voices.length === 0">
          <u-icon name="mic" size="40" color="#ccc" />
          <text>还没有音色，录一段声音来训练吧</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBabyStore } from '@/stores'
import {
  getVoiceLibrary,
  switchDefaultVoice,
  removeVoice,
} from '@/services/voice'
import type { VoiceCloneInfo } from '@/api/voice'

const babyStore = useBabyStore()

// ---- 数据状态 ----
const voices = ref<VoiceCloneInfo[]>([])

// ---- 页面生命周期 ----
onShow(() => {
  loadData()
})

// ---- 数据加载 ----
async function loadData() {
  try {
    const voiceList = await getVoiceLibrary()
    voices.value = voiceList
  } catch {
    voices.value = []
  }
}

// ---- 工具方法 ----
function getVoiceDisplayName(voice: VoiceCloneInfo) {
  return voice.voice_name || voice.voice_id
}

function getVoiceRoleName(role: string) {
  const roleMap: Record<string, string> = {
    'mom': '妈妈',
    'dad': '爸爸',
    'nanny': '保姆',
    'other': '其他',
  }
  return roleMap[role] || role
}

function goVoiceOnboarding() {
  uni.navigateTo({ url: '/pages/onboarding/index?direct=voice' })
}

async function setDefault(voice: VoiceCloneInfo) {
  try {
    await switchDefaultVoice(voice.voice_id)
    uni.showToast({ title: '已切换为：' + voice.voice_name, icon: 'success' })
    loadData()
  } catch {
    uni.showToast({ title: '切换失败', icon: 'none' })
  }
}

function confirmDelete(voice: VoiceCloneInfo) {
  uni.showModal({
    title: '删除音色',
    content: `确定要删除「${voice.voice_name}」吗？删除后不可恢复。`,
    confirmColor: '#fa3534',
    success: async (modalRes) => {
      if (!modalRes.confirm) return
      try {
        await removeVoice(voice.voice_name)
        uni.showToast({ title: '已删除', icon: 'success' })
        loadData()
      } catch {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.ai-page {
  min-height: 100vh;
  background: #f6f7fb;
  padding: 24rpx 30rpx 60rpx;
}

// 顶部渐变卡片
.hero {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 20rpx;
  padding: 40rpx 30rpx 36rpx;
  color: #fff;
  margin-bottom: 24rpx;
}
.hero-title { display: block; font-size: 44rpx; font-weight: 700; }
.hero-desc { display: block; font-size: 26rpx; opacity: .85; margin-top: 12rpx; }

// 通用区块
.section { margin-bottom: 26rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-title { display: block; font-size: 32rpx; font-weight: 700; color: #333; margin-bottom: 16rpx; }
.section-action { color: #667eea; font-size: 26rpx; padding: 4rpx 0; }

// 音色库
.voice-list { background: #fff; border-radius: 16rpx; overflow: hidden; }
.voice-card { display: flex; align-items: center; padding: 24rpx; border-bottom: 1rpx solid #f1f1f1; }
.voice-card:last-child { border-bottom: none; }
.voice-avatar {
  width: 72rpx; height: 72rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin-right: 20rpx; flex-shrink: 0;
}
.voice-avatar.role-mom { background: linear-gradient(135deg, #ff9a9e, #fad0c4); }
.voice-avatar.role-dad { background: linear-gradient(135deg, #667eea, #764ba2); }
.voice-avatar.role-nanny { background: linear-gradient(135deg, #a8edea, #fed6e3); }
.voice-main { flex: 1; }
.voice-name { display: block; font-size: 30rpx; color: #333; font-weight: 600; }
.voice-meta { display: block; font-size: 24rpx; color: #999; margin-top: 6rpx; }
.voice-actions { display: flex; align-items: center; flex-shrink: 0; }
.default-tag {
  padding: 8rpx 18rpx; border-radius: 8rpx;
  background: rgba(25,190,107,.12); color: #19be6b;
  font-size: 22rpx; font-weight: 500;
}
.switch-btn {
  padding: 8rpx 18rpx; border-radius: 8rpx;
  background: #f0f2ff; color: #667eea; font-size: 22rpx;
}
.delete-btn {
  padding: 8rpx 18rpx; border-radius: 8rpx;
  background: #fff0f0; color: #fa3534; font-size: 22rpx;
  margin-left: 8rpx;
}

// 空状态
.empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 48rpx 24rpx; color: #999; font-size: 26rpx; gap: 16rpx;
}
</style>
