<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
useHead({
  title: 'Expenses',
  htmlAttrs: { lang: 'en' },
  link: [
    { rel: 'manifest', href: '/manifest.webmanifest' },
    { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
    { rel: 'icon', type: 'image/png', href: '/favicon.png' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  ],
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'theme-color', content: '#6366f1' },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'apple-mobile-web-app-title', content: 'Expenses' },
    { name: 'description', content: 'Track and split shared expenses with your group' },
  ],
})
</script>
