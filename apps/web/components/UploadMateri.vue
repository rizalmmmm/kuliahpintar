<script setup lang="ts">
  // Upload PDF/foto materi → teks (via /api/v1/ai/ekstrak), lalu hasilnya dikirim ke parent
  // untuk mengisi textarea. Dipakai di halaman Rangkum, Latihan, Flashcard, dan Bantu Tulis.
  import {
    UPLOAD_LIMITS,
    UPLOAD_MIME_TYPES,
    type EkstrakResponse,
    type UsageSummary,
  } from '@kuliahpintar/shared'

  const props = defineProps<{
    disabled?: boolean
    /** true bila textarea sudah berisi — minta konfirmasi sebelum menimpa */
    adaTeks?: boolean
  }>()

  const emit = defineEmits<{ hasil: [teks: string] }>()

  const api = useApi()

  const tier = ref<'free' | 'premium' | null>(null)
  const dragging = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const info = ref<{ namaFile: string; terpotong: boolean; sisa: number } | null>(null)
  const inputEl = ref<HTMLInputElement | null>(null)

  // Bila tier belum diketahui, validasi klien pakai batas premium — server tetap yang menegakkan
  const batas = computed(() => UPLOAD_LIMITS[tier.value ?? 'premium'])
  const accept = [...UPLOAD_MIME_TYPES, '.heic', '.heif'].join(',')

  onMounted(async () => {
    try {
      const res = await api.get<{ data: UsageSummary }>('/api/v1/ai/usage')
      tier.value = res.data.tier
    } catch {
      // Diamkan — hanya dipakai untuk validasi awal & teks bantuan
    }
  })

  function formatMb(bytes: number) {
    return `${Math.round(bytes / (1024 * 1024))} MB`
  }

  function tipeDidukung(f: File) {
    if ((UPLOAD_MIME_TYPES as readonly string[]).includes(f.type)) return true
    // Beberapa browser mengirim type kosong untuk HEIC
    return /\.(heic|heif)$/i.test(f.name)
  }

  function validasi(files: File[]): string | null {
    if (files.length === 0) return null
    if (files.length > batas.value.maxFiles) {
      return tier.value === 'free'
        ? 'Akun gratis hanya bisa upload 1 file sekaligus. Upgrade ke Premium untuk upload hingga 5 file.'
        : `Maksimal ${batas.value.maxFiles} file sekaligus.`
    }
    const salah = files.find((f) => !tipeDidukung(f))
    if (salah) return `File "${salah.name}" tidak didukung. Gunakan PDF, JPG, PNG, WEBP, atau HEIC.`
    const total = files.reduce((n, f) => n + f.size, 0)
    if (total > batas.value.maxTotalBytes) {
      return tier.value === 'free'
        ? `Ukuran file maksimal ${formatMb(batas.value.maxTotalBytes)} untuk akun gratis. Upgrade ke Premium untuk file hingga 15 MB.`
        : `Total ukuran file maksimal ${formatMb(batas.value.maxTotalBytes)}.`
    }
    return null
  }

  async function proses(fileList: FileList | null | undefined) {
    const files = Array.from(fileList ?? [])
    if (files.length === 0 || loading.value || props.disabled) return

    error.value = validasi(files)
    info.value = null
    if (error.value) return

    if (
      props.adaTeks &&
      !window.confirm('Teks yang sudah ada akan diganti dengan isi file. Lanjutkan?')
    ) {
      return
    }

    const form = new FormData()
    files.forEach((f) => form.append('file', f))

    loading.value = true
    try {
      const res = await api.upload<{ data: EkstrakResponse }>('/api/v1/ai/ekstrak', form)
      emit('hasil', res.data.teks)
      info.value = {
        namaFile: files.length === 1 ? files[0]!.name : `${files.length} file`,
        terpotong: res.data.terpotong,
        sisa: res.data.sisaEkstrak,
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal membaca file. Coba lagi.'
    } finally {
      loading.value = false
      if (inputEl.value) inputEl.value.value = ''
    }
  }

  function onDrop(e: DragEvent) {
    dragging.value = false
    proses(e.dataTransfer?.files)
  }
</script>

<template>
  <div>
    <div
      role="button"
      tabindex="0"
      :aria-disabled="disabled || loading"
      :class="[
        'flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 transition-colors',
        disabled || loading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
        dragging
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
          : 'border-gray-200 hover:border-primary-400 dark:border-gray-700 dark:hover:border-primary-600',
      ]"
      @click="!disabled && !loading && inputEl?.click()"
      @keydown.enter.prevent="!disabled && !loading && inputEl?.click()"
      @keydown.space.prevent="!disabled && !loading && inputEl?.click()"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <div class="text-2xl" aria-hidden="true">
        <svg
          v-if="loading"
          class="h-6 w-6 animate-spin text-primary-600"
          fill="none"
          viewBox="0 0 24 24"
        >
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
        <span v-else>📎</span>
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ loading ? 'Membaca file materi...' : 'Upload PDF atau foto materi' }}
        </p>
        <p class="text-xs text-gray-500">
          <template v-if="loading">Biasanya 5–20 detik, tergantung jumlah halaman</template>
          <template v-else>
            Klik atau seret file ke sini · PDF, JPG, PNG, HEIC ·
            <template v-if="tier === 'free'">1 file maks 5 MB, 3x/hari</template>
            <template v-else-if="tier === 'premium'">hingga 5 file, total 15 MB</template>
            <template v-else>maks 15 MB</template>
          </template>
        </p>
      </div>
      <input
        ref="inputEl"
        type="file"
        class="hidden"
        :accept="accept"
        :multiple="tier !== 'free'"
        :disabled="disabled || loading"
        @change="proses(($event.target as HTMLInputElement).files)"
      />
    </div>

    <!-- Berhasil -->
    <div
      v-if="info && !error"
      class="mt-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700 dark:bg-green-950 dark:text-green-300"
    >
      ✓ Teks dari <strong class="break-all">{{ info.namaFile }}</strong> sudah dimasukkan di bawah —
      periksa dan edit bila perlu.
      <span v-if="info.sisa >= 0">Sisa upload hari ini: {{ info.sisa }}.</span>
      <p v-if="info.terpotong" class="mt-1 text-orange-600 dark:text-orange-400">
        ⚠️ Materinya panjang, jadi hanya bagian awal (±10.000 karakter) yang diambil. Untuk bagian
        lain, upload halaman/foto yang relevan saja.
      </p>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300"
    >
      {{ error }}
      <NuxtLink
        v-if="error.includes('Upgrade')"
        to="/harga"
        class="ml-1 font-medium text-primary-600 hover:underline"
      >
        Lihat Premium →
      </NuxtLink>
    </div>
  </div>
</template>
