/**
 * 语音交互API
 * 对齐后端 FastAPI：18个接口（全部小程序接口）
 * 路径参数：{clip_id}, {session_id}, {voice_id}
 */
import { get, post, put, del } from './request'
import { API } from './config'
import { BASE_URL, SPEECH_BASE_URL, ASR_BASE_URL } from './config'

// 音色信息（对齐后端 VoiceClipInfo）
export interface VoiceClip {
  id: number
  family_id: number
  voice_role: string
  clip_type: string
  clip_name: string | null
  event_type_id: number | null
  scenario: string | null
  content_text: string | null
  audio_url: string
  duration_ms: number | null
  file_size_bytes: number | null
  tts_model_id: string | null
  similarity_score: number | null
  is_active: number | null
  sort_order: number | null
  created_at: string | null
}

// 音色库信息（对齐后端 VoiceInfo）
export interface VoiceCloneInfo {
  id: number | null
  voice_id: string
  voice_role: string
  voice_name: string
  is_default: boolean
  similarity_score: number | null
  created_at: string | null
}

// 对话历史（对齐后端 ChatMessageInfo）
export interface ChatMessage {
  id: number
  baby_id: number
  session_id: string
  role: string
  content_text: string | null
  ltm_tags: string | null
  is_ltm_stored: number | null
  asr_confidence: number | null
  tts_voice_role: string | null
  response_latency_ms: number | null
  created_at: string | null
}

// 会话信息（对齐后端 SessionInfo）
export interface VoiceSession {
  session_id: string
  baby_id: number
  session_type: string
  status: string
  created_at: string | null
  updated_at: string | null
}

// 语音克隆训练响应（对齐后端 VoiceCloneTrainResponse）
export interface VoiceCloneTrainResult {
  voice_id: string
  voice_role: string
  status: string
  similarity_score: number | null
  message: string | null
  created_at: string | null
}

// 语音切换请求（对齐后端 VoiceSwitchRequest）
export interface VoiceSwitchRequest {
  voice_id: string
  switch_delay_ms?: number
}

// ========== 基础语音接口 ==========

/**
 * 上传音频训练克隆专属音色
 * POST /api/v1/voice/clone
 */
export function cloneVoice(data: {
  baby_id: number
  clip_name: string
  audio_file: File
}) {
  return post<VoiceClip>(API.VOICE.CLONE, data)
}

/**
 * 查询已克隆音色列表
 * GET /api/v1/voice/clips
 */
export function getVoiceClips(babyId: number) {
  return get<VoiceClip[]>(`${API.VOICE.CLIPS}?baby_id=${babyId}`)
}

/**
 * 切换当前使用AI音色
 * POST /api/v1/voice/switch
 */
export function switchVoice(data: { clip_id: number }) {
  return post(API.VOICE.SWITCH, data)
}

/**
 * 语音转换文字识别（外部接口）
 * POST http://223.247.96.246:30021/speech-to-text
 */
export function voiceAsr(data: { baby_id: number; audio_data: string }): Promise<{ code: number; message: string; data: { text: string } }> {
  const token = uni.getStorageSync('baby_bed_token') || ''
  return new Promise((resolve, reject) => {
    uni.request({
      url: ASR_BASE_URL + '/speech-to-text',
      method: 'POST',
      data: data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      success: (res: any) => {
        try {
          const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          resolve(parsed)
        } catch {
          resolve({ code: 0, data: { text: '' }, message: '解析失败' })
        }
      },
      fail: (err: any) => {
        reject(new Error('语音识别失败: ' + (err.errMsg || '网络错误')))
      },
    })
  })
}

/**
 * 文字转换语音输出（外部接口）
 * POST http://223.247.96.246:30028/v1/audio/generate_speech
 */
export function voiceTts(data: { baby_id: number; text: string; voice_role?: string }): Promise<{ code: number; message: string; data: { audio_url: string } }> {
  const token = uni.getStorageSync('baby_bed_token') || ''
  return new Promise((resolve, reject) => {
    uni.request({
      url: SPEECH_BASE_URL + '/audio/generate_speech',
      method: 'POST',
      data: {
        input: data.text,
        voice: data.voice_role || 'longxiaoxia',
        response_format: 'wav',
        sample_rate: 24000,
        stream: false,
        speed: 1,
      },
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      success: (res: any) => {
        try {
          const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          resolve(parsed)
        } catch {
          resolve({ code: 0, data: { audio_url: '' }, message: '解析失败' })
        }
      },
      fail: (err: any) => {
        reject(new Error('语音合成失败: ' + (err.errMsg || '网络错误')))
      },
    })
  })
}

/**
 * 和AI进行自然语言对话
 * POST /api/v1/voice/chat
 * 对齐后端 ChatRequest: { baby_id, message, session_id?: string }
 */
export function voiceChat(data: {
  baby_id: number
  message: string
  session_id?: string
}) {
  return post<ChatMessage>(API.VOICE.CHAT, data)
}

/**
 * 分页查询历史对话记录
 * GET /api/v1/voice/history
 */
export function getVoiceHistory(params: { baby_id: number; session_id?: string; page?: number; page_size?: number }) {
  const queryParams: string[] = [`baby_id=${params.baby_id}`]
  if (params.session_id) queryParams.push(`session_id=${params.session_id}`)
  if (params.page) queryParams.push(`page=${params.page}`)
  if (params.page_size) queryParams.push(`page_size=${params.page_size}`)
  return get<{ items: ChatMessage[]; page: number; page_size: number }>(`${API.VOICE.HISTORY}?${queryParams.join('&')}`)
}

/**
 * 删除某个克隆音色
 * DELETE /api/v1/voice/clip/{clip_id}
 */
export function deleteVoiceClip(clipId: number) {
  return del(API.VOICE.DELETE_CLIP(clipId))
}

// ========== 新增语音接口 ==========

/**
 * 语音唤醒词检测
 * POST /api/v1/voice/wake
 */
export function voiceWake(data: {
  baby_id: number
  audio_data: string
  filter_noise?: boolean
}) {
  return post<{ is_waked: boolean; confidence: number; wake_word: string | null }>(API.VOICE.WAKE, data)
}

/**
 * 语音指令意图识别
 * POST /api/v1/voice/intent
 */
export function voiceIntent(data: {
  baby_id: number
  text: string
  context?: string
}) {
  return post<{ intent: string; confidence: number; slots: Record<string, any> | null }>(API.VOICE.INTENT, data)
}

/**
 * 执行语音指令控制
 * POST /api/v1/voice/command
 */
export function voiceCommand(data: {
  baby_id: number
  command: string
  params?: Record<string, any>
}) {
  return post<{ command: string; status: string; result: string | null; message: string | null }>(API.VOICE.COMMAND, data)
}

/**
 * 查询长记忆数据库
 * POST /api/v1/voice/ltm/query
 */
export function queryLtm(data: {
  baby_id: number
  query: string
  limit?: number
}) {
  return post<{ id: number; baby_id: number; content: string; tags: string | null; source: string; created_at: string | null }[]>(API.VOICE.LTM_QUERY, data)
}

/**
 * 存储对话到长记忆库
 * POST /api/v1/voice/ltm/store
 */
export function storeLtm(data: {
  baby_id: number
  content: string
  tags?: string[]
  source?: string
}) {
  return post<{ id: number }>(API.VOICE.LTM_STORE, data)
}

/**
 * 创建新的对话会话
 * POST /api/v1/voice/session
 */
export function createVoiceSession(data: {
  baby_id: number
  session_type?: string
}) {
  return post<VoiceSession>(API.VOICE.SESSION_CREATE, data)
}

/**
 * 关闭指定对话会话
 * POST /api/v1/voice/session/{session_id}/close
 */
export function closeVoiceSession(sessionId: string) {
  return post(API.VOICE.SESSION_CLOSE(sessionId))
}

/**
 * 训练语音克隆模型
 * POST /api/v1/voice/clone/train
 */
export function trainVoiceClone(data: {
  baby_id: number
  voice_role: string
  audio_data: string
  voice_name?: string
}) {
  return post<VoiceCloneTrainResult>(API.VOICE.CLONE_TRAIN, data)
}

/**
 * 获取音色库列表
 * GET /api/v1/voice/clone/voices
 */
export function getCloneVoices(babyId: number) {
  return get<VoiceCloneInfo[]>(`${API.VOICE.CLONE_VOICES}?baby_id=${babyId}`)
}

/**
 * 设置默认音色
 * PUT /api/v1/voice/clone/voices/{voice_id}/default
 */
export function setDefaultVoice(voiceId: string) {
  return put(API.VOICE.CLONE_VOICE_DEFAULT(voiceId), {
    voice_id: voiceId,
    switch_delay_ms: 150,
  })
}

// ========== 外部语音接口 ==========

/**
 * 获取音色列表（外部接口）
 * GET http://223.247.96.246:30028/v1/audio/get_voices
 * 返回格式：{ voices: ["xiaohe", "speech:liangbo:xxx:6262ce28", ...] }
 */
export function getVoices(): Promise<{ voices: string[] }> {
  const token = uni.getStorageSync('baby_bed_token') || ''
  return new Promise((resolve, reject) => {
    uni.request({
      url: SPEECH_BASE_URL + '/audio/get_voices',
      method: 'GET',
      header: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      success: (res: any) => {
        try {
          const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          resolve(parsed)
        } catch {
          resolve({ voices: [] })
        }
      },
      fail: (err: any) => {
        reject(new Error('获取音色列表失败: ' + (err.errMsg || '网络错误')))
      },
    })
  })
}

/**
 * 删除音色（外部接口）
 * DELETE http://223.247.96.246:30028/v1/audio/delete_voice?voice_uri=xxx
 */
export function deleteVoice(voiceUri: string) {
  const token = uni.getStorageSync('baby_bed_token') || ''
  return new Promise((resolve, reject) => {
    uni.request({
      url: SPEECH_BASE_URL + `/audio/delete_voice?voice_uri=${encodeURIComponent(voiceUri)}`,
      method: 'DELETE',
      header: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      success: (res: any) => {
        try {
          const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          resolve(parsed)
        } catch {
          resolve({ code: 0, data: res.data })
        }
      },
      fail: (err: any) => {
        reject(new Error('删除音色失败: ' + (err.errMsg || '网络错误')))
      },
    })
  })
}

/**
 * 克隆音色（外部接口）
 * POST http://223.247.96.246:30028/v1/audio/clone_voice
 */
export function cloneVoiceExternal(data: { customName: string; text: string; file: any }) {
  const token = uni.getStorageSync('baby_bed_token') || ''
  return new Promise((resolve, reject) => {
    uni.request({
      url: SPEECH_BASE_URL + '/audio/clone_voice',
      method: 'POST',
      data: data,
      header: {
        'Content-Type': 'multipart/form-data',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      success: (res: any) => {
        try {
          const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          resolve(parsed)
        } catch {
          resolve({ code: 0, data: res.data })
        }
      },
      fail: (err: any) => {
        reject(new Error('克隆音色失败: ' + (err.errMsg || '网络错误')))
      },
    })
  })
}
