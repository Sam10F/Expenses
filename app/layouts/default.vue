<template>
  <div>
    <header class="topbar" role="banner">
      <a href="/" class="topbar-logo" :aria-label="t('nav.home') + ' — home'">
        {{ t('nav.home') }}
      </a>
      <span class="topbar-spacer" aria-hidden="true" ></span>
      <button
        class="avatar avatar-sm"
        :aria-label="t('nav.yourProfile')"
        style="background:#4f46e5;color:#fff;border:none;cursor:pointer;font-size:11px;font-weight:600;"
        @click="handleProfileClick"
      >
        SD
      </button>
    </header>

    <main id="main-content">
      <slot ></slot>
    </main>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

function handleProfileClick() {
  // Profile menu placeholder
}
</script>
