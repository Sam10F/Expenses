<template>
  <div>
    <h1 class="auth-title">{{ t('auth.signup') }}</h1>

    <div v-if="success" class="auth-success" role="status">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {{ t('auth.signupSuccess') }}
      <NuxtLink to="/auth/login" class="auth-link">{{ t('auth.login') }}</NuxtLink>
    </div>

    <form v-else class="auth-form" novalidate @submit.prevent="handleSubmit">
      <div class="form-field">
        <label for="username" class="form-label">{{ t('auth.username') }}</label>
        <input
          id="username"
          v-model="username"
          type="text"
          class="form-input"
          :class="{ 'form-input-error': errors.username }"
          autocomplete="username"
          autocapitalize="none"
          spellcheck="false"
          :placeholder="t('auth.username')"
          :aria-describedby="errors.username ? 'username-error' : 'username-hint'"
          :aria-invalid="!!errors.username"
          required
        />
        <p id="username-hint" class="form-hint">{{ t('auth.usernameRules') }}</p>
        <p v-if="errors.username" id="username-error" class="form-error" role="alert">
          <span aria-hidden="true">⚠ </span>{{ errors.username }}
        </p>
      </div>

      <div class="form-field">
        <label for="password" class="form-label">{{ t('auth.password') }}</label>
        <input
          id="password"
          v-model="password"
          type="password"
          class="form-input"
          :class="{ 'form-input-error': errors.password }"
          autocomplete="new-password"
          :placeholder="t('auth.password')"
          :aria-describedby="errors.password ? 'password-error' : 'password-hint'"
          :aria-invalid="!!errors.password"
          required
        />
        <p id="password-hint" class="form-hint">{{ t('auth.passwordRules') }}</p>

        <!-- Inline strength indicators -->
        <ul role="list" class="password-checks" :aria-label="t('auth.passwordRequirements')">
          <li :class="{ 'check-pass': hasLower }">
            <span aria-hidden="true">{{ hasLower ? '✓' : '○' }}</span>
            {{ t('auth.passwordHasLower') }}
          </li>
          <li :class="{ 'check-pass': hasUpper }">
            <span aria-hidden="true">{{ hasUpper ? '✓' : '○' }}</span>
            {{ t('auth.passwordHasUpper') }}
          </li>
          <li :class="{ 'check-pass': hasNumber }">
            <span aria-hidden="true">{{ hasNumber ? '✓' : '○' }}</span>
            {{ t('auth.passwordHasNumber') }}
          </li>
          <li :class="{ 'check-pass': hasSpecial }">
            <span aria-hidden="true">{{ hasSpecial ? '✓' : '○' }}</span>
            {{ t('auth.passwordHasSpecial') }}
          </li>
          <li :class="{ 'check-pass': hasLength }">
            <span aria-hidden="true">{{ hasLength ? '✓' : '○' }}</span>
            {{ t('auth.passwordHasLength') }}
          </li>
        </ul>

        <p v-if="errors.password" id="password-error" class="form-error" role="alert">
          <span aria-hidden="true">⚠ </span>{{ errors.password }}
        </p>
      </div>

      <div class="form-field">
        <label for="confirmPassword" class="form-label">{{ t('auth.confirmPassword') }}</label>
        <input
          id="confirmPassword"
          v-model="confirmPassword"
          type="password"
          class="form-input"
          :class="{ 'form-input-error': errors.confirmPassword }"
          autocomplete="new-password"
          :placeholder="t('auth.confirmPassword')"
          :aria-describedby="errors.confirmPassword ? 'confirm-error' : undefined"
          :aria-invalid="!!errors.confirmPassword"
          required
        />
        <p v-if="errors.confirmPassword" id="confirm-error" class="form-error" role="alert">
          <span aria-hidden="true">⚠ </span>{{ errors.confirmPassword }}
        </p>
      </div>

      <p v-if="serverError" class="form-error form-error-global" role="alert">
        <span aria-hidden="true">⚠ </span>{{ serverError }}
      </p>

      <button
        type="submit"
        class="btn btn-primary btn-md auth-submit"
        :disabled="loading"
        :aria-busy="loading"
      >
        <svg v-if="loading" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" class="spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        {{ loading ? t('common.loading') : t('auth.signup') }}
      </button>
    </form>

    <p v-if="!success" class="auth-link-row">
      {{ t('auth.hasAccount') }}
      <NuxtLink to="/auth/login" class="auth-link">{{ t('auth.login') }}</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { t } = useI18n()
const authStore = useAuthStore()

const username       = ref('')
const password       = ref('')
const confirmPassword = ref('')
const loading        = ref(false)
const success        = ref(false)
const serverError    = ref('')
const errors         = reactive({ username: '', password: '', confirmPassword: '' })

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^]).{8,}$/

const hasLower   = computed(() => /[a-z]/.test(password.value))
const hasUpper   = computed(() => /[A-Z]/.test(password.value))
const hasNumber  = computed(() => /\d/.test(password.value))
const hasSpecial = computed(() => /[@$!%*?&#^]/.test(password.value))
const hasLength  = computed(() => password.value.length >= 8)

function validate(): boolean {
  errors.username = ''
  errors.password = ''
  errors.confirmPassword = ''
  let valid = true

  if (!USERNAME_RE.test(username.value)) {
    errors.username = t('auth.usernameInvalid')
    valid = false
  }
  if (!PASSWORD_RE.test(password.value)) {
    errors.password = t('auth.passwordWeak')
    valid = false
  }
  if (password.value !== confirmPassword.value) {
    errors.confirmPassword = t('auth.passwordMismatch')
    valid = false
  }

  return valid
}

async function handleSubmit() {
  serverError.value = ''
  if (!validate()) return

  loading.value = true
  try {
    await authStore.signUp(username.value, password.value)
    success.value = true
  }
  catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message ?? ''
    serverError.value = msg === 'auth.usernameTaken'
      ? t('auth.usernameTaken')
      : t('common.error')
  }
  finally {
    loading.value = false
  }
}
</script>
