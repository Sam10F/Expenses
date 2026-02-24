import type { InvitationWithDetails } from '#types/app'

export function useInvitations() {
  const apiFetch = useApi()
  const invitations = ref<InvitationWithDetails[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const pendingCount = computed(() => invitations.value.length)

  async function fetchInvitations() {
    loading.value = true
    error.value = null
    try {
      const data = await apiFetch<InvitationWithDetails[]>('/api/invitations')
      invitations.value = data
    }
    catch (e) {
      error.value = (e as Error).message
    }
    finally {
      loading.value = false
    }
  }

  async function acceptInvitation(id: string) {
    const data = await apiFetch<{ group_id: string }>(`/api/invitations/${id}/accept`, { method: 'POST' })
    invitations.value = invitations.value.filter(i => i.id !== id)
    return data.group_id
  }

  async function declineInvitation(id: string) {
    await apiFetch(`/api/invitations/${id}/decline`, { method: 'POST' })
    invitations.value = invitations.value.filter(i => i.id !== id)
  }

  return { invitations, pendingCount, loading, error, fetchInvitations, acceptInvitation, declineInvitation }
}
