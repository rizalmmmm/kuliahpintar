<script setup lang="ts">
  import type { TulisResponse, ModeTulis, JenisTulisan } from '@kuliahpintar/shared'

  definePageMeta({ middleware: 'auth', layout: 'default' })
  useHead({ title: 'Bantu Tulis' })

  const api = useApi()

  const form = reactive({
    teks: '',
    mode: 'kerangka' as ModeTulis,
    jenis: 'essay' as JenisTulisan,
  })

  const hasil = ref<string | null>(null)
  const sisaHarian = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const copied = ref(false)

  const charCount = computed(() => form.teks.length)
  const isValid = computed(() => charCount.value >= 10 && charCount.value <= 10_000)

  const modeOptions: { value: ModeTulis; label: string; desc: string }[] = [
    { value: 'kerangka', label: 'Kerangka', desc: 'Topik → outline' },
    { value: 'kembangkan', label: 'Kembangkan', desc: 'Poin → paragraf' },
    { value: 'perbaiki', label: 'Perbaiki', desc: 'Perhalus draft' },
  ]

  const jenisOptions: { value: JenisTulisan; label: string }[] = [
    { value: 'essay', label: 'Essay' },
    { value: 'laporan', label: 'Laporan' },
    { value: 'makalah', label: 'Makalah' },
  ]

  const placeholderMode: Record<ModeTulis, string> = {
    kerangka:
      'Tulis topik yang ingin dibuat kerangkanya...\n\nContoh: Dampak media sosial terhadap kesehatan mental mahasiswa',
    kembangkan:
      'Tempel poin-poin atau kerangka yang ingin dikembangkan...\n\nContoh:\n- Definisi media sosial\n- Pola penggunaan di kalangan mahasiswa\n- Dampak positif dan negatif',
    perbaiki:
      'Tempel draft tulisanmu di sini, AI akan memperbaiki tata bahasa dan gaya akademiknya...',
  }

  async function handleTulis() {
    if (!isValid.value) return

    loading.value = true
    error.value = null
    hasil.value = null

    try {
      const res = await api.post<{ data: TulisResponse }>('/api/v1/ai/tulis', {
        teks: form.teks,
        mode: form.mode,
        jenis: form.jenis,
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
      <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">✍️ Bantu Tulis</h1>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Asisten essay dan laporan akademik — buat kerangka, kembangkan poin, atau perbaiki draft.
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- ── Input Panel ── -->
      <div class="space-y-4">
        <!-- Mode -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Jenis Bantuan
          </label>
          <div class="mt-2 grid grid-cols-3 gap-2">
            <button
              v-for="opt in modeOptions"
              :key="opt.value"
              type="button"
              :disabled="loading"
              :class="[
                'rounded-lg border p-2.5 text-left transition-colors',
                form.mode === opt.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600',
              ]"
              @click="form.mode = opt.value"
            >
              <div
                class="text-sm font-medium"
                :class="
                  form.mode === opt.value
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

        <!-- Jenis Tulisan -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Jenis Tulisan
          </label>
          <div class="mt-2 flex gap-2">
            <button
              v-for="opt in jenisOptions"
              :key="opt.value"
              type="button"
              :disabled="loading"
              :class="[
                'rounded-full border px-3 py-1 text-sm transition-colors',
                form.jenis === opt.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300',
              ]"
              @click="form.jenis = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Textarea -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {{
              form.mode === 'kerangka'
                ? 'Topik'
                : form.mode === 'kembangkan'
                  ? 'Poin / Kerangka'
                  : 'Draft Tulisan'
            }}
          </label>
          <textarea
            v-model="form.teks"
            rows="12"
            class="input mt-1 resize-none text-sm leading-relaxed"
            :placeholder="placeholderMode[form.mode]"
            :disabled="loading"
          />
          <div class="mt-1 flex items-center justify-between">
            <p
              class="text-xs"
              :class="{
                'text-gray-400': charCount < 10,
                'text-green-600 dark:text-green-400': charCount >= 10 && charCount <= 10_000,
                'text-red-500': charCount > 10_000,
              }"
            >
              <template v-if="charCount === 0">Minimal 10 karakter</template>
              <template v-else-if="charCount < 10">{{ charCount }} karakter — kurang</template>
              <template v-else-if="charCount > 10_000">
                {{ charCount.toLocaleString('id-ID') }} / 10.000 — terlalu panjang
              </template>
              <template v-else>{{ charCount.toLocaleString('id-ID') }} karakter ✓</template>
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

        <!-- Submit -->
        <button
          :disabled="!isValid || loading"
          class="btn-primary w-full py-3 text-base"
          @click="handleTulis"
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
            Sedang menulis...
          </span>
          <span v-else>✨ Bantu Tulis</span>
        </button>

        <!-- Usage info -->
        <p v-if="sisaHarian !== null" class="text-center text-xs text-gray-500">
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
          <h2 class="text-sm font-medium text-gray-700 dark:text-gray-300">Hasil</h2>
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
          <div class="h-4 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div class="h-4 w-4/6 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div class="mt-2 h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div class="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
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
          class="flex min-h-[300px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-gray-700"
        >
          <div class="text-4xl">✍️</div>
          <p class="mt-3 text-sm text-gray-500">Hasil tulisan akan muncul di sini</p>
          <p class="mt-1 text-xs text-gray-400">
            Pilih jenis bantuan, isi teks, lalu klik Bantu Tulis
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
