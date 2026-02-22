<template>
  <span
    :class="['avatar', sizeClass]"
    :style="{ background: bgColor, color: '#fff' }"
    :aria-hidden="ariaHidden"
    :title="name"
  >
    {{ initials }}
  </span>
</template>

<script setup lang="ts">
import { getMemberColorHex, getInitials } from '~/utils/memberColor'

const props = defineProps<{
  name:       string
  size?:      'sm' | 'md' | 'lg' | 'xl'
  avatarUrl?: string
  ariaHidden?: boolean | 'true' | 'false'
}>()

const sizeClass = computed(() => `avatar-${props.size ?? 'md'}`)
const bgColor   = computed(() => getMemberColorHex(props.name))
const initials  = computed(() => getInitials(props.name))
</script>
