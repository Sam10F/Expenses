import type {
  RecurringExpenseWithDetails,
  CreateRecurringExpensePayload,
} from '#types/app'

export function useRecurringExpenses(groupId: MaybeRef<string>) {
  const apiFetch = useApi()
  const items = ref<RecurringExpenseWithDetails[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const data = await apiFetch<RecurringExpenseWithDetails[]>(
        `/api/groups/${toValue(groupId)}/recurring-expenses`,
      )
      items.value = data
    }
    catch (e) {
      error.value = (e as Error).message
    }
    finally {
      loading.value = false
    }
  }

  async function add(payload: CreateRecurringExpensePayload) {
    const data = await apiFetch<RecurringExpenseWithDetails>(
      `/api/groups/${toValue(groupId)}/recurring-expenses`,
      { method: 'POST', body: payload },
    )
    items.value = [data, ...items.value]
    return data
  }

  async function update(recId: string, payload: CreateRecurringExpensePayload) {
    const data = await apiFetch<RecurringExpenseWithDetails>(
      `/api/groups/${toValue(groupId)}/recurring-expenses/${recId}`,
      { method: 'PUT', body: payload },
    )
    const idx = items.value.findIndex(r => r.id === recId)
    if (idx !== -1) {
      // The PUT response is a raw row; re-fetch the enriched version
      await fetchAll()
    }
    return data
  }

  async function remove(recId: string) {
    await apiFetch(
      `/api/groups/${toValue(groupId)}/recurring-expenses/${recId}`,
      { method: 'DELETE' },
    )
    items.value = items.value.filter(r => r.id !== recId)
  }

  return { items, loading, error, fetchAll, add, update, remove }
}
