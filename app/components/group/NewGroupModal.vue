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
      <div class="form-field" role="group" :aria-labelledby="colorLabelId">
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
const colorLabelId = useId()
const apiFetch = useApi()

const form = reactive({
  name:        '',
  description: '',
  color:       'indigo' as string,
})

const errors = reactive({
  name: '',
})

const saving = ref(false)

function validate(): boolean {
  errors.name = ''
  if (!form.name.trim()) {
    errors.name = t('groups.new.nameRequired')
    return false
  }
  return true
}

async function handleSubmit() {
  if (!validate()) return

  saving.value = true
  try {
    const data = await apiFetch<{ id: string }>('/api/groups', {
      method: 'POST',
      body: {
        name:        form.name.trim(),
        description: form.description.trim(),
        color:       form.color,
      },
    })
    emit('created', data.id)
    emit('close')
    Object.assign(form, { name: '', description: '', color: 'indigo' })
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
