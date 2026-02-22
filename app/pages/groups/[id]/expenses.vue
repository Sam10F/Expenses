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
      <NuxtLink :to="`/groups/${groupId}/settings`" class="section-tab">
        {{ t('settings.title') }}
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

      <!-- Expense list -->
      <div v-else class="card">
        <ul role="list" style="list-style:none;padding:0;margin:0;">
          <ExpenseListRow
            v-for="exp in expComposable.expenses.value"
            :key="exp.id"
            :expense="exp"
            @edit="handleEditExpense"
            @delete="handleDeleteExpense"
          />
        </ul>

        <div v-if="expComposable.hasMore.value" class="card-footer" style="text-align:center;">
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

// Load members and categories
const { data } = await useAsyncData(`expenses-page-${groupId.value}`, () =>
  Promise.all([
    $fetch<Member[]>(`/api/groups/${groupId.value}/members`),
    $fetch<Category[]>(`/api/groups/${groupId.value}/categories`),
  ]),
)

const members    = computed(() => data.value?.[0] ?? [])
const categories = computed(() => data.value?.[1] ?? [])

// Expenses composable
const expComposable = useExpenses(groupId)

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
