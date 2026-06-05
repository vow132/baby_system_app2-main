<template>
  <view class="ai-page">
    <!-- 顶部渐变卡片 -->
    <view class="hero">
      <text class="hero-title">AI 陪伴</text>
      <text class="hero-desc">打字或按住说话，随时和宝宝聊聊</text>
    </view>

    <!-- 音色库 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">音色库</text>
        <text class="section-action" @click="goVoiceOnboarding">录入新音色</text>
      </view>
      <view class="voice-list">
        <view class="voice-card" v-for="voice in voices" :key="voice.id || voice.voice_id">
          <view class="voice-avatar" :class="'role-' + (voice.voice_role || 'mom')">
            <u-icon name="man" v-if="voice.voice_role === 'dad'" size="24" color="#fff" />
            <u-icon name="woman" v-else-if="voice.voice_role === 'mom'" size="24" color="#fff" />
            <u-icon name="account" v-else size="24" color="#fff" />
          </view>
          <view class="voice-main">
            <text class="voice-name">{{ voice.voice_name || voice.voice_role || '未命名音色' }}</text>
            <text class="voice-meta">{{ getRoleLabel(voice.voice_role) }} · 相似度 {{ voice.similarity_score || '--' }}</text>
          </view>
          <text class="default-tag" v-if="voice.is_default">当前使用</text>
          <text class="switch-btn" v-else @click="setDefault(voice.voice_id || voice.id)">切换</text>
        </view>
        <view class="empty" v-if="voices.length === 0">
          <u-icon name="mic" size="40" color="#ccc" />
          <text>还没有音色，录一段声音来训练吧</text>
        </view>
      </view>
    </view>

    <!-- 语音对话 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">语音对话</text>
        <text class="section-action" @click="goToMemory">对话记忆</text>
      </view>
      <view class="chat-card">
        <!-- 对话消息列表 -->
        <scroll-view class="message-list" scroll-y :scroll-into-view="'msg-' + (messages.length - 1)">
          <view
            class="message"
            v-for="(m, i) in messages"
            :key="m.id || i"
            :id="'msg-' + i"
            :class="m.role"
          >
            <text>{{ m.content_text || m.reply || m.message }}</text>
          </view>
          <!-- 思考中动画 -->
          <view class="message assistant" v-if="thinking">
            <text class="thinking-dots">
              <text class="dot">.</text><text class="dot">.</text><text class="dot">.</text>
            </text>
          </view>
          <view class="empty" v-if="messages.length === 0 && !thinking">
            <u-icon name="chat" size="40" color="#ccc" />
            <text>开始和宝宝说句话吧</text>
          </view>
        </scroll-view>

        <!-- 输入区域：文字/语音双模式 -->
        <view class="input-row">
          <!-- 文字模式 -->
          <template v-if="inputMode === 'text'">
            <u-input
              v-model="chatText"
              placeholder="打字聊聊..."
              border="none"
              :custom-style="{ flex: 1, background: '#f5f6fa', borderRadius: '40rpx', padding: '14rpx 24rpx', fontSize: '28rpx' }"
            />
            <view class="send-btn" @click="sendChat" :class="{ disabled: !chatText.trim() || sending }">
              <u-icon name="arrow-rightward" size="20" color="#fff" />
            </view>
          </template>

          <!-- 语音模式 -->
          <template v-else>
            <view class="voice-bar">
              <!-- ASR 识别中 -->
              <view class="asr-badge" v-if="asrProcessing">
                <text>识别中</text><text class="dot-anim">...</text>
              </view>
              <!-- 按住说话 / 松开结束 -->
              <view v-else class="hold-btn" :class="{ recording: isRecording }"
                @touchstart.prevent="startRecord"
                @touchend.prevent="stopRecord"
                @touchcancel.prevent="stopRecord">
                <view class="hold-ripple" v-if="isRecording" />
                <u-icon name="mic" size="28" :color="isRecording ? '#fff' : '#667eea'" />
                <text>{{ isRecording ? '松开结束' : '按住说话' }}</text>
              </view>
            </view>
          </template>

          <!-- 切换输入模式 -->
          <view class="mode-btn" @click="toggleInputMode">
            <u-icon :name="inputMode === 'voice' ? 'keyboard' : 'mic'" size="22" color="#999" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBabyStore } from '@/stores'
import {
  getVoiceLibrary,
  switchDefaultVoice,
  sendMessage,
  getChatHistory,
  recognizeSpeech,
  type VoiceCloneInfo,
} from '@/services/voice'

const babyStore = useBabyStore()

// ---- 数据状态 ----
const voices = ref<VoiceCloneInfo[]>([])
const messages = ref<any[]>([])
const chatText = ref('')
const sending = ref(false)
const thinking = ref(false)

// ---- 输入模式：text / voice ----
const inputMode = ref<'text' | 'voice'>('text')
function toggleInputMode() {
  inputMode.value = inputMode.value === 'text' ? 'voice' : 'text'
}

// ---- 录音管理器 ----
const recorderManager = uni.getRecorderManager()
const isRecording = ref(false)
const asrProcessing = ref(false)
let recordTimer: ReturnType<typeof setInterval> | null = null

recorderManager.onStop(async (res: any) => {
  isRecording.value = false
  if (!res.tempFilePath) return

  // 录音结束 → ASR 转文字 → 自动发送
  asrProcessing.value = true
  try {
    if (!babyStore.currentBaby) return
    const audioData = await fileToBase64(res.tempFilePath)
    const result = await recognizeSpeech(babyStore.currentBaby.id, audioData)
    if (result.text) {
      // 用识别的文字自动发送
      await doSendMessage(result.text)
    } else {
      uni.showToast({ title: '没有识别到内容，请再试一次', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '语音识别失败', icon: 'none' })
  } finally {
    asrProcessing.value = false
  }
})

recorderManager.onError(() => {
  isRecording.value = false
  if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
  uni.showToast({ title: '录音失败，请检查麦克风权限', icon: 'none' })
})

function fileToBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.getFileSystemManager().readFile({
      filePath,
      encoding: 'base64',
      success: (res) => resolve(res.data as string),
      fail: (err) => reject(err),
    })
  })
}

function startRecord() {
  if (isRecording.value) return
  isRecording.value = true
  recordTimer = setInterval(() => {}, 1000) // 保持活跃
  recorderManager.start({
    format: 'mp3',
    sampleRate: 16000,
    numberOfChannels: 1,
    encodeBitRate: 96000,
  })
}

function stopRecord() {
  if (!isRecording.value) return
  if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
  recorderManager.stop()
}

onUnmounted(() => {
  if (recordTimer) clearInterval(recordTimer)
})

// ---- 页面生命周期 ----
onShow(() => {
  if (!babyStore.currentBaby) {
    babyStore.fetchBabyList().then(() => loadData())
  } else {
    loadData()
  }
})

// ---- 数据加载 ----
async function loadData() {
  if (!babyStore.currentBaby) return
  try {
    const [voiceList, historyData] = await Promise.all([
      getVoiceLibrary(babyStore.currentBaby.id),
      getChatHistory(babyStore.currentBaby.id),
    ])
    voices.value = voiceList
    messages.value = (historyData.items || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      content_text: m.content,
    }))
  } catch {
    // 后端未就绪时静默处理
  }
}

// ---- 工具方法 ----
function getRoleLabel(role: string) {
  const map: Record<string, string> = { mom: '妈妈', dad: '爸爸', nanny: '保姆' }
  return map[role] || '未命名'
}

function goVoiceOnboarding() {
  uni.navigateTo({ url: '/pages/onboarding/index?direct=voice' })
}

function goToMemory() {
  uni.navigateTo({ url: '/pages/memory/index' })
}

async function setDefault(voiceId: string) {
  try {
    await switchDefaultVoice(voiceId)
    uni.showToast({ title: '已切换', icon: 'success' })
    if (babyStore.currentBaby) {
      const list = await getVoiceLibrary(babyStore.currentBaby.id)
      voices.value = list
    }
  } catch {
    uni.showToast({ title: '切换失败', icon: 'none' })
  }
}

// ---- 对话逻辑 ----

/** 文字模式：从输入框发送 */
async function sendChat() {
  const content = chatText.value.trim()
  if (!content) return
  chatText.value = ''
  await doSendMessage(content)
}

/** 通用发送：文字消息 → 添加到列表 → 调后端 */
async function doSendMessage(content: string) {
  if (!babyStore.currentBaby) return

  messages.value.push({ id: `local-${Date.now()}`, role: 'user', content_text: content })
  thinking.value = true
  sending.value = true

  try {
    const result = await sendMessage(babyStore.currentBaby.id, content)
    messages.value.push({
      id: `reply-${Date.now()}`,
      role: 'assistant',
      content_text: result.reply,
      session_id: result.sessionId,
    })
  } catch {
    uni.showToast({ title: '回复失败，请稍后再试', icon: 'none' })
  } finally {
    thinking.value = false
    sending.value = false
  }
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
.default-tag {
  padding: 8rpx 18rpx; border-radius: 8rpx;
  background: rgba(25,190,107,.12); color: #19be6b;
  font-size: 22rpx; font-weight: 500;
}
.switch-btn {
  padding: 8rpx 18rpx; border-radius: 8rpx;
  background: #f0f2ff; color: #667eea; font-size: 22rpx;
}

// 对话区域
.chat-card { background: #fff; border-radius: 16rpx; overflow: hidden; }
.message-list { padding: 20rpx 24rpx; max-height: 560rpx; }
.message { margin-bottom: 16rpx; display: flex; }
.message text {
  max-width: 80%; padding: 16rpx 22rpx; border-radius: 16rpx;
  font-size: 28rpx; line-height: 1.6;
}
.message.user { justify-content: flex-end; }
.message.user text {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff; border-bottom-right-radius: 6rpx;
}
.message.assistant text {
  background: #f1f3f8; color: #333; border-bottom-left-radius: 6rpx;
}
.thinking-dots { font-size: 36rpx; letter-spacing: 4rpx; color: #999; padding: 16rpx 22rpx; background: #f1f3f8; border-radius: 12rpx; }
.dot { animation: blink 1.4s infinite both; }
.dot:nth-child(2) { animation-delay: .2s; }
.dot:nth-child(3) { animation-delay: .4s; }
@keyframes blink { 0%,80%,100%{opacity:.2} 40%{opacity:1} }

// 输入区域
.input-row {
  display: flex; align-items: center; gap: 16rpx;
  padding: 18rpx 20rpx; border-top: 1rpx solid #f1f1f1;
}
.send-btn {
  width: 64rpx; height: 64rpx; border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.send-btn.disabled { background: #ccc; }

// 语音模式
.voice-bar {
  flex: 1; display: flex; align-items: center; justify-content: center;
}
.hold-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 12rpx;
  padding: 20rpx 0; border-radius: 40rpx;
  background: #f5f6fa; position: relative; overflow: hidden;
  text { font-size: 28rpx; color: #667eea; }
  &.recording {
    background: linear-gradient(135deg, #667eea, #764ba2);
    text { color: #fff; }
  }
}
.hold-ripple {
  position: absolute; top: 50%; left: 50%;
  width: 80rpx; height: 80rpx; border-radius: 50%;
  background: rgba(255,255,255,.3);
  transform: translate(-50%, -50%);
  animation: ripple 1.2s infinite;
}
@keyframes ripple {
  0% { transform: translate(-50%,-50%) scale(.8); opacity: 1; }
  100% { transform: translate(-50%,-50%) scale(2.5); opacity: 0; }
}

// ASR 识别中
.asr-badge {
  flex: 1; text-align: center; padding: 20rpx 0;
  font-size: 28rpx; color: #667eea; font-weight: 500;
}
.dot-anim { animation: blinkDot 1s infinite; }
@keyframes blinkDot { 0%,100%{opacity:.3} 50%{opacity:1} }

// 模式切换按钮
.mode-btn {
  width: 64rpx; height: 64rpx; border-radius: 50%;
  background: #f5f6fa; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}

// 空状态
.empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 48rpx 24rpx; color: #999; font-size: 26rpx; gap: 16rpx;
}
</style>
