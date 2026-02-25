<template>
  <AppModal
    :open="open"
    :title="expense ? t('expenses.edit.title') : t('expenses.add.title')"
    @close="emit('close')"
  >
    <form id="add-expense-form" novalidate @submit.prevent="handleSubmit">
      <!-- Title -->
      <div class="form-field" style="margin-bottom:14px;">
        <label for="exp-title" class="form-label">
          {{ t('expenses.add.titleLabel') }}
          <span aria-hidden="true" style="color:var(--color-negative)">*</span>
        </label>
        <input
          id="exp-title"
          v-model="form.title"
          type="text"
          class="form-input"
          :class="{ error: errors.title }"
          :placeholder="t('expenses.add.titlePlaceholder')"
          autocomplete="off"
          required
          :aria-describedby="errors.title ? 'exp-title-error' : undefined"
        />
        <span v-if="errors.title" id="exp-title-error" class="form-error" role="alert">
          {{ errors.title }}
        </span>
      </div>

      <!-- Amount + Date row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
        <!-- Amount -->
        <div class="form-field">
          <label for="exp-amount" class="form-label">
            {{ t('expenses.add.amountLabel') }}
            <span aria-hidden="true" style="color:var(--color-negative)">*</span>
          </label>
          <div class="form-prefix-group">
            <span class="form-prefix" aria-hidden="true">€</span>
            <input
              id="exp-amount"
              v-model.number="form.amount"
              type="number"
              min="0.01"
              step="0.01"
              class="form-input"
              :class="{ error: errors.amount }"
              placeholder="0.00"
              required
              :aria-describedby="errors.amount ? 'exp-amount-error' : undefined"
            />
          </div>
          <span v-if="errors.amount" id="exp-amount-error" class="form-error" role="alert">
            {{ errors.amount }}
          </span>
        </div>

        <!-- Date -->
        <div class="form-field">
          <label for="exp-date" class="form-label">
            {{ t('expenses.add.dateLabel') }}
            <span aria-hidden="true" style="color:var(--color-negative)">*</span>
          </label>
          <input
            id="exp-date"
            v-model="form.date"
            type="date"
            class="form-input"
            :class="{ error: errors.date }"
            required
            :aria-describedby="errors.date ? 'exp-date-error' : undefined"
          />
          <span v-if="errors.date" id="exp-date-error" class="form-error" role="alert">
            {{ errors.date }}
          </span>
        </div>
      </div>

      <!-- Paid by (watchers excluded) -->
      <div class="form-field" style="margin-bottom:14px;">
        <label for="exp-paidby" class="form-label">{{ t('expenses.add.paidByLabel') }}</label>
        <select id="exp-paidby" v-model="form.paid_by" class="form-input">
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

      <!-- Split (hidden when there is only one non-watcher member) -->
      <div v-if="nonWatcherMembers.length > 1" class="form-field" role="group" :aria-labelledby="splitLabelId">
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
            <!-- Toggle (disabled for watchers) -->
            <input
              :id="`split-${s.member.id}`"
              type="checkbox"
              :checked="s.is_included"
              :disabled="isWatcherMember(s.member)"
              :aria-label="s.member.name"
              style="width:16px;height:16px;cursor:pointer;flex-shrink:0;"
              @change="splitCalc.toggleMember(s.member.id)"
            />
            <label :for="`split-${s.member.id}`" style="flex:1;font-size:14px;cursor:pointer;">
              {{ s.member.name }}
            </label>

            <!-- Custom amount input -->
            <div v-if="splitCalc.isCustom.value && s.is_included" class="form-prefix-group" style="width:90px;">
              <span class="form-prefix" aria-hidden="true">€</span>
              <input
                type="number"
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

        <span
          v-if="errors.splits"
          class="form-error"
          role="alert"
          style="margin-top:8px;"
        >
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
        form="add-expense-form"
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
import type { Member, Category, ExpenseWithDetails, ExpensePrefill } from '#types/app'
import { useSplitCalculator } from '~/composables/useSplitCalculator'
import { formatCurrency } from '~/utils/currency'
import { todayISO } from '~/utils/date'

const props = defineProps<{
  open:       boolean
  groupId:    string
  members:    Member[]
  categories: Category[]
  expense?:   ExpenseWithDetails | null
  prefill?:   ExpensePrefill | null
}>()

const emit = defineEmits<{
  close:  []
  saved:  []
}>()

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

const form = reactive({
  title:       '',
  amount:      0,
  date:        todayISO(),
  paid_by:     '',
  category_id: '',
})

const errors = reactive({ title: '', amount: '', date: '', splits: '' })
const saving = ref(false)

// Split calculator
const membersRef = toRef(props, 'members')
const amountRef  = toRef(form, 'amount') as Ref<number>

const splitCalc = useSplitCalculator(membersRef, amountRef)

// Pre-fill when editing, from settlement prefill, or reset to defaults
watch([() => props.expense, () => props.prefill], ([exp, pre]) => {
  if (exp) {
    form.title       = exp.title
    form.amount      = exp.amount
    form.date        = exp.date
    form.paid_by     = exp.paid_by
    form.category_id = exp.category_id ?? ''

    splitCalc.initSplits(exp.splits.map(s => ({
      member:      s.member,
      amount:      s.amount,
      is_included: s.is_included,
    })))
  }
  else if (pre) {
    form.title       = pre.title
    form.amount      = pre.amount
    form.date        = todayISO()
    form.paid_by     = pre.paid_by
    form.category_id = props.categories.find(c => c.is_default)?.id ?? ''

    splitCalc.initSplits(props.members.map(m => ({
      member:      m,
      amount:      m.id === pre.only_member_id ? pre.amount : 0,
      is_included: m.id === pre.only_member_id,
    })))
  }
  else {
    Object.assign(form, { title: '', amount: 0, date: todayISO() })
    const currentUserMember = nonWatcherMembers.value.find(m => m.user_id === authStore.user?.id)
    form.paid_by     = currentUserMember?.id ?? nonWatcherMembers.value[0]?.id ?? ''
    form.category_id = props.categories.find(c => c.is_default)?.id ?? ''
    splitCalc.initSplits()
  }
}, { immediate: true })

function validate(): boolean {
  errors.title = errors.amount = errors.date = errors.splits = ''
  let valid = true

  if (!form.title.trim()) { errors.title = t('expenses.add.titleRequired'); valid = false }
  if (!form.amount || form.amount <= 0) { errors.amount = t('expenses.add.amountInvalid'); valid = false }
  if (!form.date) { errors.date = t('expenses.add.dateRequired'); valid = false }
  if (!splitCalc.isValid.value) {
    errors.splits = t('expenses.add.splitInvalid', {
      total: formatCurrency(form.amount),
    })
    valid = false
  }

  return valid
}

async function handleSubmit() {
  if (!validate()) return
  saving.value = true

  const body = {
    title:       form.title.trim(),
    amount:      form.amount,
    date:        form.date,
    paid_by:     form.paid_by,
    category_id: form.category_id,
    splits:      splitCalc.splits.value.map(s => ({
      member_id:   s.member.id,
      amount:      s.amount,
      is_included: s.is_included,
    })),
  }

  try {
    if (props.expense) {
      await apiFetch(`/api/groups/${props.groupId}/expenses/${props.expense.id}`, {
        method: 'PUT',
        body,
      })
    }
    else {
      await apiFetch(`/api/groups/${props.groupId}/expenses`, {
        method: 'POST',
        body,
      })
    }
    emit('saved')
    emit('close')
  }
  finally {
    saving.value = false
  }
}
</script>
