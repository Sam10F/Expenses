<template>
  <span :class="['amount', amountClass]">{{ formatted }}</span>
</template>

<script setup lang="ts">
import { formatBalance, balanceClass } from '~/utils/currency'

const props = defineProps<{
  amount: number
}>()

const formatted  = computed(() => formatBalance(props.amount))
const amountClass = computed(() => `amount-${balanceClass(props.amount)}`)
</script>
