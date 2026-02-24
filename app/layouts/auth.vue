<template>
  <div class="auth-shell">
    <div class="auth-card" role="main">
      <div class="auth-header">
        <span class="topbar-logo" aria-hidden="true">Expenses</span>
      </div>
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.auth-shell {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: var(--color-surface-card);
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-elevated);
  padding: 32px;
}

.auth-header {
  text-align: center;
  margin-bottom: 28px;
}

.topbar-logo {
  font-size: 22px;
}
</style>
