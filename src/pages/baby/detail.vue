<template>
  <view class="baby-detail-page">
    <u-form :model="form" ref="formRef" labelPosition="left" labelWidth="160">
      <u-form-item label="宝宝昵称" prop="name" required>
        <u-input v-model="form.name" placeholder="请输入宝宝昵称" />
      </u-form-item>
      <u-form-item label="性别" prop="gender">
        <u-radio-group v-model="form.gender">
          <u-radio :name="1" label="男" />
          <u-radio :name="2" label="女" />
        </u-radio-group>
      </u-form-item>
      <u-form-item label="出生日期" prop="birth_date">
        <u-datetime-picker 
          :show="showDatePicker" 
          v-model="dateValue" 
          mode="date"
          @confirm="onDateConfirm"
          @cancel="showDatePicker = false"
        />
        <view class="date-picker" @click="showDatePicker = true">
          <text>{{ form.birth_date || '请选择出生日期' }}</text>
          <u-icon name="arrow-right" size="28" color="#ccc" />
        </view>
      </u-form-item>
      <u-form-item label="头像" prop="avatar_url">
        <view class="avatar-picker" @click="chooseAvatar">
          <image class="avatar-preview" :src="form.avatar_url || '/static/logo.png'" mode="aspectFill" />
          <view class="avatar-mask">
            <text>更换</text>
          </view>
        </view>
      </u-form-item>
    </u-form>
    
    <view class="btn-group">
      <u-button type="primary" text="保存" @click="handleSave" :loading="loading" />
      <u-button v-if="isEdit" type="error" text="删除" @click="handleDelete" plain />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useBabyStore } from '@/stores'

const babyStore = useBabyStore()

const babyId = ref<number | null>(null)
const loading = ref(false)
const showDatePicker = ref(false)
const dateValue = ref(Date.now())

const isEdit = computed(() => !!babyId.value)

const form = reactive({
  name: '',
  gender: 0,
  birth_date: '',
  avatar_url: ''
})

onLoad((options) => {
  if (options?.id) {
    babyId.value = Number(options.id)
    const baby = babyStore.babyList.find(b => b.id === babyId.value)
    if (baby) {
      form.name = baby.name
      form.gender = baby.gender || 1
      form.birth_date = baby.birth_date || ''
      form.avatar_url = baby.avatar_url || ''
      if (baby.birth_date) {
        dateValue.value = new Date(baby.birth_date).getTime()
      }
    }
    uni.setNavigationBarTitle({ title: '编辑宝宝' })
  } else {
    uni.setNavigationBarTitle({ title: '添加宝宝' })
  }
})

function onDateConfirm({ value }: any) {
  const date = new Date(value)
  form.birth_date = date.toISOString().split('T')[0]
  showDatePicker.value = false
}

function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const path = res.tempFilePaths?.[0]
      if (path) {
        form.avatar_url = path
        uni.saveFile({
          tempFilePath: path,
          success: (saveRes) => {
            form.avatar_url = saveRes.savedFilePath
          }
        })
      }
    }
  })
}

async function handleSave() {
  if (!form.name) {
    uni.showToast({ title: '请输入宝宝昵称', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const payload: any = {
      name: form.name,
      gender: form.gender,
      avatar_url: form.avatar_url,
    }
    if (form.birth_date) {
      payload.birth_date = form.birth_date
    }

    let res
    if (isEdit.value && babyId.value) {
      res = await babyStore.updateBabyAction(babyId.value, payload)
    } else {
      res = await babyStore.addBabyAction(payload)
    }

    if (res.code === 0 || res.code === 200) {
      uni.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 1000)
    } else {
      uni.showToast({ title: res.message || '保存失败', icon: 'none' })
    }
  } catch (e) {
    console.error('[baby-detail] handleSave', e)
    uni.showToast({ title: '保存请求失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function handleDelete() {
  if (!babyId.value) return

  uni.showModal({
    title: '确认删除',
    content: '删除后无法恢复，确定要删除吗？',
    success: async (res) => {
      if (!res.confirm) return
      loading.value = true
      try {
        const result = await babyStore.deleteBabyAction(babyId.value!)
        if (result.code === 0 || result.code === 200) {
          uni.showToast({ title: '删除成功', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 1000)
        } else {
          uni.showToast({ title: result.message || '删除失败', icon: 'none' })
        }
      } catch (e) {
        console.error('[baby-detail] handleDelete', e)
        uni.showToast({ title: '删除请求失败', icon: 'none' })
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.baby-detail-page {
  min-height: 100vh;
  background: #f8f8f8;
  padding: 20rpx 30rpx;
}

.date-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 20rpx 0;
  
  text {
    color: #333;
  }
}

.avatar-picker {
  position: relative;
  width: 140rpx;
  height: 140rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: #f3f4f6;
}

.avatar-preview {
  width: 100%;
  height: 100%;
}

.avatar-mask {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.42);

  text {
    color: #fff;
    font-size: 22rpx;
  }
}

.btn-group {
  margin-top: 60rpx;
  
  .u-button {
    margin-bottom: 20rpx;
  }
}
</style>
