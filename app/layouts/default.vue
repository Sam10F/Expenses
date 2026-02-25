<template>
  <div>
    <header class="topbar" role="banner">
      <a href="/" class="topbar-logo" :aria-label="t('nav.home') + ' — home'">
        {{ t('nav.home') }}
      </a>
      <span class="topbar-spacer" aria-hidden="true"></span>

      <div ref="dropdownRef" class="profile-dropdown-wrapper">
        <!-- Invitation badge -->
        <button
          v-if="pendingCount > 0"
          class="btn btn-ghost btn-icon"
          style="position:relative;margin-right:4px;"
          :aria-label="t('invitations.title') + ' (' + pendingCount + ')'"
          @click="navigateTo('/invitations')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span class="invitation-badge" aria-hidden="true">{{ pendingCount }}</span>
        </button>

        <!-- User avatar button -->
        <button
          class="avatar avatar-sm"
          :aria-label="t('nav.yourProfile')"
          :aria-expanded="dropdownOpen"
          aria-haspopup="menu"
          style="background:#4f46e5;color:#fff;border:none;cursor:pointer;font-size:11px;font-weight:600;"
          @click="dropdownOpen = !dropdownOpen"
        >
          {{ initials }}
        </button>

        <!-- Dropdown menu -->
        <div
          v-if="dropdownOpen"
          class="profile-dropdown"
          role="menu"
          :aria-label="t('nav.yourProfile')"
        >
          <div class="profile-dropdown-header">
            {{ authStore.user?.username }}
          </div>
          <button
            class="profile-dropdown-item"
            role="menuitem"
            @click="goToInvitations"
          >
            {{ t('invitations.title') }}
            <span v-if="pendingCount > 0" class="invitation-badge" style="position:static;margin-left:auto;" aria-label="({{ pendingCount }})">{{ pendingCount }}</span>
          </button>
          <button
            class="profile-dropdown-item"
            role="menuitem"
            @click="goToUserSettings"
          >
            {{ t('nav.userSettings') }}
          </button>
          <button
            class="profile-dropdown-item"
            role="menuitem"
            @click="handleSignOut"
          >
            {{ t('auth.signOut') }}
          </button>
        </div>
      </div>
    </header>

    <main id="main-content">
      <slot></slot>
    </main>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const authStore = useAuthStore()
const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const { pendingCount, fetchInvitations } = useInvitations()

const initials = computed(() => {
  const name = authStore.user?.username ?? ''
  return name.slice(0, 2).toUpperCase() || '??'
})

onMounted(() => {
  fetchInvitations()
})

// Close dropdown when clicking outside
onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})
onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})

function handleOutsideClick(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    dropdownOpen.value = false
  }
}

function goToInvitations() {
  dropdownOpen.value = false
  navigateTo('/invitations')
}

function goToUserSettings() {
  dropdownOpen.value = false
  navigateTo('/settings')
}

async function handleSignOut() {
  dropdownOpen.value = false
  await authStore.signOut()
  navigateTo('/auth/login')
}
</script>
