<script setup lang="ts">
  // Simulasi Ujian — daftar paket soal buatan sendiri, ujian dari dek Kartu Hafalan, dan riwayat
  // nilai. Tanpa AI: soal ditulis sendiri atau disusun otomatis dari kartu (lihat utils/ujian.ts).
  import {
    MIN_KARTU_UNTUK_UJIAN,
    formatDate,
    formatSisaWaktu,
    type DekKartu,
    type HasilUjian,
    type PaketUjian,
  } from '@kuliahpintar/shared'

  definePageMeta({ middleware: 'auth', layout: 'default' })
  useHead({ title: 'Simulasi Ujian' })

  type PaketRingkas = PaketUjian & { jumlahSoal: number }
  type DekRingkas = Pick<DekKartu, 'id' | 'judul'> & { jumlahKartu: number }

  const supabase = useSupabaseClient()
  const router = useRouter()

  const paket = ref<PaketRingkas[]>([])
  const dek = ref<DekRingkas[]>([])
  const riwayat = ref<HasilUjian[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const form = reactive({ judul: '', durasi: 30 })
  const menyimpan = ref(false)

  async function muat() {
    loading.value = true
    error.value = null
    const userId = (await supabase.auth.getUser()).data.user?.id ?? ''
    const [p, s, d, k, h] = await Promise.all([
      supabase
        .from('paket_ujian')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
      supabase.from('soal_ujian').select('paket_id').eq('user_id', userId).limit(10_000),
      supabase
        .from('dek_kartu')
        .select('id, judul')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
      supabase.from('kartu').select('dek_id').eq('user_id', userId).limit(10_000),
      supabase
        .from('hasil_ujian')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])
    if (p.error || s.error || h.error) {
      error.value = 'Gagal memuat data. Coba muat ulang halaman.'
      loading.value = false
      return
    }
    const hitungSoal = new Map<string, number>()
    for (const x of s.data ?? []) hitungSoal.set(x.paket_id, (hitungSoal.get(x.paket_id) ?? 0) + 1)
    paket.value = ((p.data ?? []) as PaketUjian[]).map((x) => ({
      ...x,
      jumlahSoal: hitungSoal.get(x.id) ?? 0,
    }))

    // Dek kartu opsional — kalau tabelnya belum ada, bagian ini disembunyikan saja
    const hitungKartu = new Map<string, number>()
    for (const x of k.data ?? []) hitungKartu.set(x.dek_id, (hitungKartu.get(x.dek_id) ?? 0) + 1)
    dek.value = (d.data ?? []).map((x) => ({ ...x, jumlahKartu: hitungKartu.get(x.id) ?? 0 }))

    riwayat.value = (h.data ?? []) as HasilUjian[]
    loading.value = false
  }

  async function buatPaket() {
    const judul = form.judul.trim()
    if (!judul) return
    menyimpan.value = true
    const { data, error: e } = await supabase
      .from('paket_ujian')
      .insert({ judul, durasi_menit: Math.min(300, Math.max(1, Math.round(form.durasi))) })
      .select('id')
      .single()
    menyimpan.value = false
    if (e || !data) {
      error.value = 'Gagal membuat paket.'
      return
    }
    await router.push(`/alat/ujian/${data.id}`)
  }

  const nilai = (h: HasilUjian) => Math.round((h.benar / h.total) * 100)

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
    <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">📝 Simulasi Ujian</h1>
    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
      Latihan ujian pilihan ganda dengan batas waktu. Tulis soal sendiri, atau ujikan dek Kartu
      Hafalanmu.
    </p>

    <!-- Buat paket -->
    <form class="card mt-6 space-y-3" @submit.prevent="buatPaket">
      <p class="font-medium text-gray-900 dark:text-white">Buat paket soal</p>
      <input
        v-model="form.judul"
        required
        maxlength="120"
        class="input"
        placeholder="Judul, mis. Latihan UTS Statistika"
      />
      <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        Durasi
        <input
          v-model.number="form.durasi"
          type="number"
          min="1"
          max="300"
          required
          class="input w-24"
        />
        menit
      </label>
      <button :disabled="menyimpan" class="btn-primary px-5 py-2 disabled:opacity-60">
        {{ menyimpan ? 'Membuat...' : 'Buat paket' }}
      </button>
    </form>

    <p v-if="loading" class="mt-6 text-center text-sm text-gray-500">Memuat...</p>
    <p v-else-if="error" class="mt-6 text-center text-sm text-red-500">{{ error }}</p>

    <template v-else>
      <!-- Paket soal -->
      <h2 class="mt-8 font-semibold text-gray-900 dark:text-white">Paket soal</h2>
      <p v-if="!paket.length" class="mt-2 text-sm text-gray-500">Belum ada paket soal.</p>
      <div v-for="p in paket" :key="p.id" class="card mt-3 flex flex-wrap items-center gap-3">
        <NuxtLink :to="`/alat/ujian/${p.id}`" class="min-w-0 flex-1">
          <p class="truncate font-medium text-gray-900 hover:text-primary-600 dark:text-white">
            {{ p.judul }}
          </p>
          <p class="text-xs text-gray-500">{{ p.jumlahSoal }} soal · {{ p.durasi_menit }} menit</p>
        </NuxtLink>
        <NuxtLink
          :to="`/alat/ujian/kerjakan?paket=${p.id}`"
          class="btn-primary px-4 py-1.5 text-sm"
          :class="{ 'pointer-events-none opacity-50': !p.jumlahSoal }"
        >
          Mulai
        </NuxtLink>
      </div>

      <!-- Dari dek kartu -->
      <template v-if="dek.length">
        <h2 class="mt-8 font-semibold text-gray-900 dark:text-white">Ujian dari Kartu Hafalan</h2>
        <p class="mt-1 text-xs text-gray-500">
          Soal pilihan ganda disusun otomatis dari kartu; pilihan pengecoh diambil dari jawaban
          kartu lain. Minimal {{ MIN_KARTU_UNTUK_UJIAN }} kartu.
        </p>
        <div v-for="d in dek" :key="d.id" class="card mt-3 flex flex-wrap items-center gap-3">
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium text-gray-900 dark:text-white">{{ d.judul }}</p>
            <p class="text-xs text-gray-500">{{ d.jumlahKartu }} kartu</p>
          </div>
          <NuxtLink
            :to="`/alat/ujian/kerjakan?dek=${d.id}`"
            class="btn-secondary px-4 py-1.5 text-sm"
            :class="{ 'pointer-events-none opacity-50': d.jumlahKartu < MIN_KARTU_UNTUK_UJIAN }"
          >
            Mulai
          </NuxtLink>
        </div>
      </template>

      <!-- Riwayat -->
      <h2 class="mt-8 font-semibold text-gray-900 dark:text-white">Riwayat nilai</h2>
      <p v-if="!riwayat.length" class="mt-2 text-sm text-gray-500">Belum ada ujian yang selesai.</p>
      <div v-else class="card mt-3 divide-y divide-gray-100 py-1 dark:divide-gray-800">
        <div v-for="h in riwayat" :key="h.id" class="flex items-center gap-3 py-2 text-sm">
          <div class="min-w-0 flex-1">
            <p class="truncate text-gray-900 dark:text-white">{{ h.judul }}</p>
            <p class="text-xs text-gray-500">
              {{ formatDate(h.created_at, { timeStyle: 'short' }) }} ·
              {{ formatSisaWaktu(h.durasi_detik) }}
            </p>
          </div>
          <span class="text-xs text-gray-500">{{ h.benar }}/{{ h.total }}</span>
          <span
            class="w-10 text-right font-semibold"
            :class="nilai(h) >= 70 ? 'text-green-600' : 'text-red-500'"
          >
            {{ nilai(h) }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>
