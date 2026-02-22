<template>
  <nav
    class="group-tabs-bar"
    role="tablist"
    :aria-label="t('groups.title')"
  >
    <button
      v-for="group in groups"
      :key="group.id"
      role="tab"
      class="group-tab"
      :aria-selected="group.id === activeGroupId ? 'true' : 'false'"
      @click="emit('select', group.id)"
    >
      <span
        class="group-color-dot"
        :class="`color-${group.color}`"
        aria-hidden="true"
      ></span>
      {{ group.name }}
    </button>

    <button
      class="group-tab"
      role="tab"
      aria-selected="false"
      :aria-label="t('groups.fab')"
      style="color: var(--color-primary);"
      @click="emit('new')"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        aria-hidden="true"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      {{ t('groups.new.title') }}
    </button>
  </nav>
</template>

<script setup lang="ts">
import type { GroupWithStats } from '#types/app'

defineProps<{
  groups:        GroupWithStats[]
  activeGroupId: string | null
}>()

const emit = defineEmits<{
  select:   [id: string]
  settings: [id: string]
  new:      []
}>()

const { t } = useI18n()
</script>
