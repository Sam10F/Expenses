<template>
  <button
    class="fab"
    :aria-label="label"
    aria-haspopup="dialog"
    @click="emit('click')"
  >
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  label: string
}>()

const emit = defineEmits<{
  click: []
}>()
</script>
