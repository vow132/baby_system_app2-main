<template>
  <view class="ai-page">
    <view class="hero">
      <text class="hero-title">AI 助手调试</text>
      <text class="hero-desc">先打通 Gemma 文字对话链路，再逐步替换语音链路</text>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">文字对话测试</text>
      </view>
      <view class="chat-panel">
        <view class="chat-meta">
          <text class="chat-baby">当前宝宝：{{ currentBabyName }}</text>
          <text class="chat-status">{{ currentBabyId ? '后端端口：34223' : '请先选择宝宝' }}</text>
        </view>

        <view v-if="messages.length" class="chat-list">
          <view
            v-for="item in messages"
            :key="item.id"
            class="chat-item"
            :class="item.role === 'user' ? 'is-user' : 'is-ai'"
          >
            <text class="chat-role">{{ item.role === 'user' ? '我' : 'Gemma' }}</text>
            <text class="chat-text">{{ item.content }}</text>
            <text v-if="item.time" class="chat-time">{{ item.time }}</text>
          </view>
        </view>
        <view v-else class="empty">
          <u-icon name="chat" size="40" color="#ccc" />
          <text>还没有对话，先发一条消息压一下后端</text>
        </view>

        <view class="quick-actions">
          <text class="quick-tag" @click="fillPrompt('宝宝哭了应该怎么安抚？')">安抚建议</text>
          <text class="quick-tag" @click="fillPrompt('请给我一个适合婴儿的睡前流程。')">睡前流程</text>
          <text class="quick-tag" @click="fillPrompt('夜里频繁醒来可能是什么原因？')">夜醒分析</text>
        </view>

        <view class="composer">
          <textarea
            v-model="draft"
            class="composer-input"
            maxlength="500"
            auto-height
            placeholder="输入一段文字，直接测试 Gemma4:latest 的回复质量"
          />
          <button class="send-btn" :disabled="sending || !canSend" @click="handleSend">
            {{ sending ? '发送中...' : '发送' }}
          </button>
        </view>
      </view>
    </view>

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
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBabyStore } from '@/stores'
import {
  getChatHistory,
  getVoiceLibrary,
  sendMessage,
  switchDefaultVoice,
  removeVoice,
} from '@/services/voice'
import type { ChatMessage, VoiceCloneInfo } from '@/api/voice'

const babyStore = useBabyStore()

const voices = ref<VoiceCloneInfo[]>([])
const draft = ref('')
const sending = ref(false)
const messages = ref<Array<{ id: string; role: string; content: string; time: string }>>([])

const currentBaby = computed(() => babyStore.currentBaby)
const currentBabyId = computed(() => currentBaby.value?.id || 0)
const currentBabyName = computed(() => currentBaby.value?.name || '未选择')
const canSend = computed(() => !!currentBabyId.value && !!draft.value.trim())

onShow(() => {
  loadData()
})

async function loadData() {
  if (!babyStore.currentBaby) {
    await babyStore.fetchBabyList()
  }

  try {
    const voiceList = await getVoiceLibrary()
    voices.value = voiceList
  } catch {
    voices.value = []
  }

  await loadChatHistory()
}

async function loadChatHistory() {
  if (!currentBabyId.value) {
    messages.value = []
    return
  }

  try {
    const history = await getChatHistory(currentBabyId.value, undefined, 1, 20)
    const items = Array.isArray(history?.items) ? history.items : []
    messages.value = items
      .slice()
      .reverse()
      .map(normalizeMessage)
      .filter(item => !!item.content)
  } catch {
    messages.value = []
  }
}

function normalizeMessage(item: ChatMessage) {
  return {
    id: String(item.id || `${item.role}-${item.created_at || Math.random()}`),
    role: item.role || 'assistant',
    content: item.content_text || '',
    time: formatTime(item.created_at),
  }
}

function formatTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
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

function fillPrompt(text: string) {
  draft.value = text
}

async function handleSend() {
  if (!canSend.value || sending.value) return

  const babyId = currentBabyId.value
  const message = draft.value.trim()

  messages.value.push({
    id: `local-user-${Date.now()}`,
    role: 'user',
    content: message,
    time: formatTime(new Date().toISOString()),
  })
  draft.value = ''
  sending.value = true

  try {
    const result = await sendMessage(babyId, message)
    messages.value.push({
      id: `local-ai-${Date.now()}`,
      role: 'assistant',
      content: result.reply || '模型未返回内容',
      time: formatTime(new Date().toISOString()),
    })
  } catch (error: any) {
    messages.value.push({
      id: `local-error-${Date.now()}`,
      role: 'assistant',
      content: error?.message || '对话请求失败',
      time: formatTime(new Date().toISOString()),
    })
  } finally {
    sending.value = false
  }
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

.hero {
  background: linear-gradient(135deg, #0f766e, #155e75);
  border-radius: 20rpx;
  padding: 40rpx 30rpx 36rpx;
  color: #fff;
  margin-bottom: 24rpx;
}
.hero-title { display: block; font-size: 44rpx; font-weight: 700; }
.hero-desc { display: block; font-size: 26rpx; opacity: .85; margin-top: 12rpx; }

.section { margin-bottom: 26rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-title { display: block; font-size: 32rpx; font-weight: 700; color: #333; margin-bottom: 16rpx; }
.section-action { color: #0f766e; font-size: 26rpx; padding: 4rpx 0; }

.chat-panel {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
}
.chat-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
  color: #5b6472;
  font-size: 24rpx;
}
.chat-baby { font-weight: 600; color: #1f2937; }
.chat-status { color: #0f766e; }
.chat-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.chat-item {
  max-width: 88%;
  border-radius: 18rpx;
  padding: 18rpx 20rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.chat-item.is-user {
  align-self: flex-end;
  background: #dcfce7;
}
.chat-item.is-ai {
  align-self: flex-start;
  background: #f3f4f6;
}
.chat-role {
  font-size: 22rpx;
  color: #6b7280;
}
.chat-text {
  font-size: 28rpx;
  color: #111827;
  line-height: 1.6;
}
.chat-time {
  font-size: 22rpx;
  color: #9ca3af;
}
.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}
.quick-tag {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: #ecfeff;
  color: #155e75;
  font-size: 24rpx;
}
.composer {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.composer-input {
  width: 100%;
  min-height: 180rpx;
  background: #f8fafc;
  border-radius: 16rpx;
  padding: 20rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  color: #111827;
}
.send-btn {
  width: 100%;
  height: 84rpx;
  border: none;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #0f766e, #155e75);
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
}
.send-btn[disabled] {
  opacity: .55;
}

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

.empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 48rpx 24rpx; color: #999; font-size: 26rpx; gap: 16rpx;
}
</style>
