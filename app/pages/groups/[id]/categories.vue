<template>
  <div>
    <!-- Group tabs bar -->
    <GroupTabsBar
      :groups="store.groups"
      :active-group-id="groupId"
      @select="navigateToGroup"
      @new="showNewGroup = true"
    />

    <!-- Section tabs -->
    <nav class="section-tabs" :aria-label="t('nav.home')">
      <NuxtLink :to="`/groups/${groupId}`" class="section-tab">
        {{ t('balance.title') }}
      </NuxtLink>
      <NuxtLink :to="`/groups/${groupId}/expenses`" class="section-tab">
        {{ t('expenses.title') }}
      </NuxtLink>
      <NuxtLink
        :to="`/groups/${groupId}/categories`"
        class="section-tab"
        aria-current="page"
      >
        {{ t('categories.title') }}
      </NuxtLink>
      <NuxtLink
        :to="`/groups/${groupId}/settings`"
        class="section-tab"
        style="margin-left:auto;"
        :aria-label="t('settings.title')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </NuxtLink>
    </nav>

    <div v-if="pending" class="page-content">
      <p style="color:var(--color-text-secondary);">{{ t('common.loading') }}</p>
    </div>

    <div v-else-if="error" class="page-content">
      <p style="color:var(--color-negative);">{{ t('common.error') }}</p>
    </div>

    <div v-else class="page-content">
      <section class="page-section" :aria-labelledby="titleId">
        <div class="section-heading">
          <h2 :id="titleId" class="section-title">{{ t('categories.title') }}</h2>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <!-- Month selector inline (shown only in monthly view) -->
            <div v-if="selectedCategoryView === 'monthly'" class="category-month-nav" aria-live="polite">
              <button
                class="btn btn-ghost btn-sm"
                :aria-label="t('categories.prevMonth')"
                @click="prevMonth"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span class="category-month-label">{{ selectedMonthLabel }}</span>
              <button
                class="btn btn-ghost btn-sm"
                :aria-label="t('categories.nextMonth')"
                :disabled="isCurrentMonth"
                @click="nextMonth"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
            <!-- Export CSV -->
            <button class="btn btn-secondary btn-sm" @click="exportCsv()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {{ t('categories.exportCsv') }}
            </button>
            <!-- View toggle pills -->
            <div class="category-view-toggle" role="group" :aria-label="t('categories.title')">
              <button
                class="category-view-btn"
                :class="{ active: selectedCategoryView === 'monthly' }"
                :aria-pressed="selectedCategoryView === 'monthly'"
                @click="selectedCategoryView = 'monthly'"
              >
                {{ t('categories.viewMonthly') }}
              </button>
              <button
                class="category-view-btn"
                :class="{ active: selectedCategoryView === 'all' }"
                :aria-pressed="selectedCategoryView === 'all'"
                @click="selectedCategoryView = 'all'"
              >
                {{ t('categories.viewAll') }}
              </button>
            </div>
          </div>
        </div>

        <CategoryPieChart :categories="categoryStats" :expenses="categoryViewExpenses" />
      </section>
    </div>

    <!-- FAB -->
    <AppFab :label="t('expenses.fab')" @click="showAddExpense = true" />

    <!-- Modals -->
    <NewGroupModal
      :open="showNewGroup"
      @close="showNewGroup = false"
      @created="handleGroupCreated"
    />

    <AddExpenseModal
      :open="showAddExpense"
      :group-id="groupId"
      :members="members"
      :categories="categories"
      :expense="null"
      :prefill="null"
      @close="showAddExpense = false"
      @saved="handleExpenseSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import { useGroupsStore } from '~/stores/groups'
import { useCategoryExport } from '~/composables/useCategoryExport'
import type { Category, CategoryWithStats, Member, ExpenseWithDetails } from '#types/app'

definePageMeta({ layout: 'default' })

const router = useRouter()
const { t }  = useI18n()
const store  = useGroupsStore()

const groupId = computed(() => useRoute().params.id as string)

const titleId = useId()

const showNewGroup   = ref(false)
const showAddExpense = ref(false)

const selectedCategoryView = ref<'monthly' | 'all'>('monthly')
const now = new Date()
const selectedMonth = ref({ year: now.getFullYear(), month: now.getMonth() + 1 })

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const selectedMonthLabel = computed(() => {
  const name = MONTH_NAMES_SHORT[selectedMonth.value.month - 1]
  return `${name} ${selectedMonth.value.year}`
})

const isCurrentMonth = computed(() => {
  const n = new Date()
  return selectedMonth.value.year === n.getFullYear() && selectedMonth.value.month === n.getMonth() + 1
})

function prevMonth() {
  if (selectedMonth.value.month === 1) {
    selectedMonth.value = { year: selectedMonth.value.year - 1, month: 12 }
  }
  else {
    selectedMonth.value = { year: selectedMonth.value.year, month: selectedMonth.value.month - 1 }
  }
}

function nextMonth() {
  if (isCurrentMonth.value) return
  if (selectedMonth.value.month === 12) {
    selectedMonth.value = { year: selectedMonth.value.year + 1, month: 1 }
  }
  else {
    selectedMonth.value = { year: selectedMonth.value.year, month: selectedMonth.value.month + 1 }
  }
}

const apiFetch = useApi()

const { data, pending, error, refresh } = await useAsyncData(
  `group-categories-${groupId.value}`,
  async () => {
    const [categories, expensesRes, members] = await Promise.all([
      apiFetch<Category[]>(`/api/groups/${groupId.value}/categories`),
      apiFetch<{ data: ExpenseWithDetails[]; total: number }>(`/api/groups/${groupId.value}/expenses`),
      apiFetch<Member[]>(`/api/groups/${groupId.value}/members`),
    ])
    return { categories, expenses: expensesRes.data, members }
  },
)

const categories = computed(() => data.value?.categories ?? [])
const expenses   = computed(() => data.value?.expenses ?? [])
const members    = computed(() => data.value?.members ?? [])

const categoryViewExpenses = computed<ExpenseWithDetails[]>(() => {
  if (selectedCategoryView.value === 'all') return expenses.value
  const prefix = `${selectedMonth.value.year}-${String(selectedMonth.value.month).padStart(2, '0')}`
  return expenses.value.filter(e => e.date.startsWith(prefix))
})

const categoryStats = computed<CategoryWithStats[]>(() => {
  const total = categoryViewExpenses.value.reduce((sum, e) => sum + e.amount, 0)
  return categories.value.map(cat => {
    const catTotal = categoryViewExpenses.value
      .filter(e => e.category_id === cat.id)
      .reduce((sum, e) => sum + e.amount, 0)
    return { ...cat, totalAmount: catTotal, percentage: total > 0 ? (catTotal / total) * 100 : 0 }
  })
})

const { exportCsv } = useCategoryExport({
  expenses:  categoryViewExpenses,
  period:    computed(() => selectedCategoryView.value === 'monthly' ? selectedMonthLabel.value : null),
  groupName: computed(() => store.groups.find(g => g.id === groupId.value)?.name ?? 'group'),
})

watch(groupId, (id) => store.setActiveGroup(id), { immediate: true })

onMounted(() => { store.fetchGroups() })

async function navigateToGroup(id: string) {
  store.setActiveGroup(id)
  await router.push(`/groups/${id}`)
}

async function handleGroupCreated(id: string) {
  await store.fetchGroups()
  await router.push(`/groups/${id}`)
}

async function handleExpenseSaved() { await refresh() }
</script>

<style>
/* Category view toggle */
.category-view-toggle {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.category-view-btn {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: background 120ms ease, color 120ms ease;
}

.category-view-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.category-view-btn.active {
  background: var(--color-primary);
  color: #fff;
}

.category-view-btn:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: -2px;
}

/* Month navigation — inline in section heading */
.category-month-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.category-month-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  min-width: 80px;
  text-align: center;
}
</style>
