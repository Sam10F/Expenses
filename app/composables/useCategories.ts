import type { Category, CreateCategoryPayload } from '#types/app'

export function useCategories(groupId: MaybeRef<string>) {
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchCategories() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<Category[]>(`/api/groups/${toValue(groupId)}/categories`)
      categories.value = data
    }
    catch (e) {
      error.value = (e as Error).message
    }
    finally {
      loading.value = false
    }
  }

  async function addCategory(payload: CreateCategoryPayload) {
    const data = await $fetch<Category>(`/api/groups/${toValue(groupId)}/categories`, {
      method: 'POST',
      body: payload,
    })
    categories.value = [...categories.value, data]
    return data
  }

  async function updateCategory(catId: string, payload: Partial<CreateCategoryPayload>) {
    const data = await $fetch<Category>(`/api/groups/${toValue(groupId)}/categories/${catId}`, {
      method: 'PUT',
      body: payload,
    })
    const idx = categories.value.findIndex(c => c.id === catId)
    if (idx !== -1) categories.value[idx] = data
    return data
  }

  async function deleteCategory(catId: string) {
    await $fetch(`/api/groups/${toValue(groupId)}/categories/${catId}`, { method: 'DELETE' })
    categories.value = categories.value.filter(c => c.id !== catId)
  }

  /** Returns the default (General) category. */
  const defaultCategory = computed(() => categories.value.find(c => c.is_default) ?? null)

  return {
    categories,
    defaultCategory,
    loading,
    error,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
  }
}
