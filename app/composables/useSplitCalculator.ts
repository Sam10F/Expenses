import type { Member } from '#types/app'

export interface SplitEntry {
  member:      Member
  amount:      number
  is_included: boolean
}

function isWatcher(member: Member): boolean {
  return (member as Member & { role?: string }).role === 'watcher'
}

export function useSplitCalculator(members: Ref<Member[]>, totalAmount: Ref<number>) {
  const splits = ref<SplitEntry[]>([])
  const isCustom = ref(false)

  /** Re-initialise splits from the current member list with equal distribution. */
  function initSplits(overrides?: SplitEntry[]) {
    if (overrides) {
      splits.value = overrides.map(o => ({
        ...o,
        // Watchers are always excluded regardless of override
        is_included: isWatcher(o.member) ? false : o.is_included,
        amount:      isWatcher(o.member) ? 0 : o.amount,
      }))
      const anyCustom = overrides.some(o => {
        if (isWatcher(o.member)) return false
        const includedCount = overrides.filter(s => s.is_included && !isWatcher(s.member)).length
        const equal = includedCount > 0 ? Math.round((totalAmount.value / includedCount) * 100) / 100 : 0
        return o.is_included && Math.abs(o.amount - equal) > 0.01
      })
      isCustom.value = anyCustom
    }
    else {
      recalculateEqual()
    }
  }

  /** Recalculate equal split for all included non-watcher members. */
  function recalculateEqual() {
    const included = splits.value.filter(s => s.is_included && !isWatcher(s.member))
    const count = included.length

    if (count === 0) {
      splits.value = splits.value.map(s => ({ ...s, amount: 0 }))
      return
    }

    const baseAmount = Math.floor((totalAmount.value / count) * 100) / 100
    let remainder = Math.round((totalAmount.value - baseAmount * count) * 100)

    splits.value = members.value.map((member) => {
      // Watchers always excluded
      if (isWatcher(member)) return { member, amount: 0, is_included: false }

      const existing = splits.value.find(s => s.member.id === member.id)
      const memberIncluded = existing?.is_included ?? true

      if (!memberIncluded) {
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

  /** Toggle a member in/out of the split. Watchers cannot be toggled. */
  function toggleMember(memberId: string) {
    const split = splits.value.find(s => s.member.id === memberId)
    if (!split) return
    if (isWatcher(split.member)) return

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
    if (!split || isWatcher(split.member)) return
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
      amount:      isWatcher(member) ? 0 : (existing.get(member.id)?.amount ?? 0),
      is_included: isWatcher(member) ? false : (existing.get(member.id)?.is_included ?? true),
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
