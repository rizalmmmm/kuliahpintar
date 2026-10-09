<script setup lang="ts">
  // Detail Rencana Belajar: sesi per hari (centang selesai), hitung mundur, progres, dan susun
  // ulang sisa materi mulai hari ini bila ada sesi yang terlewat.
  import {
    JUDUL_REVIEW,
    dariKunciTanggal,
    hariTersedia,
    kunciTanggal,
    selisihHari,
    susunRencana,
    type RencanaBelajar,
    type SesiRencana,
    type SesiTersusun,
  } from '@kuliahpintar/shared'

  definePageMeta({ middleware: 'auth', layout: 'default' })

  const LABEL_JENIS: Record<SesiRencana['jenis'], string> = {
    materi: 'Materi',
    ulang: 'Ulang',
    review: 'Review',
  }

  const supabase = useSupabaseClient()
  const route = useRoute()
  const router = useRouter()
  const rencanaId = computed(() => route.params['id'] as string)

  const rencana = ref<RencanaBelajar | null>(null)
  const sesi = ref<SesiRencana[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const menyusun = ref(false)
  const hariIni = kunciTanggal(new Date())

  useHead(() => ({ title: rencana.value?.judul ?? 'Rencana Belajar' }))

  async function muat() {
    loading.value = true
    const [r, s] = await Promise.all([
      supabase.from('rencana_belajar').select('*').eq('id', rencanaId.value).maybeSingle(),
      supabase
        .from('sesi_rencana')
        .select('*')
        .eq('rencana_id', rencanaId.value)
        .order('tanggal', { ascending: true })
        .order('urutan', { ascending: true }),
    ])
    if (r.error || s.error || !r.data) {
      error.value = 'Rencana tidak ditemukan.'
    } else {
      rencana.value = r.data as RencanaBelajar
      sesi.value = (s.data ?? []) as SesiRencana[]
    }
    loading.value = false
  }

  const sisaHari = computed(() =>
    rencana.value ? selisihHari(new Date(), dariKunciTanggal(rencana.value.tanggal_ujian)) : 0
  )
  const jumlahSelesai = computed(() => sesi.value.filter((s) => s.selesai).length)
  const persen = computed(() =>
    sesi.value.length ? Math.round((jumlahSelesai.value / sesi.value.length) * 100) : 0
  )
  const terlewat = computed(() => sesi.value.filter((s) => !s.selesai && s.tanggal < hariIni))

  const perHari = computed(() => {
    const grup = new Map<string, SesiRencana[]>()
    for (const s of sesi.value) grup.set(s.tanggal, [...(grup.get(s.tanggal) ?? []), s])
    return [...grup].map(([tanggal, isi]) => ({ tanggal, isi }))
  })

  function labelTanggal(kunci: string) {
    const teks = dariKunciTanggal(kunci).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    })
    if (kunci === hariIni) return `Hari ini · ${teks}`
    return teks
  }

  async function centang(s: SesiRencana) {
    const selesai = !s.selesai
    const { error: e } = await supabase
      .from('sesi_rencana')
      .update({ selesai, selesai_at: selesai ? new Date().toISOString() : null })
      .eq('id', s.id)
    if (e) {
      error.value = 'Gagal menyimpan. Coba lagi.'
      return
    }
    s.selesai = selesai
    s.selesai_at = selesai ? new Date().toISOString() : null
  }

  /**
   * Susun ulang mulai hari ini: sesi yang sudah selesai dipertahankan, sesi yang belum selesai
   * dihapus, lalu topik yang materinya belum dipelajari dibagi lagi ke hari tersisa.
   */
  async function susunUlang() {
    const r = rencana.value
    if (!r) return
    if (!window.confirm('Susun ulang sesi yang belum selesai mulai hari ini?')) return
    menyusun.value = true
    error.value = null

    const sudahDipelajari = new Set(
      sesi.value.filter((s) => s.jenis === 'materi' && s.selesai).map((s) => s.judul)
    )
    const sisaTopik = r.topik.filter((t) => !sudahDipelajari.has(t))
    const ujian = dariKunciTanggal(r.tanggal_ujian)

    let baru: SesiTersusun[]
    if (sisaTopik.length) {
      baru = susunRencana({
        topik: sisaTopik,
        mulai: new Date(),
        tanggalUjian: ujian,
        hariLibur: r.hari_libur,
      })
    } else {
      // Semua materi sudah dipelajari → cukup sesi review di hari terakhir sebelum ujian
      const hari = hariTersedia(new Date(), ujian, r.hari_libur)
      const tgl = hari.length ? hari[hari.length - 1]! : new Date()
      baru = [{ tanggal: kunciTanggal(tgl), judul: JUDUL_REVIEW, jenis: 'review', urutan: 0 }]
    }

    const { error: e1 } = await supabase
      .from('sesi_rencana')
      .delete()
      .eq('rencana_id', r.id)
      .eq('selesai', false)
    if (e1) {
      menyusun.value = false
      error.value = 'Gagal menyusun ulang.'
      return
    }
    // Urutan dilanjutkan setelah sesi selesai yang sudah ada di tanggal yang sama
    const urutanTerakhir = new Map<string, number>()
    for (const s of sesi.value.filter((x) => x.selesai)) {
      urutanTerakhir.set(s.tanggal, Math.max(urutanTerakhir.get(s.tanggal) ?? -1, s.urutan))
    }
    const { error: e2 } = await supabase.from('sesi_rencana').insert(
      baru.map((s) => ({
        ...s,
        urutan: s.urutan + (urutanTerakhir.get(s.tanggal) ?? -1) + 1,
        rencana_id: r.id,
      }))
    )
    menyusun.value = false
    if (e2) error.value = 'Sebagian sesi gagal disimpan. Coba susun ulang lagi.'
    await muat()
  }

  async function hapusRencana() {
    if (!window.confirm(`Hapus rencana "${rencana.value?.judul}"?`)) return
    const { error: e } = await supabase.from('rencana_belajar').delete().eq('id', rencanaId.value)
    if (!e) await router.push('/alat/rencana')
  }

  onMounted(muat)
</script>

<template>
  <div class="container mx-auto max-w-2xl px-4 py-8">
    <NuxtLink
      to="/alat/rencana"
      class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
    >
      ← Rencana Belajar
    </NuxtLink>

    <p v-if="loading" class="mt-8 text-center text-sm text-gray-500">Memuat...</p>
    <p v-else-if="!rencana" class="mt-8 text-center text-sm text-red-500">{{ error }}</p>

    <template v-else>
      <div class="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ rencana.judul }}</h1>
          <p class="mt-1 text-sm text-gray-500">
            Ujian
            {{
              dariKunciTanggal(rencana.tanggal_ujian).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            }}
          </p>
        </div>
        <p class="text-2xl font-bold text-primary-600">
          {{ sisaHari < 0 ? 'Selesai' : sisaHari === 0 ? 'Hari ini!' : `H-${sisaHari}` }}
        </p>
      </div>

      <!-- Progres -->
      <div class="card mt-4">
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-600 dark:text-gray-400">
            {{ jumlahSelesai }}/{{ sesi.length }} sesi selesai
          </span>
          <span class="font-semibold text-gray-900 dark:text-white">{{ persen }}%</span>
        </div>
        <div class="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div class="h-full rounded-full bg-primary-600" :style="{ width: `${persen}%` }" />
        </div>
        <div
          v-if="terlewat.length && sisaHari >= 0"
          class="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        >
          <span>⚠️ {{ terlewat.length }} sesi terlewat.</span>
          <button
            :disabled="menyusun"
            class="font-medium underline disabled:opacity-60"
            @click="susunUlang"
          >
            {{ menyusun ? 'Menyusun...' : 'Susun ulang mulai hari ini' }}
          </button>
        </div>
        <p v-if="error" class="mt-2 text-sm text-red-500">{{ error }}</p>
      </div>

      <!-- Sesi per hari -->
      <div class="mt-6 space-y-4">
        <div v-for="h in perHari" :key="h.tanggal">
          <p
            class="text-xs font-semibold uppercase tracking-wide"
            :class="h.tanggal === hariIni ? 'text-primary-600' : 'text-gray-500'"
          >
            {{ labelTanggal(h.tanggal) }}
          </p>
          <div
            class="card mt-1.5 divide-y divide-gray-100 py-1 dark:divide-gray-800"
            :class="h.tanggal === hariIni ? 'border-primary-300 dark:border-primary-800' : ''"
          >
            <label
              v-for="s in h.isi"
              :key="s.id"
              class="flex cursor-pointer items-center gap-3 py-2.5"
            >
              <input
                type="checkbox"
                :checked="s.selesai"
                class="h-5 w-5 shrink-0"
                @change="centang(s)"
              />
              <span
                class="min-w-0 flex-1 text-sm"
                :class="
                  s.selesai
                    ? 'text-gray-400 line-through'
                    : s.tanggal < hariIni
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-gray-800 dark:text-gray-200'
                "
              >
                {{ s.judul }}
              </span>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-[11px]"
                :class="
                  s.jenis === 'review'
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                "
              >
                {{ LABEL_JENIS[s.jenis] }}
              </span>
            </label>
          </div>
        </div>
        <p v-if="!sesi.length" class="text-center text-sm text-gray-500">
          Belum ada sesi.
          <button class="text-primary-600 hover:underline" @click="susunUlang">
            Susun sekarang
          </button>
        </p>
      </div>

      <div class="mt-8 flex flex-wrap gap-4 text-sm">
        <button
          v-if="sesi.length && sisaHari >= 0"
          :disabled="menyusun"
          class="text-gray-500 hover:underline"
          @click="susunUlang"
        >
          Susun ulang jadwal
        </button>
        <button class="text-red-600 hover:underline" @click="hapusRencana">Hapus rencana</button>
      </div>
    </template>
  </div>
</template>
