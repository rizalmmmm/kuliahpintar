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

    <RingkasanHariIni class="mt-6" />
    <ProgresBelajar class="mt-4" />

    <!-- Semua fitur, dikelompokkan per kebutuhan (sumber: utils/menuFitur.ts) -->
    <div class="mt-10 flex flex-wrap items-end justify-between gap-2">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Semua fitur</h2>
      <p class="flex items-center gap-1.5 text-xs text-gray-500">
        <span
          class="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          >Kuota</span
        >
        = memakai kuota harian · lainnya gratis tanpa batas
      </p>
    </div>
    <section v-for="k in KATEGORI_FITUR" :key="k.id" class="mt-6">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {{ k.ikon }} {{ k.judul }}
      </h3>
      <div class="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NuxtLink
          v-for="f in k.item"
          :key="f.to"
          :to="f.to"
          class="card flex items-start gap-3 py-4 transition-colors hover:border-primary-400"
        >
          <span class="text-2xl leading-none">{{ f.ikon }}</span>
          <span class="min-w-0">
            <span class="flex flex-wrap items-center gap-1.5">
              <span class="font-semibold text-gray-900 dark:text-white">{{ f.judul }}</span>
              <span
                v-if="f.kuota"
                class="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                >Kuota</span
              >
            </span>
            <span class="mt-0.5 block text-sm text-gray-500">{{ f.ringkas }}</span>
          </span>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
