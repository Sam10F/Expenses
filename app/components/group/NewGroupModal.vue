<template>
  <AppModal
    :open="open"
    :title="t('groups.new.title')"
    @close="emit('close')"
  >
    <form
      id="new-group-form"
      novalidate
      @submit.prevent="handleSubmit"
    >
      <!-- Name -->
      <div class="form-field" style="margin-bottom:16px;">
        <label for="group-name" class="form-label">
          {{ t('groups.new.nameLabel') }}
          <span aria-hidden="true" style="color:var(--color-negative)">*</span>
        </label>
        <input
          id="group-name"
          v-model="form.name"
          type="text"
          class="form-input"
          :class="{ error: errors.name }"
          :placeholder="t('groups.new.namePlaceholder')"
          autocomplete="off"
          required
          aria-required="true"
          :aria-describedby="errors.name ? 'group-name-error' : undefined"
        />
        <span
          v-if="errors.name"
          id="group-name-error"
          class="form-error"
          role="alert"
        >
          {{ errors.name }}
        </span>
      </div>

      <!-- Description -->
      <div class="form-field" style="margin-bottom:16px;">
        <label for="group-desc" class="form-label">
          {{ t('groups.new.descriptionLabel') }}
          <span style="color:var(--color-text-muted); font-weight:400;"> ({{ t('common.optional') }})</span>
        </label>
        <input
          id="group-desc"
          v-model="form.description"
          type="text"
          class="form-input"
          :placeholder="t('groups.new.descriptionPlaceholder')"
          autocomplete="off"
        />
      </div>

      <!-- Color -->
      <div class="form-field" style="margin-bottom:16px;" role="group" :aria-labelledby="colorLabelId">
        <span :id="colorLabelId" class="form-label">{{ t('groups.new.colorLabel') }}</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
          <button
            v-for="color in GROUP_COLORS"
            :key="color"
            type="button"
            class="color-swatch"
            :class="[`color-${color}`, { selected: form.color === color }]"
            :aria-label="color"
            :aria-pressed="form.color === color"
            @click="form.color = color"
          ></button>
        </div>
      </div>

      <!-- Members -->
      <div class="form-field" role="group" :aria-labelledby="membersLabelId">
        <span :id="membersLabelId" class="form-label">{{ t('groups.new.membersLabel') }}</span>
        <p class="form-hint">{{ t('groups.new.membersHint') }}</p>

        <ul
          v-if="form.members.length"
          role="list"
          style="list-style:none;padding:0;margin:8px 0;display:flex;flex-direction:column;gap:6px;"
        >
          <li
            v-for="(member, i) in form.members"
            :key="i"
            style="display:flex;align-items:center;gap:8px;"
          >
            <AppAvatar :name="member" size="sm" aria-hidden="true" />
            <span style="flex:1;font-size:14px;">{{ member }}</span>
            <button
              type="button"
              class="btn btn-ghost btn-icon"
              :aria-label="t('members.remove') + ' ' + member"
              @click="removeMember(i)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </li>
        </ul>

        <span
          v-if="errors.members"
          class="form-error"
          role="alert"
          style="margin-bottom:8px;"
        >
          {{ errors.members }}
        </span>

        <div style="display:flex;gap:8px;margin-top:8px;">
          <div style="flex:1;">
            <label :for="memberInputId" class="sr-only">{{ t('groups.new.membersLabel') }}</label>
            <input
              :id="memberInputId"
              v-model="newMemberName"
              type="text"
              class="form-input"
              :placeholder="t('groups.new.memberNamePlaceholder')"
              autocomplete="off"
              @keydown.enter.prevent="addMember"
            />
          </div>
          <button
            type="button"
            class="btn btn-secondary btn-md"
            :disabled="!newMemberName.trim()"
            @click="addMember"
          >
            {{ t('common.add') }}
          </button>
        </div>
      </div>
    </form>

    <template #footer>
      <button type="button" class="btn btn-secondary btn-md" @click="emit('close')">
        {{ t('common.cancel') }}
      </button>
      <button
        type="submit"
        form="new-group-form"
        class="btn btn-primary btn-md"
        :disabled="saving"
      >
        {{ saving ? t('common.loading') : t('groups.new.submit') }}
      </button>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import { GROUP_COLORS } from '#types/app'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close:   []
  created: [groupId: string]
}>()

const { t } = useI18n()
const colorLabelId   = useId()
const membersLabelId = useId()
const memberInputId  = useId()

const form = reactive({
  name:        '',
  description: '',
  color:       'indigo' as string,
  members:     [] as string[],
})

const errors = reactive({
  name:    '',
  members: '',
})

const newMemberName = ref('')
const saving = ref(false)

function addMember() {
  const name = newMemberName.value.trim()
  if (!name) return
  if (form.members.length >= 10) return
  form.members.push(name)
  newMemberName.value = ''
}

function removeMember(index: number) {
  form.members.splice(index, 1)
}

function validate(): boolean {
  errors.name    = ''
  errors.members = ''

  let valid = true
  if (!form.name.trim()) {
    errors.name = t('groups.new.nameRequired')
    valid = false
  }
  if (!form.members.length) {
    errors.members = t('groups.new.memberRequired')
    valid = false
  }
  return valid
}

async function handleSubmit() {
  if (!validate()) return

  saving.value = true
  try {
    const data = await $fetch<{ id: string }>('/api/groups', {
      method: 'POST',
      body: {
        name:        form.name.trim(),
        description: form.description.trim(),
        color:       form.color,
        members:     form.members,
      },
    })
    emit('created', data.id)
    emit('close')
    // Reset form
    Object.assign(form, { name: '', description: '', color: 'indigo', members: [] })
  }
  finally {
    saving.value = false
  }
}
</script>

<style>
.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 9999px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 120ms ease, border-color 120ms ease;
}
.color-swatch:hover { transform: scale(1.1); }
.color-swatch.selected { border-color: var(--color-text); }
.color-swatch:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
</style>
