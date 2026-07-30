/**
 * 微信订阅消息工具
 *
 * 使用前需在微信公众平台 (mp.weixin.qq.com) → 功能 → 订阅消息 中选用模板
 * 拿到 template_id 后替换下方占位符
 */
import { bindWechat } from '@/api/auth'

export const SUBSCRIBE_TEMPLATES = {
  /** 报警通知 - 用于宝宝哭了/危险事件推送 */
  ALERT: 'SxTRB612hERgov6bY8l7v_Pv1T2xd6TNQgf5nvWjht4',
  /** 状态提醒 - 用于小事/动态提醒 */
  REMINDER: '',
  /** 数据报告通知 - 用于周/月小结 */
  REPORT: '',
}

export const SUBSCRIBED_KEY = 'baby_bed_subscribe_done'

export type SubscribeStatus = 'accept' | 'reject' | 'ban' | 'filter'
export type SubscribeResults = Record<string, SubscribeStatus>

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

/** 将当前后端账号绑定到执行订阅操作的微信用户。 */
export function bindCurrentWechatUser(): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: async (loginResult) => {
        try {
          if (!loginResult.code) throw new Error('微信未返回登录 code')
          const response = await bindWechat({ code: loginResult.code })
          if (response.code !== 0) throw new Error(response.message || '微信绑定失败')
          resolve()
        } catch (error) {
          reject(error)
        }
      },
      fail: reject,
    })
  })
}

/**
 * 请求订阅消息
 * @param tmplIds 模板ID数组
 * @returns 每个模板的微信授权结果
 */
export function requestSubscribe(tmplIds: string[]): Promise<SubscribeResults> {
  const validIds = tmplIds.filter(Boolean)
  if (validIds.length === 0) {
    return Promise.resolve({})
  }

  return new Promise((resolve) => {
    uni.requestSubscribeMessage({
      tmplIds: validIds,
      success: (res) => {
        const results = validIds.reduce<SubscribeResults>((output, id) => {
          const status = (res as any)[id]
          output[id] = ['accept', 'reject', 'ban', 'filter'].includes(status)
            ? status
            : 'reject'
          return output
        }, {})
        if (Object.values(results).some(status => status === 'accept')) {
          markSubscribeDone()
        }
        resolve(results)
      },
      fail: () => resolve(
        validIds.reduce<SubscribeResults>((output, id) => {
          output[id] = 'reject'
          return output
        }, {}),
      ),
    })
  })
}
