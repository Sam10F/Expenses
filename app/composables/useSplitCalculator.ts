import type { Member } from '#types/app'

export interface SplitEntry {
  member:      Member
  amount:      number
  is_included: boolean
}

export function useSplitCalculator(members: Ref<Member[]>, totalAmount: Ref<number>) {
  const splits = ref<SplitEntry[]>([])
  const isCustom = ref(false)

  /** Re-initialise splits from the current member list with equal distribution. */
  function initSplits(overrides?: SplitEntry[]) {
    if (overrides) {
      splits.value = overrides.map(o => ({ ...o }))
      const anyCustom = overrides.some(o => {
        const includedCount = overrides.filter(s => s.is_included).length
        const equal = includedCount > 0 ? Math.round((totalAmount.value / includedCount) * 100) / 100 : 0
        return o.is_included && Math.abs(o.amount - equal) > 0.01
      })
      isCustom.value = anyCustom
    }
    else {
      recalculateEqual()
    }
  }

  /** Recalculate equal split for all included members. */
  function recalculateEqual() {
    const included = splits.value.filter(s => s.is_included)
    const count = included.length

    if (count === 0) {
      splits.value = splits.value.map(s => ({ ...s, amount: 0 }))
      return
    }

    const baseAmount = Math.floor((totalAmount.value / count) * 100) / 100
    let remainder = Math.round((totalAmount.value - baseAmount * count) * 100)

    splits.value = members.value.map((member) => {
      const existing = splits.value.find(s => s.member.id === member.id)
      const included = existing?.is_included ?? true

      if (!included) {
        return { member, amount: 0, is_included: false }
      }

      let amount = baseAmount
      if (remainder > 0) {
        amount = Math.round((baseAmount + 0.01) * 100) / 100
        remainder--
      }

      return { member, amount, is_included: true }
    })
  }

  /** Toggle a member in/out of the split. */
  function toggleMember(memberId: string) {
    const split = splits.value.find(s => s.member.id === memberId)
    if (!split) return

    split.is_included = !split.is_included

    if (!isCustom.value) {
      recalculateEqual()
    }
    else {
      if (!split.is_included) {
        split.amount = 0
      }
    }
  }

  /** Set a custom amount for a member. */
  function setCustomAmount(memberId: string, amount: number) {
    const split = splits.value.find(s => s.member.id === memberId)
    if (!split) return
    split.amount = amount
    isCustom.value = true
  }

  /** Switch between equal and custom split mode. */
  function setCustomMode(custom: boolean) {
    isCustom.value = custom
    if (!custom) recalculateEqual()
  }

  /** Validate that included splits sum to the total amount. */
  const isValid = computed(() => {
    const includedTotal = splits.value
      .filter(s => s.is_included)
      .reduce((sum, s) => sum + s.amount, 0)
    return Math.abs(Math.round(includedTotal * 100) - Math.round(totalAmount.value * 100)) <= 1
  })

  const includedTotal = computed(() =>
    splits.value.filter(s => s.is_included).reduce((sum, s) => sum + s.amount, 0),
  )

  // When members list changes, re-sync (add new, remove old)
  watch(members, (newMembers) => {
    const existing = new Map(splits.value.map(s => [s.member.id, s]))
    splits.value = newMembers.map(member => ({
      member,
      amount:      existing.get(member.id)?.amount ?? 0,
      is_included: existing.get(member.id)?.is_included ?? true,
    }))
    if (!isCustom.value) recalculateEqual()
  }, { immediate: true })

  // When total changes in equal mode, recalculate
  watch(totalAmount, () => {
    if (!isCustom.value) recalculateEqual()
  })

  return {
    splits,
    isCustom,
    isValid,
    includedTotal,
    initSplits,
    recalculateEqual,
    toggleMember,
    setCustomAmount,
    setCustomMode,
  }
}
