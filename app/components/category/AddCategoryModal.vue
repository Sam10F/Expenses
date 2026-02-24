<template>
  <AppModal
    :open="open"
    :title="t('categories.add.title')"
    @close="emit('close')"
  >
    <form id="add-category-form" novalidate @submit.prevent="handleSubmit">
      <!-- Name -->
      <div class="form-field" style="margin-bottom:16px;">
        <label for="cat-name" class="form-label">
          {{ t('categories.add.nameLabel') }}
          <span aria-hidden="true" style="color:var(--color-negative)">*</span>
        </label>
        <input
          id="cat-name"
          v-model="form.name"
          type="text"
          class="form-input"
          :class="{ error: errors.name }"
          :placeholder="t('categories.add.namePlaceholder')"
          autocomplete="off"
          required
          :aria-describedby="errors.name ? 'cat-name-error' : undefined"
        />
        <span v-if="errors.name" id="cat-name-error" class="form-error" role="alert">
          {{ errors.name }}
        </span>
      </div>

      <!-- Color -->
      <div class="form-field" style="margin-bottom:16px;" role="group" :aria-labelledby="colorLabelId">
        <span :id="colorLabelId" class="form-label">{{ t('categories.add.colorLabel') }}</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
          <button
            v-for="color in CATEGORY_COLORS"
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

      <!-- Icon -->
      <div class="form-field" role="group" :aria-labelledby="iconLabelId">
        <span :id="iconLabelId" class="form-label">{{ t('categories.add.iconLabel') }}</span>
        <div class="icon-grid" style="margin-top:4px;">
          <button
            v-for="icon in CATEGORY_ICONS"
            :key="icon"
            type="button"
            class="icon-btn"
            :class="{ selected: form.icon === icon }"
            :aria-label="t(`categories.icons.${icon}`)"
            :aria-pressed="form.icon === icon"
            :title="t(`categories.icons.${icon}`)"
            @click="form.icon = icon"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path :d="iconPath(icon)" />
            </svg>
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
        form="add-category-form"
        class="btn btn-primary btn-md"
        :disabled="saving"
      >
        {{ saving ? t('common.loading') : t('categories.add.submit') }}
      </button>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '#types/app'
import { CATEGORY_ICON_PATHS } from '~/utils/categoryIcons'
import type { Category } from '#types/app'

const props = defineProps<{
  open:    boolean
  groupId: string
}>()

const emit = defineEmits<{
  close:   []
  created: [category: Category]
}>()

const { t } = useI18n()
const colorLabelId = useId()
const iconLabelId  = useId()
const apiFetch = useApi()

const form = reactive({
  name:  '',
  color: 'indigo' as string,
  icon:  'general' as string,
})

const errors = reactive({ name: '' })
const saving = ref(false)

function iconPath(icon: string): string {
  return CATEGORY_ICON_PATHS[icon] ?? CATEGORY_ICON_PATHS['general'] ?? ''
}

function validate(): boolean {
  errors.name = ''
  if (!form.name.trim()) {
    errors.name = t('categories.add.nameRequired')
    return false
  }
  return true
}

async function handleSubmit() {
  if (!validate()) return
  saving.value = true
  try {
    const data = await apiFetch<Category>(`/api/groups/${props.groupId}/categories`, {
      method: 'POST',
      body: { name: form.name.trim(), color: form.color, icon: form.icon },
    })
    emit('created', data)
    emit('close')
    Object.assign(form, { name: '', color: 'indigo', icon: 'general' })
  }
  finally {
    saving.value = false
  }
}
</script>

<style>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 120ms ease;
}
.icon-btn:hover { background: var(--color-surface-hover); color: var(--color-text); }
.icon-btn.selected {
  background: var(--color-primary-subtle);
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.icon-btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
</style>
