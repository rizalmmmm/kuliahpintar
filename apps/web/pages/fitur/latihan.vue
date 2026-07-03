<script setup lang="ts">
  import type { LatihanResponse, SoalLatihan, JenisSoal } from '@kuliahpintar/shared'

  definePageMeta({ middleware: 'auth', layout: 'default' })
  useHead({ title: 'Latihan Soal' })

  const api = useApi()

  const form = reactive({
    teks: '',
    jumlah: 5,
    jenis: 'pilihan_ganda' as JenisSoal,
  })

  const soal = ref<SoalLatihan[] | null>(null)
  const pilihan = ref<(number | null)[]>([])
  const terungkap = ref<boolean[]>([])
  const sisaHarian = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const charCount = computed(() => form.teks.length)
  const isValid = computed(() => charCount.value >= 100 && charCount.value <= 10_000)

  const jenisOptions: { value: JenisSoal; label: string; desc: string }[] = [
    { value: 'pilihan_ganda', label: 'Pilihan Ganda', desc: 'Jawab & lihat skor' },
    { value: 'isian', label: 'Isian Singkat', desc: 'Jawaban tersembunyi' },
  ]

  const dijawab = computed(() => pilihan.value.filter((p) => p !== null).length)
  const benar = computed(
    () =>
      soal.value?.filter((s, i) => pilihan.value[i] !== null && pilihan.value[i] === s.jawabanIndex)
        .length ?? 0
  )
  const selesai = computed(
    () => soal.value !== null && soal.value.length > 0 && dijawab.value === soal.value.length
  )

  async function handleBuatSoal() {
    if (!isValid.value) return

    loading.value = true
    error.value = null
    soal.value = null

    try {
      const res = await api.post<{ data: LatihanResponse }>('/api/v1/ai/latihan', {
        teks: form.teks,
        jumlah: form.jumlah,
        jenis: form.jenis,
      })
      soal.value = res.data.soal
      pilihan.value = res.data.soal.map(() => null)
      terungkap.value = res.data.soal.map(() => false)
      sisaHarian.value = res.data.sisaHarian
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.'
    } finally {
      loading.value = false
    }
  }

  function jawab(soalIdx: number, opsiIdx: number) {
    // Jawaban dikunci setelah memilih — seperti kuis sungguhan
    if (pilihan.value[soalIdx] !== null) return
    pilihan.value[soalIdx] = opsiIdx
  }

  function ulangi() {
    pilihan.value = soal.value?.map(() => null) ?? []
    terungkap.value = soal.value?.map(() => false) ?? []
  }

  function buatBaru() {
    soal.value = null
    error.value = null
  }
</script>

<template>
  <div class="container mx-auto max-w-3xl px-4 py-8">
    <!-- Header -->
    <div class="mb-6">
      <NuxtLink
        to="/dashboard"
        class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        ← Dashboard
      </NuxtLink>
      <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">📝 Latihan Soal</h1>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Tempel materi kuliah, AI buatkan soal latihan untuk menguji pemahamanmu.
      </p>
    </div>

    <!-- ── Form Input ── -->
    <div v-if="!soal" class="space-y-4">
      <!-- Jenis Soal -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Jenis Soal
        </label>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <button
            v-for="opt in jenisOptions"
            :key="opt.value"
            type="button"
            :disabled="loading"
            :class="[
              'rounded-lg border p-2.5 text-left transition-colors',
              form.jenis === opt.value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600',
            ]"
            @click="form.jenis = opt.value"
          >
            <div
              class="text-sm font-medium"
              :class="
                form.jenis === opt.value
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

      <!-- Jumlah Soal -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Jumlah Soal: <strong>{{ form.jumlah }}</strong>
        </label>
        <input
          v-model.number="form.jumlah"
          type="range"
          min="3"
          max="10"
          class="mt-2 w-full accent-primary-600"
          :disabled="loading"
        />
        <div class="flex justify-between text-xs text-gray-400"><span>3</span><span>10</span></div>
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
          placeholder="Tempel materi kuliah di sini — soal dibuat hanya dari materi ini..."
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
        @click="handleBuatSoal"
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
          Sedang membuat soal...
        </span>
        <span v-else>✨ Buat {{ form.jumlah }} Soal</span>
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

    <!-- ── Daftar Soal ── -->
    <div v-else class="space-y-4">
      <!-- Toolbar -->
      <div class="flex items-center justify-between">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          <template v-if="form.jenis === 'pilihan_ganda'">
            Dijawab: <strong>{{ dijawab }}/{{ soal.length }}</strong>
            <template v-if="dijawab > 0">
              · Benar:
              <strong class="text-green-600 dark:text-green-400">{{ benar }}</strong>
            </template>
          </template>
          <template v-else>{{ soal.length }} soal isian singkat</template>
        </p>
        <div class="flex gap-2">
          <button
            v-if="form.jenis === 'pilihan_ganda' && dijawab > 0"
            class="btn-secondary px-3 py-1.5 text-xs"
            @click="ulangi"
          >
            🔄 Ulangi
          </button>
          <button class="btn-secondary px-3 py-1.5 text-xs" @click="buatBaru">➕ Soal Baru</button>
        </div>
      </div>

      <!-- Skor akhir -->
      <div
        v-if="selesai && form.jenis === 'pilihan_ganda'"
        class="rounded-xl border p-4 text-center"
        :class="
          benar / soal.length >= 0.7
            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
            : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950'
        "
      >
        <p class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ benar }}/{{ soal.length }}
          <span class="text-base font-normal"
            >({{ Math.round((benar / soal.length) * 100) }}%)</span
          >
        </p>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{
            benar === soal.length
              ? 'Sempurna! Kamu menguasai materi ini. 🎉'
              : benar / soal.length >= 0.7
                ? 'Bagus! Cek lagi penjelasan soal yang salah. 👍'
                : 'Baca lagi materinya, lalu coba Ulangi. 💪'
          }}
        </p>
      </div>

      <!-- Kartu soal -->
      <div v-for="(s, i) in soal" :key="i" class="card space-y-3">
        <p class="text-sm font-medium text-gray-900 dark:text-white">
          {{ i + 1 }}. {{ s.pertanyaan }}
        </p>

        <!-- Pilihan ganda -->
        <div v-if="s.opsi" class="space-y-2">
          <button
            v-for="(opsi, j) in s.opsi"
            :key="j"
            type="button"
            class="w-full rounded-lg border p-2.5 text-left text-sm transition-colors"
            :class="[
              pilihan[i] === null
                ? 'border-gray-200 hover:border-primary-300 hover:bg-primary-50 dark:border-gray-700 dark:hover:bg-primary-950'
                : j === s.jawabanIndex
                  ? 'border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
                  : j === pilihan[i]
                    ? 'border-red-500 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
                    : 'border-gray-200 opacity-50 dark:border-gray-700',
              'text-gray-700 dark:text-gray-300',
            ]"
            @click="jawab(i, j)"
          >
            <span class="mr-1.5 font-medium">{{ ['A', 'B', 'C', 'D'][j] }}.</span>
            {{ opsi }}
            <span v-if="pilihan[i] !== null && j === s.jawabanIndex" class="ml-1">✓</span>
            <span v-else-if="pilihan[i] === j" class="ml-1">✗</span>
          </button>
        </div>

        <!-- Isian singkat -->
        <div v-else>
          <button
            v-if="!terungkap[i]"
            class="btn-secondary px-3 py-1.5 text-xs"
            @click="terungkap[i] = true"
          >
            👁 Lihat Jawaban
          </button>
          <p
            v-else
            class="rounded-lg bg-green-50 p-2.5 text-sm text-green-800 dark:bg-green-950 dark:text-green-200"
          >
            <strong>Jawaban:</strong> {{ s.jawaban }}
          </p>
        </div>

        <!-- Penjelasan -->
        <p
          v-if="(s.opsi && pilihan[i] !== null) || (!s.opsi && terungkap[i])"
          class="rounded-lg bg-gray-50 p-2.5 text-xs leading-relaxed text-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          💡 {{ s.penjelasan }}
        </p>
      </div>

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
