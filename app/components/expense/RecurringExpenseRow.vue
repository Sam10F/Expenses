<template>
  <li class="recurring-row" role="listitem">
    <div class="recurring-row-inner">
      <AppAvatar
        :name="expense.paidByMember?.name ?? '?'"
        :color="expense.paidByMember?.color"
        size="sm"
        :aria-hidden="true"
      />

      <div class="recurring-row-info">
        <div class="recurring-row-title">{{ expense.title }}</div>
        <div class="recurring-row-meta">
          {{ frequencyLabel }}
          <span v-if="expense.category" class="recurring-row-category">
            <span
              class="recurring-row-cat-dot"
              :style="{ background: categoryColorHex(expense.category.color) }"
              aria-hidden="true"
            ></span>
            {{ expense.category.name }}
          </span>
        </div>
      </div>

      <div class="recurring-row-amount">
        {{ formatCurrency(expense.amount) }}
      </div>
    </div>

    <div v-if="canEdit" class="recurring-row-actions">
      <button
        class="btn btn-ghost btn-icon"
        :aria-label="`${t('common.edit')} ${expense.title}`"
        @click="emit('edit', expense)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button
        class="btn btn-ghost btn-icon"
        :aria-label="`${t('common.delete')} ${expense.title}`"
        @click="emit('delete', expense)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
    </div>
  </li>
</template>

<script setup lang="ts">
import type { RecurringExpenseWithDetails } from '#types/app'
import { formatCurrency } from '~/utils/currency'
import { CATEGORY_COLOR_HEX } from '~/utils/categoryIcons'

const props = defineProps<{
  expense: RecurringExpenseWithDetails
  canEdit: boolean
}>()

const emit = defineEmits<{
  edit:   [expense: RecurringExpenseWithDetails]
  delete: [expense: RecurringExpenseWithDetails]
}>()

const { t } = useI18n()

function categoryColorHex(color: string): string {
  return CATEGORY_COLOR_HEX[color] ?? '#9ca3af'
}

const frequencyLabel = computed(() => {
  if (props.expense.frequency === 'weekly' && props.expense.day_of_week != null) {
    const dayName = t(`recurringExpenses.add.days.${props.expense.day_of_week}`)
    return t('recurringExpenses.frequency.weekly', { day: dayName })
  }
  if (props.expense.frequency === 'monthly' && props.expense.day_of_month != null) {
    return t('recurringExpenses.frequency.monthly', { day: props.expense.day_of_month })
  }
  return ''
})
</script>

<style>
.recurring-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
}
.recurring-row:last-child { border-bottom: none; }

.recurring-row-inner {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  min-width: 0;
}

.recurring-row-info {
  flex: 1;
  min-width: 0;
}

.recurring-row-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recurring-row-meta {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.recurring-row-category {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.recurring-row-cat-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  flex-shrink: 0;
}

.recurring-row-amount {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  padding-right: 4px;
}

.recurring-row-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-right: 8px;
  flex-shrink: 0;
}
</style>
