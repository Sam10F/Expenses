<template>
  <div>
    <!-- Loading -->
    <div v-if="store.loading" class="page-content">
      <p style="color:var(--color-text-secondary);">{{ t('common.loading') }}</p>
    </div>

    <!-- Has groups → redirect handled in onMounted; show brief loading -->
    <div v-else-if="store.groups.length" class="page-content">
      <p style="color:var(--color-text-secondary);">{{ t('common.loading') }}</p>
    </div>

    <!-- Empty state -->
    <div v-else class="page-content">
      <div class="empty-state" style="min-height:60vh;">
        <div class="empty-state-icon" aria-hidden="true">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.5" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h1 class="empty-state-title">{{ t('groups.empty.title') }}</h1>
        <p class="empty-state-desc">{{ t('groups.empty.description') }}</p>
        <button class="btn btn-primary btn-lg" @click="showNewGroup = true">
          {{ t('groups.empty.cta') }}
        </button>
        <p style="font-size:13px;color:var(--color-text-muted);margin-top:4px;">
          {{ t('groups.empty.hint') }}
        </p>
      </div>
    </div>

    <!-- FAB -->
    <AppFab :label="t('groups.fab')" @click="showNewGroup = true" />

    <!-- New group modal -->
    <NewGroupModal
      :open="showNewGroup"
      @close="showNewGroup = false"
      @created="handleGroupCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { useGroupsStore } from '~/stores/groups'

definePageMeta({ layout: 'default' })

const { t } = useI18n()
const store = useGroupsStore()
const router = useRouter()

const showNewGroup = ref(false)

onMounted(async () => {
  await store.fetchGroups()
  if (store.activeGroupId) {
    await router.push(`/groups/${store.activeGroupId}`)
  }
  else if (store.groups.length) {
    await router.push(`/groups/${store.groups[0]!.id}`)
  }
})

async function handleGroupCreated(groupId: string) {
  await store.fetchGroups()
  await router.push(`/groups/${groupId}`)
}
</script>
