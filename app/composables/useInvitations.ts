import type { InvitationWithDetails } from '#types/app'

// Module-level singleton state (safe for ssr: false / client-only app).
// Shared across all component instances so the header badge updates
// immediately when the user accepts or declines an invitation.
const _invitations = ref<InvitationWithDetails[]>([])
const _loading = ref(false)
const _error = ref<string | null>(null)

export function useInvitations() {
  const apiFetch = useApi()

  const pendingCount = computed(() => _invitations.value.length)

  async function fetchInvitations() {
    _loading.value = true
    _error.value = null
    try {
      const data = await apiFetch<InvitationWithDetails[]>('/api/invitations')
      _invitations.value = data
    }
    catch (e) {
      _error.value = (e as Error).message
    }
    finally {
      _loading.value = false
    }
  }

  async function acceptInvitation(id: string) {
    const data = await apiFetch<{ group_id: string }>(`/api/invitations/${id}/accept`, { method: 'POST' })
    _invitations.value = _invitations.value.filter(i => i.id !== id)
    return data.group_id
  }

  async function declineInvitation(id: string) {
    await apiFetch(`/api/invitations/${id}/decline`, { method: 'POST' })
    _invitations.value = _invitations.value.filter(i => i.id !== id)
  }

  return {
    invitations: _invitations,
    pendingCount,
    loading: _loading,
    error: _error,
    fetchInvitations,
    acceptInvitation,
    declineInvitation,
  }
}
