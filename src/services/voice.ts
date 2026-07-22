/**
 * 语音对话服务层
 *
 * 封装 Wake → ASR → LTM → LLM → TTS 全链路为简洁方法，
 * 对页面组件隐藏技术细节。页面只需调用这些方法，拿到结果展示即可。
 *
 * 对应文档：婴儿床业务逻辑版-5.22.xlsx → 1.3 对话引擎与上下文
 * 后端接口：POST /voice/asr, /voice/tts, /voice/chat, /voice/session 等
 */
import {
  voiceAsr,
  voiceTts,
  voiceChat,
  voiceWake,
  voiceIntent,
  voiceCommand,
  queryLtm,
  storeLtm,
  createVoiceSession,
  closeVoiceSession,
  getVoiceHistory,
  getCloneVoices,
  setDefaultVoice,
  trainVoiceClone,
  deleteVoiceClip,
  getVoices,
  deleteVoice,
  uploadVoiceLibrary,
  getVoiceLibraryList,
  switchVoiceById,
  deleteVoiceByName,
  type VoiceCloneInfo,
  type ChatMessage,
  type VoiceSession,
} from '@/api/voice'

// ========== 类型定义 ==========

/** 对话上下文 */
export interface ConversationContext {
  sessionId: string
  babyId: number
}

/** 发送消息结果 */
export interface MessageResult {
  reply: string
  audioUrl: string | null
  sessionId: string
}

/** 语音转文字结果 */
export interface AsrResult {
  text: string
}

/** 文字转语音结果 */
export interface TtsResult {
  audioUrl: string
}

// ========== 对话生命周期 ==========

/** 当前活跃的会话上下文 */
let activeSession: ConversationContext | null = null

/**
 * 开始一段新对话
 * 对应后端链路第一步：创建会话 → 硬件端开始监听唤醒词
 */
export async function startConversation(babyId: number, sessionType = 'voice'): Promise<ConversationContext> {
  // 先关闭旧会话（如果有）
  if (activeSession) {
    await closeConversation()
  }

  const res = await createVoiceSession({ baby_id: babyId, session_type: sessionType })
  if (res.code !== 0) throw new Error(res.message || '创建会话失败')

  activeSession = {
    sessionId: res.data.session_id,
    babyId,
  }
  return activeSession
}

/**
 * 结束当前对话
 */
export async function closeConversation(): Promise<void> {
  if (!activeSession) return
  try {
    await closeVoiceSession(activeSession.sessionId)
  } catch {
    // 忽略关闭失败
  }
  activeSession = null
}

/**
 * 获取当前会话ID（如果没有则返回 null）
 */
export function getSessionId(): string | null {
  return activeSession?.sessionId ?? null
}

// ========== 核心对话功能 ==========

/**
 * 发送文字消息给AI，获取回复
 * 对应链路：LTM检索 → LLM推理 → 返回文字回复
 * 页面只需调用这一个方法，不需要关心 LTM/LLM 的细节
 *
 * @param babyId 宝宝ID
 * @param message 用户输入的文字
 * @returns AI的文字回复和会话ID
 */
export async function sendMessage(babyId: number, message: string): Promise<MessageResult> {
  // 如果没有活跃会话，自动创建一个
  if (!activeSession || activeSession.babyId !== babyId) {
    await startConversation(babyId)
  }

  const res = await voiceChat({
    baby_id: babyId,
    message,
    session_id: activeSession!.sessionId,
  })

  if (res.code !== 0) throw new Error(res.message || '对话请求失败')

  return {
    reply: res.data.content_text || '',
    audioUrl: null,
    sessionId: activeSession!.sessionId,
  }
}

/**
 * 语音转文字（ASR）
 * 用户按住录音 → 上传音频 → 返回文字
 * 页面只需调用这个方法拿到文字，不需要知道 ASR 这个词
 *
 * @param babyId 宝宝ID
 * @param audioData 音频数据（base64编码）
 * @returns 识别出的文字
 */
export async function recognizeSpeech(babyId: number, audioData: string): Promise<AsrResult> {
  const res = await voiceAsr({ baby_id: babyId, audio_data: audioData })
  if (res.code !== 0) throw new Error(res.message || '语音识别失败')
  return { text: res.data.text }
}

/**
 * 文字转语音（TTS）
 * AI回复文字 → 生成语音 → 返回音频URL
 * 页面只需调用这个方法拿到音频地址播放，不需要知道 TTS 这个词
 *
 * @param babyId 宝宝ID
 * @param text 要转语音的文字
 * @returns 音频文件URL
 */
export async function synthesizeSpeech(babyId: number, text: string): Promise<TtsResult> {
  const res = await voiceTts({ baby_id: babyId, text })
  if (res.code !== 0) throw new Error(res.message || '语音合成失败')
  return { audioUrl: res.data.audio_url }
}

// ========== 唤醒与指令 ==========

/**
 * 检测唤醒词
 */
export async function detectWakeWord(babyId: number, audioData: string): Promise<{ word: string; confidence: number }> {
  const res = await voiceWake({ baby_id: babyId, audio_data: audioData })
  if (res.code !== 0) throw new Error(res.message || '唤醒检测失败')
  return { word: res.data.wake_word || '', confidence: res.data.confidence }
}

/**
 * 识别用户指令意图
 */
export async function recognizeIntent(babyId: number, text: string, context?: string) {
  const res = await voiceIntent({ baby_id: babyId, text, context })
  if (res.code !== 0) throw new Error(res.message || '意图识别失败')
  return res.data
}

/**
 * 执行语音指令
 */
export async function executeCommand(babyId: number, command: string, params?: Record<string, any>) {
  const res = await voiceCommand({ baby_id: babyId, command, params })
  if (res.code !== 0) throw new Error(res.message || '指令执行失败')
  return res.data
}

// ========== 长记忆管理 ==========

/**
 * 检索相关历史记忆
 */
export async function searchMemories(babyId: number, query: string, limit = 5) {
  const res = await queryLtm({ baby_id: babyId, query, limit })
  if (res.code !== 0) throw new Error(res.message || '记忆检索失败')
  return res.data
}

/**
 * 保存重要对话到记忆库
 */
export async function saveMemory(babyId: number, content: string, tags?: string[]) {
  const res = await storeLtm({ baby_id: babyId, content, tags })
  if (res.code !== 0) throw new Error(res.message || '记忆保存失败')
  return res.data
}

// ========== 音色库管理 ==========

/**
 * 获取音色库列表（后端接口）
 * 返回格式：VoiceCloneInfo[]
 */
export async function getVoiceLibrary(): Promise<VoiceCloneInfo[]> {
  const res = await getVoiceLibraryList()
  if (res.code === 0 && Array.isArray(res.data)) {
    return res.data
  }
  return []
}

/**
 * 克隆音色（文件上传方式）
 */
export async function cloneVoiceLibrary(data: {
  voice_role: string
  voice_name: string
  text: string
  is_default?: boolean
  audio_file: string
}): Promise<any> {
  const res = await uploadVoiceLibrary(data)
  if (res.code !== 0) throw new Error(res.message || '克隆音色失败')
  return res.data
}

/**
 * 设为默认音色
 */
export async function switchDefaultVoice(voiceId: string): Promise<void> {
  const res = await switchVoiceById(voiceId)
  if (res.code !== 0) throw new Error(res.message || '切换默认音色失败')
}

/**
 * 训练新音色（旧接口）
 */
export async function trainNewVoice(data: { baby_id: number; voice_role: string; audio_data: string; voice_name?: string }) {
  const res = await trainVoiceClone(data)
  if (res.code !== 0) throw new Error(res.message || '音色训练失败')
  return res.data
}

/**
 * 删除音色（后端接口，根据音色名称删除）
 * @param voiceName 音色名称
 */
export async function removeVoice(voiceName: string): Promise<void> {
  const res = await deleteVoiceByName(voiceName)
  if (res.code !== 0) throw new Error(res.message || '删除音色失败')
}

// ========== 对话历史 ==========

/**
 * 获取对话历史
 */
export async function getChatHistory(babyId: number, sessionId?: string, page = 1, pageSize = 20) {
  const res = await getVoiceHistory({ baby_id: babyId, session_id: sessionId, page, page_size: pageSize })
  if (res.code !== 0) throw new Error(res.message || '获取对话历史失败')
  return res.data
}
