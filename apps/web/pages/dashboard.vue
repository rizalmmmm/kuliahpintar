<script setup lang="ts">
  definePageMeta({
    middleware: 'auth',
    layout: 'default',
  })
  useHead({ title: 'Dashboard' })

  const user = useSupabaseUser()
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Selamat datang! 👋</h1>
    <p class="mt-1 text-gray-600 dark:text-gray-400">{{ user?.email }}</p>

    <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div class="card flex flex-col gap-2">
        <div class="text-2xl">📄</div>
        <h3 class="font-semibold text-gray-900 dark:text-white">Rangkum Materi</h3>
        <p class="text-sm text-gray-500">Tempel teks materi kuliah, AI rangkum dalam sekejap.</p>
        <NuxtLink to="/fitur/rangkum" class="btn-primary mt-auto self-start">Mulai</NuxtLink>
      </div>
      <div class="card flex flex-col gap-2">
        <div class="text-2xl">💬</div>
        <h3 class="font-semibold text-gray-900 dark:text-white">Tanya AI</h3>
        <p class="text-sm text-gray-500">Tanyakan apa saja seputar materi kuliah.</p>
        <NuxtLink to="/fitur/tanya" class="btn-primary mt-auto self-start">Mulai</NuxtLink>
      </div>
      <div class="card flex flex-col gap-2 opacity-60">
        <div class="text-2xl">✍️</div>
        <h3 class="font-semibold text-gray-900 dark:text-white">Bantu Tulis</h3>
        <p class="text-sm text-gray-500">Asisten untuk essay dan laporan akademik.</p>
        <span
          class="mt-auto self-start rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800"
        >
          Segera
        </span>
      </div>
    </div>
  </div>
</template>
