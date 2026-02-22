import type { Member, ExpenseWithDetails, Settlement } from '#types/app'

/**
 * Calculate the net balance for each member.
 * Positive = owed money by others.
 * Negative = owes money to others.
 */
export function calculateNetBalances(
  members: Member[],
  expenses: ExpenseWithDetails[],
): Map<string, number> {
  const balances = new Map<string, number>()

  for (const member of members) {
    balances.set(member.id, 0)
  }

  for (const expense of expenses) {
    // The payer gets credit for the full amount
    const paidByBalance = balances.get(expense.paid_by) ?? 0
    balances.set(expense.paid_by, paidByBalance + expense.amount)

    // Each included split reduces that member's balance
    for (const split of expense.splits) {
      if (!split.is_included) continue
      const splitBalance = balances.get(split.member_id) ?? 0
      balances.set(split.member_id, splitBalance - split.amount)
    }
  }

  return balances
}

/**
 * Greedy settlement algorithm: minimises the number of transactions.
 * Returns an array of settlements: from → to, amount.
 */
export function calculateSettlements(
  members: Member[],
  balances: Map<string, number>,
): Settlement[] {
  const memberMap = new Map(members.map(m => [m.id, m]))

  // Build list of { memberId, balance } sorted (creditors positive, debtors negative)
  const entries = [...balances.entries()]
    .map(([id, balance]) => ({ id, balance: Math.round(balance * 100) / 100 }))
    .filter(e => Math.abs(e.balance) > 0.005)

  const creditors = entries.filter(e => e.balance > 0).sort((a, b) => b.balance - a.balance)
  const debtors   = entries.filter(e => e.balance < 0).sort((a, b) => a.balance - b.balance)

  const settlements: Settlement[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]!
    const debtor   = debtors[di]!

    const amount = Math.min(creditor.balance, Math.abs(debtor.balance))
    const roundedAmount = Math.round(amount * 100) / 100

    if (roundedAmount > 0.005) {
      const fromMember = memberMap.get(debtor.id)
      const toMember   = memberMap.get(creditor.id)

      if (fromMember && toMember) {
        settlements.push({ from: fromMember, to: toMember, amount: roundedAmount })
      }
    }

    creditor.balance -= amount
    debtor.balance   += amount

    if (Math.abs(creditor.balance) < 0.005) ci++
    if (Math.abs(debtor.balance)   < 0.005) di++
  }

  return settlements
}
