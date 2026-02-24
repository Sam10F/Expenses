import type { Member, AddMemberPayload } from '#types/app'

export function useMembers(groupId: MaybeRef<string>) {
  const members = ref<Member[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchMembers() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<Member[]>(`/api/groups/${toValue(groupId)}/members`)
      members.value = data
    }
    catch (e) {
      error.value = (e as Error).message
    }
    finally {
      loading.value = false
    }
  }

  async function addMember(payload: AddMemberPayload) {
    const data = await $fetch<Member>(`/api/groups/${toValue(groupId)}/members`, {
      method: 'POST',
      body: payload,
    })
    members.value = [...members.value, data]
    return data
  }

  async function updateMember(memberId: string, payload: { name: string; color?: string }) {
    const data = await $fetch<Member>(`/api/groups/${toValue(groupId)}/members/${memberId}`, {
      method: 'PUT',
      body: payload,
    })
    const idx = members.value.findIndex(m => m.id === memberId)
    if (idx !== -1) members.value[idx] = data
    return data
  }

  async function removeMember(memberId: string) {
    await $fetch(`/api/groups/${toValue(groupId)}/members/${memberId}`, { method: 'DELETE' })
    members.value = members.value.filter(m => m.id !== memberId)
  }

  return { members, loading, error, fetchMembers, addMember, updateMember, removeMember }
}
