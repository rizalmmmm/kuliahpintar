// Konfigurasi utama Nuxt 3 untuk KuliahPintar.id
export default defineNuxtConfig({
  compatibilityDate: '2026-09-10',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase', '@pinia/nuxt', '@nuxtjs/color-mode'],

  // @ts-expect-error — @nuxtjs/supabase belum augment NuxtConfig
  supabase: {
    url: process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || '',
    key: process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || '',
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: [
        '/',
        '/login',
        '/daftar',
        '/confirm',
        '/harga',
        '/pembayaran/selesai',
        '/privasi',
        '/ketentuan',
        // Alat publik tanpa login (untuk pengunjung dari Google)
        '/alat/kalkulator-ipk',
        '/alat/daftar-pustaka',
      ],
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
      // URL publik situs — dipakai untuk canonical, og:url, sitemap, dan structured data
      siteUrl: 'https://kuliahpintar.id',
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
          content:
            'Teman belajar mahasiswa Indonesia: rangkum materi, latihan soal, jadwal & pengingat tugas, kalkulator IPK, dan generator daftar pustaka. Gratis untuk mulai.',
        },
        { name: 'theme-color', content: '#2563eb' },
        // Open Graph & Twitter — tampilan saat link dibagikan di WhatsApp, X, Facebook, LinkedIn
        { property: 'og:site_name', content: 'KuliahPintar.id' },
        { property: 'og:type', content: 'website' },
        { property: 'og:locale', content: 'id_ID' },
        { property: 'og:image', content: 'https://kuliahpintar.id/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: 'https://kuliahpintar.id/og-image.png' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },
})
