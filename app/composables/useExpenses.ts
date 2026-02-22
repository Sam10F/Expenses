import type { ExpenseWithDetails, CreateExpensePayload, UpdateExpensePayload } from '#types/app'

interface ExpensePage {
  data:     ExpenseWithDetails[]
  total:    number
  page:     number
  pageSize: number
}

export function useExpenses(groupId: MaybeRef<string>) {
  const expenses = ref<ExpenseWithDetails[]>([])
  const total = ref(0)
  const currentPage = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const hasMore = computed(() => expenses.value.length < total.value)

  async function fetchExpenses(page = 0) {
    loading.value = true
    error.value = null
    try {
      const result = await $fetch<ExpensePage>(`/api/groups/${toValue(groupId)}/expenses`, {
        query: { page },
      })
      if (page === 0) {
        expenses.value = result.data
      }
      else {
        expenses.value = [...expenses.value, ...result.data]
      }
      total.value = result.total
      currentPage.value = page
    }
    catch (e) {
      error.value = (e as Error).message
    }
    finally {
      loading.value = false
    }
  }

  async function loadMore() {
    if (!hasMore.value) return
    await fetchExpenses(currentPage.value + 1)
  }

  async function addExpense(payload: CreateExpensePayload) {
    const data = await $fetch<ExpenseWithDetails>(`/api/groups/${toValue(groupId)}/expenses`, {
      method: 'POST',
      body: payload,
    })
    // Re-fetch page 0 to get enriched data with relations
    await fetchExpenses(0)
    return data
  }

  async function updateExpense(expId: string, payload: UpdateExpensePayload) {
    await $fetch(`/api/groups/${toValue(groupId)}/expenses/${expId}`, {
      method: 'PUT',
      body: payload,
    })
    await fetchExpenses(0)
  }

  async function deleteExpense(expId: string) {
    await $fetch(`/api/groups/${toValue(groupId)}/expenses/${expId}`, { method: 'DELETE' })
    expenses.value = expenses.value.filter(e => e.id !== expId)
    total.value = Math.max(0, total.value - 1)
  }

  return {
    expenses,
    total,
    hasMore,
    loading,
    error,
    fetchExpenses,
    loadMore,
    addExpense,
    updateExpense,
    deleteExpense,
  }
}
