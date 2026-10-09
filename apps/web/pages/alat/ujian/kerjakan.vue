<script setup lang="ts">
  // Pengerjaan Simulasi Ujian. Sumber soal: ?paket=<id> (paket soal) atau ?dek=<id> (dek Kartu
  // Hafalan, disusun jadi pilihan ganda). Timer hitung mundur; waktu habis → otomatis dikumpulkan.
  import {
    MIN_KARTU_UNTUK_UJIAN,
    acak,
    formatSisaWaktu,
    hitungNilai,
    soalDariKartu,
    type HasilNilai,
    type PaketUjian,
    type SoalUjian,
    type SoalUjianSiap,
  } from '@kuliahpintar/shared'

  definePageMeta({ middleware: 'auth', layout: 'default' })
  useHead({ title: 'Mengerjakan Ujian' })

  const HURUF = ['A', 'B', 'C', 'D', 'E']
  /** Ujian dari dek kartu: maksimal soal & menit per soal */
  const MAKS_SOAL_DEK = 30
  const MENIT_PER_SOAL_DEK = 1

  const supabase = useSupabaseClient()
  const route = useRoute()
  const paketId = route.query['paket'] as string | undefined
  const dekId = route.query['dek'] as string | undefined

  const judul = ref('')
  const soal = ref<SoalUjianSiap[]>([])
  const jawaban = ref<(number | null)[]>([])
  const ragu = ref<Set<number>>(new Set())
  const nomor = ref(0)
  const tahap = ref<'memuat' | 'siap' | 'mengerjakan' | 'selesai' | 'gagal'>('memuat')
  const pesanGagal = ref('')
  const durasiDetik = ref(0)
  const sisaDetik = ref(0)
  const hasil = ref<HasilNilai | null>(null)
  const errorSimpan = ref<string | null>(null)
  let mulaiAt = 0
  let timer: ReturnType<typeof setInterval> | null = null

  const soalSekarang = computed(() => soal.value[nomor.value] ?? null)
  const terjawab = computed(() => jawaban.value.filter((j) => j !== null).length)

  function gagal(pesan: string) {
    pesanGagal.value = pesan
    tahap.value = 'gagal'
  }

  async function muat() {
    if (paketId) {
      const [p, s] = await Promise.all([
        supabase.from('paket_ujian').select('*').eq('id', paketId).maybeSingle(),
        supabase.from('soal_ujian').select('*').eq('paket_id', paketId),
      ])
      if (p.error || s.error || !p.data) return gagal('Paket soal tidak ditemukan.')
      const pk = p.data as PaketUjian
      const daftar = ((s.data ?? []) as SoalUjian[]).sort((a, b) =>
        a.created_at.localeCompare(b.created_at)
      )
      if (!daftar.length) return gagal('Paket ini belum punya soal.')
      judul.value = pk.judul
      durasiDetik.value = pk.durasi_menit * 60
      const siap = daftar.map((x) => ({
        id: x.id,
        pertanyaan: x.pertanyaan,
        opsi: x.opsi,
        kunci: x.kunci,
        pembahasan: x.pembahasan,
      }))
      soal.value = pk.acak_soal ? acak(siap) : siap
    } else if (dekId) {
      const [d, k] = await Promise.all([
        supabase.from('dek_kartu').select('judul').eq('id', dekId).maybeSingle(),
        supabase.from('kartu').select('id, depan, belakang').eq('dek_id', dekId),
      ])
      if (d.error || k.error || !d.data) return gagal('Dek kartu tidak ditemukan.')
      const kartu = k.data ?? []
      if (kartu.length < MIN_KARTU_UNTUK_UJIAN) {
        return gagal(`Dek ini perlu minimal ${MIN_KARTU_UNTUK_UJIAN} kartu untuk dijadikan ujian.`)
      }
      const daftar = soalDariKartu(kartu, MAKS_SOAL_DEK)
      if (!daftar.length)
        return gagal('Jawaban kartu di dek ini terlalu mirip untuk dijadikan soal.')
      judul.value = `${d.data.judul} (dari kartu)`
      durasiDetik.value = daftar.length * MENIT_PER_SOAL_DEK * 60
      soal.value = daftar
    } else {
      return gagal('Sumber soal tidak ditentukan.')
    }
    jawaban.value = soal.value.map(() => null)
    sisaDetik.value = durasiDetik.value
    tahap.value = 'siap'
  }

  function mulai() {
    mulaiAt = Date.now()
    const akhir = mulaiAt + durasiDetik.value * 1000
    tahap.value = 'mengerjakan'
    timer = setInterval(() => {
      sisaDetik.value = Math.max(0, Math.round((akhir - Date.now()) / 1000))
      if (sisaDetik.value === 0) kumpulkan()
    }, 500)
  }

  function pilih(i: number) {
    if (tahap.value !== 'mengerjakan') return
    jawaban.value[nomor.value] = i
  }

  function ubahRagu() {
    const s = new Set(ragu.value)
    s.has(nomor.value) ? s.delete(nomor.value) : s.add(nomor.value)
    ragu.value = s
  }

  function konfirmasiKumpul() {
    const kosong = soal.value.length - terjawab.value
    const pesan = kosong
      ? `Masih ada ${kosong} soal kosong. Kumpulkan sekarang?`
      : 'Kumpulkan jawaban sekarang?'
    if (window.confirm(pesan)) kumpulkan()
  }

  async function kumpulkan() {
    if (tahap.value !== 'mengerjakan') return
    if (timer) clearInterval(timer)
    timer = null
    hasil.value = hitungNilai(soal.value, jawaban.value)
    tahap.value = 'selesai'
    nomor.value = 0

    const { error } = await supabase.from('hasil_ujian').insert({
      paket_id: paketId ?? null,
      dek_id: dekId ?? null,
      judul: judul.value.slice(0, 120),
      benar: hasil.value.benar,
      total: hasil.value.total,
      durasi_detik: Math.min(durasiDetik.value, Math.round((Date.now() - mulaiAt) / 1000)),
    })
    if (error) errorSimpan.value = 'Nilai tidak tersimpan ke riwayat (koneksi bermasalah).'
  }

  function cegahTinggal(e: BeforeUnloadEvent) {
    if (tahap.value === 'mengerjakan') e.preventDefault()
  }

  function kelasNomor(i: number) {
    if (tahap.value === 'selesai') {
      return jawaban.value[i] === soal.value[i]?.kunci
        ? 'border-green-500 bg-green-500 text-white'
        : 'border-red-400 bg-red-400 text-white'
    }
    if (i === nomor.value) return 'border-primary-600 bg-primary-600 text-white'
    if (ragu.value.has(i)) return 'border-amber-400 bg-amber-100 text-amber-800'
    if (jawaban.value[i] !== null) return 'border-primary-200 bg-primary-50 text-primary-700'
    return 'border-gray-300 text-gray-500 dark:border-gray-700'
  }

  function kelasOpsi(i: number) {
    const s = soalSekarang.value
    if (!s) return ''
    const dipilih = jawaban.value[nomor.value] === i
    if (tahap.value === 'selesai') {
      if (i === s.kunci) return 'border-green-500 bg-green-50 dark:bg-green-950'
      if (dipilih) return 'border-red-400 bg-red-50 dark:bg-red-950'
      return 'border-gray-200 dark:border-gray-800'
    }
    return dipilih
      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
      : 'border-gray-200 hover:border-gray-300 dark:border-gray-800'
  }

  onMounted(() => {
    muat()
    window.addEventListener('beforeunload', cegahTinggal)
  })
  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
    window.removeEventListener('beforeunload', cegahTinggal)
  })
</script>

<template>
  <div class="container mx-auto max-w-2xl px-4 py-8">
    <NuxtLink
      v-if="tahap !== 'mengerjakan'"
      to="/alat/ujian"
      class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
    >
      ← Simulasi Ujian
    </NuxtLink>

    <p v-if="tahap === 'memuat'" class="mt-8 text-center text-sm text-gray-500">Memuat soal...</p>

    <div v-else-if="tahap === 'gagal'" class="card mt-6 text-center">
      <p class="text-sm text-red-500">{{ pesanGagal }}</p>
      <NuxtLink to="/alat/ujian" class="btn-primary mt-4 inline-block px-5 py-2">Kembali</NuxtLink>
    </div>

    <!-- Siap mulai -->
    <div v-else-if="tahap === 'siap'" class="card mt-6 text-center">
      <h1 class="text-xl font-bold text-gray-900 dark:text-white">{{ judul }}</h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {{ soal.length }} soal · waktu {{ formatSisaWaktu(durasiDetik) }}
      </p>
      <p class="mt-1 text-xs text-gray-500">
        Jawaban otomatis dikumpulkan saat waktu habis. Pembahasan muncul setelah selesai.
      </p>
      <button class="btn-primary mt-5 px-8 py-2.5" @click="mulai">Mulai ujian</button>
    </div>

    <template v-else>
      <!-- Header: timer / nilai -->
      <div
        class="sticky top-16 z-10 -mx-4 mt-2 flex items-center justify-between gap-3 bg-white/90 px-4 py-2 backdrop-blur dark:bg-gray-950/90"
      >
        <p class="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white">
          {{ judul }}
        </p>
        <span
          v-if="tahap === 'mengerjakan'"
          class="shrink-0 rounded-lg px-3 py-1 font-mono text-sm font-semibold"
          :class="
            sisaDetik <= 60
              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
          "
        >
          ⏱ {{ formatSisaWaktu(sisaDetik) }}
        </span>
      </div>

      <!-- Hasil -->
      <div v-if="tahap === 'selesai' && hasil" class="card mt-3 text-center">
        <p
          class="text-4xl font-bold"
          :class="hasil.nilai >= 70 ? 'text-green-600' : 'text-red-500'"
        >
          {{ hasil.nilai }}
        </p>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ hasil.benar }} benar dari {{ hasil.total }} soal
        </p>
        <p v-if="errorSimpan" class="mt-2 text-xs text-red-500">{{ errorSimpan }}</p>
        <p class="mt-2 text-xs text-gray-500">Klik nomor di bawah untuk melihat pembahasan.</p>
      </div>

      <!-- Navigasi nomor -->
      <div class="mt-4 flex flex-wrap gap-1.5">
        <button
          v-for="(_, i) in soal"
          :key="i"
          type="button"
          class="h-9 w-9 rounded-lg border text-sm font-medium"
          :class="kelasNomor(i)"
          @click="nomor = i"
        >
          {{ i + 1 }}
        </button>
      </div>

      <!-- Soal -->
      <div v-if="soalSekarang" class="card mt-4">
        <p class="text-xs text-gray-500">Soal {{ nomor + 1 }} dari {{ soal.length }}</p>
        <p class="mt-2 whitespace-pre-line font-medium text-gray-900 dark:text-white">
          {{ soalSekarang.pertanyaan }}
        </p>
        <div class="mt-4 space-y-2">
          <button
            v-for="(o, i) in soalSekarang.opsi"
            :key="i"
            type="button"
            class="flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm"
            :class="kelasOpsi(i)"
            :disabled="tahap === 'selesai'"
            @click="pilih(i)"
          >
            <span class="font-semibold text-gray-500">{{ HURUF[i] }}.</span>
            <span class="whitespace-pre-line text-gray-800 dark:text-gray-200">{{ o }}</span>
          </button>
        </div>

        <div
          v-if="tahap === 'selesai'"
          class="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <p>
            Jawabanmu:
            <strong>{{ jawaban[nomor] === null ? 'kosong' : HURUF[jawaban[nomor]!] }}</strong>
            · Kunci: <strong>{{ HURUF[soalSekarang.kunci] }}</strong>
          </p>
          <p v-if="soalSekarang.pembahasan" class="mt-1 whitespace-pre-line">
            {{ soalSekarang.pembahasan }}
          </p>
        </div>

        <div class="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="btn-secondary px-4 py-1.5 text-sm"
            :disabled="nomor === 0"
            @click="nomor--"
          >
            ← Sebelumnya
          </button>
          <button
            type="button"
            class="btn-secondary px-4 py-1.5 text-sm"
            :disabled="nomor === soal.length - 1"
            @click="nomor++"
          >
            Berikutnya →
          </button>
          <button
            v-if="tahap === 'mengerjakan'"
            type="button"
            class="ml-auto text-sm"
            :class="ragu.has(nomor) ? 'font-medium text-amber-600' : 'text-gray-500'"
            @click="ubahRagu"
          >
            {{ ragu.has(nomor) ? '⚑ Ragu-ragu' : '⚐ Tandai ragu' }}
          </button>
        </div>
      </div>

      <div v-if="tahap === 'mengerjakan'" class="mt-4 flex items-center justify-between gap-3">
        <p class="text-sm text-gray-500">{{ terjawab }}/{{ soal.length }} terjawab</p>
        <button class="btn-primary px-6 py-2" @click="konfirmasiKumpul">Kumpulkan</button>
      </div>
      <div v-else class="mt-6 flex flex-wrap gap-2">
        <NuxtLink to="/alat/ujian" class="btn-primary px-5 py-2">Selesai</NuxtLink>
        <a :href="route.fullPath" class="btn-secondary px-5 py-2">Ulangi</a>
      </div>
    </template>
  </div>
</template>
