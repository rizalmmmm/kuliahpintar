<script setup lang="ts">
  import type { FlashcardResponse, Flashcard } from '@kuliahpintar/shared'

  definePageMeta({ middleware: 'auth', layout: 'default' })
  useHead({ title: 'Flashcard' })

  const api = useApi()

  const form = reactive({
    teks: '',
    jumlah: 8,
  })

  const kartu = ref<Flashcard[] | null>(null)
  const indexAktif = ref(0)
  const terbalik = ref(false)
  const sudahDilihat = ref<Set<number>>(new Set())
  const sisaHarian = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const charCount = computed(() => form.teks.length)
  const isValid = computed(() => charCount.value >= 100 && charCount.value <= 10_000)

  const kartuAktif = computed(() => kartu.value?.[indexAktif.value] ?? null)
  const progress = computed(() =>
    kartu.value ? Math.round((sudahDilihat.value.size / kartu.value.length) * 100) : 0
  )

  async function handleBuat() {
    if (!isValid.value) return

    loading.value = true
    error.value = null
    kartu.value = null

    try {
      const res = await api.post<{ data: FlashcardResponse }>('/api/v1/ai/flashcard', {
        teks: form.teks,
        jumlah: form.jumlah,
      })
      kartu.value = res.data.kartu
      indexAktif.value = 0
      terbalik.value = false
      sudahDilihat.value = new Set()
      sisaHarian.value = res.data.sisaHarian
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.'
    } finally {
      loading.value = false
    }
  }

  function balik() {
    terbalik.value = !terbalik.value
    if (terbalik.value) sudahDilihat.value.add(indexAktif.value)
  }

  function pindah(arah: number) {
    if (!kartu.value) return
    const baru = indexAktif.value + arah
    if (baru < 0 || baru >= kartu.value.length) return
    indexAktif.value = baru
    terbalik.value = false
  }

  function buatBaru() {
    kartu.value = null
    error.value = null
  }

  // Navigasi keyboard: panah kiri/kanan pindah kartu, spasi balik
  function onKeydown(e: KeyboardEvent) {
    if (!kartu.value) return
    if (e.key === 'ArrowRight') pindah(1)
    else if (e.key === 'ArrowLeft') pindah(-1)
    else if (e.key === ' ') {
      e.preventDefault()
      balik()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="container mx-auto max-w-2xl px-4 py-8">
    <!-- Header -->
    <div class="mb-6">
      <NuxtLink
        to="/dashboard"
        class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        ← Dashboard
      </NuxtLink>
      <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">🃏 Flashcard</h1>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Tempel materi kuliah, AI buatkan kartu hafalan. Klik kartu untuk membaliknya.
      </p>
    </div>

    <!-- ── Form Input ── -->
    <div v-if="!kartu" class="space-y-4">
      <!-- Jumlah -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Jumlah Kartu: <strong>{{ form.jumlah }}</strong>
        </label>
        <input
          v-model.number="form.jumlah"
          type="range"
          min="4"
          max="15"
          class="mt-2 w-full accent-primary-600"
          :disabled="loading"
        />
        <div class="flex justify-between text-xs text-gray-400"><span>4</span><span>15</span></div>
      </div>

      <!-- Textarea -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Teks Materi
        </label>
        <textarea
          v-model="form.teks"
          rows="10"
          class="input mt-1 resize-none text-sm leading-relaxed"
          placeholder="Tempel materi kuliah di sini — kartu dibuat hanya dari materi ini..."
          :disabled="loading"
        />
        <p
          class="mt-1 text-xs"
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
          <template v-else>{{ charCount.toLocaleString('id-ID') }} karakter ✓</template>
        </p>
      </div>

      <!-- Submit -->
      <button
        :disabled="!isValid || loading"
        class="btn-primary w-full py-3 text-base"
        @click="handleBuat"
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
          Sedang membuat kartu...
        </span>
        <span v-else>✨ Buat {{ form.jumlah }} Kartu</span>
      </button>

      <!-- Error -->
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
    </div>

    <!-- ── Deck ── -->
    <div v-else class="space-y-4">
      <!-- Progress bar -->
      <div>
        <div class="flex items-center justify-between text-xs text-gray-500">
          <span>Kartu {{ indexAktif + 1 }} / {{ kartu.length }}</span>
          <span>{{ sudahDilihat.size }}/{{ kartu.length }} sudah dibuka</span>
        </div>
        <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            class="h-full rounded-full bg-primary-600 transition-all"
            :style="{ width: `${progress}%` }"
          />
        </div>
      </div>

      <!-- Kartu (flip 3D) -->
      <div class="flashcard-scene" @click="balik">
        <div class="flashcard" :class="{ 'is-flipped': terbalik }">
          <!-- Depan -->
          <div class="flashcard-face flashcard-depan card">
            <span class="mb-2 text-xs uppercase tracking-wide text-primary-500">Depan</span>
            <p class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ kartuAktif?.depan }}
            </p>
            <span class="mt-4 text-xs text-gray-400">Klik untuk lihat jawaban</span>
          </div>
          <!-- Belakang -->
          <div class="flashcard-face flashcard-belakang card">
            <span class="mb-2 text-xs uppercase tracking-wide text-green-500">Belakang</span>
            <p class="text-base leading-relaxed text-gray-800 dark:text-gray-200">
              {{ kartuAktif?.belakang }}
            </p>
          </div>
        </div>
      </div>

      <!-- Navigasi -->
      <div class="flex items-center justify-between gap-2">
        <button
          class="btn-secondary px-4 py-2 text-sm disabled:opacity-40"
          :disabled="indexAktif === 0"
          @click="pindah(-1)"
        >
          ← Sebelumnya
        </button>
        <button class="btn-secondary px-3 py-2 text-xs" @click="buatBaru">➕ Deck Baru</button>
        <button
          class="btn-secondary px-4 py-2 text-sm disabled:opacity-40"
          :disabled="indexAktif === kartu.length - 1"
          @click="pindah(1)"
        >
          Berikutnya →
        </button>
      </div>

      <p class="text-center text-xs text-gray-400">
        Tip: pakai tombol ← → untuk pindah, spasi untuk membalik
      </p>

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
  </div>
</template>

<style scoped>
  .flashcard-scene {
    perspective: 1200px;
    cursor: pointer;
  }

  .flashcard {
    position: relative;
    width: 100%;
    min-height: 220px;
    transition: transform 0.5s;
    transform-style: preserve-3d;
  }

  .flashcard.is-flipped {
    transform: rotateY(180deg);
  }

  .flashcard-face {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  .flashcard-belakang {
    transform: rotateY(180deg);
  }
</style>
