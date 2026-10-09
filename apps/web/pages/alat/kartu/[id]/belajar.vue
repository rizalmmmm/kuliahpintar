<script setup lang="ts">
  // Sesi belajar Kartu Hafalan (Leitner). Kartu yang jatuh tempo ditampilkan acak; benar → naik
  // kotak & dijadwalkan ulang, salah → kembali ke kotak 1 dan diulang lagi di sesi ini.
  import { jawabKartu, kunciTanggal, type DekKartu, type Kartu } from '@kuliahpintar/shared'

  definePageMeta({ middleware: 'auth', layout: 'default' })
  useHead({ title: 'Belajar Kartu Hafalan' })

  const supabase = useSupabaseClient()
  const route = useRoute()
  const dekId = computed(() => route.params['id'] as string)

  const dek = ref<DekKartu | null>(null)
  const semua = ref<Kartu[]>([])
  const antrean = ref<Kartu[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const terbuka = ref(false)
  const latihanBebas = ref(false) // latih semua kartu tanpa mengubah jadwal Leitner
  const skor = reactive({ benar: 0, salah: 0 })
  const sedangSimpan = ref(false)

  const kartuSekarang = computed(() => antrean.value[0] ?? null)
  const selesai = computed(() => !loading.value && !antrean.value.length)

  function acak<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j]!, a[i]!]
    }
    return a
  }

  async function muat() {
    loading.value = true
    const [d, k] = await Promise.all([
      supabase.from('dek_kartu').select('*').eq('id', dekId.value).maybeSingle(),
      supabase.from('kartu').select('*').eq('dek_id', dekId.value),
    ])
    const user = (await supabase.auth.getUser()).data.user
    if (d.error || k.error || !d.data || d.data.user_id !== user?.id) {
      error.value = 'Dek tidak ditemukan.'
    } else {
      dek.value = d.data as DekKartu
      semua.value = (k.data ?? []) as Kartu[]
      const sekarang = Date.now()
      antrean.value = acak(semua.value.filter((x) => new Date(x.jatuh_tempo).getTime() <= sekarang))
    }
    loading.value = false
  }

  function mulaiLatihanBebas() {
    latihanBebas.value = true
    skor.benar = 0
    skor.salah = 0
    terbuka.value = false
    antrean.value = acak(semua.value)
  }

  async function jawab(benar: boolean) {
    const k = kartuSekarang.value
    if (!k || sedangSimpan.value) return
    benar ? skor.benar++ : skor.salah++
    terbuka.value = false

    if (!latihanBebas.value) {
      const hasil = jawabKartu(k.kotak, benar)
      sedangSimpan.value = true
      const { error: e } = await supabase
        .from('kartu')
        .update({ kotak: hasil.kotak, jatuh_tempo: hasil.jatuhTempo.toISOString() })
        .eq('id', k.id)
      sedangSimpan.value = false
      if (e) {
        error.value = 'Gagal menyimpan progres. Periksa koneksi lalu coba lagi.'
        return
      }
      k.kotak = hasil.kotak
      k.jatuh_tempo = hasil.jatuhTempo.toISOString()
    }

    // Catat untuk Progres Belajar (streak & statistik); gagal dicatat tidak mengganggu sesi
    supabase
      .rpc('catat_ulang_kartu', { p_tanggal: kunciTanggal(new Date()) })
      .then(({ error: e }) => e && console.warn('Gagal mencatat aktivitas kartu:', e.message))

    antrean.value.shift()
    // Kartu yang salah diulang lagi di akhir sesi sampai benar
    if (!benar) antrean.value.push(k)
  }

  function onKey(e: KeyboardEvent) {
    if (!kartuSekarang.value) return
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      terbuka.value = !terbuka.value
    } else if (terbuka.value && (e.key === '1' || e.key === 'ArrowLeft')) jawab(false)
    else if (terbuka.value && (e.key === '2' || e.key === 'ArrowRight')) jawab(true)
  }

  onMounted(() => {
    muat()
    window.addEventListener('keydown', onKey)
  })
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="container mx-auto max-w-xl px-4 py-8">
    <NuxtLink
      :to="`/alat/kartu/${dekId}`"
      class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
    >
      ← {{ dek?.judul ?? 'Kembali' }}
    </NuxtLink>

    <p v-if="loading" class="mt-8 text-center text-sm text-gray-500">Memuat kartu...</p>
    <p v-else-if="error && !dek" class="mt-8 text-center text-sm text-red-500">{{ error }}</p>

    <!-- Selesai / tidak ada yang jatuh tempo -->
    <div v-else-if="selesai" class="card mt-8 text-center">
      <div class="text-4xl">{{ skor.benar + skor.salah ? '🎉' : '✅' }}</div>
      <p class="mt-3 font-semibold text-gray-900 dark:text-white">
        {{ skor.benar + skor.salah ? 'Sesi selesai!' : 'Tidak ada kartu yang perlu diulang.' }}
      </p>
      <p v-if="skor.benar + skor.salah" class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {{ skor.benar }} benar · {{ skor.salah }} salah
      </p>
      <p v-else class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Semua kartu sudah dijadwalkan untuk hari lain. Datang lagi besok, atau latih semua kartu
        sekarang (jadwal tidak berubah).
      </p>
      <div class="mt-5 flex flex-wrap justify-center gap-2">
        <button v-if="semua.length" class="btn-secondary px-5 py-2" @click="mulaiLatihanBebas">
          Latih semua kartu
        </button>
        <NuxtLink :to="`/alat/kartu/${dekId}`" class="btn-primary px-5 py-2"
          >Kembali ke dek</NuxtLink
        >
      </div>
    </div>

    <!-- Kartu -->
    <template v-else-if="kartuSekarang">
      <div class="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>{{ latihanBebas ? 'Latihan bebas' : 'Ulangan Leitner' }}</span>
        <span>Sisa {{ antrean.length }} · ✓ {{ skor.benar }} · ✗ {{ skor.salah }}</span>
      </div>

      <button
        type="button"
        class="card mt-3 flex min-h-[16rem] w-full flex-col items-center justify-center text-center"
        :aria-label="terbuka ? 'Tutup jawaban' : 'Lihat jawaban'"
        @click="terbuka = !terbuka"
      >
        <p class="whitespace-pre-line text-lg font-medium text-gray-900 dark:text-white">
          {{ kartuSekarang.depan }}
        </p>
        <template v-if="terbuka">
          <div class="my-4 h-px w-16 bg-gray-200 dark:bg-gray-700" />
          <p class="whitespace-pre-line text-gray-700 dark:text-gray-300">
            {{ kartuSekarang.belakang }}
          </p>
        </template>
        <p v-else class="mt-6 text-xs text-gray-400">Ketuk atau tekan Spasi untuk lihat jawaban</p>
      </button>

      <p v-if="error" class="mt-2 text-sm text-red-500">{{ error }}</p>

      <div v-if="terbuka" class="mt-4 grid grid-cols-2 gap-3">
        <button
          :disabled="sedangSimpan"
          class="rounded-lg border border-red-200 bg-red-50 py-3 font-medium text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          @click="jawab(false)"
        >
          ✗ Belum hafal
        </button>
        <button
          :disabled="sedangSimpan"
          class="rounded-lg border border-green-200 bg-green-50 py-3 font-medium text-green-700 hover:bg-green-100 disabled:opacity-60 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
          @click="jawab(true)"
        >
          ✓ Sudah hafal
        </button>
      </div>
      <p class="mt-3 text-center text-xs text-gray-400">
        Pintasan: Spasi = buka · 1 = belum · 2 = sudah
      </p>
    </template>
  </div>
</template>
