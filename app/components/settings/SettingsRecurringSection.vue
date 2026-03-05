<template>
  <section class="card page-section" :aria-labelledby="titleId">
    <div class="card-header">
      <h2 :id="titleId" style="margin:0;font-size:15px;font-weight:600;">
        {{ t('recurringExpenses.title') }}
      </h2>
      <button
        v-if="isAdmin"
        class="btn btn-secondary btn-sm"
        style="margin-left:auto;"
        @click="openAdd"
      >
        + {{ t('recurringExpenses.add.title') }}
      </button>
    </div>

    <div class="card-body" style="padding:0;">
      <!-- Loading state -->
      <div v-if="recurring.loading.value" style="padding:20px;text-align:center;color:var(--color-text-secondary);font-size:14px;">
        {{ t('common.loading') }}
      </div>

      <!-- Empty state -->
      <div
        v-else-if="recurring.items.value.length === 0"
        style="padding:24px 20px;text-align:center;"
      >
        <p style="font-size:14px;font-weight:500;color:var(--color-text);margin:0 0 4px;">
          {{ t('recurringExpenses.empty.title') }}
        </p>
        <p style="font-size:13px;color:var(--color-text-secondary);margin:0;">
          {{ t('recurringExpenses.empty.description') }}
        </p>
      </div>

      <!-- List -->
      <ul v-else role="list" style="list-style:none;padding:0;margin:0;">
        <RecurringExpenseRow
          v-for="item in recurring.items.value"
          :key="item.id"
          :expense="item"
          :can-edit="isAdmin"
          @edit="openEdit"
          @delete="handleDelete"
        />
      </ul>
    </div>
  </section>

  <!-- Add / Edit modal -->
  <RecurringExpenseModal
    :open="showModal"
    :group-id="groupId"
    :members="members"
    :categories="categories"
    :expense="editingExpense"
    @close="closeModal"
    @saved="onSaved"
  />
</template>

<script setup lang="ts">
import { useId } from 'vue'
import type { Member, Category, RecurringExpenseWithDetails } from '#types/app'
import { useRecurringExpenses } from '~/composables/useRecurringExpenses'

const props = defineProps<{
  groupId:    string
  members:    Member[]
  categories: Category[]
  isAdmin:    boolean
}>()

const { t } = useI18n()
const titleId = useId()

const recurring = useRecurringExpenses(computed(() => props.groupId))

const showModal     = ref(false)
const editingExpense = ref<RecurringExpenseWithDetails | null>(null)

onMounted(() => recurring.fetchAll())

function openAdd() {
  editingExpense.value = null
  showModal.value = true
}

function openEdit(expense: RecurringExpenseWithDetails) {
  editingExpense.value = expense
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingExpense.value = null
}

async function onSaved() {
  await recurring.fetchAll()
}

async function handleDelete(expense: RecurringExpenseWithDetails) {
  if (!confirm(t('recurringExpenses.deleteConfirm', { title: expense.title }))) return
  await recurring.remove(expense.id)
}
</script>
