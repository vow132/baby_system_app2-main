/**
 * 宝宝状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getBabyList, addBaby, updateBaby, deleteBaby, type BabyInfo } from '@/api/baby'
import { getDeviceList, unbindDevice } from '@/api/device'

const BABY_LIST_KEY = 'baby_bed_baby_list_cache'
const CURRENT_BABY_KEY = 'baby_bed_current_baby_cache'

export const useBabyStore = defineStore('baby', () => {
  // 状态
  const babyList = ref<BabyInfo[]>(uni.getStorageSync(BABY_LIST_KEY) || [])
  const currentBaby = ref<BabyInfo | null>(uni.getStorageSync(CURRENT_BABY_KEY) || babyList.value[0] || null)
  
  // 计算属性
  const hasBaby = computed(() => babyList.value.length > 0)
  const babyCount = computed(() => babyList.value.length)

  // 获取宝宝列表
  async function fetchBabyList() {
    try {
      const res = await getBabyList()
      if (res.code === 0 && Array.isArray(res.data)) {
        babyList.value = mergeWithCachedBabies(res.data)
        if (currentBaby.value) {
          currentBaby.value = babyList.value.find(baby => baby.id === currentBaby.value?.id) || babyList.value[0] || null
        } else if (babyList.value.length > 0) {
          currentBaby.value = babyList.value[0]
        } else {
          currentBaby.value = null
        }
        persistBabyCache()
      } else {
        console.warn('[baby-store] keep cache after list request failed', res.code, res.message)
        persistBabyCache()
      }
      return res
    } catch {
      persistBabyCache()
      return { code: -1, message: '获取宝宝列表失败', data: babyList.value }
    }
  }

  // 添加宝宝
  async function addBabyAction(data: { name: string; gender?: number; birth_date?: string; avatar_url?: string }) {
    const res = await addBaby(data)
    if (res.code === 0) {
      if (res.data) {
        currentBaby.value = res.data
        babyList.value = [res.data, ...babyList.value.filter(baby => baby.id !== res.data!.id)]
        persistBabyCache()
      }
      await fetchBabyList()
    }
    return res
  }

  // 更新宝宝
  async function updateBabyAction(id: number, data: { name?: string; gender?: number; birth_date?: string; avatar_url?: string }) {
    const res = await updateBaby(id, data)
    if (res.code === 0) {
      mergeUpdatedBaby(id, data)
      await fetchBabyList()
    }
    return res
  }

  // 删除宝宝
  async function deleteBabyAction(id: number) {
    // 先尝试自动解绑该宝宝关联设备，避免设备序列号被历史绑定占用
    try {
      const deviceRes = await getDeviceList()
      if (deviceRes.code === 0 && Array.isArray(deviceRes.data)) {
        const linkedDevices = deviceRes.data.filter(device => device.baby_id === id && !!device.device_sn)
        for (const device of linkedDevices) {
          try {
            await unbindDevice({ device_sn: device.device_sn })
          } catch (e) {
            console.warn('[baby-store] auto unbind failed', device.device_sn, e)
          }
        }
      }
    } catch (e) {
      console.warn('[baby-store] load device list before delete failed', e)
    }

    const res = await deleteBaby(id)
    if (res.code === 0) {
      babyList.value = babyList.value.filter(baby => baby.id !== id)
      if (currentBaby.value?.id === id) {
        currentBaby.value = babyList.value[0] || null
      }
      persistBabyCache()
      await fetchBabyList()
    }
    return res
  }

  // 设置当前宝宝
  function setCurrentBaby(baby: BabyInfo) {
    currentBaby.value = baby
    persistBabyCache()
  }

  function mergeWithCachedBabies(list: BabyInfo[]) {
    const cachedMap = new Map(babyList.value.map(baby => [baby.id, baby]))
    return list.map(baby => {
      const cached = cachedMap.get(baby.id)
      return {
        ...baby,
        avatar_url: baby.avatar_url || cached?.avatar_url || null,
      }
    })
  }

  function mergeUpdatedBaby(id: number, data: { name?: string; gender?: number; birth_date?: string; avatar_url?: string }) {
    babyList.value = babyList.value.map(baby => baby.id === id ? { ...baby, ...data } : baby)
    if (currentBaby.value?.id === id) {
      currentBaby.value = { ...currentBaby.value, ...data }
    }
    persistBabyCache()
  }

  function persistBabyCache() {
    uni.setStorageSync(BABY_LIST_KEY, babyList.value)
    if (currentBaby.value) {
      uni.setStorageSync(CURRENT_BABY_KEY, currentBaby.value)
    } else {
      uni.removeStorageSync(CURRENT_BABY_KEY)
    }
  }

  // 清除宝宝缓存（退出家庭/退出登录时调用）
  function clearBabyCache() {
    babyList.value = []
    currentBaby.value = null
    uni.removeStorageSync(BABY_LIST_KEY)
    uni.removeStorageSync(CURRENT_BABY_KEY)
  }

  return {
    babyList,
    currentBaby,
    hasBaby,
    babyCount,
    fetchBabyList,
    addBabyAction,
    updateBabyAction,
    deleteBabyAction,
    setCurrentBaby,
    clearBabyCache,
  }
})
