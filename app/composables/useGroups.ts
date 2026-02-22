import type { GroupWithStats, CreateGroupPayload, UpdateGroupPayload } from '#types/app'

export function useGroups() {
  const groups = useState<GroupWithStats[]>('groups', () => [])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchGroups() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<GroupWithStats[]>('/api/groups')
      groups.value = data
    }
    catch (e) {
      error.value = (e as Error).message
    }
    finally {
      loading.value = false
    }
  }

  async function createGroup(payload: CreateGroupPayload) {
    const data = await $fetch('/api/groups', { method: 'POST', body: payload })
    await fetchGroups()
    return data
  }

  async function updateGroup(id: string, payload: UpdateGroupPayload) {
    const data = await $fetch(`/api/groups/${id}`, { method: 'PUT', body: payload })
    await fetchGroups()
    return data
  }

  async function deleteGroup(id: string) {
    await $fetch(`/api/groups/${id}`, { method: 'DELETE' })
    await fetchGroups()
  }

  return { groups, loading, error, fetchGroups, createGroup, updateGroup, deleteGroup }
}
