<script lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useUserStore } from './stores/user'
import { getDeviceList } from './api/device'
import { getBabyStatus } from './api/monitor'
import { TOKEN_KEY } from './api/config'

let statusTimer: ReturnType<typeof setTimeout> | null = null
const lastAlertLevels = new Map<string, number>()
let dangerPollingGeneration = 0
let dangerPollingActive = false

async function startDangerPolling() {
  if (dangerPollingActive) return
  dangerPollingActive = true
  const generation = ++dangerPollingGeneration
  await pollDangerStatuses(generation)
}

async function pollDangerStatuses(generation: number) {
  if (!dangerPollingActive || generation !== dangerPollingGeneration) return
  const token = uni.getStorageSync(TOKEN_KEY)
  if (!token) {
    stopDangerPolling()
    return
  }

  try {
    const res = await getDeviceList()
    const devices = (res.code === 0 && Array.isArray(res.data))
      ? res.data.filter(device => device.baby_id != null)
      : []
    const statuses = await Promise.allSettled(
      devices.map(device => getBabyStatus(device.device_sn)),
    )
    if (!dangerPollingActive || generation !== dangerPollingGeneration) return

    let alertShown = false
    statuses.forEach((result, index) => {
      const device = devices[index]
      if (result.status !== 'fulfilled' || !device) return
      const statusRes = result.value
      const level = statusRes?.data?.status_level ?? 0
      const previousLevel = lastAlertLevels.get(device.device_sn) ?? -1
      lastAlertLevels.set(device.device_sn, level)
      if (alertShown || level < 3 || previousLevel >= 3) return

      alertShown = true
      const snap = statusRes.data?.sensor_snapshot
      const content = [
        device.device_name ? `设备：${device.device_name}` : `设备：${device.device_sn}`,
        statusRes.data?.risk_label ? `风险等级：${statusRes.data.risk_label}` : '',
        snap?.heart_rate != null ? `心率：${snap.heart_rate} 次/分` : '',
        snap?.breath_rate != null ? `呼吸：${snap.breath_rate} 次/分` : '',
      ].filter(Boolean).join('\n') || '宝宝当前处于危险状态，请立即查看'
      uni.showModal({
        title: '⚠ 危险警报',
        content,
        confirmText: '查看详情',
        cancelText: '知道了',
        success(r) {
          if (r.confirm) uni.navigateTo({ url: '/pages/monitor/index' })
        },
      })
    })
  } catch (error) {
    console.warn('[danger-polling] 危险状态刷新失败，将自动重试', error)
  } finally {
    if (dangerPollingActive && generation === dangerPollingGeneration) {
      statusTimer = setTimeout(() => void pollDangerStatuses(generation), 10000)
    }
  }
}

function stopDangerPolling() {
  dangerPollingActive = false
  dangerPollingGeneration += 1
  if (statusTimer) { clearTimeout(statusTimer); statusTimer = null }
}

export default {
  onLaunch() {
    console.log('App Launch')
    const userStore = useUserStore()
    if (userStore.isLoggedIn) {
      userStore.fetchUserInfo().catch(error => {
        console.warn('[app-launch] user info refresh failed; keeping cached session', error)
      })
      startDangerPolling()
    }
  },
  onShow() {
    console.log('App Show')
    const userStore = useUserStore()
    if (userStore.isLoggedIn && !dangerPollingActive) startDangerPolling()
  },
  onHide() {
    console.log('App Hide')
    stopDangerPolling()
  },
}
</script>

<style lang="scss">
/* uView 基础样式 - 必须按顺序导入 */
@import 'uview-plus/theme.scss';
@import 'uview-plus/libs/css/mixin.scss';
@import 'uview-plus/libs/css/common.scss';

/* 全局样式 */
page {
  background-color: #f8f8f8;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 通用样式 */
.container {
  padding: 20rpx 30rpx;
}

.text-center {
  text-align: center;
}

.text-primary {
  color: #5677fc;
}

.text-success {
  color: #19be6b;
}

.text-warning {
  color: #ff9900;
}

.text-error {
  color: #fa3534;
}

.text-muted {
  color: #999;
}

.flex {
  display: flex;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flex-1 {
  flex: 1;
}

.mt-20 {
  margin-top: 20rpx;
}

.mb-20 {
  margin-bottom: 20rpx;
}

.p-20 {
  padding: 20rpx;
}

.bg-white {
  background-color: #fff;
}

.rounded {
  border-radius: 16rpx;
}

.shadow {
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}
</style>
