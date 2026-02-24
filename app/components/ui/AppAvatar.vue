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
import { getColorHex, getInitials } from '~/utils/memberColor'

const props = defineProps<{
  name:        string
  size?:       'sm' | 'md' | 'lg' | 'xl'
  color?:      string
  avatarUrl?:  string
  ariaHidden?: boolean | 'true' | 'false'
}>()

const sizeClass = computed(() => `avatar-${props.size ?? 'md'}`)
const bgColor   = computed(() => getColorHex(props.color ?? '', props.name))
const initials  = computed(() => getInitials(props.name))
</script>
