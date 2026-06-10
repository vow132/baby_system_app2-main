/**
 * 用户状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  login, register, wechatLogin, codeLogin, getUserInfo, updateUserInfo, 
  type UserInfo, type LoginResponse 
} from '@/api/auth'
import { TOKEN_KEY, USER_INFO_KEY } from '@/api/config'

export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref<string>(uni.getStorageSync(TOKEN_KEY) || '')
  const userInfo = ref<UserInfo | null>(uni.getStorageSync(USER_INFO_KEY) || null)
  
  // 计算属性
  const isLoggedIn = computed(() => !!token.value)
  const nickname = computed(() => userInfo.value?.nickname || '未登录')
  const avatar = computed(() => userInfo.value?.avatar_url || '')

  function setLoginSession(data: LoginResponse) {
    token.value = data.access_token
    uni.setStorageSync(TOKEN_KEY, data.access_token)

    if (data.user) {
      const nextUser: UserInfo = {
        id: data.user.id,
        phone: data.user.phone || null,
        email: null,
        nickname: data.user.nickname || null,
        avatar_url: data.user.avatar_url || null,
        gender: null,
        status: null,
        last_login_at: null,
        created_at: null,
      }
      userInfo.value = nextUser
      uni.setStorageSync(USER_INFO_KEY, nextUser)
    } else {
      userInfo.value = null
      uni.removeStorageSync(USER_INFO_KEY)
    }
  }

  async function refreshUserInfoSilently() {
    try {
      await fetchUserInfo()
    } catch (error) {
      console.warn('[user-store] fetch user info skipped after login', error)
    }
  }

  // 登录
  async function loginAction(phone: string, password: string) {
    const res = await login({ phone, password })
    if (res.code === 0 && res.data) {
      setLoginSession(res.data)
      await refreshUserInfoSilently()
    }
    return res
  }

  // 手机验证码登录
  async function codeLoginAction(phone: string, code: string) {
    const res = await codeLogin({ phone, code })
    if (res.code === 0 && res.data) {
      setLoginSession(res.data)
      await refreshUserInfoSilently()
    }
    return res
  }

  // 注册
  async function registerAction(phone: string, password: string, nickname?: string) {
    const res = await register({ phone, password, nickname })
    if (res.code === 0 && res.data) {
      setLoginSession(res.data)
      await refreshUserInfoSilently()
    }
    return res
  }

  // 微信授权登录
  async function wechatLoginAction(code: string) {
    const res = await wechatLogin({ code })
    if (res.code === 0 && res.data) {
      setLoginSession(res.data)
      await refreshUserInfoSilently()
    }
    return res
  }

  // 获取用户信息
  async function fetchUserInfo() {
    const res = await getUserInfo()
    if (res.code === 0 && res.data) {
      userInfo.value = res.data
      uni.setStorageSync(USER_INFO_KEY, res.data)
    }
    return res
  }

  // 更新用户信息
  async function updateUserInfoAction(data: { nickname?: string; avatar_url?: string; gender?: number }) {
    const res = await updateUserInfo(data)
    if (res.code === 0) {
      const responseUser = res.data && typeof res.data === 'object' ? res.data : {}
      const nextUser = {
        ...(userInfo.value || {}),
        ...data,
        ...responseUser,
      } as UserInfo
      userInfo.value = nextUser
      uni.setStorageSync(USER_INFO_KEY, nextUser)
    }
    return res
  }

  // 退出登录
  function logout() {
    token.value = ''
    userInfo.value = null
    uni.removeStorageSync(TOKEN_KEY)
    uni.removeStorageSync(USER_INFO_KEY)
    // 清除家庭和宝宝缓存（直接操作 storage，避免循环依赖）
    uni.removeStorageSync('baby_bed_family_info_cache')
    uni.removeStorageSync('baby_bed_baby_list_cache')
    uni.removeStorageSync('baby_bed_current_baby_cache')
    uni.reLaunch({ url: '/pages/login/login' })
  }

  // 检查登录状态
  function checkLogin() {
    if (!token.value) {
      uni.navigateTo({ url: '/pages/login/login' })
      return false
    }
    return true
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    nickname,
    avatar,
    loginAction,
    codeLoginAction,
    registerAction,
    wechatLoginAction,
    fetchUserInfo,
    updateUserInfoAction,
    logout,
    checkLogin,
  }
})
