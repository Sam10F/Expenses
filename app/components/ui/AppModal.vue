<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="modal-backdrop"
        role="presentation"
        @click.self="handleClose"
        @keydown.esc="handleClose"
      >
        <div
          :id="dialogId"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          class="modal"
          @keydown.esc="handleClose"
        >
          <div class="modal-header">
            <h2 :id="titleId" class="modal-title">{{ title }}</h2>
            <button
              class="modal-close"
              :aria-label="t('common.close')"
              @click="handleClose"
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <slot ></slot>
          </div>

          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" ></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useId } from 'vue'

const props = defineProps<{
  open:  boolean
  title: string
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

const dialogId = useId()
const titleId  = useId()

function handleClose() {
  emit('close')
}

// Trap focus and handle Escape when modal opens
watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    const el = document.getElementById(dialogId)
    const firstFocusable = el?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    firstFocusable?.focus()
  }
})
</script>

<style>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 200ms ease;
}
.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: transform 200ms ease, opacity 200ms ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: scale(0.96);
  opacity: 0;
}
</style>
