<template>
  <li
    class="expense-row"
    role="listitem"
  >
    <button
      class="expense-row-inner"
      :aria-label="`${expense.title}, ${formatCurrency(expense.amount)}, ${t('expenses.paidBy', { name: expense.paidByMember?.name })}`"
      @click="emit('edit', expense)"
    >
      <AppAvatar
        :name="expense.paidByMember?.name ?? '?'"
        :color="expense.paidByMember?.color"
        size="sm"
        :aria-hidden="true"
      />

      <div class="expense-row-info">
        <div class="expense-row-title">{{ expense.title }}</div>
        <div class="expense-row-meta">
          {{ expense.paidByMember?.name }} · {{ formatDate(expense.date) }}
        </div>
      </div>

      <div class="expense-row-amount">
        <div class="expense-row-total">{{ formatCurrency(expense.amount) }}</div>
      </div>
    </button>

    <button
      class="btn btn-ghost btn-icon expense-row-menu"
      :aria-label="`${t('common.delete')} ${expense.title}`"
      @click.stop="emit('delete', expense)"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
      </svg>
    </button>
  </li>
</template>

<script setup lang="ts">
import type { ExpenseWithDetails } from '#types/app'
import { formatCurrency } from '~/utils/currency'
import { formatDate } from '~/utils/date'

defineProps<{
  expense: ExpenseWithDetails
}>()

const emit = defineEmits<{
  edit:   [expense: ExpenseWithDetails]
  delete: [expense: ExpenseWithDetails]
}>()

const { t } = useI18n()
</script>

<style>
.expense-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
}
.expense-row:last-child { border-bottom: none; }

.expense-row-inner {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: var(--font-sans);
  min-width: 0;
  transition: background 120ms ease;
}
.expense-row-inner:hover { background: var(--color-surface-hover); }
.expense-row-inner:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.expense-row-info {
  flex: 1;
  min-width: 0;
}

.expense-row-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expense-row-meta {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.expense-row-amount {
  text-align: right;
  flex-shrink: 0;
}

.expense-row-total {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.expense-row-menu {
  padding: 12px 12px;
  flex-shrink: 0;
}
</style>
