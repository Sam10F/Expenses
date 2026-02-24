<template>
  <section class="card page-section" :aria-labelledby="titleId">
    <div class="card-header">
      <h2 :id="titleId" style="margin:0;font-size:15px;font-weight:600;">
        {{ t('invitations.title') }}
      </h2>
    </div>
    <div class="card-body">
      <!-- Invite form -->
      <form novalidate style="display:flex;gap:8px;margin-bottom:16px;" @submit.prevent="handleSend">
        <div style="flex:1;">
          <label :for="usernameInputId" class="sr-only">{{ t('auth.username') }}</label>
          <input
            :id="usernameInputId"
            v-model="inviteUsername"
            type="text"
            class="form-input"
            :class="{ error: inviteError }"
            :placeholder="t('auth.username')"
            autocomplete="off"
          />
        </div>
        <select v-model="inviteRole" class="form-input" style="width:120px;" :aria-label="t('invitations.roleLabel')">
          <option value="user">{{ t('roles.user') }}</option>
          <option value="watcher">{{ t('roles.watcher') }}</option>
        </select>
        <button type="submit" class="btn btn-primary btn-md" :disabled="sending || !inviteUsername.trim()">
          {{ sending ? t('common.loading') : t('invitations.sendButton') }}
        </button>
      </form>
      <span v-if="inviteError" class="form-error" role="alert" style="display:block;margin-bottom:12px;">{{ inviteError }}</span>
      <span v-if="inviteSuccess" style="font-size:13px;color:var(--color-positive);display:block;margin-bottom:12px;">✓ {{ inviteSuccess }}</span>

      <!-- Pending invitations -->
      <div v-if="pendingInvitations.length > 0">
        <p style="font-size:13px;font-weight:600;color:var(--color-text-secondary);margin:0 0 8px;">
          {{ t('invitations.pending') }}
        </p>
        <ul role="list" style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px;">
          <li
            v-for="inv in pendingInvitations"
            :key="inv.id"
            style="display:flex;align-items:center;gap:8px;font-size:13px;"
          >
            <span style="flex:1;">{{ inv.invitee?.username }}</span>
            <span class="role-badge" :class="`role-badge-${inv.role}`">{{ t(`roles.${inv.role}`) }}</span>
            <button
              class="btn btn-ghost btn-sm"
              :aria-label="'Cancel invitation for ' + inv.invitee?.username"
              @click="cancelInvitation(inv.id)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useId } from 'vue'

const props = defineProps<{ groupId: string }>()
const { t } = useI18n()
const apiFetch = useApi()
const titleId = useId()
const usernameInputId = useId()

const inviteUsername = ref('')
const inviteRole = ref<'user' | 'watcher'>('user')
const inviteError = ref('')
const inviteSuccess = ref('')
const sending = ref(false)
const pendingInvitations = ref<{ id: string; role: string; invitee?: { username: string } | null }[]>([])

onMounted(() => fetchPending())

async function fetchPending() {
  try {
    const data = await apiFetch<typeof pendingInvitations.value>(`/api/groups/${props.groupId}/invite`)
    pendingInvitations.value = data
  }
  catch { /* admin check failed — hide silently */ }
}

async function handleSend() {
  inviteError.value = ''
  inviteSuccess.value = ''
  if (!inviteUsername.value.trim()) return
  sending.value = true
  try {
    await apiFetch(`/api/groups/${props.groupId}/invite`, {
      method: 'POST',
      body: { username: inviteUsername.value.trim(), role: inviteRole.value },
    })
    inviteSuccess.value = t('invitations.send') + ' ✓'
    inviteUsername.value = ''
    await fetchPending()
  }
  catch (e) {
    inviteError.value = (e as { data?: { message?: string } }).data?.message ?? (e as Error).message
  }
  finally {
    sending.value = false
  }
}

async function cancelInvitation(id: string) {
  try {
    await apiFetch(`/api/invitations/${id}/decline`, { method: 'POST' })
    pendingInvitations.value = pendingInvitations.value.filter(i => i.id !== id)
  }
  catch { /* ignore */ }
}
</script>
