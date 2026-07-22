/**
 * 微信订阅消息工具
 *
 * 使用前需在微信公众平台 (mp.weixin.qq.com) → 功能 → 订阅消息 中选用模板
 * 拿到 template_id 后替换下方占位符
 */
export const SUBSCRIBE_TEMPLATES = {
  /** 报警通知 - 用于宝宝哭了/危险事件推送 */
  ALERT: 'SxTRB612hERgov6bY8l7v_Pv1T2xd6TNQgf5nvWjht4',
  /** 状态提醒 - 用于小事/动态提醒 */
  REMINDER: '',
  /** 数据报告通知 - 用于周/月小结 */
  REPORT: '',
}

export const SUBSCRIBED_KEY = 'baby_bed_subscribe_done'

export function hasRequestedSubscribe(): boolean {
  try {
    return !!uni.getStorageSync(SUBSCRIBED_KEY)
  } catch {
    return false
  }
}

export function markSubscribeDone(): void {
  try {
    uni.setStorageSync(SUBSCRIBED_KEY, true)
  } catch { /* ignore */ }
}

/**
 * 请求订阅消息
 * @param tmplIds 模板ID数组
 * @returns 是否全部接受
 */
export function requestSubscribe(tmplIds: string[]): Promise<boolean> {
  const validIds = tmplIds.filter(Boolean)
  if (validIds.length === 0) {
    return Promise.resolve(false)
  }

  return new Promise((resolve) => {
    uni.requestSubscribeMessage({
      tmplIds: validIds,
      success: (res) => {
        const anyAccepted = validIds.some((id) => (res as any)[id] === 'accept')
        if (anyAccepted) {
          markSubscribeDone()
        }
        resolve(anyAccepted)
      },
      fail: () => resolve(false),
    })
  })
}
