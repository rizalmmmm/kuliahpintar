<script setup lang="ts">
  // Rencana Belajar menuju UTS/UAS — tanpa AI. Topik dibagi rata ke hari-hari sebelum ujian
  // (lihat packages/shared/src/utils/rencana.ts), hari terakhir untuk review.
  import {
    dariKunciTanggal,
    hariTersedia,
    kunciTanggal,
    selisihHari,
    susunRencana,
    type RencanaBelajar,
  } from '@kuliahpintar/shared'

  definePageMeta({ middleware: 'auth', layout: 'default' })
  useHead({ title: 'Rencana Belajar' })

  type RencanaRingkas = RencanaBelajar & { total: number; selesai: number }

  const NAMA_HARI = [
    { nilai: 1, label: 'Sen' },
    { nilai: 2, label: 'Sel' },
    { nilai: 3, label: 'Rab' },
    { nilai: 4, label: 'Kam' },
    { nilai: 5, label: 'Jum' },
    { nilai: 6, label: 'Sab' },
    { nilai: 0, label: 'Min' },
  ]

  const supabase = useSupabaseClient()
  const router = useRouter()

  const daftar = ref<RencanaRingkas[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const menyimpan = ref(false)
  const besok = kunciTanggal(new Date(Date.now() + 86_400_000))
  const form = reactive({
    judul: '',
    tanggalUjian: '',
    topik: '',
    hariLibur: [] as number[],
    keJadwal: true,
  })

  const topikForm = computed(() =>
    form.topik
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)
  )
  const pratinjau = computed(() => {
    if (!form.tanggalUjian || !topikForm.value.length) return null
    const hari = hariTersedia(new Date(), dariKunciTanggal(form.tanggalUjian), form.hariLibur)
    return { hari: hari.length, topik: topikForm.value.length }
  })

  async function muat() {
    loading.value = true
    error.value = null
    const userId = (await supabase.auth.getUser()).data.user?.id ?? ''
    const [r, s] = await Promise.all([
      supabase
        .from('rencana_belajar')
        .select('*')
        .eq('user_id', userId)
        .order('tanggal_ujian', { ascending: true }),
      supabase
        .from('sesi_rencana')
        .select('rencana_id, selesai')
        .eq('user_id', userId)
        .limit(10_000),
    ])
    if (r.error || s.error) {
      error.value = 'Gagal memuat rencana. Coba muat ulang halaman.'
      loading.value = false
      return
    }
    const hitung = new Map<string, { total: number; selesai: number }>()
    for (const x of s.data ?? []) {
      const h = hitung.get(x.rencana_id) ?? { total: 0, selesai: 0 }
      h.total++
      if (x.selesai) h.selesai++
      hitung.set(x.rencana_id, h)
    }
    daftar.value = ((r.data ?? []) as RencanaBelajar[]).map((x) => ({
      ...x,
      ...(hitung.get(x.id) ?? { total: 0, selesai: 0 }),
    }))
    loading.value = false
  }

  async function buat() {
    error.value = null
    const judul = form.judul.trim()
    if (!judul || !form.tanggalUjian) return
    if (!topikForm.value.length) {
      error.value = 'Isi minimal satu materi/topik.'
      return
    }
    if (topikForm.value.length > 100) {
      error.value = 'Maksimal 100 topik.'
      return
    }
    menyimpan.value = true
    const { data: rencana, error: e } = await supabase
      .from('rencana_belajar')
      .insert({
        judul,
        tanggal_ujian: form.tanggalUjian,
        topik: topikForm.value.map((t) => t.slice(0, 190)),
        hari_libur: form.hariLibur,
      })
      .select('id')
      .single()
    if (e || !rencana) {
      menyimpan.value = false
      error.value = 'Gagal membuat rencana.'
      return
    }

    const sesi = susunRencana({
      topik: topikForm.value.map((t) => t.slice(0, 190)),
      mulai: new Date(),
      tanggalUjian: dariKunciTanggal(form.tanggalUjian),
      hariLibur: form.hariLibur,
    })
    const { error: e2 } = await supabase
      .from('sesi_rencana')
      .insert(sesi.map((s) => ({ ...s, rencana_id: rencana.id })))

    // Ujian ikut masuk Jadwal & Tugas sebagai deadline (pukul 07.00 hari ujian)
    if (form.keJadwal) {
      const deadline = dariKunciTanggal(form.tanggalUjian)
      deadline.setHours(7)
      await supabase
        .from('tugas')
        .insert({ judul: `Ujian: ${judul}`.slice(0, 200), deadline: deadline.toISOString() })
    }

    menyimpan.value = false
    if (e2) {
      error.value =
        'Rencana dibuat, tapi jadwal sesi gagal disimpan. Buka rencana lalu klik Susun ulang.'
    }
    await router.push(`/alat/rencana/${rencana.id}`)
  }

  function hitungMundur(r: RencanaBelajar) {
    const n = selisihHari(new Date(), dariKunciTanggal(r.tanggal_ujian))
    if (n < 0) return 'Sudah lewat'
    if (n === 0) return 'Hari ini!'
    return `H-${n}`
  }

  onMounted(muat)
</script>

<template>
  <div class="container mx-auto max-w-2xl px-4 py-8">
    <NuxtLink
      to="/dashboard"
      class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
    >
      ← Dashboard
    </NuxtLink>
    <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">🗂️ Rencana Belajar</h1>
    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
      Masukkan tanggal ujian dan daftar materi — materi dibagi rata ke hari-hari sebelum ujian,
      dengan hari terakhir untuk review.
    </p>

    <!-- Buat rencana -->
    <form class="card mt-6 space-y-3" @submit.prevent="buat">
      <p class="font-medium text-gray-900 dark:text-white">Buat rencana baru</p>
      <input
        v-model="form.judul"
        required
        maxlength="120"
        class="input"
        placeholder="Nama ujian, mis. UAS Statistika"
      />
      <label class="block text-sm text-gray-600 dark:text-gray-400">
        Tanggal ujian
        <input v-model="form.tanggalUjian" type="date" required :min="besok" class="input mt-1" />
      </label>
      <label class="block text-sm text-gray-600 dark:text-gray-400">
        Materi / topik — satu per baris
        <textarea
          v-model="form.topik"
          rows="6"
          class="input mt-1"
          placeholder="Peluang&#10;Distribusi normal&#10;Uji hipotesis&#10;Regresi linear"
        />
      </label>
      <div>
        <p class="text-sm text-gray-600 dark:text-gray-400">Hari libur belajar (opsional)</p>
        <div class="mt-1 flex flex-wrap gap-1.5">
          <label
            v-for="h in NAMA_HARI"
            :key="h.nilai"
            class="cursor-pointer rounded-lg border px-2.5 py-1 text-sm"
            :class="
              form.hariLibur.includes(h.nilai)
                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'
            "
          >
            <input v-model="form.hariLibur" type="checkbox" :value="h.nilai" class="sr-only" />
            {{ h.label }}
          </label>
        </div>
      </div>
      <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <input v-model="form.keJadwal" type="checkbox" class="h-4 w-4" />
        Tambahkan ujian ke Jadwal &amp; Tugas
      </label>
      <p v-if="pratinjau" class="text-xs text-gray-500">
        {{ pratinjau.topik }} topik dibagi ke {{ Math.max(1, pratinjau.hari) }} hari belajar{{
          pratinjau.hari >= 2 ? ' (hari terakhir untuk review)' : ''
        }}.
      </p>
      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
      <button :disabled="menyimpan" class="btn-primary px-5 py-2 disabled:opacity-60">
        {{ menyimpan ? 'Menyusun...' : 'Susun rencana' }}
      </button>
    </form>

    <!-- Daftar rencana -->
    <div class="mt-6 space-y-3">
      <p v-if="loading" class="text-center text-sm text-gray-500">Memuat...</p>
      <p v-else-if="!daftar.length" class="text-center text-sm text-gray-500">
        Belum ada rencana belajar.
      </p>
      <NuxtLink
        v-for="r in daftar"
        :key="r.id"
        :to="`/alat/rencana/${r.id}`"
        class="card block hover:border-primary-300"
      >
        <div class="flex items-center justify-between gap-3">
          <p class="truncate font-medium text-gray-900 dark:text-white">{{ r.judul }}</p>
          <span class="shrink-0 text-sm font-semibold text-primary-600">{{ hitungMundur(r) }}</span>
        </div>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            class="h-full rounded-full bg-primary-600"
            :style="{ width: `${r.total ? (r.selesai / r.total) * 100 : 0}%` }"
          />
        </div>
        <p class="mt-1 text-xs text-gray-500">{{ r.selesai }}/{{ r.total }} sesi selesai</p>
      </NuxtLink>
    </div>
  </div>
</template>
