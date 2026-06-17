<template>
  <view class="onboarding-page">
    <!-- 自定义导航栏返回按钮 -->
    <view class="custom-nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @click="goBack">
        <u-icon name="arrow-left" size="20" color="#333" />
        <text class="nav-back-text">返回</text>
      </view>
    </view>

    <!-- 步骤指示器（直接模式和重新配网模式隐藏） -->
    <view class="stepper" v-if="!directMode && !reconfigMode">
      <view class="step" v-for="(s, i) in steps" :key="i" :class="{ active: i <= currentStep, done: i < currentStep }" @click="jumpToStep(i)">
        <view class="step-dot">
          <u-icon v-if="i < currentStep" name="checkmark" size="14" color="#fff" />
          <text v-else>{{ i + 1 }}</text>
        </view>
        <text class="step-label">{{ s.label }}</text>
        <view v-if="i < steps.length - 1" class="step-line" :class="{ filled: i < currentStep }" />
      </view>
    </view>

    <!-- 步骤0: 家庭配置 -->
    <view class="step-content" v-if="currentStep === 0">
      <view class="intro-strip">
        <view class="intro-icon">
          <u-icon name="home-fill" size="24" color="#667eea" />
        </view>
        <view class="intro-copy">
          <text class="intro-title">欢迎使用智能婴儿床</text>
          <text class="intro-desc">完成家庭、宝宝和设备连接后即可开始看护</text>
        </view>
      </view>

      <view class="section-card">
        <text class="card-title">设置家庭</text>
        <text class="card-desc">创建家庭成为管理员，或输入邀请码加入已有家庭</text>

        <!-- Tab 切换 -->
        <view class="family-tabs">
          <view class="family-tab" :class="{ active: familyMode === 'create' }" @click="familyMode = 'create'">
            <u-icon name="plus-circle" size="18" :color="familyMode === 'create' ? '#667eea' : '#999'" />
            <text>创建家庭</text>
          </view>
          <view class="family-tab" :class="{ active: familyMode === 'join' }" @click="familyMode = 'join'">
            <u-icon name="scan" size="18" :color="familyMode === 'join' ? '#667eea' : '#999'" />
            <text>加入家庭</text>
          </view>
        </view>

        <!-- 创建家庭 -->
        <view v-if="familyMode === 'create'">
          <view class="form-group">
            <text class="form-label">家庭名称</text>
            <u-input v-model="familyForm.family_name" placeholder="如：我的家庭" border="surround" clearable maxlength="16" />
          </view>
          <u-button type="primary" text="创建家庭" :loading="familyLoading" @click="createFamily" block />
        </view>

        <!-- 加入家庭 -->
        <view v-if="familyMode === 'join'">
          <view class="form-group">
            <text class="form-label">邀请码</text>
            <u-input v-model="familyForm.invite_code" placeholder="输入家人分享的邀请码" border="surround" clearable />
          </view>
          <u-button type="primary" text="加入家庭" :loading="familyLoading" @click="joinFamily" block />
        </view>
      </view>

      <view class="tip-card">
        <u-icon name="info-circle" size="18" color="#5677fc" />
        <text class="tip-text">创建家庭后你将成为管理员，可以邀请家人共同看护宝宝</text>
      </view>
    </view>

    <!-- 步骤1: 宝宝信息 -->
    <view class="step-content" v-if="currentStep === 1">
      <view class="section-card">
        <text class="card-title">宝宝信息</text>
        <text class="card-desc">宝宝昵称必填，性别和生日可以之后再补充</text>

        <view class="baby-mini-card" v-if="activeBaby">
          <image class="baby-mini-avatar" :src="activeBaby.avatar_url || '/static/logo.png'" mode="aspectFill" />
          <view class="baby-mini-info">
            <text class="baby-mini-name">{{ activeBaby.name }}</text>
            <text class="baby-mini-desc">{{ currentBabyAgeText }}</text>
          </view>
          <text class="baby-mini-tag">已选择</text>
        </view>

        <view class="form-group">
          <text class="form-label">宝宝昵称</text>
          <u-input v-model="babyForm.name" placeholder="如：小宝贝" border="surround" clearable maxlength="12" />
        </view>

        <view class="form-group">
          <text class="form-label">性别</text>
          <view class="gender-tabs">
            <view class="gender-tab" :class="{ active: babyForm.gender === item.value }" v-for="item in genderOptions" :key="item.value" @click="babyForm.gender = item.value">
              <u-icon :name="item.icon" size="18" :color="babyForm.gender === item.value ? '#667eea' : '#999'" />
              <text>{{ item.label }}</text>
            </view>
          </view>
        </view>

        <view class="form-group">
          <text class="form-label">出生日期</text>
          <u-datetime-picker
            :show="showBirthPicker"
            v-model="birthDateValue"
            mode="date"
            :max-date="todayTimestamp"
            @confirm="onBirthConfirm"
            @cancel="showBirthPicker = false"
          />
          <view class="picker-trigger" @click="showBirthPicker = true">
            <text>{{ babyForm.birth_date || '请选择出生日期' }}</text>
            <u-icon name="arrow-right" size="14" color="#999" />
          </view>
        </view>

        <u-button type="primary" :text="activeBaby ? '确认宝宝信息' : '保存宝宝信息'" :loading="babySaving" @click="saveBabyInfo" block />
      </view>

      <view class="tip-card">
        <u-icon name="info-circle" size="18" color="#5677fc" />
        <text class="tip-text">宝宝月龄会用于作息模板、成长记录和监控提醒，可以之后在"我的-宝宝管理"中修改。</text>
      </view>
    </view>

    <!-- 步骤2: 连接设备 -->
    <view class="step-content" v-if="currentStep === 2">
      <view class="section-card">
        <text class="card-title">连接设备</text>
        <text class="card-desc">扫码或输入设备 SN 后，完成 WiFi 配网并绑定到宝宝；设备不在身边时可先跳过</text>

        <view class="scan-area" @click="scanQRCode">
          <u-icon name="scan" size="48" color="#667eea" />
          <text class="scan-text">点击扫码绑定</text>
        </view>

        <view class="divider">
          <view class="divider-line" />
          <text class="divider-text">或手动输入</text>
          <view class="divider-line" />
        </view>

        <view class="form-group">
          <text class="form-label">设备序列号</text>
          <u-input v-model="bindForm.device_sn" placeholder="输入设备SN码" border="surround" clearable />
        </view>

        <view class="form-group" v-if="babyStore.babyList.length > 0">
          <text class="form-label">绑定到宝宝</text>
          <u-picker :show="showBabyPicker" :columns="babyColumns" keyName="text" @confirm="onBabyConfirm" @cancel="showBabyPicker = false" />
          <view class="picker-trigger" @click="showBabyPicker = true">
            <text>{{ selectedBabyName || '请选择宝宝' }}</text>
            <u-icon name="arrow-right" size="14" color="#999" />
          </view>
        </view>

        <view class="form-group">
          <text class="form-label">WiFi名称 (SSID)</text>
          <u-input v-model="wifiForm.ssid" placeholder="输入WiFi名称" border="surround" clearable />
        </view>

        <view class="form-group">
          <text class="form-label">WiFi密码</text>
          <u-input v-model="wifiForm.password" placeholder="输入WiFi密码" border="surround" type="password" clearable />
        </view>

        <u-button type="primary" text="完成连接" :loading="wifiConnecting || binding" @click="completeDeviceSetup" block />
        <u-button class="skip-device-btn" text="暂不连接，进入首页" @click="skipDeviceSetup" block plain />
      </view>

      <view class="tip-card">
        <u-icon name="info-circle" size="18" color="#ff9900" />
        <text class="tip-text">设备指示灯蓝色闪烁表示正在连接，常亮绿色表示连接成功。跳过后可在首页或“我的-设备管理”中继续连接。</text>
      </view>
    </view>

    <!-- 重新配网：已登录家庭用户的短流程 -->
    <view class="reconfig-content" v-if="currentStep === 4 && reconfigMode">
      <view class="reconfig-hero">
        <view class="reconfig-icon">
          <u-icon name="wifi" size="34" color="#fff" />
        </view>
        <view class="reconfig-title-wrap">
          <text class="reconfig-title">重新配网</text>
          <text class="reconfig-desc">为已绑定设备重新连接 WiFi，不会修改家庭、宝宝和设备绑定关系</text>
        </view>
      </view>

      <view class="section-card">
        <text class="card-title">选择设备</text>
        <text class="card-desc">家庭内只有一台设备时会自动选择</text>

        <view class="device-summary" v-if="selectedDeviceSn">
          <view class="device-summary-icon">
            <u-icon name="grid-fill" size="22" color="#5677fc" />
          </view>
          <view class="device-summary-info">
            <text class="device-summary-name">{{ selectedDeviceName || '婴儿床设备' }}</text>
            <text class="device-summary-sn">SN: {{ selectedDeviceSn }}</text>
          </view>
          <text class="device-summary-status">{{ selectedDeviceStatus }}</text>
        </view>

        <view class="picker-trigger" v-if="deviceList.length > 1" @click="showDevicePicker = true">
          <text>{{ selectedDeviceName || '请选择要重新配网的设备' }}</text>
          <u-icon name="arrow-right" size="14" color="#999" />
        </view>

        <u-picker
          :show="showDevicePicker"
          :columns="deviceColumns"
          keyName="text"
          @confirm="onDeviceConfirm"
          @cancel="showDevicePicker = false"
        />

        <view class="empty-device" v-if="!deviceLoading && deviceList.length === 0">
          <u-icon name="info-circle" size="18" color="#ff9900" />
          <text>暂未获取到已绑定设备，请手动输入设备底部标签上的 SN 码。</text>
        </view>
      </view>

      <view class="section-card">
        <text class="card-title">WiFi信息</text>
        <text class="card-desc">请让手机和婴儿床靠近路由器，设备指示灯蓝色闪烁时开始配网</text>

        <view class="form-group">
          <text class="form-label">WiFi名称 (SSID)</text>
          <u-input v-model="wifiForm.ssid" placeholder="输入WiFi名称" border="surround" clearable />
        </view>

        <view class="form-group">
          <text class="form-label">WiFi密码</text>
          <u-input v-model="wifiForm.password" placeholder="输入WiFi密码" border="surround" type="password" clearable />
        </view>

        <view class="form-group">
          <text class="form-label">设备序列号</text>
          <u-input v-model="wifiForm.device_sn" placeholder="设备底部标签上的SN码" border="surround" clearable />
        </view>

        <u-button type="primary" text="开始配网" :loading="wifiConnecting" @click="connectWifi" block />
      </view>

      <view class="tip-card">
        <u-icon name="info-circle" size="18" color="#ff9900" />
        <text class="tip-text">重新配网只更新设备网络连接，成功后可返回设备管理查看在线状态。</text>
      </view>
    </view>

    <!-- 步骤5: 语音录入 -->
    <view class="step-content" v-if="currentStep === 5">
      <view class="section-card">
        <text class="card-title">录入家人声音</text>
        <text class="card-desc">录制5-20秒语音，AI将学习并克隆您的音色</text>

        <view class="voice-role-list">
          <view class="voice-role-item" v-for="role in voiceRoles" :key="role.value"
            :class="{ selected: voiceForm.voice_role === role.value }"
            @click="voiceForm.voice_role = role.value">
            <u-icon :name="role.icon" size="24" :color="voiceForm.voice_role === role.value ? '#667eea' : '#999'" />
            <text class="role-name">{{ role.label }}</text>
            <view class="role-check" v-if="voiceForm.voice_role === role.value">
              <u-icon name="checkmark-circle-fill" size="20" color="#667eea" />
            </view>
          </view>
        </view>

        <view class="form-group">
          <text class="form-label">音色名称</text>
          <u-input v-model="voiceForm.voice_name" placeholder="如：妈妈的声音" border="surround" clearable maxlength="16" />
        </view>

        <view class="form-group">
          <text class="form-label">朗读文本</text>
          <u-picker :show="showTextPicker" :columns="voiceTextColumns" keyName="text" @confirm="onVoiceTextConfirm" @cancel="showTextPicker = false" />
          <view class="picker-trigger" @click="showTextPicker = true">
            <text>{{ voiceForm.voice_text || '请选择朗读文本' }}</text>
            <u-icon name="arrow-right" size="14" color="#999" />
          </view>
        </view>

        <view class="record-area">
          <!-- 录音方式切换 -->
          <view class="record-mode-tabs">
            <view class="mode-tab" :class="{ active: recordMode === 'mic' }" @click="switchRecordMode('mic')">
              <u-icon name="mic" size="16" :color="recordMode === 'mic' ? '#667eea' : '#999'" />
              <text>实时录音</text>
            </view>
            <view class="mode-tab" :class="{ active: recordMode === 'upload' }" @click="switchRecordMode('upload')">
              <u-icon name="folder" size="16" :color="recordMode === 'upload' ? '#667eea' : '#999'" />
              <text>上传音频</text>
            </view>
          </view>

          <!-- 实时录音模式 -->
          <view class="mic-mode" v-if="recordMode === 'mic'">
            <view class="record-btn" :class="{ recording: isRecording }" @touchstart.prevent="startRecord" @touchend.prevent="stopRecord" @touchcancel.prevent="stopRecord">
              <u-icon :name="isRecording ? 'mic' : 'mic'" size="32" color="#fff" />
            </view>
            <text class="record-hint">{{ isRecording ? '松开结束录音' : '按住录音' }}</text>
            <text class="record-time" v-if="recordDuration > 0">{{ formatDuration(recordDuration) }}</text>
            <text class="record-limit" v-if="!audioFilePath">最短5秒，最长20秒</text>
          </view>

          <!-- 上传音频模式 -->
          <view class="upload-mode" v-if="recordMode === 'upload'">
            <view class="upload-btn" @click="chooseAudioFile">
              <u-icon name="folder" size="28" color="#667eea" />
              <text class="upload-btn-text">选择音频文件</text>
            </view>
            <text class="upload-hint">从微信聊天记录选取 mp3/wav</text>
          </view>

          <!-- 已有录音：试听与重录 -->
          <view class="audio-preview" v-if="audioFilePath">
            <view class="preview-info">
              <u-icon name="volume-fill" size="20" color="#667eea" />
              <text class="preview-name">{{ audioFileName || '录音文件' }}</text>
              <text class="preview-duration" v-if="recordDuration > 0">{{ formatDuration(recordDuration) }}</text>
            </view>
            <view class="preview-actions">
              <view class="preview-action" @click="playAudio">
                <u-icon :name="isPlaying ? 'pause-circle' : 'play-circle'" size="22" color="#667eea" />
                <text>{{ isPlaying ? '暂停' : '试听' }}</text>
              </view>
              <view class="preview-action" @click="resetAudio">
                <u-icon name="reload" size="22" color="#ff9900" />
                <text>重录</text>
              </view>
            </view>
          </view>
        </view>

        <u-button type="primary" text="提交训练" :loading="training" @click="submitVoiceClone" block />
      </view>

      <view class="tip-card">
        <u-icon name="info-circle" size="18" color="#5677fc" />
        <text class="tip-text">语音克隆训练需要几分钟，完成后可在AI陪伴页面切换使用</text>
      </view>
    </view>

    <!-- 完成页 -->
    <view class="step-content" v-if="currentStep === 3">
      <view class="done-hero">
        <view class="done-icon">
          <u-icon name="checkmark-circle-fill" size="64" color="#19be6b" />
        </view>
        <text class="done-title">{{ doneTitle }}</text>
        <text class="done-desc">{{ doneDesc }}</text>
      </view>

      <view class="done-actions">
        <u-button type="primary" text="进入首页" @click="goHome" block />
        <u-button v-if="onboardingEntryMode === 'create'" text="现在录入家人声音" @click="currentStep = 5" block plain />
        <u-button v-if="onboardingEntryMode === 'create'" text="再添加一台设备" @click="currentStep = 2" block plain />
      </view>
    </view>

    <!-- 底部导航 -->
    <view class="bottom-nav reconfig-bottom" v-if="reconfigMode && currentStep === 4">
      <u-button text="取消" @click="goBack" plain />
      <u-button type="primary" text="查看设备状态" @click="goDeviceList" />
    </view>

    <view class="bottom-nav" v-if="!reconfigMode && ((!directMode && (currentStep < 3 || currentStep === 5)) || (directMode && currentStep === 5))">
      <u-button v-if="currentStep > 0 && !directMode && currentStep !== 5" text="上一步" @click="prevStep" plain />
      <view v-else-if="!directMode" />
      <u-button type="primary" :text="nextButtonText" @click="nextStep" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useBabyStore, useFamilyStore } from '@/stores'
import { post } from '@/api/request'
import { API, SPEECH_BASE_URL } from '@/api/config'
import { getDeviceList, type DeviceInfo } from '@/api/device'
import { cloneVoiceLibrary } from '@/services/voice'
import { formatBabyAge } from '@/utils/age'

const babyStore = useBabyStore()
const familyStore = useFamilyStore()

// 直接模式：从AI陪伴页面进入，跳过家庭/宝宝/连接设备，直接到语音录入
const directMode = ref(false)
const reconfigMode = ref(false)
const statusBarHeight = ref(44)

const currentStep = ref(0)
const onboardingEntryMode = ref<'create' | 'join'>('create')

onLoad(async (options: any) => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 44

  // 直接模式：从AI陪伴页面进入，跳到语音录入
  if (options?.direct === 'voice') {
    directMode.value = true
    currentStep.value = 5
    loadBabyData()
    return
  }

  // 重新配网模式：从"我的"页面进入，跳到WiFi配置步骤
  if (options?.reconfig === '1') {
    reconfigMode.value = true
    currentStep.value = 4
    loadBabyData()
    loadDeviceData()
    return
  }

  // 检查是否已有家庭，有则跳过引导
  await familyStore.fetchFamilyInfo()
  if (familyStore.hasFamily) {
    goHome()
    return
  }

  loadBabyData()
})

function loadBabyData() {
  babyStore.fetchBabyList().then(() => {
    if (!shouldUseExistingBaby.value) {
      bindForm.value.baby_id = 0
      selectedBabyName.value = ''
      babyForm.value = { name: '', gender: 1, birth_date: '' }
      return
    }

    const baby = babyStore.currentBaby || babyStore.babyList[0]
    if (!baby) return
    babyStore.setCurrentBaby(baby)
    bindForm.value.baby_id = baby.id
    selectedBabyName.value = baby.name
    babyForm.value.name = baby.name
    babyForm.value.gender = baby.gender ?? 0
    babyForm.value.birth_date = baby.birth_date || ''
    if (baby.birth_date) birthDateValue.value = new Date(baby.birth_date).getTime()
  })
}

const wifiConnecting = ref(false)
const binding = ref(false)
const training = ref(false)
const isRecording = ref(false)
const isPlaying = ref(false)
const recordDuration = ref(0)
const showBabyPicker = ref(false)
const showDevicePicker = ref(false)
const showBirthPicker = ref(false)
const babySaving = ref(false)
const familyLoading = ref(false)
const familyMode = ref<'create' | 'join'>('create')
const deviceLoading = ref(false)

// 语料采样相关状态
const recordMode = ref<'mic' | 'upload'>('mic')
const audioFilePath = ref('')
const audioFileName = ref('')

// 录音管理器
const recorderManager = uni.getRecorderManager()
// 音频播放管理器
let innerAudioContext: UniApp.InnerAudioContext | null = null
// 录音计时器
let recordTimer: ReturnType<typeof setInterval> | null = null

// 监听录音结束事件
recorderManager.onStop((res: any) => {
  audioFilePath.value = res.tempFilePath
  audioFileName.value = '录音_' + new Date().toLocaleTimeString().replace(/:/g, '')
  if (recordDuration.value < 5) {
    uni.showToast({ title: '录音时间不足5秒，请重新录制', icon: 'none' })
    audioFilePath.value = ''
    recordDuration.value = 0
  }
})

// 监听录音错误
recorderManager.onError(() => {
  isRecording.value = false
  if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
  uni.showToast({ title: '录音失败，请检查权限', icon: 'none' })
})

const steps = [
  { label: '家庭' },
  { label: '宝宝' },
  { label: '连接' },
  { label: '完成' },
]

const wifiForm = ref({ ssid: '', password: '', device_sn: '' })
const bindForm = ref({ device_sn: '', baby_id: 0 })
const voiceForm = ref({
  voice_role: 'mom',
  voice_name: '',
  voice_text: '乖宝宝快闭眼，妈妈在你身边陪着你哦。',
})

const showTextPicker = ref(false)
const voiceTextOptions = [
  '乖宝宝快闭眼，妈妈在你身边陪着你哦。',
  '月亮婆婆挂在天上，守护着你进入甜甜的梦乡。',
  '小宝贝不要害怕，爸爸会一直在这里陪着你。',
]
const voiceTextColumns = computed(() => [voiceTextOptions.map(text => ({ text }))])
const onVoiceTextConfirm = (val: any) => {
  voiceForm.value.voice_text = val.value[0].text
  showTextPicker.value = false
}
const babyForm = ref({ name: '', gender: 1, birth_date: '' })
const familyForm = ref({ family_name: '', invite_code: '' })
const birthDateValue = ref(Date.now())

// 日期选择器最大日期：今天
const todayTimestamp = (() => {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.getTime()
})()

const genderOptions = [
  { label: '男宝', value: 1, icon: 'man' },
  { label: '女宝', value: 2, icon: 'woman' },
]

const shouldUseExistingBaby = computed(() => directMode.value || reconfigMode.value || onboardingEntryMode.value === 'join')
const activeBaby = computed(() => shouldUseExistingBaby.value ? babyStore.currentBaby : null)

const currentBabyAgeText = computed(() => {
  const baby = activeBaby.value
  if (!baby) return ''
  const age = formatBabyAge(baby)
  return age === '年龄未知' ? '月龄待补充' : age
})

const doneTitle = computed(() => {
  return onboardingEntryMode.value === 'join' ? '加入成功' : '设置完成!'
})

const doneDesc = computed(() => {
  return onboardingEntryMode.value === 'join'
    ? '你已加入家庭，可以开始查看权限内的宝宝看护信息'
    : '智能婴儿床已准备就绪，开始守护宝宝吧'
})

const voiceRoles = [
  { label: '妈妈', value: 'mom', icon: 'woman' },
  { label: '爸爸', value: 'dad', icon: 'man' },
  { label: '奶奶/外婆', value: 'grandma', icon: 'woman' },
  { label: '其他', value: 'other', icon: 'account' },
]

const selectedBabyName = ref('')
const deviceList = ref<DeviceInfo[]>([])
const selectedDeviceSn = ref('')
const selectedDeviceName = ref('')
const selectedDeviceStatus = ref('状态待刷新')

const babyColumns = computed(() => [
  babyStore.babyList.map(b => ({ text: b.name, value: b.id }))
])

const deviceColumns = computed(() => [
  deviceList.value.map(device => ({
    text: `${device.device_name || '婴儿床设备'} (${device.device_sn})`,
    value: device.device_sn,
  }))
])

function onBabyConfirm({ value }: any) {
  const baby = babyStore.babyList.find(b => b.id === value[0].value)
  if (baby) {
    babyStore.setCurrentBaby(baby)
    bindForm.value.baby_id = baby.id
    selectedBabyName.value = baby.name
    babyForm.value.name = baby.name
    babyForm.value.gender = baby.gender ?? 0
    babyForm.value.birth_date = baby.birth_date || ''
    if (baby.birth_date) birthDateValue.value = new Date(baby.birth_date).getTime()
  }
  showBabyPicker.value = false
}

function onBirthConfirm({ value }: any) {
  const d = new Date(value)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  babyForm.value.birth_date = `${y}-${m}-${day}`
  showBirthPicker.value = false
}

function prevStep() {
  if (currentStep.value > 0) currentStep.value--
}

function jumpToStep(step: number) {
  if (step > currentStep.value) {
    uni.showToast({ title: '请先完成当前步骤', icon: 'none' })
    return
  }
  currentStep.value = step
}

const nextButtonText = computed(() => {
  if (currentStep.value === 2) return '暂不连接'
  if (currentStep.value === 5) return '完成'
  return '下一步'
})

async function nextStep() {
  // 步骤0: 家庭 - 需要已创建或加入家庭
  if (currentStep.value === 0) {
    if (!familyStore.hasFamily) {
      uni.showToast({ title: '请先创建或加入家庭', icon: 'none' })
      return
    }
  }
  // 步骤1: 宝宝 - 需要已保存
  if (currentStep.value === 1) {
    if (!activeBaby.value && !babyForm.value.name) {
      uni.showToast({ title: '请填写宝宝昵称', icon: 'none' })
      return
    }
    await saveBabyInfo()
    return
  }
  // 步骤2: 连接设备 - 可跳过，后续在首页或设备管理中连接
  if (currentStep.value === 2) {
    skipDeviceSetup()
    return
  }
  // 步骤5: 语音 - 完成后跳完成页
  if (currentStep.value === 5) {
    currentStep.value = 3
    return
  }
  currentStep.value++
}

// ========== 家庭功能 ==========

async function createFamily() {
  if (!familyForm.value.family_name.trim()) {
    uni.showToast({ title: '请输入家庭名称', icon: 'none' })
    return
  }
  familyLoading.value = true
  try {
    const res = await post(API.FAMILY.CREATE, { family_name: familyForm.value.family_name })
    if (res.code === 0) {
      await familyStore.fetchFamilyInfo()
      onboardingEntryMode.value = 'create'
      uni.showToast({ title: '家庭创建成功', icon: 'success' })
      currentStep.value = 1
    } else {
      uni.showToast({ title: res.message || '创建失败', icon: 'none' })
    }
  } finally {
    familyLoading.value = false
  }
}

function getDeviceStatusText(status: number | null | undefined) {
  if (status === 1) return '在线'
  if (status === 0) return '离线'
  return '状态未知'
}

function applySelectedDevice(device: DeviceInfo) {
  selectedDeviceSn.value = device.device_sn
  selectedDeviceName.value = device.device_name || '婴儿床设备'
  selectedDeviceStatus.value = getDeviceStatusText(device.online_status)
  wifiForm.value.device_sn = device.device_sn
}

function onDeviceConfirm({ value }: any) {
  const deviceSn = value?.[0]?.value
  const device = deviceList.value.find(item => item.device_sn === deviceSn)
  if (device) applySelectedDevice(device)
  showDevicePicker.value = false
}

async function loadDeviceData() {
  deviceLoading.value = true
  try {
    const res = await getDeviceList()
    if (res.code === 0 && Array.isArray(res.data)) {
      deviceList.value = res.data
      if (res.data.length === 1) {
        applySelectedDevice(res.data[0])
      } else if (res.data.length > 1 && babyStore.currentBaby) {
        const currentBabyDevice = res.data.find(item => item.baby_id === babyStore.currentBaby?.id)
        if (currentBabyDevice) applySelectedDevice(currentBabyDevice)
      }
    }
  } finally {
    deviceLoading.value = false
  }
}

async function joinFamily() {
  if (!familyForm.value.invite_code.trim()) {
    uni.showToast({ title: '请输入邀请码', icon: 'none' })
    return
  }
  familyLoading.value = true
  try {
    const res = await post(API.FAMILY.JOIN, { family_code: familyForm.value.invite_code })
    if (res.code === 0) {
      await familyStore.fetchFamilyInfo()
      onboardingEntryMode.value = 'join'
      uni.showToast({ title: '加入成功', icon: 'success' })
      currentStep.value = 3
    } else {
      uni.showToast({ title: res.message || '加入失败', icon: 'none' })
    }
  } finally {
    familyLoading.value = false
  }
}

// ========== WiFi配置 ==========

async function connectWifi() {
  if (!wifiForm.value.ssid || !wifiForm.value.password || !wifiForm.value.device_sn) {
    uni.showToast({ title: '请填写完整WiFi信息', icon: 'none' })
    return
  }
  wifiConnecting.value = true
  try {
    const res = await post(API.DEVICE.WIFI_CONFIG, {
      ssid: wifiForm.value.ssid,
      password: wifiForm.value.password,
      device_sn: wifiForm.value.device_sn,
    })
    if (res.code === 0) {
      uni.showToast({ title: 'WiFi配置成功', icon: 'success' })
      bindForm.value.device_sn = wifiForm.value.device_sn
      if (!reconfigMode.value) {
        currentStep.value = 3
      }
    } else {
      uni.showToast({ title: res.message || 'WiFi配置失败', icon: 'none' })
    }
  } finally {
    wifiConnecting.value = false
  }
}

async function completeDeviceSetup() {
  if (!bindForm.value.device_sn) {
    uni.showToast({ title: '请扫码或输入设备SN码', icon: 'none' })
    return
  }
  if (!bindForm.value.baby_id && babyStore.currentBaby) {
    bindForm.value.baby_id = babyStore.currentBaby.id
  }
  if (!bindForm.value.baby_id) {
    uni.showToast({ title: '请选择要绑定的宝宝', icon: 'none' })
    return
  }
  if (!wifiForm.value.ssid || !wifiForm.value.password) {
    uni.showToast({ title: '请填写WiFi名称和密码', icon: 'none' })
    return
  }

  wifiForm.value.device_sn = bindForm.value.device_sn
  wifiConnecting.value = true
  binding.value = true
  try {
    const wifiRes = await post(API.DEVICE.WIFI_CONFIG, {
      ssid: wifiForm.value.ssid,
      password: wifiForm.value.password,
      device_sn: bindForm.value.device_sn,
    })
    if (wifiRes.code !== 0) {
      uni.showToast({ title: wifiRes.message || 'WiFi配置失败', icon: 'none' })
      return
    }

    const bindRes = await post(API.DEVICE.BIND, {
      device_sn: bindForm.value.device_sn,
      baby_id: bindForm.value.baby_id,
    })
    if (bindRes.code === 0 || bindRes.code === 200) {
      uni.showToast({ title: '设备已连接', icon: 'success' })
      currentStep.value = 3
    } else {
      uni.showToast({ title: bindRes.message || '设备绑定失败', icon: 'none' })
    }
  } finally {
    wifiConnecting.value = false
    binding.value = false
  }
}

function skipDeviceSetup() {
  uni.showToast({ title: '可之后在首页或设备管理中连接设备', icon: 'none' })
  currentStep.value = 3
}

// ========== 设备绑定 ==========

function scanQRCode() {
  uni.scanCode({
    scanType: ['qrCode'],
    success: (res) => {
      if (res.result) {
        bindForm.value.device_sn = res.result
        uni.showToast({ title: '扫码成功', icon: 'success' })
      }
    },
    fail: () => {
      uni.showToast({ title: '扫码取消或失败', icon: 'none' })
    }
  })
}

async function bindDevice(silent = false) {
  if (!bindForm.value.device_sn) {
    uni.showToast({ title: '请输入设备SN码', icon: 'none' })
    return
  }
  if (!bindForm.value.baby_id && babyStore.currentBaby) {
    bindForm.value.baby_id = babyStore.currentBaby.id
  }
  if (!bindForm.value.baby_id && !silent) {
    uni.showToast({ title: '请选择要绑定的宝宝', icon: 'none' })
    return
  }
  binding.value = true
  try {
    const res = await post(API.DEVICE.BIND, {
      device_sn: bindForm.value.device_sn,
      baby_id: bindForm.value.baby_id || undefined,
    }, { showError: !silent })
    if (res.code === 0 || res.code === 200) {
      if (!silent) {
        uni.showToast({ title: '绑定成功', icon: 'success', duration: 2500 })
      }
    } else {
      if (!silent) uni.showToast({ title: res.message || '绑定失败', icon: 'none', duration: 2500 })
    }
  } catch {
    if (!silent) uni.showToast({ title: '设备绑定稍后可重试', icon: 'none' })
  } finally {
    binding.value = false
  }
}

// ========== 宝宝信息 ==========

async function saveBabyInfo() {
  if (!activeBaby.value && !babyForm.value.name) {
    uni.showToast({ title: '请填写宝宝昵称', icon: 'none' })
    return
  }

  babySaving.value = true
  try {
    const payload: { name: string; gender?: number; birth_date?: string } = {
      name: babyForm.value.name,
      gender: babyForm.value.gender,
    }
    if (babyForm.value.birth_date) {
      payload.birth_date = babyForm.value.birth_date
    }

    if (!activeBaby.value) {
      const res = await babyStore.addBabyAction(payload)
      if (res.code !== 0) {
        uni.showToast({ title: res.message || '保存失败', icon: 'none' })
        return
      }
      if (res.data) babyStore.setCurrentBaby(res.data)
    } else if (babyForm.value.name) {
      const res = await babyStore.updateBabyAction(activeBaby.value.id, payload)
      if (res.code !== 0) {
        uni.showToast({ title: res.message || '保存失败', icon: 'none' })
        return
      }
    }

    await babyStore.fetchBabyList()
    if (babyStore.currentBaby) {
      bindForm.value.baby_id = babyStore.currentBaby.id
      selectedBabyName.value = babyStore.currentBaby.name
    }
    uni.showToast({ title: '宝宝信息已保存', icon: 'success' })
    currentStep.value = 2
  } finally {
    babySaving.value = false
  }
}

// ========== 语料采样功能 ==========

function switchRecordMode(mode: 'mic' | 'upload') {
  recordMode.value = mode
}

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return min > 0 ? `${min}分${sec}秒` : `${sec}秒`
}

function startRecord() {
  if (isRecording.value) return
  audioFilePath.value = ''
  audioFileName.value = ''
  recordDuration.value = 0

  isRecording.value = true
  recordTimer = setInterval(() => {
    recordDuration.value++
    if (recordDuration.value >= 20) stopRecord()
  }, 1000)

  recorderManager.start({
    format: 'wav',
    sampleRate: 16000,
    numberOfChannels: 1,
    encodeBitRate: 96000,
    duration: 20000,
  })
}

function stopRecord() {
  if (!isRecording.value) return
  isRecording.value = false
  if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
  recorderManager.stop()
}

function chooseAudioFile() {
  uni.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['mp3', 'wav'],
    success: (res) => {
      const file = res.tempFiles[0]
      if (file.size > 10 * 1024 * 1024) {
        uni.showToast({ title: '文件不能超过10MB', icon: 'none' })
        return
      }
      const ext = getAudioFileExtension(file.name || file.path)
      if (!['mp3', 'wav'].includes(ext)) {
        uni.showToast({ title: '请上传 mp3 或 wav 格式音频', icon: 'none' })
        return
      }
      audioFilePath.value = file.path
      audioFileName.value = file.name
      recordDuration.value = 0
      uni.showToast({ title: '音频文件已选择', icon: 'success' })
    },
    fail: () => {
      uni.showToast({ title: '文件选择取消', icon: 'none' })
    }
  })
}

function getAudioFileExtension(fileNameOrPath: string): string {
  const cleanPath = (fileNameOrPath || '').split('?')[0]
  const parts = cleanPath.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
}

function prepareInnerAudioOptions() {
  const options = {
    mixWithOther: false,
    obeyMuteSwitch: false,
    speakerOn: true,
  }

  try {
    const setInnerAudioOption = (uni as any).setInnerAudioOption
    if (typeof setInnerAudioOption === 'function') {
      setInnerAudioOption({
        ...options,
        fail: (err: any) => console.warn('[voice-preview] setInnerAudioOption fail', err),
      })
    }
  } catch (error) {
    console.warn('[voice-preview] setInnerAudioOption unavailable:', error)
  }
}

function playAudio() {
  if (!audioFilePath.value) return

  if (isPlaying.value && innerAudioContext) {
    innerAudioContext.stop()
    isPlaying.value = false
    return
  }

  if (innerAudioContext) innerAudioContext.destroy()
  prepareInnerAudioOptions()

  innerAudioContext = uni.createInnerAudioContext()
  innerAudioContext.autoplay = false
  innerAudioContext.volume = 1
  innerAudioContext.startTime = 0
  ;(innerAudioContext as any).obeyMuteSwitch = false
  innerAudioContext.src = audioFilePath.value
  innerAudioContext.onPlay(() => {
    isPlaying.value = true
  })
  innerAudioContext.onEnded(() => {
    isPlaying.value = false
  })
  innerAudioContext.onStop(() => {
    isPlaying.value = false
  })
  innerAudioContext.onPause(() => {
    isPlaying.value = false
  })
  innerAudioContext.onError((err: any) => {
    isPlaying.value = false
    console.error('[voice-preview] onError:', err)
    uni.showToast({ title: `播放失败 ${err?.errCode || ''}`, icon: 'none' })
  })
  innerAudioContext.onCanplay(() => {
    if (recordDuration.value === 0 && innerAudioContext) {
      recordDuration.value = Math.floor(innerAudioContext.duration || 0)
    }
  })
  innerAudioContext.play()
}

function resetAudio() {
  if (innerAudioContext) {
    innerAudioContext.stop()
    innerAudioContext.destroy()
    innerAudioContext = null
  }
  isPlaying.value = false
  audioFilePath.value = ''
  audioFileName.value = ''
  recordDuration.value = 0
}

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

function getVoiceUriFromResponse(res: any): string {
  if (!res) return ''
  if (typeof res.uri === 'string') return res.uri
  if (typeof res.voice_uri === 'string') return res.voice_uri
  if (typeof res.data?.uri === 'string') return res.data.uri
  if (typeof res.data?.voice_uri === 'string') return res.data.voice_uri
  return ''
}

async function submitVoiceClone() {
  const voiceName = voiceForm.value.voice_name.trim()
  const voiceText = voiceForm.value.voice_text.trim()

  if (!voiceName) {
    uni.showToast({ title: '请输入音色名称', icon: 'none' })
    return
  }
  if (!voiceText) {
    uni.showToast({ title: '请输入录音对应的朗读文本', icon: 'none' })
    return
  }
  if (!audioFilePath.value) {
    uni.showToast({ title: '请先录制或上传音频', icon: 'none' })
    return
  }
  if (recordMode.value === 'mic' && recordDuration.value < 5) {
    uni.showToast({ title: '录音不足5秒，请重新录制', icon: 'none' })
    return
  }
  if (recordMode.value === 'upload') {
    const ext = getAudioFileExtension(audioFileName.value || audioFilePath.value)
    if (!['mp3', 'wav'].includes(ext)) {
      uni.showToast({ title: '请上传 mp3 或 wav 格式音频', icon: 'none' })
      return
    }
  }
  const familyRes = await familyStore.fetchFamilyInfo()
  if (familyRes.code !== 0 || !familyRes.data) {
    uni.showToast({ title: '请先创建或加入家庭', icon: 'none' })
    return
  }

  await babyStore.fetchBabyList()
  if (!babyStore.currentBaby) {
    uni.showToast({ title: '请先添加宝宝', icon: 'none' })
    return
  }

  training.value = true
  try {
    // 调用后端接口克隆音色
    const result = await cloneVoiceLibrary({
      voice_role: voiceForm.value.voice_role,
      voice_name: voiceName,
      text: voiceText,
      is_default: false,
      audio_file: audioFilePath.value,
    })

    console.log('克隆音色结果:', result)
    uni.showToast({ title: '音色克隆成功', icon: 'success' })
    // 跳转到音色管理页面
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/ai/index' })
    }, 1500)
  } catch (e: any) {
    console.error('克隆音色异常:', e)
    uni.showToast({
      title: e?.message || '音色克隆失败',
      icon: 'none',
      duration: 3000,
    })
  } finally {
    training.value = false
  }
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function goDeviceList() {
  uni.navigateTo({ url: '/pages/device/list' })
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    // 页面栈为空（从 reLaunch 进入），用户已登录，跳转到首页
    uni.switchTab({ url: '/pages/index/index' })
  }
}

onUnmounted(() => {
  if (recordTimer) { clearInterval(recordTimer); recordTimer = null }
  if (innerAudioContext) { innerAudioContext.destroy(); innerAudioContext = null }
  if (isRecording.value) { recorderManager.stop() }
})
</script>

<style lang="scss" scoped>
.onboarding-page {
  min-height: 100vh;
  background: #f6f7fb;
  padding: 0 0 120rpx;
}

.custom-nav-bar {
  padding: 0 30rpx 10rpx;
  background: #fff;
  box-sizing: border-box;
  .nav-back {
    width: 132rpx;
    min-height: 88rpx;
    display: flex;
    align-items: center;
    gap: 8rpx;
    position: relative;
    z-index: 5;
    .nav-back-text { font-size: 28rpx; color: #333; }
  }
}

.stepper {
  display: flex;
  align-items: flex-start;
  padding: 40rpx 30rpx 20rpx;
  background: #fff;
  .step {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    .step-dot {
      width: 48rpx;
      height: 48rpx;
      border-radius: 50%;
      background: #e5e7eb;
      color: #999;
      font-size: 24rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
    }
    .step-label { margin-top: 10rpx; font-size: 22rpx; color: #999; }
    .step-line {
      position: absolute;
      top: 24rpx;
      left: 50%;
      width: 100%;
      height: 4rpx;
      background: #e5e7eb;
      z-index: 0;
    }
    &.active {
      .step-dot { background: #667eea; color: #fff; }
      .step-label { color: #667eea; font-weight: 600; }
    }
    &.done {
      .step-dot { background: #19be6b; }
      .step-label { color: #19be6b; }
    }
    .step-line.filled { background: #19be6b; }
    &:last-child .step-line { display: none; }
  }
}

.step-content { padding: 30rpx; }

.reconfig-content {
  padding: 30rpx;
}

.intro-strip {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  background: #fff;
  border-radius: 18rpx;

  .intro-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(102, 126, 234, 0.12);
    flex-shrink: 0;
  }

  .intro-copy {
    min-width: 0;
    flex: 1;
  }

  .intro-title {
    display: block;
    color: #1f2937;
    font-size: 30rpx;
    font-weight: 700;
  }

  .intro-desc {
    display: block;
    margin-top: 6rpx;
    color: #98a2b3;
    font-size: 24rpx;
    line-height: 1.4;
  }
}

.reconfig-hero {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 28rpx rgba(15, 118, 110, 0.08);
}

.reconfig-icon {
  width: 84rpx;
  height: 84rpx;
  border-radius: 22rpx;
  background: linear-gradient(135deg, #0f766e, #2563eb);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 22rpx;
  flex-shrink: 0;
}

.reconfig-title-wrap {
  flex: 1;
  min-width: 0;
}

.reconfig-title {
  display: block;
  font-size: 38rpx;
  line-height: 1.25;
  font-weight: 700;
  color: #1f2937;
}

.reconfig-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.45;
  color: #667085;
}

.welcome-hero {
  text-align: center;
  padding: 50rpx 30rpx 30rpx;
  .welcome-icon {
    width: 140rpx; height: 140rpx; border-radius: 50%;
    background: rgba(102, 126, 234, 0.1);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 30rpx;
  }
  .welcome-title { display: block; font-size: 40rpx; font-weight: 700; color: #333; }
  .welcome-desc { display: block; font-size: 28rpx; color: #999; margin-top: 14rpx; }
}

.feature-list {
  .feature-item {
    display: flex; align-items: center;
    background: #fff; border-radius: 16rpx; padding: 28rpx; margin-bottom: 18rpx;
    .feature-icon {
      width: 72rpx; height: 72rpx; border-radius: 16rpx;
      display: flex; align-items: center; justify-content: center;
      margin-right: 22rpx; flex-shrink: 0;
    }
    .feature-info {
      flex: 1;
      .feature-title { display: block; font-size: 30rpx; font-weight: 600; color: #333; }
      .feature-desc { display: block; font-size: 24rpx; color: #999; margin-top: 6rpx; }
    }
  }
}

.setup-path {
  background: #fff; border-radius: 18rpx; padding: 12rpx 24rpx; margin-top: 24rpx;
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 8rpx 16rpx;
  .path-item { display: flex; align-items: center; padding: 16rpx 0; }
  .path-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #667eea; margin-right: 12rpx; }
  text { font-size: 24rpx; color: #667085; }
}

.section-card {
  background: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 24rpx;
  .card-title { display: block; font-size: 34rpx; font-weight: 600; color: #333; margin-bottom: 10rpx; }
  .card-desc { display: block; font-size: 26rpx; color: #999; margin-bottom: 30rpx; }
}

.form-group {
  margin-bottom: 28rpx;
  .form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 12rpx; }
}

.picker-trigger {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18rpx 20rpx; border: 2rpx solid #dcdfe6; border-radius: 8rpx;
  font-size: 28rpx; color: #333;
}

.device-summary {
  display: flex;
  align-items: center;
  padding: 22rpx;
  margin-bottom: 20rpx;
  border-radius: 18rpx;
  background: #f8f9fc;
}

.device-summary-icon {
  width: 66rpx;
  height: 66rpx;
  border-radius: 18rpx;
  background: #eef2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 18rpx;
  flex-shrink: 0;
}

.device-summary-info {
  flex: 1;
  min-width: 0;
}

.device-summary-name {
  display: block;
  font-size: 28rpx;
  color: #1f2937;
  font-weight: 600;
}

.device-summary-sn {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #98a2b3;
}

.device-summary-status {
  font-size: 22rpx;
  color: #0f766e;
  background: #ecfdf3;
  border-radius: 999rpx;
  padding: 8rpx 14rpx;
  flex-shrink: 0;
}

.empty-device {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 18rpx;
  border-radius: 14rpx;
  background: #fffbf0;
  color: #b7791f;
  font-size: 24rpx;
  line-height: 1.5;
}

// 家庭 Tab
.family-tabs {
  display: flex; gap: 16rpx; margin-bottom: 30rpx;
  .family-tab {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx;
    padding: 20rpx; border-radius: 14rpx; background: #f8f9fc;
    border: 2rpx solid transparent; font-size: 26rpx; color: #666;
    &.active { border-color: #667eea; background: rgba(102,126,234,0.06); color: #667eea; font-weight: 600; }
  }
}

.baby-mini-card {
  display: flex; align-items: center; background: #f8f9fc;
  border-radius: 18rpx; padding: 22rpx; margin-bottom: 28rpx;
  .baby-mini-avatar { width: 76rpx; height: 76rpx; border-radius: 50%; margin-right: 18rpx; border: 4rpx solid #e0e7ff; }
  .baby-mini-info { flex: 1; }
  .baby-mini-name { display: block; font-size: 30rpx; color: #1f2937; font-weight: 700; }
  .baby-mini-desc { display: block; font-size: 23rpx; color: #98a2b3; margin-top: 4rpx; }
  .baby-mini-tag { font-size: 22rpx; color: #19be6b; background: #ecfdf3; border-radius: 999rpx; padding: 8rpx 16rpx; }
}

.gender-tabs {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx;
  .gender-tab {
    height: 76rpx; border-radius: 16rpx; background: #f8f9fc;
    border: 2rpx solid transparent;
    display: flex; align-items: center; justify-content: center; gap: 8rpx;
    text { font-size: 25rpx; color: #667085; }
    &.active { border-color: #667eea; background: rgba(102,126,234,.08); text { color: #667eea; font-weight: 600; } }
  }
}

.tip-card {
  display: flex; align-items: flex-start; gap: 14rpx;
  background: #fffbf0; border-radius: 14rpx; padding: 22rpx;
  .tip-text { font-size: 24rpx; color: #b7791f; line-height: 1.5; flex: 1; }
}

.scan-area {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 300rpx; background: #f8f9fc; border-radius: 16rpx;
  border: 2rpx dashed #d0d5dd; margin-bottom: 30rpx;
  .scan-text { margin-top: 16rpx; font-size: 28rpx; color: #667eea; }
}

.divider {
  display: flex; align-items: center; margin-bottom: 30rpx;
  .divider-line { flex: 1; height: 1rpx; background: #e5e7eb; }
  .divider-text { padding: 0 20rpx; font-size: 24rpx; color: #999; }
}

.voice-role-list {
  display: flex; gap: 16rpx; margin-bottom: 28rpx; flex-wrap: wrap;
  .voice-role-item {
    flex: 1; min-width: 140rpx;
    display: flex; flex-direction: column; align-items: center;
    padding: 24rpx 16rpx; background: #f8f9fc; border-radius: 16rpx;
    border: 2rpx solid transparent;
    &.selected { border-color: #667eea; background: rgba(102,126,234,0.06); }
    .role-name { font-size: 24rpx; color: #333; margin-top: 10rpx; }
    .role-check { margin-top: 6rpx; }
  }
}

.record-area {
  display: flex; flex-direction: column; align-items: center; padding: 20rpx 0;
  .record-mode-tabs {
    display: flex; gap: 20rpx; margin-bottom: 30rpx;
    .mode-tab {
      display: flex; align-items: center; gap: 8rpx;
      padding: 14rpx 32rpx; border-radius: 40rpx;
      background: #f5f6fa; font-size: 26rpx; color: #999;
      &.active { background: rgba(102, 126, 234, 0.1); color: #667eea; font-weight: 600; }
    }
  }
  .mic-mode {
    display: flex; flex-direction: column; align-items: center;
    .record-btn {
      width: 120rpx; height: 120rpx; border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      display: flex; align-items: center; justify-content: center;
      &.recording { background: linear-gradient(135deg, #fa3534, #e74c3c); }
    }
    .record-hint { margin-top: 20rpx; font-size: 26rpx; color: #999; }
    .record-time { margin-top: 8rpx; font-size: 28rpx; color: #667eea; font-weight: 600; }
    .record-limit { margin-top: 6rpx; font-size: 22rpx; color: #bbb; }
  }
  .upload-mode {
    display: flex; flex-direction: column; align-items: center;
    .upload-btn {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      width: 360rpx; height: 200rpx; border-radius: 16rpx;
      background: #f8f9fc; border: 2rpx dashed #c8cbe0; gap: 14rpx;
      .upload-btn-text { font-size: 26rpx; color: #667eea; }
    }
    .upload-hint { margin-top: 16rpx; font-size: 22rpx; color: #bbb; }
  }
  .audio-preview {
    width: 100%; margin-top: 24rpx; background: #f8f9fc;
    border-radius: 14rpx; padding: 20rpx 24rpx;
    .preview-info { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx;
      .preview-name { font-size: 26rpx; color: #333; flex: 1; }
      .preview-duration { font-size: 24rpx; color: #667eea; }
    }
    .preview-actions { display: flex; gap: 40rpx;
      .preview-action { display: flex; align-items: center; gap: 6rpx; font-size: 24rpx; color: #666; }
    }
  }
}

.done-hero {
  text-align: center; padding: 80rpx 30rpx 40rpx;
  .done-icon { margin-bottom: 30rpx; }
  .done-title { display: block; font-size: 44rpx; font-weight: 700; color: #333; }
  .done-desc { display: block; font-size: 28rpx; color: #999; margin-top: 14rpx; }
}

.done-actions {
  padding: 0 30rpx; display: flex; flex-direction: column; gap: 20rpx;
}

.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; justify-content: space-between; align-items: center;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff; box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05); z-index: 100;
}

.reconfig-bottom {
  gap: 18rpx;

  :deep(.u-button) {
    flex: 1;
  }
}

.skip-device-btn {
  margin-top: 20rpx;
}
</style>
