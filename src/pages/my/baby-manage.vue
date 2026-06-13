<template>
  <view class="baby-list-page">
    <view class="page-header">
      <text class="page-title">宝宝管理</text>
      <text class="page-subtitle">管理宝宝信息与绑定设备</text>
    </view>

    <view class="baby-list">
      <view class="baby-card" v-for="baby in babyStore.babyList" :key="baby.id" @click="goToDetail(baby.id)">
        <view class="card-main">
          <image class="baby-avatar" :src="baby.avatar_url || '/static/logo.png'" mode="aspectFill" />
          <view class="baby-info">
            <view class="info-row">
              <text class="baby-name">{{ baby.name }}</text>
              <view class="gender-tag" :class="baby.gender === 1 ? 'boy' : baby.gender === 2 ? 'girl' : ''">
                <u-icon :name="baby.gender === 1 ? 'man' : baby.gender === 2 ? 'woman' : 'question'" size="20" color="#fff" />
              </view>
            </view>
            <text class="baby-age">{{ getAgeText(baby) }}</text>
            <text class="baby-birth" v-if="baby.birth_date">{{ formatBirthDate(baby.birth_date) }}</text>
          </view>
        </view>
        <view class="card-arrow">
          <u-icon name="arrow-right" size="32" color="#ccc" />
        </view>

        <view class="device-link" @click.stop="goDeviceForBaby(baby.id)">
          <text class="device-label">绑定设备</text>
          <text class="device-value">{{ getBabyDeviceText(baby.id) }}</text>
          <u-icon v-if="getBabyDevice(baby.id)" name="arrow-right" size="24" color="#bbb" />
        </view>
      </view>

      <view class="add-card" @click="goToDetail()">
        <view class="add-icon">
          <u-icon name="plus" size="48" color="#667eea" />
        </view>
        <text class="add-text">添加宝宝</text>
        <text class="add-desc">记录新成员成长信息</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBabyStore } from '@/stores'
import { getDeviceList, type DeviceInfo } from '@/api/device'
import { getDeviceDisplayName, isRemovedDevice } from '@/common/deviceLocal'
import { formatBabyAge } from '@/utils/age'

const babyStore = useBabyStore()
const devices = ref<DeviceInfo[]>([])

onShow(async () => {
  await Promise.allSettled([babyStore.fetchBabyList(), loadDevices()])
})

async function loadDevices() {
  const res = await getDeviceList()
  if (res.code === 0 && Array.isArray(res.data)) {
    devices.value = res.data.filter((d) => !isRemovedDevice(d.device_sn))
  }
}

function getAgeText(baby: any) {
  return formatBabyAge(baby)
}

function formatBirthDate(date: string) {
  const d = new Date(date)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function getBabyDevice(babyId: number) {
  return devices.value.find((d) => d.baby_id === babyId) || null
}

function getBabyDeviceText(babyId: number) {
  const device = getBabyDevice(babyId)
  if (!device) return '未绑定设备'
  return `${getDeviceDisplayName(device.device_sn, device.device_name)}（${device.device_sn}）`
}

function goDeviceForBaby(babyId: number) {
  const device = getBabyDevice(babyId)
  if (device) {
    uni.navigateTo({ url: `/pages/device/detail?sn=${device.device_sn}` })
  } else {
    uni.navigateTo({ url: `/pages/device/list?bindBaby=${babyId}` })
  }
}

function goToDetail(id?: number) {
  const url = id ? `/pages/baby/detail?id=${id}` : '/pages/baby/detail'
  uni.navigateTo({ url })
}
</script>

<style lang="scss" scoped>
.baby-list-page { min-height: 100vh; background: linear-gradient(180deg, #667eea 0%, #764ba2 200rpx, #f8f9fc 200rpx); padding-bottom: 40rpx; }
.page-header { padding: 40rpx 30rpx 60rpx; }
.page-title { display: block; font-size: 40rpx; font-weight: 600; color: #fff; margin-bottom: 12rpx; }
.page-subtitle { font-size: 26rpx; color: rgba(255, 255, 255, 0.8); }
.baby-list { padding: 0 30rpx; }
.baby-card { position: relative; background: #fff; border-radius: 20rpx; padding: 28rpx; margin-bottom: 24rpx; box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06); }
.card-main { display: flex; align-items: center; }
.baby-avatar { width: 100rpx; height: 100rpx; border-radius: 50%; margin-right: 24rpx; border: 2rpx solid #f0f0f0; }
.baby-info { flex: 1; }
.info-row { display: flex; align-items: center; margin-bottom: 8rpx; }
.baby-name { font-size: 32rpx; font-weight: 600; color: #333; margin-right: 12rpx; }
.gender-tag { width: 36rpx; height: 36rpx; border-radius: 50%; background: #999; display: flex; align-items: center; justify-content: center; }
.gender-tag.boy { background: #5677fc; }
.gender-tag.girl { background: #f43f5e; }
.baby-age { display: block; font-size: 28rpx; color: #667eea; font-weight: 500; margin-bottom: 4rpx; }
.baby-birth { font-size: 24rpx; color: #999; }
.card-arrow { position: absolute; right: 34rpx; top: 56rpx; }
.device-link { margin-top: 18rpx; border-top: 1rpx solid #f3f4f6; padding-top: 18rpx; display: flex; align-items: center; }
.device-label { width: 120rpx; font-size: 25rpx; color: #8a95a8; }
.device-value { flex: 1; font-size: 25rpx; color: #334155; }
.add-card { display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fff; border-radius: 20rpx; padding: 50rpx; border: 2rpx dashed #667eea; }
.add-icon { width: 88rpx; height: 88rpx; border-radius: 50%; background: rgba(102, 126, 234, 0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 16rpx; }
.add-text { font-size: 30rpx; font-weight: 500; color: #667eea; margin-bottom: 8rpx; }
.add-desc { font-size: 24rpx; color: #999; }
</style>
