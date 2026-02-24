<template>
  <section class="page-container" aria-labelledby="invitations-heading">
    <h1 id="invitations-heading" class="page-title">{{ t('invitations.title') }}</h1>

    <div v-if="loading" class="loading-state" aria-live="polite" aria-busy="true">
      <span class="spin" aria-hidden="true" style="display:inline-block;width:20px;height:20px;border:2px solid var(--color-border);border-top-color:var(--color-primary);border-radius:50%;"></span>
    </div>

    <div v-else-if="invitations.length === 0" class="empty-state">
      <div class="empty-state-icon" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </div>
      <div class="empty-state-title">{{ t('invitations.empty') }}</div>
    </div>

    <ul v-else role="list" style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px;">
      <li
        v-for="inv in invitations"
        :key="inv.id"
        class="card"
        style="padding:16px 20px;"
      >
        <div style="display:flex;flex-direction:column;gap:8px;">
          <!-- Group info -->
          <div style="display:flex;align-items:center;gap:10px;">
            <div
              class="avatar avatar-md"
              :style="`background:${groupColorHex(inv.group?.color ?? 'indigo')};color:#fff;font-size:14px;font-weight:600;`"
              aria-hidden="true"
            >
              {{ (inv.group?.name ?? '?').slice(0, 2).toUpperCase() }}
            </div>
            <div>
              <div style="font-weight:600;font-size:15px;">{{ inv.group?.name }}</div>
              <div style="font-size:12px;color:var(--color-text-secondary);">
                {{ inv.memberCount }} {{ t('members.title') }} ·
                {{ t('invitations.invitedBy', { name: inv.inviter?.username ?? '' }) }}
              </div>
            </div>
            <span
              class="role-badge"
              :class="`role-badge-${inv.role}`"
              style="margin-left:auto;"
            >
              {{ t('invitations.joinAs') }}: {{ t(`roles.${inv.role}`) }}
            </span>
          </div>

          <!-- Group description -->
          <p v-if="inv.group?.description" style="font-size:13px;color:var(--color-text-secondary);margin:0;">
            {{ inv.group.description }}
          </p>

          <!-- Actions -->
          <div style="display:flex;gap:8px;margin-top:4px;">
            <button
              class="btn btn-primary btn-sm"
              :disabled="actionLoading === inv.id"
              @click="handleAccept(inv.id)"
            >
              {{ t('invitations.accept') }}
            </button>
            <button
              class="btn btn-secondary btn-sm"
              :disabled="actionLoading === inv.id"
              @click="handleDecline(inv.id)"
            >
              {{ t('invitations.decline') }}
            </button>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { getColorHex } from '~/utils/memberColor'

const { t } = useI18n()
const { invitations, loading, fetchInvitations, acceptInvitation, declineInvitation } = useInvitations()
const groupsStore = useGroupsStore()
const actionLoading = ref<string | null>(null)

onMounted(() => {
  fetchInvitations()
})

function groupColorHex(color: string): string {
  return getColorHex(color) ?? '#6366f1'
}

async function handleAccept(id: string) {
  actionLoading.value = id
  try {
    const groupId = await acceptInvitation(id)
    await groupsStore.fetchGroups()
    groupsStore.setActiveGroup(groupId)
    await navigateTo(`/groups/${groupId}`)
  }
  catch (e) {
    console.error(e)
  }
  finally {
    actionLoading.value = null
  }
}

async function handleDecline(id: string) {
  actionLoading.value = id
  try {
    await declineInvitation(id)
  }
  catch (e) {
    console.error(e)
  }
  finally {
    actionLoading.value = null
  }
}
</script>
