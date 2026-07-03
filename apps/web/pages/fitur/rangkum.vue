<script setup lang="ts">
  import type { RangkumResponse, GayaRangkum } from '@kuliahpintar/shared'

  definePageMeta({ middleware: 'auth', layout: 'default' })
  useHead({ title: 'Rangkum Materi' })

  const api = useApi()

  const form = reactive({
    teks: '',
    gaya: 'singkat' as GayaRangkum,
  })

  const hasil = ref<string | null>(null)
  const sisaHarian = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const copied = ref(false)

  const charCount = computed(() => form.teks.length)
  const isValid = computed(() => charCount.value >= 100 && charCount.value <= 10_000)

  const gayaOptions: { value: GayaRangkum; label: string; desc: string }[] = [
    { value: 'singkat', label: 'Singkat', desc: '3–5 kalimat padat' },
    { value: 'detail', label: 'Detail', desc: 'Penjelasan lengkap' },
    { value: 'poin', label: 'Poin-poin', desc: 'Bullet points' },
  ]

  async function handleRangkum() {
    if (!isValid.value) return

    loading.value = true
    error.value = null
    hasil.value = null

    try {
      const res = await api.post<{ data: RangkumResponse }>('/api/v1/ai/rangkum', {
        teks: form.teks,
        gaya: form.gaya,
      })
      hasil.value = res.data.hasil
      sisaHarian.value = res.data.sisaHarian
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.'
    } finally {
      loading.value = false
    }
  }

  async function copyHasil() {
    if (!hasil.value) return
    await navigator.clipboard.writeText(hasil.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
</script>

<template>
  <div class="container mx-auto max-w-5xl px-4 py-8">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center gap-2">
        <NuxtLink
          to="/dashboard"
          class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ← Dashboard
        </NuxtLink>
      </div>
      <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">📄 Rangkum Materi</h1>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Tempel teks materi kuliah, AI akan merangkumnya dalam Bahasa Indonesia yang jelas.
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- ── Input Panel ── -->
      <div class="space-y-4">
        <!-- Textarea -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Teks Materi
          </label>
          <textarea
            v-model="form.teks"
            rows="15"
            class="input mt-1 resize-none font-mono text-sm leading-relaxed"
            placeholder="Tempel teks materi kuliah di sini...&#10;&#10;Contoh: paragraph dari buku, slide kuliah, artikel, dsb."
            :disabled="loading"
          />
          <div class="mt-1 flex items-center justify-between">
            <p
              class="text-xs"
              :class="{
                'text-gray-400': charCount < 100,
                'text-green-600 dark:text-green-400': charCount >= 100 && charCount <= 10_000,
                'text-red-500': charCount > 10_000,
              }"
            >
              <template v-if="charCount === 0">Minimal 100 karakter</template>
              <template v-else-if="charCount < 100">
                {{ charCount }} karakter (butuh {{ 100 - charCount }} lagi)
              </template>
              <template v-else-if="charCount > 10_000">
                {{ charCount.toLocaleString('id-ID') }} / 10.000 — terlalu panjang
              </template>
              <template v-else> {{ charCount.toLocaleString('id-ID') }} karakter ✓ </template>
            </p>
            <button
              v-if="form.teks"
              type="button"
              class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              @click="form.teks = ''"
            >
              Hapus
            </button>
          </div>
        </div>

        <!-- Gaya Rangkuman -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Gaya Rangkuman
          </label>
          <div class="mt-2 grid grid-cols-3 gap-2">
            <button
              v-for="opt in gayaOptions"
              :key="opt.value"
              type="button"
              :disabled="loading"
              :class="[
                'rounded-lg border p-2.5 text-left transition-colors',
                form.gaya === opt.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600',
              ]"
              @click="form.gaya = opt.value"
            >
              <div
                class="text-sm font-medium"
                :class="
                  form.gaya === opt.value
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300'
                "
              >
                {{ opt.label }}
              </div>
              <div class="mt-0.5 text-xs text-gray-500">{{ opt.desc }}</div>
            </button>
          </div>
        </div>

        <!-- Submit -->
        <button
          :disabled="!isValid || loading"
          class="btn-primary w-full py-3 text-base"
          @click="handleRangkum"
        >
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                fill="currentColor"
              />
            </svg>
            Sedang merangkum...
          </span>
          <span v-else>✨ Rangkum Sekarang</span>
        </button>

        <!-- Usage info -->
        <p v-if="sisaHarian !== null && sisaHarian >= 0" class="text-center text-xs text-gray-500">
          Sisa hari ini:
          <strong :class="sisaHarian <= 1 ? 'text-orange-500' : 'text-gray-700 dark:text-gray-300'">
            {{ sisaHarian }} request gratis
          </strong>
          ·
          <NuxtLink to="/harga" class="text-primary-600 hover:underline">Upgrade Premium</NuxtLink>
        </p>
      </div>

      <!-- ── Result Panel ── -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-medium text-gray-700 dark:text-gray-300">Hasil Rangkuman</h2>
          <button
            v-if="hasil"
            class="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
            @click="copyHasil"
          >
            <span>{{ copied ? '✓ Tersalin!' : '📋 Salin' }}</span>
          </button>
        </div>

        <!-- Error state -->
        <div
          v-if="error"
          class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950"
        >
          <p class="text-sm text-red-700 dark:text-red-300">{{ error }}</p>
          <NuxtLink
            v-if="error.includes('Upgrade')"
            to="/harga"
            class="mt-2 inline-block text-sm font-medium text-primary-600 hover:underline"
          >
            Lihat paket Premium →
          </NuxtLink>
        </div>

        <!-- Loading skeleton -->
        <div v-else-if="loading" class="card space-y-3">
          <div class="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div class="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700 w-5/6" />
          <div class="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700 w-4/6" />
          <div class="mt-2 h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700 w-full" />
          <div class="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700 w-3/4" />
        </div>

        <!-- Result -->
        <div v-else-if="hasil" class="card flex-1">
          <p class="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200">
            {{ hasil }}
          </p>
        </div>

        <!-- Empty state -->
        <div
          v-else
          class="flex flex-1 min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center"
        >
          <div class="text-4xl">📝</div>
          <p class="mt-3 text-sm text-gray-500">Hasil rangkuman akan muncul di sini</p>
          <p class="mt-1 text-xs text-gray-400">
            Tempel teks minimal 100 karakter, lalu klik Rangkum
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
