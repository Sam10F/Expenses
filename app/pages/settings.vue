<template>
  <div class="page-content" style="max-width:600px;">
    <h1 style="font-size:18px;font-weight:700;margin:0 0 24px;">{{ t('userSettings.title') }}</h1>

    <!-- Default Group -->
    <section class="card page-section" :aria-labelledby="defaultGroupTitleId">
      <div class="card-header">
        <h2 :id="defaultGroupTitleId" style="margin:0;font-size:15px;font-weight:600;">{{ t('userSettings.defaultGroup.title') }}</h2>
      </div>
      <div class="card-body">
        <p style="font-size:13px;color:var(--color-text-secondary);margin:0 0 14px;">
          {{ t('userSettings.defaultGroup.description') }}
        </p>
        <div class="form-field">
          <label for="default-group-select" class="form-label">{{ t('userSettings.defaultGroup.title') }}</label>
          <select
            id="default-group-select"
            v-model="selectedDefaultGroupId"
            class="form-input"
            style="max-width:320px;"
            @change="saveDefaultGroup"
          >
            <option value="">{{ t('userSettings.defaultGroup.none') }}</option>
            <option v-for="group in groups" :key="group.id" :value="group.id">
              {{ group.name }}
            </option>
          </select>
        </div>
        <p v-if="savedDefaultGroup" style="font-size:13px;color:var(--color-positive);margin-top:8px;">
          ✓ {{ t('userSettings.defaultGroup.saved') }}
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import { useGroupsStore } from '~/stores/groups'

definePageMeta({ layout: 'default' })

const { t } = useI18n()
const store = useGroupsStore()
const defaultGroupTitleId = useId()

const groups = computed(() => store.groups)
const savedDefaultGroup = ref(false)

const DEFAULT_GROUP_KEY = 'user_default_group_id'

const selectedDefaultGroupId = ref('')

onMounted(async () => {
  await store.fetchGroups()
  const stored = localStorage.getItem(DEFAULT_GROUP_KEY) ?? ''
  // Only use stored value if that group still exists
  if (stored && store.groups.find(g => g.id === stored)) {
    selectedDefaultGroupId.value = stored
  }
})

function saveDefaultGroup() {
  if (selectedDefaultGroupId.value) {
    localStorage.setItem(DEFAULT_GROUP_KEY, selectedDefaultGroupId.value)
  }
  else {
    localStorage.removeItem(DEFAULT_GROUP_KEY)
  }
  savedDefaultGroup.value = true
  setTimeout(() => { savedDefaultGroup.value = false }, 3000)
}
</script>
