<template>
  <AppModal
    :open="open"
    :title="expense ? t('recurringExpenses.edit.title') : t('recurringExpenses.add.title')"
    @close="emit('close')"
  >
    <form id="recurring-expense-form" novalidate @submit.prevent="handleSubmit">
      <!-- Title -->
      <div class="form-field" style="margin-bottom:14px;">
        <label for="rec-title" class="form-label">
          {{ t('expenses.add.titleLabel') }}
          <span aria-hidden="true" style="color:var(--color-negative)">*</span>
        </label>
        <input
          id="rec-title"
          v-model="form.title"
          type="text"
          class="form-input"
          :class="{ error: errors.title }"
          :placeholder="t('expenses.add.titlePlaceholder')"
          autocomplete="off"
          required
          :aria-describedby="errors.title ? 'rec-title-error' : undefined"
        />
        <span v-if="errors.title" id="rec-title-error" class="form-error" role="alert">
          {{ errors.title }}
        </span>
      </div>

      <!-- Amount -->
      <div class="form-field" style="margin-bottom:14px;">
        <label for="rec-amount" class="form-label">
          {{ t('expenses.add.amountLabel') }}
          <span aria-hidden="true" style="color:var(--color-negative)">*</span>
        </label>
        <div class="form-prefix-group">
          <span class="form-prefix" aria-hidden="true">€</span>
          <input
            id="rec-amount"
            v-model.number="form.amount"
            type="number"
            inputmode="decimal"
            min="0.01"
            step="0.01"
            class="form-input"
            :class="{ error: errors.amount }"
            placeholder="0.00"
            required
            :aria-describedby="errors.amount ? 'rec-amount-error' : undefined"
          />
        </div>
        <span v-if="errors.amount" id="rec-amount-error" class="form-error" role="alert">
          {{ errors.amount }}
        </span>
      </div>

      <!-- Paid by -->
      <div class="form-field" style="margin-bottom:14px;">
        <label for="rec-paidby" class="form-label">{{ t('expenses.add.paidByLabel') }}</label>
        <select id="rec-paidby" v-model="form.paid_by" class="form-input">
          <option v-for="m in nonWatcherMembers" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </div>

      <!-- Category chips -->
      <div class="form-field" style="margin-bottom:14px;">
        <span class="form-label">{{ t('expenses.add.categoryLabel') }}</span>
        <div style="margin-top:6px;">
          <CategoryChips
            :categories="categories"
            :selected="form.category_id"
            @select="form.category_id = $event"
          />
        </div>
      </div>

      <!-- Frequency -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
        <div class="form-field">
          <label for="rec-frequency" class="form-label">
            {{ t('recurringExpenses.add.frequencyLabel') }}
            <span aria-hidden="true" style="color:var(--color-negative)">*</span>
          </label>
          <select
            id="rec-frequency"
            v-model="form.frequency"
            class="form-input"
            @change="onFrequencyChange"
          >
            <option value="weekly">{{ t('recurringExpenses.add.weekly') }}</option>
            <option value="monthly">{{ t('recurringExpenses.add.monthly') }}</option>
          </select>
        </div>

        <!-- Day of week / Day of month -->
        <div class="form-field">
          <!-- Weekly: day of week -->
          <template v-if="form.frequency === 'weekly'">
            <label for="rec-day-week" class="form-label">
              {{ t('recurringExpenses.add.dayOfWeekLabel') }}
              <span aria-hidden="true" style="color:var(--color-negative)">*</span>
            </label>
            <select id="rec-day-week" v-model.number="form.day_of_week" class="form-input">
              <option v-for="d in DAYS_OF_WEEK" :key="d.value" :value="d.value">
                {{ t(`recurringExpenses.add.days.${d.value}`) }}
              </option>
            </select>
          </template>

          <!-- Monthly: day of month -->
          <template v-else>
            <label for="rec-day-month" class="form-label">
              {{ t('recurringExpenses.add.dayOfMonthLabel') }}
              <span aria-hidden="true" style="color:var(--color-negative)">*</span>
            </label>
            <select id="rec-day-month" v-model.number="form.day_of_month" class="form-input">
              <option v-for="d in DAYS_OF_MONTH" :key="d" :value="d">{{ d }}</option>
            </select>
            <span class="form-hint" style="margin-top:4px;">
              {{ t('recurringExpenses.add.dayOfMonthHint') }}
            </span>
          </template>
        </div>
      </div>

      <!-- Split (hidden when only one non-watcher member) -->
      <div
        v-if="nonWatcherMembers.length > 1"
        class="form-field"
        role="group"
        :aria-labelledby="splitLabelId"
      >
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span :id="splitLabelId" class="form-label">{{ t('expenses.add.splitLabel') }}</span>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input
              type="checkbox"
              :checked="splitCalc.isCustom.value"
              @change="splitCalc.setCustomMode(!splitCalc.isCustom.value)"
            />
            {{ t('expenses.add.customSplit') }}
          </label>
        </div>

        <ul role="list" style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px;">
          <li
            v-for="s in splitCalc.splits.value"
            :key="s.member.id"
            style="display:flex;align-items:center;gap:8px;"
            :style="isWatcherMember(s.member) ? 'opacity:0.5;' : ''"
          >
            <input
              :id="`rec-split-${s.member.id}`"
              type="checkbox"
              :checked="s.is_included"
              :disabled="isWatcherMember(s.member)"
              :aria-label="s.member.name"
              style="width:16px;height:16px;cursor:pointer;flex-shrink:0;"
              @change="splitCalc.toggleMember(s.member.id)"
            />
            <label :for="`rec-split-${s.member.id}`" style="flex:1;font-size:14px;cursor:pointer;">
              {{ s.member.name }}
            </label>

            <div v-if="splitCalc.isCustom.value && s.is_included" class="form-prefix-group" style="width:90px;">
              <span class="form-prefix" aria-hidden="true">€</span>
              <input
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                class="form-input"
                :value="s.amount"
                style="font-size:13px;"
                :aria-label="`${s.member.name} amount`"
                @input="splitCalc.setCustomAmount(s.member.id, parseFloat(($event.target as HTMLInputElement).value) || 0)"
              />
            </div>
            <span v-else style="font-size:13px;color:var(--color-text-secondary);min-width:56px;text-align:right;">
              {{ s.is_included ? formatCurrency(s.amount) : '—' }}
            </span>
          </li>
        </ul>

        <span v-if="errors.splits" class="form-error" role="alert" style="margin-top:8px;">
          {{ errors.splits }}
        </span>
      </div>
    </form>

    <template #footer>
      <button type="button" class="btn btn-secondary btn-md" @click="emit('close')">
        {{ t('common.cancel') }}
      </button>
      <button
        type="submit"
        form="recurring-expense-form"
        class="btn btn-primary btn-md"
        :disabled="saving"
      >
        {{ saving ? t('common.loading') : t('expenses.add.submit') }}
      </button>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import type { Member, Category, RecurringExpenseWithDetails } from '#types/app'
import { useSplitCalculator } from '~/composables/useSplitCalculator'
import { formatCurrency } from '~/utils/currency'

const props = defineProps<{
  open:       boolean
  groupId:    string
  members:    Member[]
  categories: Category[]
  expense?:   RecurringExpenseWithDetails | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const DAYS_OF_WEEK = [
  { value: 0 }, { value: 1 }, { value: 2 }, { value: 3 },
  { value: 4 }, { value: 5 }, { value: 6 },
] as const

const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => i + 1)

const { t } = useI18n()
const splitLabelId = useId()
const apiFetch = useApi()
const authStore = useAuthStore()

const nonWatcherMembers = computed(() =>
  props.members.filter(m => (m as { role?: string }).role !== 'watcher'),
)

function isWatcherMember(m: Member): boolean {
  return (m as Member & { role?: string }).role === 'watcher'
}

type RecurringFrequency = 'weekly' | 'monthly'

const form = reactive({
  title:        '',
  amount:       0,
  paid_by:      '',
  category_id:  '',
  frequency:    'monthly' as RecurringFrequency,
  day_of_week:  1 as number,
  day_of_month: 1 as number,
})

const errors = reactive({ title: '', amount: '', splits: '' })
const saving = ref(false)

const membersRef = toRef(props, 'members')
const amountRef  = toRef(form, 'amount') as Ref<number>
const splitCalc  = useSplitCalculator(membersRef, amountRef)

function onFrequencyChange() {
  // Reset day selectors to sensible defaults on frequency switch
  form.day_of_week  = 1
  form.day_of_month = 1
}

watch([() => props.open, () => props.expense], ([open, exp]) => {
  if (!open) return

  errors.title = errors.amount = errors.splits = ''

  if (exp) {
    form.title       = exp.title
    form.amount      = exp.amount
    form.paid_by     = exp.paid_by
    form.category_id = exp.category_id ?? ''
    form.frequency   = exp.frequency
    form.day_of_week  = exp.day_of_week  ?? 1
    form.day_of_month = exp.day_of_month ?? 1

    splitCalc.initSplits(exp.splits.map(s => ({
      member:      s.member,
      amount:      s.amount,
      is_included: s.is_included,
    })))
  }
  else {
    Object.assign(form, {
      title:        '',
      amount:       0,
      frequency:    'monthly' as RecurringFrequency,
      day_of_week:  1,
      day_of_month: 1,
    })
    const currentUserMember = nonWatcherMembers.value.find(m => m.user_id === authStore.user?.id)
    form.paid_by     = currentUserMember?.id ?? nonWatcherMembers.value[0]?.id ?? ''
    form.category_id = props.categories.find(c => c.is_default)?.id ?? ''
    splitCalc.initSplits()
  }
}, { immediate: true })

function validate(): boolean {
  errors.title = errors.amount = errors.splits = ''
  let valid = true

  if (!form.title.trim()) { errors.title = t('expenses.add.titleRequired'); valid = false }
  if (!form.amount || form.amount <= 0) { errors.amount = t('expenses.add.amountInvalid'); valid = false }
  if (!splitCalc.isValid.value) {
    errors.splits = t('expenses.add.splitInvalid', { total: formatCurrency(form.amount) })
    valid = false
  }

  return valid
}

async function handleSubmit() {
  if (!validate()) return
  saving.value = true

  const body = {
    title:        form.title.trim(),
    amount:       form.amount,
    paid_by:      form.paid_by,
    category_id:  form.category_id,
    frequency:    form.frequency,
    day_of_week:  form.frequency === 'weekly'  ? form.day_of_week  : null,
    day_of_month: form.frequency === 'monthly' ? form.day_of_month : null,
    splits: splitCalc.splits.value.map(s => ({
      member_id:   s.member.id,
      amount:      s.amount,
      is_included: s.is_included,
    })),
  }

  try {
    if (props.expense) {
      await apiFetch(
        `/api/groups/${props.groupId}/recurring-expenses/${props.expense.id}`,
        { method: 'PUT', body },
      )
    }
    else {
      await apiFetch(
        `/api/groups/${props.groupId}/recurring-expenses`,
        { method: 'POST', body },
      )
    }
    emit('saved')
    emit('close')
  }
  finally {
    saving.value = false
  }
}
</script>
