<template>
  <div>
    <h1 class="auth-title">{{ t('auth.login') }}</h1>

    <form class="auth-form" novalidate @submit.prevent="handleSubmit">
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
          :aria-describedby="errors.username ? 'username-error' : undefined"
          :aria-invalid="!!errors.username"
          required
        />
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
          autocomplete="current-password"
          :placeholder="t('auth.password')"
          :aria-describedby="errors.password ? 'password-error' : undefined"
          :aria-invalid="!!errors.password"
          required
        />
        <p v-if="errors.password" id="password-error" class="form-error" role="alert">
          <span aria-hidden="true">⚠ </span>{{ errors.password }}
        </p>
      </div>

      <div class="form-field form-checkbox-row">
        <input
          id="remember"
          v-model="remember"
          type="checkbox"
          class="form-checkbox"
        />
        <label for="remember" class="form-label-inline">{{ t('auth.rememberMe') }}</label>
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
        {{ loading ? t('common.loading') : t('auth.login') }}
      </button>
    </form>

    <p class="auth-link-row">
      {{ t('auth.noAccount') }}
      <NuxtLink to="/auth/signup" class="auth-link">{{ t('auth.signup') }}</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()

const username    = ref('')
const password    = ref('')
const remember    = ref(true)
const loading     = ref(false)
const serverError = ref('')
const errors      = reactive({ username: '', password: '' })

function validate(): boolean {
  errors.username = ''
  errors.password = ''
  let valid = true

  if (!username.value.trim()) {
    errors.username = t('auth.usernameRequired')
    valid = false
  }
  if (!password.value) {
    errors.password = t('auth.passwordRequired')
    valid = false
  }

  return valid
}

async function handleSubmit() {
  serverError.value = ''
  if (!validate()) return

  loading.value = true
  try {
    await authStore.signIn(username.value.trim(), password.value, remember.value)
    await router.push('/')
  }
  catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message ?? ''
    serverError.value = msg === 'auth.invalidCredentials'
      ? t('auth.invalidCredentials')
      : t('auth.invalidCredentials')
  }
  finally {
    loading.value = false
  }
}
</script>
