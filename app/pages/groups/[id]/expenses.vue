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
      <NuxtLink
        :to="`/groups/${groupId}/expenses`"
        class="section-tab"
        aria-current="page"
      >
        {{ t('expenses.title') }}
      </NuxtLink>
      <NuxtLink :to="`/groups/${groupId}/categories`" class="section-tab">
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

    <div class="page-content">
      <div class="section-heading" style="margin-bottom:16px;">
        <h1 style="font-size:18px;font-weight:700;margin:0;">{{ t('expenses.title') }}</h1>
      </div>

      <!-- Loading -->
      <div v-if="expComposable.loading.value && !expComposable.expenses.value.length">
        <p style="color:var(--color-text-secondary);">{{ t('common.loading') }}</p>
      </div>

      <!-- Empty -->
      <div v-else-if="!expComposable.expenses.value.length">
        <div class="empty-state">
          <div class="empty-state-icon" aria-hidden="true">💸</div>
          <div class="empty-state-title">{{ t('expenses.empty.title') }}</div>
          <p class="empty-state-desc">{{ t('expenses.empty.description') }}</p>
          <button class="btn btn-primary btn-md" @click="showAddExpense = true">
            {{ t('expenses.empty.cta') }}
          </button>
        </div>
      </div>

      <!-- Expense list grouped by year → month -->
      <div v-else>
        <div
          v-for="yearGroup in groupedExpenses"
          :key="yearGroup.year"
          class="expense-year-group"
        >
          <h2 class="expense-year-heading">{{ yearGroup.year }}</h2>

          <div
            v-for="monthGroup in yearGroup.months"
            :key="monthGroup.month"
            class="expense-month-group"
          >
            <h3 class="expense-month-heading">{{ monthGroup.label }}</h3>
            <div class="card">
              <ul role="list" style="list-style:none;padding:0;margin:0;">
                <ExpenseListRow
                  v-for="exp in monthGroup.expenses"
                  :key="exp.id"
                  :expense="exp"
                  @edit="handleEditExpense"
                  @delete="handleDeleteExpense"
                />
              </ul>
            </div>
          </div>
        </div>

        <div v-if="expComposable.hasMore.value" style="text-align:center;margin-top:16px;">
          <button
            class="btn btn-secondary btn-sm"
            :disabled="expComposable.loading.value"
            @click="expComposable.loadMore()"
          >
            {{ t('expenses.loadMore') }}
          </button>
        </div>
      </div>
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
      :expense="editingExpense"
      @close="showAddExpense = false; editingExpense = null"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { useGroupsStore } from '~/stores/groups'
import { useExpenses } from '~/composables/useExpenses'
import type { Category, Member, ExpenseWithDetails } from '#types/app'

definePageMeta({ layout: 'default' })

const { t }  = useI18n()
const router = useRouter()
const store  = useGroupsStore()

const groupId = computed(() => useRoute().params.id as string)

const showNewGroup   = ref(false)
const showAddExpense = ref(false)
const editingExpense = ref<ExpenseWithDetails | null>(null)

const apiFetch = useApi()

// Load members and categories
const { data } = await useAsyncData(`expenses-page-${groupId.value}`, () =>
  Promise.all([
    apiFetch<Member[]>(`/api/groups/${groupId.value}/members`),
    apiFetch<Category[]>(`/api/groups/${groupId.value}/categories`),
  ]),
)

const members    = computed(() => data.value?.[0] ?? [])
const categories = computed(() => data.value?.[1] ?? [])

// Expenses composable
const expComposable = useExpenses(groupId)

interface MonthGroup {
  month:    number
  label:    string
  expenses: ExpenseWithDetails[]
}

interface YearGroup {
  year:   number
  months: MonthGroup[]
}

const { locale } = useI18n()

const groupedExpenses = computed<YearGroup[]>(() => {
  const groups: YearGroup[] = []
  for (const exp of expComposable.expenses.value) {
    const d    = new Date(`${exp.date}T00:00:00`)
    const year  = d.getFullYear()
    const month = d.getMonth() + 1
    let yg = groups.find(g => g.year === year)
    if (!yg) { yg = { year, months: [] }; groups.push(yg) }
    let mg = yg.months.find(m => m.month === month)
    if (!mg) {
      const label = new Intl.DateTimeFormat(locale.value, { month: 'long' }).format(d)
      mg = { month, label, expenses: [] }
      yg.months.push(mg)
    }
    mg.expenses.push(exp)
  }
  return groups
})

onMounted(() => {
  expComposable.fetchExpenses(0)
  store.fetchGroups()
  store.setActiveGroup(groupId.value)
})

watch(groupId, async (id) => {
  store.setActiveGroup(id)
  await expComposable.fetchExpenses(0)
})

async function navigateToGroup(id: string) {
  store.setActiveGroup(id)
  await router.push(`/groups/${id}`)
}

async function handleGroupCreated(id: string) {
  await store.fetchGroups()
  await router.push(`/groups/${id}`)
}

function handleEditExpense(expense: ExpenseWithDetails) {
  editingExpense.value = expense
  showAddExpense.value = true
}

async function handleDeleteExpense(expense: ExpenseWithDetails) {
  if (!confirm(t('expenses.deleteConfirm', { title: expense.title }))) return
  await expComposable.deleteExpense(expense.id)
}

async function handleSaved() {
  await expComposable.fetchExpenses(0)
}
</script>

<style>
.expense-year-group {
  margin-bottom: 8px;
}

.expense-year-heading {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 12px 0;
  padding-top: 8px;
}

.expense-month-group {
  margin-bottom: 16px;
}

.expense-month-heading {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
  margin: 0 0 6px 0;
}
</style>
