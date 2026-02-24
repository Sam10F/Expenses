import { defineStore } from 'pinia'
import type { GroupWithStats, CreateGroupPayload, UpdateGroupPayload } from '#types/app'

export const useGroupsStore = defineStore('groups', () => {
  const groups = ref<GroupWithStats[]>([])
  const activeGroupId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Persist active group to localStorage
  if (import.meta.client) {
    const stored = localStorage.getItem('activeGroupId')
    if (stored) activeGroupId.value = stored
  }

  watch(activeGroupId, (id) => {
    if (import.meta.client) {
      if (id) localStorage.setItem('activeGroupId', id)
      else localStorage.removeItem('activeGroupId')
    }
  })

  const activeGroup = computed(() =>
    groups.value.find(g => g.id === activeGroupId.value) ?? null,
  )

  async function fetchGroups() {
    const apiFetch = useApi()
    loading.value = true
    error.value = null
    try {
      const data = await apiFetch<GroupWithStats[]>('/api/groups')
      groups.value = data

      // Auto-select first group if active group is gone or not set
      if (!activeGroupId.value || !groups.value.find(g => g.id === activeGroupId.value)) {
        activeGroupId.value = groups.value[0]?.id ?? null
      }
    }
    catch (e) {
      error.value = (e as Error).message
    }
    finally {
      loading.value = false
    }
  }

  function setActiveGroup(id: string) {
    activeGroupId.value = id
  }

  async function createGroup(payload: CreateGroupPayload) {
    const apiFetch = useApi()
    const data = await apiFetch('/api/groups', { method: 'POST', body: payload })
    await fetchGroups()
    return data
  }

  async function updateGroup(id: string, payload: UpdateGroupPayload) {
    const apiFetch = useApi()
    await apiFetch(`/api/groups/${id}`, { method: 'PUT', body: payload })
    await fetchGroups()
  }

  async function deleteGroup(id: string) {
    const apiFetch = useApi()
    await apiFetch(`/api/groups/${id}`, { method: 'DELETE' })
    if (activeGroupId.value === id) {
      activeGroupId.value = null
    }
    await fetchGroups()
  }

  return {
    groups,
    activeGroupId,
    activeGroup,
    loading,
    error,
    fetchGroups,
    setActiveGroup,
    createGroup,
    updateGroup,
    deleteGroup,
  }
})
