<script setup lang="ts">
  // Layout utama dengan navbar dan footer
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header
      class="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95"
    >
      <div class="container mx-auto flex h-16 items-center justify-between px-4">
        <NuxtLink to="/" class="text-xl font-bold text-primary-600"> KuliahPintar.id </NuxtLink>

        <nav class="flex items-center gap-6">
          <NuxtLink
            to="/fitur"
            class="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            Fitur
          </NuxtLink>
          <NuxtLink
            to="/harga"
            class="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            Harga
          </NuxtLink>
          <NuxtLink
            to="/login"
            class="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            Masuk
          </NuxtLink>
          <NuxtLink to="/daftar" class="btn-primary"> Daftar Gratis </NuxtLink>
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
        <nav class="flex items-center gap-4">
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
