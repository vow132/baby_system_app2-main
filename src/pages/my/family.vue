<template>
  <view class="family-page">
    <view class="family-card" v-if="familyStore.hasFamily">
      <view class="family-header">
        <view>
          <text class="family-name">{{ familyStore.familyName }}</text>
          <text class="family-desc">成员、权限与邀请</text>
        </view>
        <view class="family-header-actions">
          <text class="plan-badge">{{ getPlanText(familyStore.familyInfo?.plan_type) }}</text>
          <text class="edit-family" v-if="isCurrentAdmin" @click="openEditFamily">改名</text>
        </view>
      </view>

      <view class="family-meta" :class="{ compact: !isCurrentAdmin }">
        <view class="meta-item" v-if="isCurrentAdmin" @click="copyInviteCode">
          <text class="meta-label">邀请码</text>
          <text class="meta-value code">{{ familyStore.inviteCode || '--' }}</text>
        </view>
        <view class="meta-item">
          <text class="meta-label">设备</text>
          <text class="meta-value">{{ deviceCount }} 台</text>
        </view>
        <view class="meta-item">
          <text class="meta-label">宝宝</text>
          <text class="meta-value">{{ babyCount }} 位</text>
        </view>
      </view>
    </view>

    <view class="section" v-else>
      <view class="action-card" @click="showCreateFamily = true">
        <u-icon name="plus-circle" size="52" color="#5677fc" />
        <view class="action-copy">
          <text class="action-title">创建家庭</text>
          <text class="action-desc">创建新家庭，邀请家人共同看护宝宝</text>
        </view>
      </view>
      <view class="action-card" @click="showJoinFamily = true">
        <u-icon name="man-add" size="52" color="#19be6b" />
        <view class="action-copy">
          <text class="action-title">加入家庭</text>
          <text class="action-desc">输入邀请码加入已有家庭</text>
        </view>
      </view>
    </view>

    <view class="section" v-if="familyStore.hasFamily">
      <view class="family-actions">
        <view class="family-action-item" v-if="isCurrentAdmin" @click="confirmRegenerateInviteCode">
          <u-icon name="reload" size="22" color="#5b7cfa" />
          <text>重新生成邀请码</text>
        </view>
        <view class="family-action-item danger" @click="confirmLeaveFamily">
          <u-icon name="close-circle" size="22" color="#ff4d4f" />
          <text>离开家庭</text>
        </view>
        <view class="family-action-item danger" @click="confirmDissolveFamily">
          <u-icon name="trash" size="22" color="#ff4d4f" />
          <text>解散家庭</text>
        </view>
      </view>
    </view>

    <view class="section" v-if="familyStore.hasFamily">
      <view class="section-header">
        <view>
          <text class="section-title">家庭成员</text>
          <text class="section-subtitle">{{ isCurrentAdmin ? '可调整成员角色或移除成员' : '查看家庭成员与身份' }}</text>
        </view>
        <text class="section-action" v-if="isCurrentAdmin" @click="showInviteCode">邀请成员</text>
      </view>

      <view class="member-list">
        <view class="member-item" v-for="member in members" :key="member.id">
          <image class="member-avatar" :src="member.avatar_url || '/static/logo.png'" mode="aspectFill" />
          <view class="member-info">
            <view class="member-title-row">
              <text class="member-name">{{ member.nickname || member.display_name || member.phone || '家庭成员' }}</text>
              <text class="admin-badge" v-if="isMemberAdmin(member)">管理员</text>
              <text class="self-badge" v-if="isSelf(member)">我</text>
            </view>
            <text class="member-role">{{ getRoleText(member.member_role) }}</text>
            <text class="member-hint" v-if="isSelf(member)">当前账号不可移除</text>
          </view>
          <button class="member-action" v-if="isCurrentAdmin || isSelf(member)" @click="openMemberActions(member)">
            {{ isCurrentAdmin && !isSelf(member) ? '管理' : '编辑' }}
          </button>
        </view>
      </view>
    </view>

    <u-popup :show="showCreateFamily" mode="center" round="16" @close="showCreateFamily = false">
      <view class="popup-form">
        <text class="popup-title">创建家庭</text>
        <u-input v-model="newFamilyName" placeholder="请输入家庭名称" maxlength="16" />
        <view class="popup-btns">
          <u-button text="取消" @click="showCreateFamily = false" />
          <u-button type="primary" text="创建" @click="handleCreateFamily" :loading="loading" />
        </view>
      </view>
    </u-popup>

    <u-popup :show="showJoinFamily" mode="center" round="16" @close="showJoinFamily = false">
      <view class="popup-form">
        <text class="popup-title">加入家庭</text>
        <u-input v-model="joinCode" placeholder="请输入邀请码" />
        <view class="field-label">你的身份</view>
        <view class="role-grid">
          <view
            class="role-chip"
            :class="{ active: joinRole === item.value }"
            v-for="item in roleOptions"
            :key="item.value"
            @click="joinRole = item.value"
          >
            {{ item.label }}
          </view>
        </view>
        <u-input v-model="joinRelation" placeholder="关系备注，如：妈妈、外婆、保姆" />
        <view class="popup-btns">
          <u-button text="取消" @click="showJoinFamily = false" />
          <u-button type="primary" text="加入" @click="handleJoinFamily" :loading="loading" />
        </view>
      </view>
    </u-popup>

    <u-popup :show="showEditFamily" mode="center" round="16" @close="showEditFamily = false">
      <view class="popup-form">
        <text class="popup-title">修改家庭名称</text>
        <u-input v-model="editFamilyName" placeholder="请输入家庭名称" maxlength="16" />
        <view class="popup-btns">
          <u-button text="取消" @click="showEditFamily = false" />
          <u-button type="primary" text="保存" @click="handleUpdateFamilyName" :loading="loading" />
        </view>
      </view>
    </u-popup>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBabyStore, useFamilyStore, useUserStore } from '@/stores'
import type { FamilyMember } from '@/api/family'
import { getDeviceList } from '@/api/device'

const familyStore = useFamilyStore()
const userStore = useUserStore()
const babyStore = useBabyStore()

const members = ref<FamilyMember[]>([])
const deviceCount = ref(0)
const babyCount = ref(0)
const showCreateFamily = ref(false)
const showJoinFamily = ref(false)
const showEditFamily = ref(false)
const loading = ref(false)
const newFamilyName = ref('')
const editFamilyName = ref('')
const joinCode = ref('')
const joinRole = ref('parent')
const joinRelation = ref('')
const currentMember = computed(() => members.value.find((member) => isSelf(member)))
const isCurrentAdmin = computed(() => (
  familyStore.isAdmin || !!currentMember.value && isMemberAdmin(currentMember.value)
))
const transferableMembers = computed(() => members.value.filter((member) => !isSelf(member)))

const roleOptions = [
  { label: '家长', value: 'parent' },
  { label: '祖辈', value: 'grandparent' },
  { label: '保姆', value: 'nanny' },
  { label: '其他', value: 'other' },
]

onShow(() => {
  loadFamilyData()
})

async function loadFamilyData() {
  await familyStore.fetchFamilyInfo()
  if (familyStore.hasFamily) {
    const [memberRes] = await Promise.all([
      familyStore.fetchMembers(),
      loadDeviceCount(),
      loadBabyCount(),
    ])
    if (memberRes.code === 0 && memberRes.data) {
      members.value = memberRes.data
    }
    if (isCurrentAdmin.value) {
      await familyStore.fetchInviteCode()
    }
  } else {
    members.value = []
    deviceCount.value = 0
    babyCount.value = 0
  }
}

async function loadDeviceCount() {
  try {
    const res = await getDeviceList()
    deviceCount.value = res.code === 0 && Array.isArray(res.data) ? res.data.length : 0
  } catch {
    deviceCount.value = 0
  }
}

async function loadBabyCount() {
  try {
    const res = await babyStore.fetchBabyList()
    babyCount.value = res.code === 0 ? babyStore.babyList.length : 0
  } catch {
    babyCount.value = babyStore.babyList.length
  }
}

function getPlanText(plan: string | null | undefined) {
  const plans: Record<string, string> = {
    free: '免费版',
    basic: '基础版',
    premium: '高级版',
  }
  return plans[plan || ''] || '免费版'
}

function getRoleText(role: string | null) {
  const target = roleOptions.find((item) => item.value === role)
  return target?.label || '成员'
}

function isSelf(member: FamilyMember) {
  return !!userStore.userInfo?.id && member.user_id === userStore.userInfo.id
}

function isMemberAdmin(member: FamilyMember) {
  return member.is_admin === 1 || member.relation === 'creator'
}

async function copyInviteCode() {
  if (!isCurrentAdmin.value) {
    uni.showToast({ title: '只有管理员可以复制邀请码', icon: 'none' })
    return
  }
  if (!familyStore.inviteCode) {
    await familyStore.fetchInviteCode()
  }
  if (!familyStore.inviteCode) return
  uni.setClipboardData({
    data: familyStore.inviteCode,
    success: () => uni.showToast({ title: '已复制邀请码', icon: 'success' }),
  })
}

function openEditFamily() {
  if (!isCurrentAdmin.value) {
    uni.showToast({ title: '只有管理员可以修改家庭信息', icon: 'none' })
    return
  }
  editFamilyName.value = familyStore.familyName === '未加入家庭' ? '' : familyStore.familyName
  showEditFamily.value = true
}

async function showInviteCode() {
  if (!isCurrentAdmin.value) {
    uni.showToast({ title: '只有管理员可以邀请成员', icon: 'none' })
    return
  }
  if (!familyStore.inviteCode) {
    await familyStore.fetchInviteCode()
  }
  uni.showModal({
    title: '邀请成员',
    content: `邀请码：${familyStore.inviteCode || '--'}`,
    confirmText: '复制',
    success: (res) => {
      if (res.confirm) copyInviteCode()
    },
  })
}

function openMemberActions(member: FamilyMember) {
  if (!isCurrentAdmin.value && !isSelf(member)) {
    uni.showToast({ title: '只有管理员可以管理成员', icon: 'none' })
    return
  }

  const actions = isSelf(member) ? ['修改昵称', '修改角色'] : ['修改角色']
  if (isCurrentAdmin.value) {
    actions.push(isMemberAdmin(member) ? '解除管理员' : '设为管理员')
  }
  if (isCurrentAdmin.value && !isSelf(member)) {
    actions.push('转让管理员')
  }
  if (!isSelf(member)) {
    actions.push('移除成员')
  }

  uni.showActionSheet({
    itemList: actions,
    success: (res) => {
      const action = actions[res.tapIndex]
      if (action === '修改昵称') {
        editSelfNickname()
      } else if (action === '修改角色') {
        chooseRole(member)
      } else if (action === '设为管理员' || action === '解除管理员') {
        toggleMemberAdmin(member, action === '设为管理员')
      } else if (action === '转让管理员') {
        confirmTransferAdmin(member)
      } else if (action === '移除成员') {
        confirmRemoveMember(member)
      }
    },
  })
}

function confirmRegenerateInviteCode() {
  if (!isCurrentAdmin.value) {
    uni.showToast({ title: '只有管理员可以重新生成邀请码', icon: 'none' })
    return
  }

  uni.showModal({
    title: '重新生成邀请码',
    content: '生成后旧邀请码将失效，已分享的旧邀请码不能再加入家庭。确定重新生成吗？',
    confirmText: '重新生成',
    confirmColor: '#5677fc',
    success: async (res) => {
      if (!res.confirm) return

      try {
        loading.value = true
        const result = await familyStore.regenerateInviteCodeAction()
        if (result.code === 0) {
          uni.showToast({ title: '邀请码已更新', icon: 'success' })
          await loadFamilyData()
        } else {
          uni.showToast({ title: result.message || '邀请码更新失败', icon: 'none' })
        }
      } catch {
        uni.showToast({ title: '重新生成邀请码接口未接通', icon: 'none' })
      } finally {
        loading.value = false
      }
    },
  })
}

function confirmLeaveFamily() {
  if (isCurrentAdmin.value) {
    chooseTransferBeforeLeave()
    return
  }

  uni.showModal({
    title: '离开家庭',
    content: '离开后将无法查看该家庭的设备、宝宝和成员信息，确定离开吗？',
    confirmText: '离开',
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (!res.confirm) return

      try {
        loading.value = true
        const result = await familyStore.leaveFamilyAction()
        if (result.code === 0) {
          members.value = []
          // 清除宝宝缓存
          const babyStore = useBabyStore()
          babyStore.clearBabyCache()
          uni.showToast({ title: '已离开家庭', icon: 'success' })
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/onboarding/index?first=1' })
          }, 1000)
        } else {
          uni.showToast({ title: result.message || '离开家庭失败', icon: 'none' })
        }
      } catch {
        uni.showToast({ title: '离开家庭接口未接通', icon: 'none' })
      } finally {
        loading.value = false
      }
    },
  })
}

function chooseTransferBeforeLeave() {
  if (!transferableMembers.value.length) {
    uni.showModal({
      title: '无法直接离开',
      content: '当前账号是家庭管理员，且没有其他成员可接收管理员权限。如不再使用该家庭，请先解散家庭。',
      confirmText: '去解散',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          confirmDissolveFamily()
        }
      },
    })
    return
  }

  uni.showModal({
    title: '需要先转让管理员',
    content: '管理员离开家庭前，需要先把管理员权限转让给其他成员。转让完成后再离开家庭。',
    confirmText: '选择成员',
    confirmColor: '#5677fc',
    success: (res) => {
      if (!res.confirm) return

      uni.showActionSheet({
        itemList: transferableMembers.value.map((member) => (
          member.nickname || member.display_name || member.phone || '家庭成员'
        )),
        success: (sheetRes) => {
          const target = transferableMembers.value[sheetRes.tapIndex]
          if (target) {
            confirmTransferAdmin(target)
          }
        },
      })
    },
  })
}

function confirmTransferAdmin(member: FamilyMember) {
  if (!isCurrentAdmin.value) {
    uni.showToast({ title: '只有管理员可以转让管理员', icon: 'none' })
    return
  }
  const name = member.nickname || member.display_name || member.phone || '该成员'
  uni.showModal({
    title: '转让管理员',
    content: `转让后「${name}」将成为家庭管理员，你可能不再拥有家庭管理权限。确定转让吗？`,
    confirmText: '确认转让',
    confirmColor: '#5677fc',
    success: async (res) => {
      if (!res.confirm) return

      try {
        loading.value = true
        const result = await familyStore.transferAdminAction(member.id)
        if (result.code === 0) {
          uni.showToast({ title: '管理员已转让', icon: 'success' })
          await loadFamilyData()
        } else {
          uni.showToast({ title: result.message || '转让失败', icon: 'none' })
        }
      } catch {
        uni.showToast({ title: '转让管理员接口未接通', icon: 'none' })
      } finally {
        loading.value = false
      }
    },
  })
}

function confirmDissolveFamily() {
  uni.showModal({
    title: '⚠ 确定解散家庭？',
    content: '一旦解散将永久删除全部数据',
    confirmText: '确认解散',
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (!res.confirm) return

      try {
        loading.value = true
        const result = await familyStore.dissolveFamilyAction()
        if (result.code === 0) {
          // 清除宝宝缓存
          const babyStore = useBabyStore()
          babyStore.clearBabyCache()
          uni.showToast({ title: '家庭已解散', icon: 'success' })
          members.value = []
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/onboarding/index?first=1' })
          }, 1000)
        } else {
          uni.showToast({ title: result.message || '解散家庭失败', icon: 'none' })
        }
      } catch {
        uni.showToast({ title: '解散家庭接口未接通', icon: 'none' })
      } finally {
        loading.value = false
      }
    },
  })
}

function toggleMemberAdmin(member: FamilyMember, willBeAdmin: boolean) {
  const name = member.nickname || member.display_name || member.phone || '该成员'
  uni.showModal({
    title: willBeAdmin ? '设为管理员' : '解除管理员',
    content: willBeAdmin
      ? `设为管理员后，${name} 可以修改家庭信息、邀请成员和管理成员。`
      : `解除后，${name} 将不能修改家庭信息、邀请成员和管理成员。`,
    confirmText: willBeAdmin ? '设为管理员' : '确认解除',
    confirmColor: willBeAdmin ? '#5677fc' : '#ff4d4f',
    success: async (res) => {
      if (!res.confirm) return

      try {
        loading.value = true
        const result = await familyStore.updateMemberRoleAction(member.id, member.member_role || 'parent', {
          is_admin: willBeAdmin ? 1 : 0,
        })

        if (result.code === 0) {
          uni.showToast({ title: willBeAdmin ? '已设为管理员' : '已解除管理员', icon: 'success' })
          await loadFamilyData()
        } else {
          uni.showToast({ title: result.message || '管理员设置失败', icon: 'none' })
        }
      } catch {
        uni.showToast({ title: '管理员设置接口未接通', icon: 'none' })
      } finally {
        loading.value = false
      }
    },
  })
}

function chooseRole(member: FamilyMember) {
  uni.showActionSheet({
    itemList: roleOptions.map((item) => item.label),
    success: async (res) => {
      const nextRole = roleOptions[res.tapIndex]
      if (!nextRole || nextRole.value === member.member_role) return

      try {
        loading.value = true
        const result = await familyStore.updateMemberRoleAction(member.id, nextRole.value)

        if (result.code === 0) {
          uni.showToast({ title: '角色已更新', icon: 'success' })
          await loadFamilyData()
        } else {
          uni.showToast({ title: result.message || '角色更新失败', icon: 'none' })
        }
      } catch {
        uni.showToast({ title: '成员角色接口未接通', icon: 'none' })
      } finally {
        loading.value = false
      }
    },
  })
}

function editSelfNickname() {
  uni.showModal({
    title: '修改昵称',
    editable: true,
    placeholderText: '请输入新昵称',
    content: userStore.nickname,
    success: async (res) => {
      const nickname = res.content?.trim()
      if (!res.confirm || !nickname) return
      if (nickname.length > 20) {
        uni.showToast({ title: '昵称不能超过20个字符', icon: 'none' })
        return
      }

      try {
        loading.value = true
        const result = await userStore.updateUserInfoAction({ nickname })
        if (result.code === 0) {
          members.value = members.value.map((item) => (
            isSelf(item) ? { ...item, nickname, display_name: nickname } : item
          ))
          uni.showToast({ title: '昵称已更新', icon: 'success' })
          await loadFamilyData()
        } else {
          uni.showToast({ title: result.message || '昵称修改失败', icon: 'none' })
        }
      } catch {
        uni.showToast({ title: '昵称修改失败', icon: 'none' })
      } finally {
        loading.value = false
      }
    },
  })
}

function confirmRemoveMember(member: FamilyMember) {
  const name = member.nickname || member.display_name || member.phone || '该成员'
  uni.showModal({
    title: '移除成员',
    content: `确认将「${name}」移出家庭吗？`,
    confirmText: '移除',
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (!res.confirm) return

      try {
        loading.value = true
        const result = await familyStore.removeMemberAction(member.id, '管理员移除')

        if (result.code === 0) {
          uni.showToast({ title: '已移除成员', icon: 'success' })
          await loadFamilyData()
        } else {
          uni.showToast({ title: result.message || '移除失败', icon: 'none' })
        }
      } catch {
        uni.showToast({ title: '移除成员接口未接通', icon: 'none' })
      } finally {
        loading.value = false
      }
    },
  })
}

async function handleCreateFamily() {
  if (!newFamilyName.value.trim()) {
    uni.showToast({ title: '请输入家庭名称', icon: 'none' })
    return
  }

  loading.value = true
  const res = await familyStore.createFamilyAction(newFamilyName.value.trim())
  loading.value = false

  if (res.code === 0) {
    uni.showToast({ title: '创建成功', icon: 'success' })
    showCreateFamily.value = false
    newFamilyName.value = ''
    loadFamilyData()
  } else {
    uni.showToast({ title: res.message || '创建失败', icon: 'none' })
  }
}

async function handleUpdateFamilyName() {
  const nextName = editFamilyName.value.trim()
  if (!nextName) {
    uni.showToast({ title: '请输入家庭名称', icon: 'none' })
    return
  }

  try {
    loading.value = true
    const res = await familyStore.updateFamilyInfoAction(nextName)
    if (res.code === 0) {
      uni.showToast({ title: '已保存', icon: 'success' })
      showEditFamily.value = false
      await loadFamilyData()
    } else {
      uni.showToast({ title: res.message || '保存失败', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '家庭名称接口未接通', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function handleJoinFamily() {
  if (!joinCode.value.trim()) {
    uni.showToast({ title: '请输入邀请码', icon: 'none' })
    return
  }

  loading.value = true
  const res = await familyStore.joinFamilyAction(joinCode.value.trim(), joinRole.value, joinRelation.value.trim() || undefined)
  loading.value = false

  if (res.code === 0) {
    uni.showToast({ title: '加入成功', icon: 'success' })
    showJoinFamily.value = false
    joinCode.value = ''
    joinRole.value = 'parent'
    joinRelation.value = ''
    loadFamilyData()
  } else {
    uni.showToast({ title: res.message || '加入失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.family-page {
  min-height: 100vh;
  padding: 24rpx 30rpx 48rpx;
  background: #f5f6fb;
}

.family-card {
  padding: 32rpx;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24rpx;
  box-shadow: 0 16rpx 36rpx rgba(102, 126, 234, 0.22);
}

.family-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.family-header-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12rpx;
  flex-shrink: 0;
}

.family-name {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
}

.family-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  opacity: 0.82;
}

.plan-badge {
  padding: 8rpx 18rpx;
  font-size: 22rpx;
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 999rpx;
}

.edit-family {
  padding: 8rpx 18rpx;
  font-size: 22rpx;
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
  border-radius: 999rpx;
}

.family-meta {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 16rpx;
  margin-top: 28rpx;
}

.family-meta.compact {
  grid-template-columns: repeat(2, 1fr);
}

.meta-item {
  padding: 18rpx;
  background: rgba(255, 255, 255, 0.14);
  border-radius: 18rpx;
}

.meta-label,
.meta-value {
  display: block;
}

.meta-label {
  font-size: 22rpx;
  opacity: 0.75;
}

.meta-value {
  margin-top: 8rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.code {
  text-decoration: underline;
}

.section {
  margin-top: 24rpx;
}

.family-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16rpx;
}

.family-action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 118rpx;
  padding: 18rpx 10rpx;
  font-size: 24rpx;
  color: #4b5563;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);

  text {
    margin-top: 8rpx;
  }

  &.danger {
    color: #ff4d4f;
  }
}

.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.section-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #222936;
}

.section-subtitle {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #9aa3b5;
}

.section-action {
  font-size: 26rpx;
  color: #5b7cfa;
}

.action-card {
  display: flex;
  align-items: center;
  padding: 30rpx;
  margin-bottom: 20rpx;
  background: #fff;
  border-radius: 22rpx;
}

.action-copy {
  margin-left: 22rpx;
}

.action-title,
.action-desc {
  display: block;
}

.action-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #222936;
}

.action-desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #9aa3b5;
}

.member-list {
  overflow: hidden;
  background: #fff;
  border-radius: 22rpx;
}

.member-item {
  display: flex;
  align-items: center;
  min-height: 116rpx;
  padding: 22rpx 24rpx;
  border-bottom: 1rpx solid #f0f2f7;
}

.member-item:last-child {
  border-bottom: none;
}

.member-avatar {
  width: 78rpx;
  height: 78rpx;
  margin-right: 20rpx;
  border-radius: 50%;
  background: #eef2ff;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-title-row {
  display: flex;
  align-items: center;
}

.member-name {
  max-width: 330rpx;
  overflow: hidden;
  font-size: 30rpx;
  font-weight: 700;
  color: #222936;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-badge,
.self-badge {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  margin-left: 10rpx;
  font-size: 20rpx;
  border-radius: 999rpx;
}

.admin-badge {
  color: #19be6b;
  background: #e8f8ef;
}

.self-badge {
  color: #5b7cfa;
  background: #eef2ff;
}

.member-role {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #9aa3b5;
}

.member-hint {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #b8bfcc;
}

.member-action {
  flex-shrink: 0;
  height: 56rpx;
  padding: 0 22rpx;
  margin: 0;
  font-size: 24rpx;
  line-height: 56rpx;
  color: #5b7cfa;
  background: #f3f6ff;
  border: none;
  border-radius: 999rpx;
}

.member-action::after {
  border: none;
}

.popup-form {
  width: 600rpx;
  padding: 36rpx 30rpx 30rpx;
}

.popup-title {
  display: block;
  margin-bottom: 30rpx;
  font-size: 36rpx;
  font-weight: 700;
  text-align: center;
  color: #222936;
}

.field-label {
  margin: 24rpx 0 12rpx;
  font-size: 24rpx;
  color: #667085;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
  margin-bottom: 18rpx;
}

.role-chip {
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  font-size: 24rpx;
  color: #667085;
  background: #f5f6fb;
  border-radius: 16rpx;

  &.active {
    color: #5677fc;
    background: #eef2ff;
    font-weight: 600;
  }
}

.popup-btns {
  display: flex;
  gap: 18rpx;
  margin-top: 30rpx;
}

.popup-btns .u-button {
  flex: 1;
}
</style>
