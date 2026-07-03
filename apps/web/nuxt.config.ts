// Konfigurasi utama Nuxt 3 untuk KuliahPintar.id
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase', '@pinia/nuxt', '@nuxtjs/color-mode'],

  // @ts-expect-error — @nuxtjs/supabase belum augment NuxtConfig
  supabase: {
    url: process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || '',
    key: process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || '',
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/login', '/daftar', '/confirm', '/harga', '/pembayaran/selesai'],
    },
  },

  colorMode: {
    classSuffix: '', // pakai .dark bukan .dark-mode (sesuai Tailwind)
    preference: 'system',
    fallback: 'light',
    storageKey: 'kuliahpintar-color-mode',
  },

  runtimeConfig: {
    // Server-side only (tidak terekspos ke client)
    supabaseServiceRoleKey: '',
    geminiApiKey: '',
    geminiModel: 'gemini-2.0-flash',
    midtransServerKey: '',
    resendApiKey: '',
    resendFromEmail: 'noreply@kuliahpintar.id',
    jwtSecret: '',

    // Public (aman untuk client-side)
    public: {
      supabaseUrl: '',
      supabaseAnonKey: '',
      apiUrl: 'http://localhost:3001',
      midtransClientKey: '',
      appName: 'KuliahPintar.id',
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      titleTemplate: '%s — KuliahPintar.id',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Tools AI untuk mahasiswa Indonesia. Belajar lebih cerdas, bukan lebih keras.',
        },
      ],
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    },
  },
})
