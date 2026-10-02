<script setup lang="ts">
  // Layout utama dengan navbar dan footer
  import { MANUAL_PAYMENT_ACCOUNT } from '@kuliahpintar/shared'

  const user = useSupabaseUser()
  const supabase = useSupabaseClient()

  async function keluar() {
    await supabase.auth.signOut()
    await navigateTo('/')
  }
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
            class="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
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

    <footer class="border-t border-gray-200 py-8 dark:border-gray-800">
      <div
        class="container mx-auto flex flex-col items-center gap-3 px-4 text-center text-sm text-gray-500"
      >
        <nav class="flex flex-wrap items-center justify-center gap-4">
          <NuxtLink to="/alat/kalkulator-ipk" class="hover:text-gray-700 dark:hover:text-gray-300">
            Kalkulator IPK
          </NuxtLink>
          <span class="text-gray-300 dark:text-gray-700">·</span>
          <NuxtLink to="/alat/daftar-pustaka" class="hover:text-gray-700 dark:hover:text-gray-300">
            Generator Daftar Pustaka
          </NuxtLink>
          <span class="text-gray-300 dark:text-gray-700">·</span>
          <NuxtLink to="/ulasan" class="hover:text-gray-700 dark:hover:text-gray-300">
            Ulasan
          </NuxtLink>
          <span class="text-gray-300 dark:text-gray-700">·</span>
          <NuxtLink to="/privasi" class="hover:text-gray-700 dark:hover:text-gray-300">
            Kebijakan Privasi
          </NuxtLink>
          <span class="text-gray-300 dark:text-gray-700">·</span>
          <NuxtLink to="/ketentuan" class="hover:text-gray-700 dark:hover:text-gray-300">
            Ketentuan Layanan
          </NuxtLink>
        </nav>
        <p>© {{ new Date().getFullYear() }} KuliahPintar.id. Hak cipta dilindungi.</p>
      </div>
    </footer>
  </div>
</template>
