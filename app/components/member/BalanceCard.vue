<template>
  <div
    class="card balance-card"
    :class="`border-l-${balanceColorName}`"
    style="border-left-width:4px;"
  >
    <div class="card-body" style="padding:16px;display:flex;align-items:center;gap:12px;">
      <AppAvatar :name="member.name" size="md" />

      <div style="flex:1;min-width:0;">
        <div style="font-weight:500;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          {{ member.name }}
        </div>
        <div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">
          {{ balanceLabel }}
        </div>
      </div>

      <BalanceAmount :amount="member.balance" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MemberWithBalance } from '#types/app'
import { balanceClass } from '~/utils/currency'

const props = defineProps<{
  member: MemberWithBalance
}>()

const { t } = useI18n()

const balanceColorName = computed(() => {
  const cls = balanceClass(props.member.balance)
  if (cls === 'positive') return 'emerald'
  if (cls === 'negative') return 'rose'
  return 'slate'
})

const balanceLabel = computed(() => {
  const cls = balanceClass(props.member.balance)
  if (cls === 'positive') return t('balance.owedToYou')
  if (cls === 'negative') return t('balance.youOwe')
  return t('balance.settled')
})
</script>
