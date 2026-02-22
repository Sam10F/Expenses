// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'vue/html-self-closing': ['error', {
      html: { void: 'always', normal: 'never', component: 'always' },
    }],
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],
    'vue/define-macros-order': ['error', {
      order: ['defineProps', 'defineEmits', 'defineExpose'],
    }],
  },
})
