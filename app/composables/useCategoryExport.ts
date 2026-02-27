import type { Ref } from 'vue'
import type { ExpenseWithDetails } from '#types/app'

interface UseCategoryExportOptions {
  expenses:  Ref<ExpenseWithDetails[]>
  period:    Ref<string | null>  // "Feb 2026" or null (all-time)
  groupName: Ref<string>
}

const CSV_HEADER = 'Date,Title,Category,Amount (€),Paid By,Split Among'

function csvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function buildCsv(expenses: ExpenseWithDetails[]): string {
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date))
  const rows = sorted.map((exp) => {
    const categoryName = exp.category?.name ?? 'General'
    const splitNames = exp.splits
      .filter(s => s.is_included)
      .map(s => s.member.name)
      .join(', ')

    return [
      csvField(exp.date),
      csvField(exp.title),
      csvField(categoryName),
      exp.amount.toFixed(2),
      csvField(exp.paidByMember.name),
      csvField(splitNames),
    ].join(',')
  })

  return [CSV_HEADER, ...rows].join('\r\n')
}

function buildFilename(groupName: string, period: string | null): string {
  const slug = slugify(groupName) || 'group'
  const periodSlug = period ? period.replace(/\s+/g, '-') : 'all-time'
  return `expenses-${slug}-${periodSlug}.csv`
}

export function useCategoryExport(options: UseCategoryExportOptions) {
  function exportCsv() {
    const csv = buildCsv(options.expenses.value)
    const filename = buildFilename(options.groupName.value, options.period.value)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return { exportCsv }
}
