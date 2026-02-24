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
      <NuxtLink :to="`/groups/${groupId}/settings`" class="section-tab">
        {{ t('settings.title') }}
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

      <!-- Balances section -->
      <section class="page-section" :aria-labelledby="balanceTitleId">
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
          <NuxtLink :to="`/groups/${groupId}/expenses`" class="btn btn-ghost btn-sm">
            {{ t('expenses.seeAll') }} →
          </NuxtLink>
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
              <div style="font-size:12px;color:var(--color-text-secondary);">
                {{ exp.paidByMember.name }} · {{ formatDate(exp.date) }}
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
          <button
            class="btn btn-secondary btn-sm"
            @click="showAddCategory = true"
          >
            + {{ t('categories.addButton') }}
          </button>
        </div>

        <CategoryPieChart :categories="categoryStats" />
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
import type { ExpenseWithDetails, Category, CategoryWithStats, MemberWithBalance, Member, ExpensePrefill, Settlement } from '#types/app'
import { formatCurrency } from '~/utils/currency'
import { formatDate } from '~/utils/date'

definePageMeta({ layout: 'default' })

const router = useRouter()
const { t }  = useI18n()
const store  = useGroupsStore()

const groupId = computed(() => useRoute().params.id as string)

const balanceTitleId        = useId()
const categoryTitleId       = useId()
const recentExpensesTitleId = useId()

// Page state
const showNewGroup       = ref(false)
const showAddExpense     = ref(false)
const showAddCategory    = ref(false)
const showAllSettlements = ref(false)
const editingExpense     = ref<ExpenseWithDetails | null>(null)
const settlementPrefill  = ref<ExpensePrefill | null>(null)

const SETTLEMENTS_VISIBLE = 5
const RECENT_EXPENSES     = 5

// Load group data
const { data, pending, error, refresh } = await useAsyncData(
  `group-dashboard-${groupId.value}`,
  async () => {
    const [group, members, categories, expensesRes, balanceData] = await Promise.all([
      $fetch<{ id: string; name: string; description: string | null; color: string }>(`/api/groups/${groupId.value}`),
      $fetch<{ id: string; name: string; avatar_url: string | null; group_id: string; created_at: string }[]>(`/api/groups/${groupId.value}/members`),
      $fetch<Category[]>(`/api/groups/${groupId.value}/categories`),
      $fetch<{ data: ExpenseWithDetails[]; total: number }>(`/api/groups/${groupId.value}/expenses`),
      $fetch<{
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

// Category spending stats
const categoryStats = computed<CategoryWithStats[]>(() => {
  const total = expenses.value.reduce((sum, e) => sum + e.amount, 0)

  return categories.value.map(cat => {
    const catTotal = expenses.value
      .filter(e => e.category_id === cat.id)
      .reduce((sum, e) => sum + e.amount, 0)
    return {
      ...cat,
      totalAmount: catTotal,
      percentage: total > 0 ? (catTotal / total) * 100 : 0,
    }
  })
})

// Set active group in store and ensure groups are loaded for the tab bar
watch(groupId, (id) => store.setActiveGroup(id), { immediate: true })

onMounted(() => {
  store.fetchGroups()
})

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

async function handleExpenseSaved() {
  await refresh()
}

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
</style>
