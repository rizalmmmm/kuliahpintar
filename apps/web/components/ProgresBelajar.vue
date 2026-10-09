<script setup lang="ts">
  // Widget dashboard: streak harian, ringkasan minggu ini vs minggu lalu, dan heatmap aktivitas
  // 12 minggu. Sumber: Timer Fokus (sesi_fokus), tugas selesai (tugas), Kartu Hafalan
  // (aktivitas_kartu_harian) dan Simulasi Ujian (hasil_ujian). Tanpa AI.
  import {
    awalMinggu,
    hitungStreak,
    kisiHeatmap,
    kunciTanggal,
    tingkatAktivitas,
  } from '@kuliahpintar/shared'

  const JUMLAH_MINGGU = 12
  const NAMA_HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
  // Skala satu warna (terang → gelap); di mode gelap urutannya dibalik agar tetap naik kontras
  const KELAS_TINGKAT = [
    'bg-gray-100 dark:bg-gray-800',
    'bg-primary-300 dark:bg-primary-900',
    'bg-primary-500 dark:bg-primary-700',
    'bg-primary-700 dark:bg-primary-500',
    'bg-primary-900 dark:bg-primary-300',
  ]

  type Harian = { menit: number; tugas: number; kartu: number; ujian: number }

  const supabase = useSupabaseClient()
  const siap = ref(false)
  const perHari = ref(new Map<string, Harian>())
  const dipilih = ref(kunciTanggal(new Date()))

  const kisi = kisiHeatmap(JUMLAH_MINGGU)

  function tambah(kunci: string, isi: Partial<Harian>) {
    const h = perHari.value.get(kunci) ?? { menit: 0, tugas: 0, kartu: 0, ujian: 0 }
    h.menit += isi.menit ?? 0
    h.tugas += isi.tugas ?? 0
    h.kartu += isi.kartu ?? 0
    h.ujian += isi.ujian ?? 0
    perHari.value.set(kunci, h)
  }

  onMounted(async () => {
    const mulai = kisi[0]![0]!.tanggal
    const sejak = mulai.toISOString()
    const [f, t, k, u] = await Promise.all([
      supabase.from('sesi_fokus').select('selesai_at, durasi_menit').gte('selesai_at', sejak),
      supabase.from('tugas').select('selesai_at').eq('selesai', true).gte('selesai_at', sejak),
      supabase
        .from('aktivitas_kartu_harian')
        .select('tanggal, jumlah')
        .gte('tanggal', kunciTanggal(mulai)),
      supabase.from('hasil_ujian').select('created_at').gte('created_at', sejak),
    ])
    perHari.value = new Map()
    for (const x of f.data ?? [])
      tambah(kunciTanggal(new Date(x.selesai_at)), { menit: x.durasi_menit })
    for (const x of t.data ?? []) {
      if (x.selesai_at) tambah(kunciTanggal(new Date(x.selesai_at)), { tugas: 1 })
    }
    for (const x of k.data ?? []) tambah(x.tanggal, { kartu: x.jumlah })
    for (const x of u.data ?? []) tambah(kunciTanggal(new Date(x.created_at)), { ujian: 1 })
    siap.value = true
  })

  const skor = (h?: Harian) => (h ? h.menit / 5 + h.tugas * 2 + h.kartu / 2 + h.ujian * 3 : 0)

  const streak = computed(() => {
    const aktif = new Set([...perHari.value].filter(([, h]) => skor(h) > 0).map(([k]) => k))
    return hitungStreak(aktif)
  })

  function jumlahMinggu(senin: Date): Harian {
    const total = { menit: 0, tugas: 0, kartu: 0, ujian: 0 }
    for (let i = 0; i < 7; i++) {
      const h = perHari.value.get(
        kunciTanggal(new Date(senin.getFullYear(), senin.getMonth(), senin.getDate() + i))
      )
      if (!h) continue
      total.menit += h.menit
      total.tugas += h.tugas
      total.kartu += h.kartu
      total.ujian += h.ujian
    }
    return total
  }

  const ringkasan = computed(() => {
    const seninIni = awalMinggu(new Date())
    const seninLalu = new Date(seninIni.getFullYear(), seninIni.getMonth(), seninIni.getDate() - 7)
    const ini = jumlahMinggu(seninIni)
    const lalu = jumlahMinggu(seninLalu)
    return [
      { label: 'Menit fokus', ini: ini.menit, lalu: lalu.menit, to: '/alat/fokus' },
      { label: 'Tugas selesai', ini: ini.tugas, lalu: lalu.tugas, to: '/alat/jadwal' },
      { label: 'Kartu diulang', ini: ini.kartu, lalu: lalu.kartu, to: '/alat/kartu' },
      { label: 'Ujian selesai', ini: ini.ujian, lalu: lalu.ujian, to: '/alat/ujian' },
    ]
  })

  const adaAktivitas = computed(() => perHari.value.size > 0)

  // Label bulan di atas kolom yang memuat tanggal 1–7 (awal bulan)
  const labelBulan = computed(() =>
    kisi.map((minggu, i) => {
      const senin = minggu[0]!.tanggal
      return i === 0 || senin.getDate() <= 7
        ? senin.toLocaleDateString('id-ID', { month: 'short' })
        : ''
    })
  )

  function rincian(kunci: string) {
    const h = perHari.value.get(kunci)
    const [y, m, d] = kunci.split('-').map(Number) as [number, number, number]
    const tgl = new Date(y, m - 1, d).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    if (!h || skor(h) === 0) return `${tgl}: belum ada aktivitas`
    const bagian = [
      h.menit && `${h.menit} menit fokus`,
      h.tugas && `${h.tugas} tugas selesai`,
      h.kartu && `${h.kartu} kartu diulang`,
      h.ujian && `${h.ujian} ujian`,
    ].filter(Boolean)
    return `${tgl}: ${bagian.join(' · ')}`
  }

  function selisih(ini: number, lalu: number) {
    const d = ini - lalu
    if (d === 0) return 'sama dengan minggu lalu'
    return `${d > 0 ? '▲' : '▼'} ${Math.abs(d)} dari minggu lalu`
  }
</script>

<template>
  <div v-if="siap" class="card">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <h2 class="font-semibold text-gray-900 dark:text-white">📈 Progres Belajar</h2>
      <div class="sm:text-right">
        <p class="text-lg font-bold text-gray-900 dark:text-white">🔥 {{ streak.sekarang }} hari</p>
        <p class="text-xs text-gray-500">streak · terpanjang {{ streak.terpanjang }} hari</p>
      </div>
    </div>

    <!-- Minggu ini vs minggu lalu -->
    <p class="mt-4 text-xs font-medium text-gray-500">Minggu ini (Senin–Minggu)</p>
    <div class="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <NuxtLink
        v-for="r in ringkasan"
        :key="r.label"
        :to="r.to"
        class="rounded-lg bg-gray-50 px-3 py-2 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
      >
        <p class="text-xs text-gray-500">{{ r.label }}</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">{{ r.ini }}</p>
        <p class="text-[11px] text-gray-500">{{ selisih(r.ini, r.lalu) }}</p>
      </NuxtLink>
    </div>

    <!-- Heatmap 12 minggu -->
    <div class="mt-5">
      <p class="text-xs font-medium text-gray-500">Aktivitas {{ JUMLAH_MINGGU }} minggu terakhir</p>
      <!-- Kisi baris = hari (Sen–Min), kolom = minggu; kotak berukuran tetap agar rapat -->
      <div class="mt-2 overflow-x-auto">
        <div
          class="inline-grid gap-[3px]"
          :style="{
            gridTemplateColumns: `auto repeat(${JUMLAH_MINGGU}, 16px)`,
            gridTemplateRows: '14px repeat(7, 16px)',
          }"
          aria-label="Heatmap aktivitas belajar"
        >
          <span />
          <span
            v-for="(b, w) in labelBulan"
            :key="`b${w}`"
            class="overflow-visible whitespace-nowrap text-[10px] leading-[14px] text-gray-400"
          >
            {{ b }}
          </span>
          <template v-for="(h, r) in NAMA_HARI" :key="h">
            <span class="pr-1 text-[10px] leading-4 text-gray-400">{{ r % 2 ? '' : h }}</span>
            <button
              v-for="minggu in kisi"
              :key="minggu[r]!.kunci"
              type="button"
              class="h-4 w-4 rounded-sm outline-offset-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
              :class="[
                minggu[r]!.masaDepan
                  ? 'invisible'
                  : KELAS_TINGKAT[tingkatAktivitas(skor(perHari.get(minggu[r]!.kunci)))],
                dipilih === minggu[r]!.kunci ? 'ring-2 ring-gray-900 dark:ring-white' : '',
              ]"
              :disabled="minggu[r]!.masaDepan"
              :aria-label="rincian(minggu[r]!.kunci)"
              @mouseenter="dipilih = minggu[r]!.kunci"
              @focus="dipilih = minggu[r]!.kunci"
              @click="dipilih = minggu[r]!.kunci"
            />
          </template>
        </div>
      </div>

      <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs text-gray-700 dark:text-gray-300" aria-live="polite">
          {{ rincian(dipilih) }}
        </p>
        <div class="flex items-center gap-1 text-[10px] text-gray-400">
          Sedikit
          <span
            v-for="(k, i) in KELAS_TINGKAT"
            :key="i"
            class="h-2.5 w-2.5 rounded-sm"
            :class="k"
          />
          Banyak
        </div>
      </div>

      <p v-if="!adaAktivitas" class="mt-3 text-xs text-gray-500">
        Mulai dari
        <NuxtLink to="/alat/fokus" class="text-primary-600 hover:underline">Timer Fokus</NuxtLink>,
        <NuxtLink to="/alat/kartu" class="text-primary-600 hover:underline">Kartu Hafalan</NuxtLink
        >, atau selesaikan tugas — aktivitasmu akan muncul di sini.
      </p>
    </div>
  </div>
</template>
