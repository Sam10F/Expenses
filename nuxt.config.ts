import Aura from '@primevue/themes/aura'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },

  modules: [
    '@pinia/nuxt',
    '@primevue/nuxt-module',
    '@nuxtjs/i18n',
    '@nuxt/eslint',
  ],

  vite: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: [tailwindcss() as any],
  },

  css: ['~/assets/css/main.css'],

  // Path alias so both app/ and server/ code can import types via '#types/...'
  alias: {
    '#types': fileURLToPath(new URL('./types', import.meta.url)),
  },

  nitro: {
    alias: {
      '#types': fileURLToPath(new URL('./types', import.meta.url)),
    },
  },

  primevue: {
    options: {
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.dark',
          cssLayer: false,
        },
      },
    },
  },

  i18n: {
    // langDir and vueI18n are relative to ${rootDir}/i18n/ (the restructureDir default)
    langDir: 'locales',
    defaultLocale: 'en',
    strategy: 'no_prefix',
    lazy: true,
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'es', name: 'Español', file: 'es.json' },
    ],
    detectBrowserLanguage: false,
    bundle: {
      optimizeTranslationDirective: false,
    },
  },

  components: {
    dirs: [{ path: '~/components', pathPrefix: false }],
  },

  runtimeConfig: {
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    public: {
      supabaseUrl: process.env.SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  devtools: { enabled: true },
})
