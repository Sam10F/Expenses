<template>
  <div class="category-chart">
    <!-- Donut chart — decorative -->
    <div class="chart-wrapper" aria-hidden="true">
      <svg
        :width="size"
        :height="size"
        viewBox="0 0 100 100"
        role="presentation"
        aria-hidden="true"
      >
        <!-- Background ring -->
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#e5e7eb"
          stroke-width="20"
        />

        <!-- Segments -->
        <circle
          v-for="(seg, i) in segments"
          :key="i"
          cx="50"
          cy="50"
          r="40"
          fill="none"
          :stroke="seg.color"
          stroke-width="20"
          :stroke-dasharray="`${seg.dashArray} ${seg.dashGap}`"
          :stroke-dashoffset="seg.dashOffset"
          style="transform-origin: center; transform: rotate(-90deg);"
        />
      </svg>
    </div>

    <!-- Legend -->
    <ul
      class="chart-legend"
      role="list"
    >
      <li
        v-for="cat in sorted"
        :key="cat.id"
        class="legend-item"
      >
        <span
          class="legend-dot"
          :style="{ background: colorHex(cat.color) }"
          aria-hidden="true"
        ></span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          :style="{ color: colorHex(cat.color) }"
          aria-hidden="true"
        >
          <path :d="iconPath(cat.icon)" />
        </svg>
        <span class="legend-name">{{ cat.name }}</span>
        <span class="legend-spacer" ></span>
        <span class="legend-amount">{{ formatCurrency(cat.totalAmount) }}</span>
        <span class="legend-pct">{{ cat.percentage.toFixed(0) }}%</span>
      </li>

      <li v-if="!sorted.length" class="legend-empty">
        {{ t('categories.noSpending') }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { CategoryWithStats } from '#types/app'
import { CATEGORY_COLOR_HEX, CATEGORY_ICON_PATHS } from '~/utils/categoryIcons'
import { formatCurrency } from '~/utils/currency'

const props = defineProps<{
  categories: CategoryWithStats[]
  size?:      number
}>()

const { t } = useI18n()

const size = computed(() => props.size ?? 160)

const sorted = computed(() =>
  [...props.categories]
    .filter(c => c.totalAmount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount),
)

const CIRCUMFERENCE = 2 * Math.PI * 40 // ≈ 251.33

interface Segment {
  color:      string
  dashArray:  number
  dashGap:    number
  dashOffset: number
}

const segments = computed<Segment[]>(() => {
  const total = sorted.value.reduce((sum, c) => sum + c.totalAmount, 0)
  if (total === 0) return []

  let offset = 0
  return sorted.value.map((cat) => {
    const fraction = cat.totalAmount / total
    const dashArray = fraction * CIRCUMFERENCE
    const dashGap   = CIRCUMFERENCE - dashArray
    const dashOffset = -offset * CIRCUMFERENCE / total

    offset += cat.totalAmount

    return {
      color:     colorHex(cat.color),
      dashArray: Math.round(dashArray * 100) / 100,
      dashGap:   Math.round(dashGap * 100) / 100,
      dashOffset: Math.round(dashOffset * 100) / 100,
    }
  })
})

function colorHex(color: string): string {
  return CATEGORY_COLOR_HEX[color] ?? '#9ca3af'
}

function iconPath(icon: string): string {
  return CATEGORY_ICON_PATHS[icon] ?? CATEGORY_ICON_PATHS['general'] ?? ''
}
</script>

<style>
.category-chart {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-wrapper {
  display: flex;
  justify-content: center;
}

.chart-legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  flex-shrink: 0;
}

.legend-name {
  color: var(--color-text);
  font-weight: 500;
}

.legend-spacer {
  flex: 1;
}

.legend-amount {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
}

.legend-pct {
  color: var(--color-text-secondary);
  min-width: 32px;
  text-align: right;
}

.legend-empty {
  font-size: 13px;
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
