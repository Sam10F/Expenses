<template>
  <div class="category-chips" role="group" :aria-label="t('expenses.add.categoryLabel')">
    <button
      v-for="cat in categories"
      :key="cat.id"
      type="button"
      class="category-chip"
      :class="{ selected: cat.id === selected }"
      :aria-pressed="cat.id === selected"
      @click="emit('select', cat.id)"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        :style="{ color: colorHex(cat.color) }"
        aria-hidden="true"
      >
        <path :d="iconPath(cat.icon)" />
      </svg>
      {{ cat.name }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Category } from '#types/app'
import { CATEGORY_COLOR_HEX, CATEGORY_ICON_PATHS } from '~/utils/categoryIcons'

defineProps<{
  categories: Category[]
  selected:   string
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const { t } = useI18n()

function colorHex(color: string): string {
  return CATEGORY_COLOR_HEX[color] ?? '#9ca3af'
}

function iconPath(icon: string): string {
  return CATEGORY_ICON_PATHS[icon] ?? CATEGORY_ICON_PATHS['general'] ?? ''
}
</script>
