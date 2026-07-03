<script setup lang="ts">
  import type { UsageSummary } from '@kuliahpintar/shared'

  definePageMeta({
    middleware: 'auth',
    layout: 'default',
  })
  useHead({ title: 'Dashboard' })

  const user = useSupabaseUser()
  const api = useApi()

  const usage = ref<UsageSummary | null>(null)
  onMounted(async () => {
    try {
      const res = await api.get<{ data: UsageSummary }>('/api/v1/ai/usage')
      usage.value = res.data
    } catch {
      // Diamkan — badge kuota opsional, jangan ganggu dashboard
    }
  })
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Selamat datang! 👋</h1>
        <p class="mt-1 text-gray-600 dark:text-gray-400">{{ user?.email }}</p>
      </div>

      <!-- Badge tier + kuota -->
      <div v-if="usage" class="card flex items-center gap-3 py-3">
        <div>
          <span
            class="rounded-full px-2 py-0.5 text-xs font-medium"
            :class="
              usage.tier === 'premium'
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
            "
          >
            {{ usage.tier === 'premium' ? '💎 Premium' : 'Gratis' }}
          </span>
          <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
            <template v-if="usage.unlimited">Request AI tanpa batas</template>
            <template v-else>
              Sisa hari ini:
              <strong :class="usage.sisa <= 1 ? 'text-orange-500' : ''">
                {{ usage.sisa }}/{{ usage.limit }}
              </strong>
            </template>
          </p>
        </div>
        <NuxtLink
          v-if="!usage.unlimited"
          to="/harga"
          class="btn-primary whitespace-nowrap px-3 py-1.5 text-xs"
        >
          Upgrade
        </NuxtLink>
      </div>
    </div>

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
      <div class="card flex flex-col gap-2">
        <div class="text-2xl">✍️</div>
        <h3 class="font-semibold text-gray-900 dark:text-white">Bantu Tulis</h3>
        <p class="text-sm text-gray-500">Asisten untuk essay dan laporan akademik.</p>
        <NuxtLink to="/fitur/tulis" class="btn-primary mt-auto self-start">Mulai</NuxtLink>
      </div>
      <div class="card flex flex-col gap-2">
        <div class="text-2xl">📝</div>
        <h3 class="font-semibold text-gray-900 dark:text-white">Latihan Soal</h3>
        <p class="text-sm text-gray-500">Buat kuis dari materi untuk persiapan ujian.</p>
        <NuxtLink to="/fitur/latihan" class="btn-primary mt-auto self-start">Mulai</NuxtLink>
      </div>
      <div class="card flex flex-col gap-2">
        <div class="text-2xl">🃏</div>
        <h3 class="font-semibold text-gray-900 dark:text-white">Flashcard</h3>
        <p class="text-sm text-gray-500">Kartu hafalan otomatis dari materi kuliah.</p>
        <NuxtLink to="/fitur/flashcard" class="btn-primary mt-auto self-start">Mulai</NuxtLink>
      </div>
    </div>
  </div>
</template>
