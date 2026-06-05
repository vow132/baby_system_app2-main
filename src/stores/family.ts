/**
 * 家庭状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  getFamilyInfo, updateFamilyInfo, createFamily, joinFamily, getFamilyMembers, getInviteCode, regenerateInviteCode, transferFamilyAdmin, dissolveFamily, leaveFamily,
  updateFamilyMemberRole, removeFamilyMember,
  type FamilyInfo, type FamilyMember 
} from '@/api/family'
import { useUserStore } from './user'

export const useFamilyStore = defineStore('family', () => {
  // 状态
  const familyInfo = ref<FamilyInfo | null>(null)
  const members = ref<FamilyMember[]>([])
  
  // 计算属性
  const hasFamily = computed(() => !!familyInfo.value)
  const familyName = computed(() => familyInfo.value?.family_name || '未加入家庭')
  const inviteCode = computed(() => familyInfo.value?.family_code || '')
  const isAdmin = computed(() => familyInfo.value?.is_admin === 1 || familyInfo.value?.relation === 'creator')

  // 获取家庭信息
  async function fetchFamilyInfo() {
    try {
      const res = await getFamilyInfo()
      if (res.code === 0 && res.data) {
        familyInfo.value = res.data
      } else {
        familyInfo.value = null
      }
      return res
    } catch {
      familyInfo.value = null
      return { code: -1, message: '暂无家庭信息', data: null }
    }
  }

  // 创建家庭
  async function createFamilyAction(familyName: string) {
    const res = await createFamily({ family_name: familyName })
    if (res.code === 0) {
      await fetchFamilyInfo()
    }
    return res
  }

  async function updateFamilyInfoAction(familyName: string) {
    const res = await updateFamilyInfo({ family_name: familyName })
    if (res.code === 0) {
      if (familyInfo.value) {
        familyInfo.value = { ...familyInfo.value, family_name: familyName }
      }
      await fetchFamilyInfo()
    }
    return res
  }

  // 加入家庭
  async function joinFamilyAction(familyCode: string, memberRole = 'parent', relation?: string) {
    const res = await joinFamily({
      family_code: familyCode,
      member_role: memberRole,
      relation,
    })
    if (res.code === 0) {
      await fetchFamilyInfo()
    }
    return res
  }

  // 获取家庭成员
  async function fetchMembers() {
    const res = await getFamilyMembers()
    if (res.code === 0 && res.data) {
      members.value = res.data
    }
    return res
  }

  // 获取邀请码
  async function fetchInviteCode() {
    const res = await getInviteCode()
    if (res.code === 0 && res.data?.family_code && familyInfo.value) {
      familyInfo.value = { ...familyInfo.value, family_code: res.data.family_code }
    }
    return res
  }

  async function regenerateInviteCodeAction() {
    const res = await regenerateInviteCode()
    if (res.code === 0 && res.data?.family_code && familyInfo.value) {
      familyInfo.value = { ...familyInfo.value, family_code: res.data.family_code }
    }
    return res
  }

  async function updateMemberRoleAction(memberId: number, memberRole: string, options?: {
    is_admin?: number
    can_view?: number
    can_control?: number
    can_receive_push?: number
  }) {
    const res = await updateFamilyMemberRole(memberId, { member_role: memberRole, ...options })
    if (res.code === 0) {
      await fetchMembers()
    }
    return res
  }

  async function removeMemberAction(memberId: number, reason?: string) {
    const res = await removeFamilyMember(memberId, reason)
    if (res.code === 0) {
      await fetchMembers()
    }
    return res
  }

  async function transferAdminAction(memberId: number) {
    const res = await transferFamilyAdmin(memberId)
    if (res.code === 0) {
      await fetchFamilyInfo()
      await fetchMembers()
    }
    return res
  }

  async function dissolveFamilyAction() {
    const res = await dissolveFamily()
    if (res.code === 0) {
      familyInfo.value = null
      members.value = []
    }
    return res
  }

  // 退出家庭
  async function leaveFamilyAction() {
    const res = await leaveFamily()
    if (res.code === 0) {
      familyInfo.value = null
      members.value = []
    }
    return res
  }

  return {
    familyInfo,
    members,
    hasFamily,
    familyName,
    inviteCode,
    isAdmin,
    fetchFamilyInfo,
    createFamilyAction,
    updateFamilyInfoAction,
    joinFamilyAction,
    fetchMembers,
    fetchInviteCode,
    regenerateInviteCodeAction,
    updateMemberRoleAction,
    removeMemberAction,
    transferAdminAction,
    dissolveFamilyAction,
    leaveFamilyAction,
  }
})
