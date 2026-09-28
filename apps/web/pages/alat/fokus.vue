<script setup lang="ts">
  // Timer Fokus (Pomodoro) — tanpa AI. Sesi fokus yang selesai disimpan ke Supabase untuk
  // statistik mingguan & streak.
  import type { SesiFokus } from '@kuliahpintar/shared'

  definePageMeta({ middleware: 'auth', layout: 'default' })

  const supabase = useSupabaseClient()

  type Mode = 'fokus' | 'pendek' | 'panjang'
  const LABEL_MODE: Record<Mode, string> = {
    fokus: '🎯 Fokus',
    pendek: '☕ Istirahat',
    panjang: '🌿 Istirahat Panjang',
  }
  const KUNCI_SETELAN = 'kp-fokus-setelan'

  const setelan = reactive({ fokus: 25, pendek: 5, panjang: 15 })
  const mode = ref<Mode>('fokus')
  const label = ref('')
  const berjalan = ref(false)
  const sisaMs = ref(setelan.fokus * 60_000)
  const fokusBeruntun = ref(0) // jumlah sesi fokus sejak istirahat panjang terakhir
  let targetAkhir = 0
  let timer: ReturnType<typeof setInterval> | null = null

  const totalMs = computed(() => setelan[mode.value] * 60_000)
  const progres = computed(() => 1 - sisaMs.value / totalMs.value)
  const tampilan = computed(() => {
    const s = Math.max(0, Math.ceil(sisaMs.value / 1000))
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  })

  useHead(() => ({
    title: berjalan.value ? `${tampilan.value} · ${LABEL_MODE[mode.value]}` : 'Timer Fokus',
  }))

  onMounted(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KUNCI_SETELAN) ?? 'null') as typeof setelan | null
      if (s) Object.assign(setelan, s)
    } catch {
      // abaikan
    }
    sisaMs.value = totalMs.value
    muatStatistik()
  })

  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
    window.removeEventListener('beforeunload', cegahTutup)
  })

  function simpanSetelan() {
    for (const k of ['fokus', 'pendek', 'panjang'] as const) {
      setelan[k] = Math.min(180, Math.max(1, Math.round(Number(setelan[k]) || 1)))
    }
    try {
      localStorage.setItem(KUNCI_SETELAN, JSON.stringify(setelan))
    } catch {
      // abaikan
    }
    if (!berjalan.value) sisaMs.value = totalMs.value
  }

  function cegahTutup(e: BeforeUnloadEvent) {
    e.preventDefault()
  }

  // Timer berbasis waktu akhir → tetap akurat walau tab di-throttle browser
  function mulai() {
    if (berjalan.value) return
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
    targetAkhir = Date.now() + sisaMs.value
    berjalan.value = true
    timer = setInterval(() => {
      sisaMs.value = targetAkhir - Date.now()
      if (sisaMs.value <= 0) selesai()
    }, 250)
    if (mode.value === 'fokus') window.addEventListener('beforeunload', cegahTutup)
  }

  function jeda() {
    if (timer) clearInterval(timer)
    timer = null
    berjalan.value = false
    sisaMs.value = Math.max(0, targetAkhir - Date.now())
    window.removeEventListener('beforeunload', cegahTutup)
  }

  function gantiMode(m: Mode) {
    jeda()
    mode.value = m
    sisaMs.value = totalMs.value
  }

  function reset() {
    jeda()
    sisaMs.value = totalMs.value
  }

  function bunyi() {
    try {
      const ctx = new AudioContext()
      ;[0, 0.35, 0.7].forEach((t) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.2, ctx.currentTime + t)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3)
        osc.connect(gain).connect(ctx.destination)
        osc.start(ctx.currentTime + t)
        osc.stop(ctx.currentTime + t + 0.3)
      })
      setTimeout(() => ctx.close(), 1_500)
    } catch {
      // audio tidak tersedia
    }
  }

  function notifikasi(pesan: string) {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('KuliahPintar — Timer Fokus', { body: pesan })
      }
    } catch {
      // abaikan
    }
  }

  async function selesai(menitManual?: number) {
    const modeSelesai = mode.value
    jeda()
    bunyi()

    if (modeSelesai === 'fokus') {
      const menit = menitManual ?? setelan.fokus
      await simpanSesi(menit)
      fokusBeruntun.value++
      const panjang = fokusBeruntun.value % 4 === 0
      notifikasi(`Sesi fokus ${menit} menit selesai! Waktunya istirahat.`)
      mode.value = panjang ? 'panjang' : 'pendek'
    } else {
      notifikasi('Istirahat selesai. Yuk fokus lagi!')
      mode.value = 'fokus'
    }
    sisaMs.value = totalMs.value
  }

  // Selesai lebih awal — simpan menit yang sudah berjalan
  const menitBerjalan = computed(() =>
    Math.floor((totalMs.value - Math.max(0, sisaMs.value)) / 60_000)
  )
  function selesaiAwal() {
    if (menitBerjalan.value >= 1) selesai(menitBerjalan.value)
  }

  // ── Statistik ──
  const sesi = ref<Pick<SesiFokus, 'durasi_menit' | 'selesai_at'>[]>([])
  const error = ref<string | null>(null)

  async function muatStatistik() {
    const sejak = new Date(Date.now() - 60 * 86_400_000).toISOString()
    const { data, error: e } = await supabase
      .from('sesi_fokus')
      .select('durasi_menit, selesai_at')
      .gte('selesai_at', sejak)
      .order('selesai_at')
    if (e) error.value = 'Gagal memuat statistik.'
    sesi.value = (data ?? []) as typeof sesi.value
  }

  async function simpanSesi(menit: number) {
    const baris = { durasi_menit: menit, label: label.value.trim() || null }
    const { data, error: e } = await supabase
      .from('sesi_fokus')
      .insert(baris)
      .select('durasi_menit, selesai_at')
      .single()
    if (e || !data) {
      error.value = 'Sesi selesai, tapi gagal disimpan ke statistik.'
      return
    }
    sesi.value.push(data as (typeof sesi.value)[number])
  }

  function kunciTanggal(d: Date) {
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
  }

  const menitPerHari = computed(() => {
    const m = new Map<string, number>()
    for (const s of sesi.value) {
      const k = kunciTanggal(new Date(s.selesai_at))
      m.set(k, (m.get(k) ?? 0) + s.durasi_menit)
    }
    return m
  })

  const hariIni = computed(() => menitPerHari.value.get(kunciTanggal(new Date())) ?? 0)

  // Senin–Minggu minggu ini
  const minggu = computed(() => {
    const now = new Date()
    const offset = (now.getDay() + 6) % 7 // 0 = Senin
    const senin = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset)
    return ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((nama, i) => {
      const d = new Date(senin.getFullYear(), senin.getMonth(), senin.getDate() + i)
      return { nama, menit: menitPerHari.value.get(kunciTanggal(d)) ?? 0, hariIni: i === offset }
    })
  })
  const maksMinggu = computed(() => Math.max(60, ...minggu.value.map((h) => h.menit)))
  const totalMinggu = computed(() => minggu.value.reduce((n, h) => n + h.menit, 0))

  // Streak: hari berturut-turut dengan ≥1 sesi, dihitung sampai hari ini (atau kemarin bila hari ini belum)
  const streak = computed(() => {
    const d = new Date()
    if (!menitPerHari.value.has(kunciTanggal(d))) d.setDate(d.getDate() - 1)
    let n = 0
    while (menitPerHari.value.has(kunciTanggal(d))) {
      n++
      d.setDate(d.getDate() - 1)
    }
    return n
  })

  const formatJam = (menit: number) =>
    menit >= 60 ? `${Math.floor(menit / 60)} j ${menit % 60} m` : `${menit} m`

  // Lingkaran progres
  const R = 88
  const KELILING = 2 * Math.PI * R
</script>

<template>
  <div class="container mx-auto max-w-xl px-4 py-8">
    <NuxtLink
      to="/dashboard"
      class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
    >
      ← Dashboard
    </NuxtLink>
    <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">⏱️ Timer Fokus</h1>
    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
      Belajar teknik Pomodoro: fokus penuh, lalu istirahat singkat. Setiap 4 sesi, istirahat
      panjang.
    </p>

    <!-- Mode -->
    <div class="mt-6 flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-900">
      <button
        v-for="m in ['fokus', 'pendek', 'panjang'] as const"
        :key="m"
        type="button"
        :class="[
          'flex-1 rounded-lg py-2 text-xs font-medium transition-colors sm:text-sm',
          mode === m
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
        ]"
        @click="gantiMode(m)"
      >
        {{ LABEL_MODE[m] }}
      </button>
    </div>

    <!-- Timer -->
    <div class="mt-8 flex flex-col items-center">
      <div class="relative h-56 w-56">
        <svg viewBox="0 0 200 200" class="h-full w-full -rotate-90">
          <circle
            cx="100"
            cy="100"
            :r="R"
            fill="none"
            stroke-width="10"
            class="stroke-gray-200 dark:stroke-gray-800"
          />
          <circle
            cx="100"
            cy="100"
            :r="R"
            fill="none"
            stroke-width="10"
            stroke-linecap="round"
            :class="mode === 'fokus' ? 'stroke-primary-500' : 'stroke-green-500'"
            :stroke-dasharray="KELILING"
            :stroke-dashoffset="KELILING * (1 - progres)"
            style="transition: stroke-dashoffset 0.25s linear"
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="font-mono text-5xl font-bold tabular-nums text-gray-900 dark:text-white">
            {{ tampilan }}
          </span>
          <span class="mt-1 text-xs text-gray-500">Sesi ke-{{ fokusBeruntun + 1 }}</span>
        </div>
      </div>

      <input
        v-if="mode === 'fokus'"
        v-model="label"
        class="input mt-6 max-w-xs text-center text-sm"
        placeholder="Belajar apa? (opsional)"
        maxlength="120"
      />

      <div class="mt-5 flex items-center gap-3">
        <button
          v-if="!berjalan"
          type="button"
          class="btn-primary px-8 py-3 text-base"
          @click="mulai"
        >
          ▶ Mulai
        </button>
        <button v-else type="button" class="btn-secondary px-8 py-3 text-base" @click="jeda">
          ⏸ Jeda
        </button>
        <button
          type="button"
          class="px-3 py-3 text-sm text-gray-500 hover:text-gray-700"
          @click="reset"
        >
          ↺ Reset
        </button>
      </div>
      <button
        v-if="mode === 'fokus' && menitBerjalan >= 1"
        type="button"
        class="mt-3 text-xs text-gray-500 hover:text-primary-600"
        @click="selesaiAwal"
      >
        Selesai lebih awal & simpan {{ menitBerjalan }} menit
      </button>
      <button
        v-else-if="mode !== 'fokus'"
        type="button"
        class="mt-3 text-xs text-gray-500 hover:text-primary-600"
        @click="gantiMode('fokus')"
      >
        Lewati istirahat
      </button>
    </div>

    <p v-if="error" class="mt-4 text-center text-sm text-red-600">{{ error }}</p>

    <!-- Statistik -->
    <div class="mt-10 grid grid-cols-3 gap-3">
      <div class="card py-3 text-center">
        <p class="text-xs text-gray-500">Hari ini</p>
        <p class="mt-1 text-lg font-bold text-gray-900 dark:text-white">{{ formatJam(hariIni) }}</p>
      </div>
      <div class="card py-3 text-center">
        <p class="text-xs text-gray-500">Minggu ini</p>
        <p class="mt-1 text-lg font-bold text-gray-900 dark:text-white">
          {{ formatJam(totalMinggu) }}
        </p>
      </div>
      <div class="card py-3 text-center">
        <p class="text-xs text-gray-500">Streak</p>
        <p class="mt-1 text-lg font-bold text-orange-500">🔥 {{ streak }} hari</p>
      </div>
    </div>

    <div class="card mt-3">
      <p class="text-xs font-medium text-gray-500">Menit fokus minggu ini</p>
      <div class="mt-3 flex h-32 items-end gap-2">
        <div v-for="h in minggu" :key="h.nama" class="flex flex-1 flex-col items-center gap-1">
          <span class="text-[10px] tabular-nums text-gray-400">{{ h.menit || '' }}</span>
          <div
            class="w-full rounded-t-md"
            :class="h.hariIni ? 'bg-primary-500' : 'bg-primary-200 dark:bg-primary-900'"
            :style="{ height: `${Math.max(2, (h.menit / maksMinggu) * 96)}px` }"
          />
          <span
            class="text-[10px]"
            :class="h.hariIni ? 'font-semibold text-primary-600' : 'text-gray-500'"
          >
            {{ h.nama }}
          </span>
        </div>
      </div>
    </div>

    <!-- Setelan -->
    <details class="mt-3 rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-900">
      <summary class="cursor-pointer font-medium text-gray-600 dark:text-gray-400">
        ⚙️ Atur durasi
      </summary>
      <div class="mt-3 grid grid-cols-3 gap-3">
        <label
          v-for="k in ['fokus', 'pendek', 'panjang'] as const"
          :key="k"
          class="text-xs text-gray-500"
        >
          {{ LABEL_MODE[k] }} (menit)
          <input
            v-model.number="setelan[k]"
            type="number"
            min="1"
            max="180"
            class="input mt-1 text-center"
            @change="simpanSetelan"
          />
        </label>
      </div>
    </details>
  </div>
</template>
