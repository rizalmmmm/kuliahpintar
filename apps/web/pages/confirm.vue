<script setup lang="ts">
  // Halaman callback setelah OAuth (Google) atau klik link konfirmasi email
  definePageMeta({ layout: false })

  onMounted(async () => {
    await navigateTo('/dashboard')
  })
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="text-center">
      <div class="text-4xl">⏳</div>
      <p class="mt-3 text-gray-600 dark:text-gray-400">Memproses autentikasi...</p>
    </div>
  </div>
</template>
