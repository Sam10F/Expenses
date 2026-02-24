<template>
  <div>
    <GroupTabsBar
      :groups="store.groups"
      :active-group-id="groupId"
      @select="navigateToGroup"
      @new="showNewGroup = true"
    />

    <nav class="section-tabs" :aria-label="t('nav.home')">
      <NuxtLink :to="`/groups/${groupId}`" class="section-tab">{{ t('balance.title') }}</NuxtLink>
      <NuxtLink :to="`/groups/${groupId}/expenses`" class="section-tab">{{ t('expenses.title') }}</NuxtLink>
      <NuxtLink :to="`/groups/${groupId}/settings`" class="section-tab" aria-current="page">{{ t('settings.title') }}</NuxtLink>
    </nav>

    <div class="page-content" style="max-width:640px;">
      <h1 style="font-size:18px;font-weight:700;margin:0 0 24px;">{{ t('settings.title') }}</h1>

      <!-- Group info -->
      <section class="card page-section" :aria-labelledby="infoTitleId">
        <div class="card-header">
          <h2 :id="infoTitleId" style="margin:0;font-size:15px;font-weight:600;">{{ t('settings.groupInfo.title') }}</h2>
        </div>
        <div class="card-body">
          <form novalidate @submit.prevent="saveGroupInfo">
            <div class="form-field" style="margin-bottom:14px;">
              <label for="settings-name" class="form-label">{{ t('groups.new.nameLabel') }}</label>
              <input id="settings-name" v-model="groupForm.name" type="text" class="form-input" :class="{ error: groupErrors.name }" autocomplete="off" :disabled="!isAdmin" />
              <span v-if="groupErrors.name" class="form-error" role="alert">{{ groupErrors.name }}</span>
            </div>
            <div class="form-field" style="margin-bottom:14px;">
              <label for="settings-desc" class="form-label">
                {{ t('groups.new.descriptionLabel') }}
                <span style="color:var(--color-text-muted);font-weight:400;"> ({{ t('common.optional') }})</span>
              </label>
              <input id="settings-desc" v-model="groupForm.description" type="text" class="form-input" autocomplete="off" :disabled="!isAdmin" />
            </div>
            <div class="form-field" style="margin-bottom:16px;" role="group" :aria-labelledby="colorLabelId">
              <span :id="colorLabelId" class="form-label">{{ t('groups.new.colorLabel') }}</span>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
                <button v-for="color in GROUP_COLORS" :key="color" type="button" class="color-swatch" :class="[`color-${color}`, { selected: groupForm.color === color }]" :aria-label="color" :aria-pressed="groupForm.color === color" :disabled="!isAdmin" @click="groupForm.color = color"></button>
              </div>
            </div>
            <div v-if="isAdmin" style="display:flex;align-items:center;gap:10px;">
              <button type="submit" class="btn btn-primary btn-md" :disabled="savingGroup">
                {{ savingGroup ? t('common.loading') : t('settings.groupInfo.save') }}
              </button>
              <span v-if="savedGroup" style="font-size:13px;color:var(--color-positive);">✓ {{ t('settings.groupInfo.saved') }}</span>
            </div>
          </form>
        </div>
      </section>

      <!-- Members -->
      <section class="card page-section" :aria-labelledby="membersTitleId">
        <div class="card-header">
          <h2 :id="membersTitleId" style="margin:0;font-size:15px;font-weight:600;">{{ t('members.title') }}</h2>
        </div>
        <div class="card-body">
          <ul v-if="members.length" role="list" style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0;">
            <li v-for="m in members" :key="m.id" style="padding:10px 0;border-bottom:1px solid var(--color-border);">
              <div style="display:flex;align-items:center;gap:10px;">
                <AppAvatar :name="m.name" :color="m.color" size="sm" :aria-hidden="true" />
                <span style="flex:1;font-size:14px;">{{ m.name }}</span>
                <select
                  v-if="isAdmin && currentMember?.id !== m.id"
                  :value="m.role"
                  class="form-input"
                  style="width:110px;height:32px;padding:4px 8px;font-size:13px;"
                  :aria-label="t('roles.changeRole')"
                  @change="handleRoleChange(m.id, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="admin">{{ t('roles.admin') }}</option>
                  <option value="user">{{ t('roles.user') }}</option>
                  <option value="watcher">{{ t('roles.watcher') }}</option>
                </select>
                <span v-else class="role-badge" :class="`role-badge-${m.role}`">{{ t(`roles.${m.role}`) }}</span>
                <button v-if="isAdmin && currentMember?.id !== m.id" class="btn btn-ghost btn-icon" :aria-label="`${t('members.remove')} ${m.name}`" @click="handleRemoveMember(m.id, m.name)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
              <div style="display:flex;gap:4px;padding-left:38px;margin-top:6px;" role="group" :aria-label="t('members.colorLabel') + ' ' + m.name">
                <button v-for="c in MEMBER_COLORS" :key="c" type="button" class="member-color-swatch" :class="[`color-${c}`, { selected: m.color === c }]" :aria-label="c" :aria-pressed="m.color === c" @click="handleMemberColorChange(m.id, m.name, c)"></button>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <!-- Invite section (admin only) -->
      <SettingsInviteSection v-if="isAdmin" :group-id="groupId" />

      <!-- Leave group -->
      <section class="card page-section" :aria-labelledby="leaveTitleId">
        <div class="card-header">
          <h2 :id="leaveTitleId" style="margin:0;font-size:15px;font-weight:600;">{{ t('settings.leaveGroup') }}</h2>
        </div>
        <div class="card-body" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
          <div>
            <div style="font-size:14px;font-weight:500;">{{ t('settings.leaveGroup') }}</div>
            <div style="font-size:13px;color:var(--color-text-secondary);">{{ t('settings.leaveGroupDesc') }}</div>
            <div v-if="leaveError" style="font-size:13px;color:var(--color-negative);margin-top:4px;" role="alert">{{ leaveError }}</div>
          </div>
          <button class="btn btn-secondary btn-md" :disabled="leavingGroup" @click="handleLeaveGroup">
            {{ leavingGroup ? t('common.loading') : t('settings.leaveGroup') }}
          </button>
        </div>
      </section>

      <!-- Danger zone (admin only) -->
      <section v-if="isAdmin" class="card" style="border-color:#fecaca;" :aria-labelledby="dangerTitleId">
        <div class="card-header" style="color:var(--color-negative);">
          <h2 :id="dangerTitleId" style="margin:0;font-size:15px;font-weight:600;">{{ t('settings.dangerZone.title') }}</h2>
        </div>
        <div class="card-body" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
          <div>
            <div style="font-size:14px;font-weight:500;">{{ t('settings.dangerZone.deleteGroup') }}</div>
            <div style="font-size:13px;color:var(--color-text-secondary);">{{ t('settings.dangerZone.deleteDescription') }}</div>
          </div>
          <button class="btn btn-danger btn-md" :disabled="deletingGroup" @click="handleDeleteGroup">
            {{ deletingGroup ? t('common.loading') : t('settings.dangerZone.deleteGroup') }}
          </button>
        </div>
      </section>
    </div>

    <NewGroupModal :open="showNewGroup" @close="showNewGroup = false" @created="handleGroupCreated" />
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import { useGroupsStore } from '~/stores/groups'
import { useMembers } from '~/composables/useMembers'
import { GROUP_COLORS, MEMBER_COLORS } from '#types/app'

definePageMeta({ layout: 'default' })

const { t } = useI18n()
const router = useRouter()
const store = useGroupsStore()
const authStore = useAuthStore()
const apiFetch = useApi()

const groupId = computed(() => useRoute().params.id as string)
const infoTitleId    = useId()
const membersTitleId = useId()
const dangerTitleId  = useId()
const colorLabelId   = useId()
const leaveTitleId   = useId()

const showNewGroup  = ref(false)
const savingGroup   = ref(false)
const savedGroup    = ref(false)
const deletingGroup = ref(false)
const leavingGroup  = ref(false)
const leaveError    = ref('')
const groupErrors   = reactive({ name: '' })

const { data: groupData } = await useAsyncData(`settings-${groupId.value}`, () =>
  apiFetch<{ id: string; name: string; description: string | null; color: string }>(`/api/groups/${groupId.value}`),
)

const groupForm = reactive({
  name:        groupData.value?.name ?? '',
  description: groupData.value?.description ?? '',
  color:       groupData.value?.color ?? 'indigo',
})

const membersComp = useMembers(groupId)
await membersComp.fetchMembers()
const members = membersComp.members

const currentMember = computed(() => members.value.find(m => m.user_id === authStore.user?.id) ?? null)
const isAdmin       = computed(() => currentMember.value?.role === 'admin')

onMounted(() => { store.fetchGroups(); store.setActiveGroup(groupId.value) })

async function saveGroupInfo() {
  groupErrors.name = ''
  if (!groupForm.name.trim()) { groupErrors.name = t('groups.new.nameRequired'); return }
  savingGroup.value = true
  try {
    await apiFetch(`/api/groups/${groupId.value}`, { method: 'PUT', body: { name: groupForm.name.trim(), description: groupForm.description.trim(), color: groupForm.color } })
    await store.fetchGroups()
    savedGroup.value = true
    setTimeout(() => { savedGroup.value = false }, 3000)
  }
  finally { savingGroup.value = false }
}

async function handleMemberColorChange(memberId: string, name: string, color: string) {
  await membersComp.updateMember(memberId, { name, color })
}

async function handleRoleChange(memberId: string, role: string) {
  await membersComp.updateMember(memberId, { role })
}

async function handleRemoveMember(memberId: string, name: string) {
  if (!confirm(t('members.removeConfirm', { name }))) return
  await membersComp.removeMember(memberId)
}

async function handleLeaveGroup() {
  leaveError.value = ''
  leavingGroup.value = true
  try {
    await apiFetch(`/api/groups/${groupId.value}/leave`, { method: 'POST' })
    await store.fetchGroups()
    await router.push('/')
  }
  catch (e) {
    leaveError.value = (e as { data?: { message?: string } }).data?.message ?? (e as Error).message
  }
  finally { leavingGroup.value = false }
}

async function handleDeleteGroup() {
  const group = store.groups.find(g => g.id === groupId.value)
  if (!confirm(t('groups.deleteConfirm', { name: group?.name ?? '' }))) return
  deletingGroup.value = true
  try {
    await store.deleteGroup(groupId.value)
    await router.push('/')
  }
  finally { deletingGroup.value = false }
}

async function navigateToGroup(id: string) {
  store.setActiveGroup(id)
  await router.push(`/groups/${id}`)
}

async function handleGroupCreated(id: string) {
  await store.fetchGroups()
  await router.push(`/groups/${id}`)
}
</script>
