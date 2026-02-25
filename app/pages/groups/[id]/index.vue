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
      <NuxtLink
        :to="`/groups/${groupId}`"
        class="section-tab"
        aria-current="page"
      >
        {{ t('balance.title') }}
      </NuxtLink>
      <NuxtLink :to="`/groups/${groupId}/expenses`" class="section-tab">
        {{ t('expenses.title') }}
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
      <!-- Group header -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
        <span
          class="group-color-dot"
          :class="`color-${group?.color}`"
          style="width:12px;height:12px;"
          aria-hidden="true"
        ></span>
        <div>
          <h1 style="font-size:18px;font-weight:700;margin:0;">{{ group?.name }}</h1>
          <p v-if="group?.description" style="font-size:13px;color:var(--color-text-secondary);margin:2px 0 0;">
            {{ group.description }}
          </p>
          <p style="font-size:12px;color:var(--color-text-muted);margin:2px 0 0;">
            {{ t('groups.members', { count: members.length }) }} ·
            {{ t('groups.expenses', { count: expenses.length }) }} ·
            {{ t('groups.total', { amount: formatCurrency(groupTotal) }) }}
          </p>
        </div>
      </div>

      <!-- Balances section — hidden for single-member groups -->
      <section v-if="members.length > 1" class="page-section" :aria-labelledby="balanceTitleId">
        <div class="section-heading">
          <h2 :id="balanceTitleId" class="section-title">{{ t('balance.title') }}</h2>
        </div>

        <div
          v-if="memberBalances.length"
          style="display:grid;grid-template-columns:1fr;gap:8px;"
          class="balance-grid"
          role="list"
          :aria-label="t('balance.title')"
        >
          <BalanceCard
            v-for="m in memberBalances"
            :key="m.id"
            :member="m"
            role="listitem"
          />
        </div>

        <!-- Settlements -->
        <div v-if="visibleSettlements.length" style="margin-top:20px;">
          <h3 style="font-size:13px;font-weight:600;color:var(--color-text-secondary);margin-bottom:10px;">
            {{ t('balance.settlements.title') }}
          </h3>
          <ul role="list" style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px;">
            <li
              v-for="(s, i) in visibleSettlements"
              :key="i"
            >
              <button
                class="settlement-row"
                :aria-label="`${t('balance.settlements.record')}: ${s.from.name} → ${s.to.name} ${formatCurrency(s.amount)}`"
                @click="openSettlementModal(s)"
              >
                <AppAvatar :name="s.from.name" :color="s.from.color" size="sm" :aria-hidden="true" />
                <span>{{ s.from.name }}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
                <span>{{ s.to.name }}</span>
                <AppAvatar :name="s.to.name" :color="s.to.color" size="sm" :aria-hidden="true" />
                <span style="color:var(--color-text-secondary);">{{ t('balance.settlements.pays') }}</span>
                <strong>{{ formatCurrency(s.amount) }}</strong>
                <span class="settlement-record-label">{{ t('balance.settlements.record') }}</span>
              </button>
            </li>
          </ul>

          <button
            v-if="settlements.length > SETTLEMENTS_VISIBLE"
            class="btn btn-ghost btn-sm"
            style="margin-top:8px;"
            @click="showAllSettlements = !showAllSettlements"
          >
            {{ showAllSettlements ? t('common.showLess') : t('common.showMore') }}
          </button>
        </div>

        <p v-else-if="memberBalances.length" style="font-size:13px;color:var(--color-text-muted);margin-top:8px;">
          {{ t('balance.settlements.noSettlements') }}
        </p>
      </section>

      <!-- Recent Expenses section -->
      <section v-if="expenses.length" class="page-section" :aria-labelledby="recentExpensesTitleId">
        <div class="section-heading">
          <h2 :id="recentExpensesTitleId" class="section-title">{{ t('expenses.recent') }}</h2>
        </div>

        <ul role="list" style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;">
          <li
            v-for="exp in recentExpenses"
            :key="exp.id"
            style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--color-border);"
          >
            <AppAvatar :name="exp.paidByMember.name" :color="exp.paidByMember.color" size="sm" :aria-hidden="true" />
            <div style="flex:1;min-width:0;">
              <div style="font-weight:500;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                {{ exp.title }}
              </div>
              <div style="font-size:12px;color:var(--color-text-secondary);display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
                <span>{{ exp.paidByMember.name }} · {{ formatDate(exp.date) }}</span>
                <span v-if="exp.category" style="display:inline-flex;align-items:center;gap:3px;">
                  <span
                    style="display:inline-block;width:6px;height:6px;border-radius:9999px;flex-shrink:0;"
                    :style="{ background: categoryColorHex(exp.category.color) }"
                    aria-hidden="true"
                  ></span>
                  <span>{{ exp.category.name }}</span>
                </span>
              </div>
            </div>
            <span style="font-size:14px;font-weight:600;white-space:nowrap;">{{ formatCurrency(exp.amount) }}</span>
          </li>
        </ul>

        <div style="margin-top:12px;text-align:right;">
          <NuxtLink
            :to="`/groups/${groupId}/expenses`"
            style="font-size:13px;color:var(--color-primary);text-decoration:none;font-weight:500;"
          >
            {{ t('expenses.seeAll') }} →
          </NuxtLink>
        </div>
      </section>

      <!-- By Category section -->
      <section class="page-section" :aria-labelledby="categoryTitleId">
        <div class="section-heading">
          <h2 :id="categoryTitleId" class="section-title">{{ t('categories.title') }}</h2>
          <div style="display:flex;align-items:center;gap:8px;">
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
            <button
              v-if="isAdmin"
              class="btn btn-secondary btn-sm"
              @click="showAddCategory = true"
            >
              + {{ t('categories.addButton') }}
            </button>
          </div>
        </div>

        <!-- Month navigator (shown only in monthly view) -->
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
      :expense="editingExpense"
      :prefill="settlementPrefill"
      @close="showAddExpense = false; editingExpense = null; settlementPrefill = null"
      @saved="handleExpenseSaved"
    />

    <AddCategoryModal
      :open="showAddCategory"
      :group-id="groupId"
      @close="showAddCategory = false"
      @created="handleCategoryCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import { useGroupsStore } from '~/stores/groups'
import { useAuthStore } from '~/stores/auth'
import type { ExpenseWithDetails, Category, CategoryWithStats, MemberWithBalance, Member, ExpensePrefill, Settlement } from '#types/app'
import { formatCurrency } from '~/utils/currency'
import { formatDate } from '~/utils/date'
import { CATEGORY_COLOR_HEX } from '~/utils/categoryIcons'

definePageMeta({ layout: 'default' })

const router = useRouter()
const { t }  = useI18n()
const store  = useGroupsStore()
const authStore = useAuthStore()

const groupId = computed(() => useRoute().params.id as string)

const balanceTitleId        = useId()
const categoryTitleId       = useId()
const recentExpensesTitleId = useId()

const showNewGroup       = ref(false)
const showAddExpense     = ref(false)
const showAddCategory    = ref(false)
const showAllSettlements = ref(false)
const editingExpense     = ref<ExpenseWithDetails | null>(null)
const settlementPrefill  = ref<ExpensePrefill | null>(null)

// Category view state
const selectedCategoryView = ref<'monthly' | 'all'>('monthly')
const now = new Date()
const selectedMonth = ref({ year: now.getFullYear(), month: now.getMonth() + 1 })

const SETTLEMENTS_VISIBLE = 5
const RECENT_EXPENSES     = 5

const MONTH_NAMES_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const selectedMonthLabel = computed(() => {
  const name = MONTH_NAMES_LONG[selectedMonth.value.month - 1]
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

function categoryColorHex(color: string): string {
  return CATEGORY_COLOR_HEX[color] ?? '#9ca3af'
}

const apiFetch = useApi()

const { data, pending, error, refresh } = await useAsyncData(
  `group-dashboard-${groupId.value}`,
  async () => {
    const [group, members, categories, expensesRes, balanceData] = await Promise.all([
      apiFetch<{ id: string; name: string; description: string | null; color: string }>(`/api/groups/${groupId.value}`),
      apiFetch<Member[]>(`/api/groups/${groupId.value}/members`),
      apiFetch<Category[]>(`/api/groups/${groupId.value}/categories`),
      apiFetch<{ data: ExpenseWithDetails[]; total: number }>(`/api/groups/${groupId.value}/expenses`),
      apiFetch<{
        memberBalances: MemberWithBalance[]
        settlements:    { from: Member; to: Member; amount: number }[]
      }>(`/api/groups/${groupId.value}/balance`),
    ])
    return { group, members, categories, expenses: expensesRes.data, balanceData }
  },
)

const group          = computed(() => data.value?.group ?? null)
const members        = computed(() => data.value?.members ?? [])
const categories     = computed(() => data.value?.categories ?? [])
const expenses       = computed(() => data.value?.expenses ?? [])
const memberBalances = computed(() => data.value?.balanceData.memberBalances ?? [])
const settlements    = computed(() => data.value?.balanceData.settlements ?? [])

const currentMember = computed(() => members.value.find(m => m.user_id === authStore.user?.id) ?? null)
const isAdmin = computed(() => currentMember.value?.role === 'admin')

const visibleSettlements = computed(() =>
  showAllSettlements.value ? settlements.value : settlements.value.slice(0, SETTLEMENTS_VISIBLE),
)

const groupTotal = computed(() =>
  expenses.value.reduce((sum, e) => sum + e.amount, 0),
)

const recentExpenses = computed(() =>
  [...expenses.value]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, RECENT_EXPENSES),
)

// Expenses filtered by selected month (or all)
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

watch(groupId, (id) => store.setActiveGroup(id), { immediate: true })

onMounted(() => { store.fetchGroups() })

function openSettlementModal(s: Settlement) {
  settlementPrefill.value = {
    title:          `${s.from.name} → ${s.to.name}`,
    amount:         s.amount,
    paid_by:        s.from.id,
    only_member_id: s.to.id,
  }
  showAddExpense.value = true
}

async function navigateToGroup(id: string) {
  store.setActiveGroup(id)
  await router.push(`/groups/${id}`)
}

async function handleGroupCreated(id: string) {
  await store.fetchGroups()
  await router.push(`/groups/${id}`)
}

async function handleExpenseSaved() { await refresh() }

async function handleCategoryCreated() {
  await refresh()
  showAddCategory.value = false
}
</script>

<style>
@media (min-width: 563px) {
  .balance-grid { grid-template-columns: 1fr 1fr !important; }
}
@media (min-width: 1024px) {
  .balance-grid { grid-template-columns: 1fr 1fr 1fr !important; }
}

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

/* Month navigation */
.category-month-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
}

.category-month-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  min-width: 130px;
  text-align: center;
}
</style>
