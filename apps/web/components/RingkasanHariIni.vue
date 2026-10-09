<script setup lang="ts">
  // Widget dashboard: kuliah hari ini, tugas yang deadline-nya dekat (≤ 3 hari / terlambat),
  // dan sesi Rencana Belajar hari ini
  import {
    formatRelativeTime,
    kunciTanggal,
    type JadwalKuliah,
    type SesiRencana,
    type Tugas,
  } from '@kuliahpintar/shared'

  type SesiHariIni = Pick<SesiRencana, 'id' | 'judul' | 'selesai' | 'rencana_id'> & {
    rencana_belajar: { judul: string } | null
  }

  const supabase = useSupabaseClient()
  const kuliah = ref<JadwalKuliah[]>([])
  const tugas = ref<Tugas[]>([])
  const sesiRencana = ref<SesiHariIni[]>([])
  const siap = ref(false)

  onMounted(async () => {
    const d = new Date().getDay()
    const hari = d === 0 ? 7 : d
    const batas = new Date(Date.now() + 3 * 86_400_000).toISOString()
    const [j, t, r] = await Promise.all([
      supabase.from('jadwal_kuliah').select('*').eq('hari', hari).order('jam_mulai'),
      supabase
        .from('tugas')
        .select('*')
        .eq('selesai', false)
        .lte('deadline', batas)
        .order('deadline')
        .limit(5),
      supabase
        .from('sesi_rencana')
        .select('id, judul, selesai, rencana_id, rencana_belajar(judul)')
        .eq('tanggal', kunciTanggal(new Date()))
        .order('urutan'),
    ])
    sesiRencana.value = (r.data ?? []) as unknown as SesiHariIni[]
    kuliah.value = (j.data ?? []) as JadwalKuliah[]
    tugas.value = (t.data ?? []) as Tugas[]
    siap.value = true
  })

  const jam = (s: string) => s.slice(0, 5)
  const terlambat = (iso: string) => new Date(iso).getTime() < Date.now()
</script>

<template>
  <div v-if="siap" class="card">
    <div class="flex items-center justify-between">
      <h2 class="font-semibold text-gray-900 dark:text-white">📅 Hari ini</h2>
      <NuxtLink to="/alat/jadwal" class="text-xs text-primary-600 hover:underline"
        >Kelola →</NuxtLink
      >
    </div>

    <div class="mt-3 grid gap-4 sm:grid-cols-2">
      <div>
        <p class="text-xs font-medium text-gray-500">Kuliah</p>
        <ul v-if="kuliah.length" class="mt-1 space-y-1 text-sm">
          <li v-for="k in kuliah" :key="k.id" class="flex gap-2">
            <span class="font-mono text-xs text-gray-500">{{ jam(k.jam_mulai) }}</span>
            <span class="text-gray-800 dark:text-gray-200">{{ k.mata_kuliah }}</span>
            <span v-if="k.ruang" class="text-xs text-gray-400">· {{ k.ruang }}</span>
          </li>
        </ul>
        <p v-else class="mt-1 text-sm text-gray-400">
          Tidak ada kuliah.
          <NuxtLink to="/alat/jadwal?tab=jadwal" class="text-primary-600 hover:underline"
            >Isi jadwal</NuxtLink
          >
        </p>
      </div>
      <div>
        <p class="text-xs font-medium text-gray-500">Deadline dekat</p>
        <ul v-if="tugas.length" class="mt-1 space-y-1 text-sm">
          <li v-for="t in tugas" :key="t.id" class="flex gap-2">
            <span class="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-200">{{
              t.judul
            }}</span>
            <span
              class="shrink-0 text-xs"
              :class="terlambat(t.deadline) ? 'text-red-600' : 'text-orange-600'"
            >
              {{ formatRelativeTime(t.deadline) }}
            </span>
          </li>
        </ul>
        <p v-else class="mt-1 text-sm text-gray-400">Aman, tidak ada deadline 3 hari ke depan 🎉</p>
      </div>
    </div>

    <div v-if="sesiRencana.length" class="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
      <p class="text-xs font-medium text-gray-500">Rencana belajar</p>
      <ul class="mt-1 space-y-1 text-sm">
        <li v-for="s in sesiRencana" :key="s.id" class="flex gap-2">
          <span :class="s.selesai ? 'text-green-600' : 'text-gray-400'">{{
            s.selesai ? '✓' : '○'
          }}</span>
          <NuxtLink
            :to="`/alat/rencana/${s.rencana_id}`"
            class="min-w-0 flex-1 truncate hover:text-primary-600"
            :class="s.selesai ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'"
          >
            {{ s.judul }}
          </NuxtLink>
          <span v-if="s.rencana_belajar" class="shrink-0 truncate text-xs text-gray-400">
            {{ s.rencana_belajar.judul }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>
