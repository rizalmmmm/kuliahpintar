<script setup lang="ts">
  // Jadwal Kuliah & Tugas — tanpa AI. Data langsung ke Supabase (dilindungi RLS per user).
  import {
    NAMA_HARI,
    formatRelativeTime,
    type Hari,
    type JadwalKuliah,
    type Tugas,
  } from '@kuliahpintar/shared'

  definePageMeta({ middleware: 'auth', layout: 'default' })
  useHead({ title: 'Jadwal & Tugas' })

  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const route = useRoute()
  const router = useRouter()

  const tab = computed<'tugas' | 'jadwal'>(() =>
    route.query.tab === 'jadwal' ? 'jadwal' : 'tugas'
  )
  function gantiTab(t: 'tugas' | 'jadwal') {
    router.replace({ query: { ...route.query, tab: t } })
  }

  const tugas = ref<Tugas[]>([])
  const jadwal = ref<JadwalKuliah[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const sekarang = ref(Date.now())
  let tick: ReturnType<typeof setInterval> | null = null

  async function muat() {
    loading.value = true
    error.value = null
    const [t, j] = await Promise.all([
      supabase.from('tugas').select('*').order('deadline', { ascending: true }),
      supabase.from('jadwal_kuliah').select('*').order('hari').order('jam_mulai'),
    ])
    if (t.error || j.error) error.value = 'Gagal memuat data. Coba muat ulang halaman.'
    tugas.value = (t.data ?? []) as Tugas[]
    jadwal.value = (j.data ?? []) as JadwalKuliah[]
    loading.value = false
  }

  onMounted(() => {
    muat()
    muatPreferensi()
    tick = setInterval(() => (sekarang.value = Date.now()), 60_000)
  })
  onBeforeUnmount(() => {
    if (tick) clearInterval(tick)
  })

  const daftarMatkul = computed(() =>
    [...new Set(jadwal.value.map((j) => j.mata_kuliah))].sort((a, b) => a.localeCompare(b))
  )

  // ───────────────────────── Tugas ─────────────────────────
  function tanggalLokal(d: Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const h = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${h}`
  }

  function besok() {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return tanggalLokal(d)
  }

  const formTugas = reactive({
    id: null as string | null,
    judul: '',
    mata_kuliah: '',
    tanggal: besok(),
    jam: '23:59',
    catatan: '',
  })
  const simpanTugasLoading = ref(false)

  function resetFormTugas() {
    Object.assign(formTugas, {
      id: null,
      judul: '',
      mata_kuliah: '',
      tanggal: besok(),
      jam: '23:59',
      catatan: '',
    })
  }

  async function simpanTugas() {
    if (!formTugas.judul.trim() || !formTugas.tanggal) return
    simpanTugasLoading.value = true
    error.value = null
    const payload = {
      judul: formTugas.judul.trim(),
      mata_kuliah: formTugas.mata_kuliah.trim() || null,
      catatan: formTugas.catatan.trim() || null,
      // Input waktu lokal browser → simpan UTC
      deadline: new Date(`${formTugas.tanggal}T${formTugas.jam || '23:59'}`).toISOString(),
    }
    const res = formTugas.id
      ? await supabase.from('tugas').update(payload).eq('id', formTugas.id).select().single()
      : await supabase.from('tugas').insert(payload).select().single()
    simpanTugasLoading.value = false
    if (res.error || !res.data) {
      error.value = 'Gagal menyimpan tugas. Coba lagi.'
      return
    }
    const baru = res.data as Tugas
    tugas.value = [...tugas.value.filter((t) => t.id !== baru.id), baru].sort((a, b) =>
      a.deadline.localeCompare(b.deadline)
    )
    resetFormTugas()
  }

  function editTugas(t: Tugas) {
    const d = new Date(t.deadline)
    Object.assign(formTugas, {
      id: t.id,
      judul: t.judul,
      mata_kuliah: t.mata_kuliah ?? '',
      tanggal: tanggalLokal(d),
      jam: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      catatan: t.catatan ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function toggleSelesai(t: Tugas) {
    const selesai = !t.selesai
    const patch = { selesai, selesai_at: selesai ? new Date().toISOString() : null }
    Object.assign(t, patch) // optimistic
    const { error: e } = await supabase.from('tugas').update(patch).eq('id', t.id)
    if (e) {
      Object.assign(t, { selesai: !selesai, selesai_at: null })
      error.value = 'Gagal memperbarui tugas.'
    }
  }

  async function hapusTugas(t: Tugas) {
    if (!window.confirm(`Hapus tugas "${t.judul}"?`)) return
    const { error: e } = await supabase.from('tugas').delete().eq('id', t.id)
    if (e) {
      error.value = 'Gagal menghapus tugas.'
      return
    }
    tugas.value = tugas.value.filter((x) => x.id !== t.id)
    if (formTugas.id === t.id) resetFormTugas()
  }

  type Grup = { kunci: string; judul: string; warna: string; isi: Tugas[] }
  const grupTugas = computed<Grup[]>(() => {
    const now = new Date(sekarang.value)
    const hariIni = tanggalLokal(now)
    const b = new Date(now)
    b.setDate(b.getDate() + 1)
    const tglBesok = tanggalLokal(b)
    const seminggu = now.getTime() + 7 * 86_400_000

    const grup: Record<string, Grup> = {
      terlambat: { kunci: 'terlambat', judul: '⚠️ Terlambat', warna: 'text-red-600', isi: [] },
      hariIni: { kunci: 'hariIni', judul: 'Hari ini', warna: 'text-orange-600', isi: [] },
      besok: { kunci: 'besok', judul: 'Besok', warna: 'text-yellow-600', isi: [] },
      minggu: { kunci: 'minggu', judul: '7 hari ke depan', warna: 'text-gray-700', isi: [] },
      nanti: { kunci: 'nanti', judul: 'Nanti', warna: 'text-gray-500', isi: [] },
    }
    for (const t of tugas.value) {
      if (t.selesai) continue
      const d = new Date(t.deadline)
      const tgl = tanggalLokal(d)
      if (d.getTime() < now.getTime()) grup.terlambat!.isi.push(t)
      else if (tgl === hariIni) grup.hariIni!.isi.push(t)
      else if (tgl === tglBesok) grup.besok!.isi.push(t)
      else if (d.getTime() <= seminggu) grup.minggu!.isi.push(t)
      else grup.nanti!.isi.push(t)
    }
    return Object.values(grup).filter((g) => g.isi.length)
  })

  const tugasSelesai = computed(() =>
    tugas.value
      .filter((t) => t.selesai)
      .sort((a, b) => (b.selesai_at ?? '').localeCompare(a.selesai_at ?? ''))
  )

  function labelDeadline(iso: string) {
    const d = new Date(iso)
    const tgl = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
    const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    return `${tgl}, ${jam}`
  }

  // Preferensi pengingat email
  const pengingatEmail = ref<boolean | null>(null)
  async function muatPreferensi() {
    if (!user.value) return
    const { data } = await supabase
      .from('profiles')
      .select('pengingat_email')
      .eq('id', user.value.id)
      .single()
    pengingatEmail.value = (data as { pengingat_email?: boolean } | null)?.pengingat_email ?? true
  }
  async function togglePengingat() {
    if (!user.value || pengingatEmail.value === null) return
    const nilai = !pengingatEmail.value
    pengingatEmail.value = nilai
    const { error: e } = await supabase
      .from('profiles')
      .update({ pengingat_email: nilai })
      .eq('id', user.value.id)
    if (e) {
      pengingatEmail.value = !nilai
      error.value = 'Gagal menyimpan pengaturan pengingat.'
    }
  }

  // ───────────────────────── Jadwal ─────────────────────────
  const hariIniIso = computed<Hari>(() => {
    const d = new Date(sekarang.value).getDay() // 0 = Minggu
    return (d === 0 ? 7 : d) as Hari
  })

  const formJadwal = reactive({
    mata_kuliah: '',
    hari: 1 as Hari,
    jam_mulai: '08:00',
    jam_selesai: '09:40',
    ruang: '',
    dosen: '',
  })
  const simpanJadwalLoading = ref(false)

  async function simpanJadwal() {
    if (!formJadwal.mata_kuliah.trim()) return
    if (formJadwal.jam_selesai <= formJadwal.jam_mulai) {
      error.value = 'Jam selesai harus setelah jam mulai.'
      return
    }
    simpanJadwalLoading.value = true
    error.value = null
    const { data, error: e } = await supabase
      .from('jadwal_kuliah')
      .insert({
        mata_kuliah: formJadwal.mata_kuliah.trim(),
        hari: formJadwal.hari,
        jam_mulai: formJadwal.jam_mulai,
        jam_selesai: formJadwal.jam_selesai,
        ruang: formJadwal.ruang.trim() || null,
        dosen: formJadwal.dosen.trim() || null,
      })
      .select()
      .single()
    simpanJadwalLoading.value = false
    if (e || !data) {
      error.value = 'Gagal menyimpan jadwal. Coba lagi.'
      return
    }
    jadwal.value = [...jadwal.value, data as JadwalKuliah].sort(
      (a, b) => a.hari - b.hari || a.jam_mulai.localeCompare(b.jam_mulai)
    )
    Object.assign(formJadwal, { mata_kuliah: '', ruang: '', dosen: '' })
  }

  async function hapusJadwal(j: JadwalKuliah) {
    if (!window.confirm(`Hapus jadwal ${j.mata_kuliah} (${NAMA_HARI[j.hari]})?`)) return
    const { error: e } = await supabase.from('jadwal_kuliah').delete().eq('id', j.id)
    if (e) {
      error.value = 'Gagal menghapus jadwal.'
      return
    }
    jadwal.value = jadwal.value.filter((x) => x.id !== j.id)
  }

  const jam = (t: string) => t.slice(0, 5)

  function statusKelas(j: JadwalKuliah): 'berlangsung' | 'selesai' | null {
    if (j.hari !== hariIniIso.value) return null
    const d = new Date(sekarang.value)
    const kini = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    if (kini >= jam(j.jam_mulai) && kini < jam(j.jam_selesai)) return 'berlangsung'
    if (kini >= jam(j.jam_selesai)) return 'selesai'
    return null
  }

  const jadwalPerHari = computed(() =>
    ([1, 2, 3, 4, 5, 6, 7] as Hari[])
      .map((h) => ({ hari: h, isi: jadwal.value.filter((j) => j.hari === h) }))
      .filter((g) => g.isi.length || g.hari <= 5)
  )
</script>

<template>
  <div class="container mx-auto max-w-3xl px-4 py-8">
    <NuxtLink
      to="/dashboard"
      class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
    >
      ← Dashboard
    </NuxtLink>
    <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">🗓️ Jadwal & Tugas</h1>
    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
      Catat deadline tugas dan jadwal kuliah mingguanmu — kami ingatkan H-1 lewat email.
    </p>

    <!-- Tabs -->
    <div class="mt-6 flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-900">
      <button
        v-for="t in ['tugas', 'jadwal'] as const"
        :key="t"
        type="button"
        :class="[
          'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
          tab === t
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
        ]"
        @click="gantiTab(t)"
      >
        {{ t === 'tugas' ? '📌 Tugas' : '🏫 Jadwal Kuliah' }}
      </button>
    </div>

    <div
      v-if="error"
      class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
    >
      {{ error }}
    </div>

    <!-- ═══════════════ TAB TUGAS ═══════════════ -->
    <div v-if="tab === 'tugas'" class="mt-6 space-y-6">
      <form class="card space-y-3" @submit.prevent="simpanTugas">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
          {{ formTugas.id ? 'Edit Tugas' : 'Tambah Tugas' }}
        </h2>
        <input
          v-model="formTugas.judul"
          class="input"
          placeholder="Contoh: Laporan praktikum modul 3"
          maxlength="200"
          required
        />
        <div class="grid gap-3 sm:grid-cols-3">
          <input
            v-model="formTugas.mata_kuliah"
            class="input"
            placeholder="Mata kuliah (opsional)"
            list="daftar-matkul"
            maxlength="120"
          />
          <input v-model="formTugas.tanggal" type="date" class="input" required />
          <input v-model="formTugas.jam" type="time" class="input" />
        </div>
        <datalist id="daftar-matkul">
          <option v-for="m in daftarMatkul" :key="m" :value="m" />
        </datalist>
        <textarea
          v-model="formTugas.catatan"
          rows="2"
          class="input resize-none text-sm"
          placeholder="Catatan (opsional) — format, link pengumpulan, dll."
          maxlength="2000"
        />
        <div class="flex items-center gap-3">
          <button
            type="submit"
            class="btn-primary"
            :disabled="simpanTugasLoading || !formTugas.judul.trim()"
          >
            {{
              simpanTugasLoading
                ? 'Menyimpan...'
                : formTugas.id
                  ? 'Simpan Perubahan'
                  : '+ Tambah Tugas'
            }}
          </button>
          <button
            v-if="formTugas.id"
            type="button"
            class="text-sm text-gray-500 hover:text-gray-700"
            @click="resetFormTugas"
          >
            Batal
          </button>
        </div>
      </form>

      <!-- Pengingat email -->
      <label
        v-if="pengingatEmail !== null"
        class="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-900"
      >
        <span class="text-sm text-gray-700 dark:text-gray-300">
          📧 Ingatkan lewat email ±24 jam sebelum deadline
        </span>
        <input
          type="checkbox"
          class="h-5 w-5 accent-primary-600"
          :checked="pengingatEmail"
          @change="togglePengingat"
        />
      </label>

      <div v-if="loading" class="space-y-2">
        <div
          v-for="i in 3"
          :key="i"
          class="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
        />
      </div>

      <template v-else>
        <div
          v-if="!grupTugas.length"
          class="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-gray-700"
        >
          <div class="text-3xl">🎉</div>
          <p class="mt-2 text-sm text-gray-500">Tidak ada tugas yang menunggu. Santai dulu!</p>
        </div>

        <section v-for="g in grupTugas" :key="g.kunci">
          <h3 class="mb-2 text-sm font-semibold" :class="g.warna">
            {{ g.judul }} <span class="font-normal text-gray-400">({{ g.isi.length }})</span>
          </h3>
          <ul class="space-y-2">
            <li v-for="t in g.isi" :key="t.id" class="card flex items-start gap-3 py-3">
              <input
                type="checkbox"
                class="mt-1 h-5 w-5 shrink-0 accent-primary-600"
                :checked="t.selesai"
                :aria-label="`Tandai ${t.judul} selesai`"
                @change="toggleSelesai(t)"
              />
              <div class="min-w-0 flex-1">
                <p class="break-words text-sm font-medium text-gray-900 dark:text-white">
                  {{ t.judul }}
                </p>
                <p class="mt-0.5 text-xs text-gray-500">
                  <span v-if="t.mata_kuliah">{{ t.mata_kuliah }} · </span>
                  {{ labelDeadline(t.deadline) }} ·
                  <span :class="g.kunci === 'terlambat' ? 'text-red-600' : ''">
                    {{ formatRelativeTime(t.deadline) }}
                  </span>
                </p>
                <p
                  v-if="t.catatan"
                  class="mt-1 whitespace-pre-wrap break-words text-xs text-gray-500"
                >
                  {{ t.catatan }}
                </p>
              </div>
              <div class="flex shrink-0 gap-1 text-xs">
                <button
                  type="button"
                  class="rounded px-2 py-1 text-gray-400 hover:text-gray-700"
                  @click="editTugas(t)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="rounded px-2 py-1 text-gray-400 hover:text-red-600"
                  @click="hapusTugas(t)"
                >
                  Hapus
                </button>
              </div>
            </li>
          </ul>
        </section>

        <details v-if="tugasSelesai.length" class="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
          <summary class="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400">
            ✓ Selesai ({{ tugasSelesai.length }})
          </summary>
          <ul class="mt-3 space-y-2">
            <li v-for="t in tugasSelesai" :key="t.id" class="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                class="h-4 w-4 accent-primary-600"
                checked
                :aria-label="`Batalkan selesai ${t.judul}`"
                @change="toggleSelesai(t)"
              />
              <span class="min-w-0 flex-1 break-words text-gray-500 line-through">{{
                t.judul
              }}</span>
              <button
                type="button"
                class="text-xs text-gray-400 hover:text-red-600"
                @click="hapusTugas(t)"
              >
                Hapus
              </button>
            </li>
          </ul>
        </details>
      </template>
    </div>

    <!-- ═══════════════ TAB JADWAL ═══════════════ -->
    <div v-else class="mt-6 space-y-6">
      <form class="card space-y-3" @submit.prevent="simpanJadwal">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Tambah Jadwal</h2>
        <input
          v-model="formJadwal.mata_kuliah"
          class="input"
          placeholder="Mata kuliah — contoh: Kalkulus II"
          maxlength="120"
          required
        />
        <div class="grid grid-cols-3 gap-3">
          <select v-model.number="formJadwal.hari" class="input">
            <option v-for="h in [1, 2, 3, 4, 5, 6, 7] as Hari[]" :key="h" :value="h">
              {{ NAMA_HARI[h] }}
            </option>
          </select>
          <input v-model="formJadwal.jam_mulai" type="time" class="input" required />
          <input v-model="formJadwal.jam_selesai" type="time" class="input" required />
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <input
            v-model="formJadwal.ruang"
            class="input"
            placeholder="Ruang (opsional)"
            maxlength="60"
          />
          <input
            v-model="formJadwal.dosen"
            class="input"
            placeholder="Dosen (opsional)"
            maxlength="120"
          />
        </div>
        <button
          type="submit"
          class="btn-primary"
          :disabled="simpanJadwalLoading || !formJadwal.mata_kuliah.trim()"
        >
          {{ simpanJadwalLoading ? 'Menyimpan...' : '+ Tambah Jadwal' }}
        </button>
      </form>

      <div v-if="loading" class="space-y-2">
        <div
          v-for="i in 3"
          :key="i"
          class="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
        />
      </div>

      <div v-else class="space-y-4">
        <section v-for="g in jadwalPerHari" :key="g.hari">
          <h3
            class="mb-2 text-sm font-semibold"
            :class="g.hari === hariIniIso ? 'text-primary-600' : 'text-gray-700 dark:text-gray-300'"
          >
            {{ NAMA_HARI[g.hari] }}
            <span v-if="g.hari === hariIniIso" class="ml-1 text-xs font-normal">(hari ini)</span>
          </h3>
          <p v-if="!g.isi.length" class="text-xs text-gray-400">Tidak ada kuliah</p>
          <ul class="space-y-2">
            <li
              v-for="j in g.isi"
              :key="j.id"
              :class="[
                'card flex items-center gap-3 py-3',
                statusKelas(j) === 'berlangsung'
                  ? 'border-primary-400 dark:border-primary-600'
                  : '',
                statusKelas(j) === 'selesai' ? 'opacity-60' : '',
              ]"
            >
              <div class="w-24 shrink-0 font-mono text-xs text-gray-500">
                {{ jam(j.jam_mulai) }}–{{ jam(j.jam_selesai) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="break-words text-sm font-medium text-gray-900 dark:text-white">
                  {{ j.mata_kuliah }}
                  <span
                    v-if="statusKelas(j) === 'berlangsung'"
                    class="ml-1 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-200"
                  >
                    Berlangsung
                  </span>
                </p>
                <p v-if="j.ruang || j.dosen" class="text-xs text-gray-500">
                  {{ [j.ruang, j.dosen].filter(Boolean).join(' · ') }}
                </p>
              </div>
              <button
                type="button"
                class="text-xs text-gray-400 hover:text-red-600"
                @click="hapusJadwal(j)"
              >
                Hapus
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
