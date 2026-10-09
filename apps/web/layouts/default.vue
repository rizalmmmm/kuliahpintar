<script setup lang="ts">
  // Layout utama dengan navbar dan footer
  import { MANUAL_PAYMENT_ACCOUNT } from '@kuliahpintar/shared'

  const user = useSupabaseUser()
  const supabase = useSupabaseClient()

  async function keluar() {
    await supabase.auth.signOut()
    await navigateTo('/')
  }
  const footerKolom = [
    {
      judul: 'Alat gratis tanpa login',
      link: [
        { to: '/alat/kalkulator-ipk', label: 'Kalkulator IPK' },
        { to: '/alat/daftar-pustaka', label: 'Generator Daftar Pustaka' },
      ],
    },
    {
      judul: 'Jelajahi',
      link: [
        { to: '/#fitur', label: 'Semua fitur' },
        { to: '/harga', label: 'Harga' },
        { to: '/ulasan', label: 'Ulasan pengguna' },
      ],
    },
    {
      judul: 'Legal',
      link: [
        { to: '/privasi', label: 'Kebijakan Privasi' },
        { to: '/ketentuan', label: 'Ketentuan Layanan' },
      ],
    },
  ]

  // Hanya untuk menampilkan menu; akses sebenarnya dicek server (requireAdmin)
  const adminPhone = computed(
    () => user.value?.phone?.replace(/\D/g, '') === MANUAL_PAYMENT_ACCOUNT.whatsappIntl
  )
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header
      class="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90"
    >
      <div class="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
        <NuxtLink to="/" class="text-lg font-bold text-primary-600 sm:text-xl">
          KuliahPintar<span class="text-gray-900 dark:text-white">.id</span>
        </NuxtLink>

        <nav class="flex items-center gap-3 sm:gap-6" aria-label="Navigasi utama">
          <NuxtLink
            to="/#fitur"
            class="hidden text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white sm:inline"
          >
            Fitur
          </NuxtLink>
          <NuxtLink
            to="/harga"
            class="hidden text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white sm:inline"
          >
            Harga
          </NuxtLink>
          <NuxtLink
            to="/ulasan"
            class="hidden text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white sm:inline"
          >
            Ulasan
          </NuxtLink>
          <template v-if="user">
            <NuxtLink
              v-if="adminPhone"
              to="/admin"
              class="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Admin
            </NuxtLink>
            <NuxtLink to="/dashboard" class="btn-primary whitespace-nowrap">Dashboard</NuxtLink>
            <button
              type="button"
              class="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              @click="keluar"
            >
              Keluar
            </button>
          </template>
          <template v-else>
            <NuxtLink
              to="/login"
              class="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Masuk
            </NuxtLink>
            <NuxtLink to="/daftar" class="btn-primary whitespace-nowrap">Daftar Gratis</NuxtLink>
          </template>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-gray-200 py-10 dark:border-gray-800">
      <div class="container mx-auto px-4">
        <div class="grid gap-8 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <NuxtLink to="/" class="text-lg font-bold text-primary-600">
              KuliahPintar<span class="text-gray-900 dark:text-white">.id</span>
            </NuxtLink>
            <p class="mt-2 text-gray-500">Teman belajar & alat kuliah untuk mahasiswa Indonesia.</p>
          </div>
          <nav v-for="kolom in footerKolom" :key="kolom.judul" :aria-label="kolom.judul">
            <p class="font-semibold text-gray-900 dark:text-white">{{ kolom.judul }}</p>
            <ul class="mt-3 space-y-2">
              <li v-for="l in kolom.link" :key="l.to">
                <NuxtLink
                  :to="l.to"
                  class="text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                >
                  {{ l.label }}
                </NuxtLink>
              </li>
            </ul>
          </nav>
        </div>
        <p
          class="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-400 dark:border-gray-800"
        >
          © {{ new Date().getFullYear() }} KuliahPintar.id. Hak cipta dilindungi.
        </p>
      </div>
    </footer>
  </div>
</template>
