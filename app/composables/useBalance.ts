import type { MemberWithBalance, Settlement } from '#types/app'

interface BalanceResponse {
  memberBalances: MemberWithBalance[]
  settlements:    Settlement[]
}

export function useBalance(groupId: MaybeRef<string>) {
  const memberBalances = ref<MemberWithBalance[]>([])
  const settlements    = ref<Settlement[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchBalance() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<BalanceResponse>(`/api/groups/${toValue(groupId)}/balance`)
      memberBalances.value = data.memberBalances
      settlements.value    = data.settlements
    }
    catch (e) {
      error.value = (e as Error).message
    }
    finally {
      loading.value = false
    }
  }

  return { memberBalances, settlements, loading, error, fetchBalance }
}
