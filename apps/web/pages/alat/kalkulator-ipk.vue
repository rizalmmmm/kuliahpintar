<script setup lang="ts">
  // Kalkulator IPK/IPS — tanpa AI, publik. Login → tersimpan di Supabase (semua perangkat);
  // tamu → tersimpan di browser (localStorage).
  import {
    SKALA_NILAI,
    bobotHuruf,
    hitungIp,
    hitungNilaiAkhir,
    ipsDibutuhkan,
    predikatLulus,
    type KomponenNilai,
    type NilaiMk,
    type SkalaNilai,
  } from '@kuliahpintar/shared'

  definePageMeta({ layout: 'default' })
  const judulSeo = 'Kalkulator IPK & IPS Online'
  const deskripsiSeo =
    'Hitung IPK dan IPS per semester, target IPK, dan nilai UAS yang dibutuhkan. Skala A/A-/B+ atau AB/BC. Gratis untuk mahasiswa Indonesia.'
  useSeoMeta({
    title: judulSeo,
    description: deskripsiSeo,
    ogTitle: `${judulSeo} — KuliahPintar.id`,
    ogDescription: deskripsiSeo,
  })

  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const KUNCI_NILAI = 'kp-nilai-ipk'
  const KUNCI_SKALA = 'kp-skala-nilai'

  const skala = ref<SkalaNilai>('umum')
  const rows = ref<NilaiMk[]>([])
  const semesterTambahan = ref<number[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  const pakaiCloud = computed(() => !!user.value)

  // ── Penyimpanan: Supabase (login) atau localStorage (tamu) ──
  function bacaLokal(): NilaiMk[] {
    try {
      return JSON.parse(localStorage.getItem(KUNCI_NILAI) ?? '[]') as NilaiMk[]
    } catch {
      return []
    }
  }
  function tulisLokal() {
    try {
      localStorage.setItem(KUNCI_NILAI, JSON.stringify(rows.value))
    } catch {
      // abaikan
    }
  }

  async function muat() {
    loading.value = true
    error.value = null
    if (pakaiCloud.value) {
      const { data, error: e } = await supabase
        .from('nilai_mk')
        .select('id, semester, mata_kuliah, sks, huruf, bobot')
        .order('semester')
        .order('created_at')
      if (e) error.value = 'Gagal memuat nilai. Coba muat ulang.'
      rows.value = ((data ?? []) as NilaiMk[]).map((r) => ({ ...r, bobot: Number(r.bobot) }))
    } else {
      rows.value = bacaLokal()
    }
    loading.value = false
  }

  onMounted(() => {
    try {
      const s = localStorage.getItem(KUNCI_SKALA) as SkalaNilai | null
      if (s && s in SKALA_NILAI) skala.value = s
    } catch {
      // abaikan
    }
    muat()
  })
  watch(user, () => muat())
  watch(skala, (s) => {
    try {
      localStorage.setItem(KUNCI_SKALA, s)
    } catch {
      // abaikan
    }
  })

  const hurufOpsi = computed(() => SKALA_NILAI[skala.value].huruf)

  async function tambahMk(
    semester: number,
    form: { mata_kuliah: string; sks: number; huruf: string }
  ) {
    const bobot = bobotHuruf(skala.value, form.huruf)
    if (!form.mata_kuliah.trim() || bobot === null || form.sks < 1) return false
    const baris = {
      semester,
      mata_kuliah: form.mata_kuliah.trim(),
      sks: form.sks,
      huruf: form.huruf,
      bobot,
    }
    if (pakaiCloud.value) {
      const { data, error: e } = await supabase
        .from('nilai_mk')
        .insert(baris)
        .select('id, semester, mata_kuliah, sks, huruf, bobot')
        .single()
      if (e || !data) {
        error.value = 'Gagal menyimpan mata kuliah.'
        return false
      }
      rows.value.push({ ...(data as NilaiMk), bobot: Number((data as NilaiMk).bobot) })
    } else {
      rows.value.push({ id: Math.random().toString(36).slice(2), ...baris })
      tulisLokal()
    }
    semesterTambahan.value = semesterTambahan.value.filter((s) => s !== semester)
    return true
  }

  async function ubahMk(r: NilaiMk, patch: Partial<Pick<NilaiMk, 'sks' | 'huruf'>>) {
    const lama = { sks: r.sks, huruf: r.huruf, bobot: r.bobot }
    const baru: Partial<NilaiMk> = { ...patch }
    if (patch.huruf !== undefined) {
      const b = bobotHuruf(skala.value, patch.huruf)
      if (b === null) return
      baru.bobot = b
    }
    if (baru.sks !== undefined && (baru.sks < 1 || baru.sks > 24 || !Number.isInteger(baru.sks)))
      return
    Object.assign(r, baru)
    if (pakaiCloud.value) {
      const { error: e } = await supabase.from('nilai_mk').update(baru).eq('id', r.id)
      if (e) {
        Object.assign(r, lama)
        error.value = 'Gagal menyimpan perubahan.'
      }
    } else tulisLokal()
  }

  async function hapusMk(r: NilaiMk) {
    if (pakaiCloud.value) {
      const { error: e } = await supabase.from('nilai_mk').delete().eq('id', r.id)
      if (e) {
        error.value = 'Gagal menghapus.'
        return
      }
    }
    rows.value = rows.value.filter((x) => x.id !== r.id)
    if (!pakaiCloud.value) tulisLokal()
  }

  // ── Per semester ──
  // Semester selalu berurutan 1..N (N = semester terbesar yang terisi / ditambahkan)
  const semesters = computed(() => {
    const maks = Math.max(1, ...rows.value.map((r) => r.semester), ...semesterTambahan.value)
    return Array.from({ length: maks }, (_, i) => i + 1)
  })

  const formBaru = reactive<Record<number, { mata_kuliah: string; sks: number; huruf: string }>>({})
  // Siapkan form "tambah mata kuliah" untuk tiap semester sebelum render (jangan mutasi saat render)
  watchEffect(() => {
    for (const sem of semesters.value) formBaru[sem] ??= { mata_kuliah: '', sks: 3, huruf: 'A' }
  })
  const form = (sem: number) => formBaru[sem] ?? { mata_kuliah: '', sks: 3, huruf: 'A' }
  async function submitBaru(sem: number) {
    const f = form(sem)
    if (await tambahMk(sem, f)) Object.assign(f, { mata_kuliah: '' })
  }

  function tambahSemester() {
    const berikut = Math.max(0, ...semesters.value) + 1
    if (berikut <= 14) semesterTambahan.value.push(berikut)
  }

  const ipsPer = (sem: number) => hitungIp(rows.value.filter((r) => r.semester === sem))
  const total = computed(() => hitungIp(rows.value))
  const predikat = computed(() => (total.value.totalSks ? predikatLulus(total.value.ip) : null))

  // ── Target IPK ──
  // Kalau belum mengisi nilai per mata kuliah, IPK & SKS saat ini bisa diketik langsung
  const target = reactive({ ipk: 3.5, sks: 20, ipkManual: 3.2, sksManual: 60 })
  const pakaiManual = computed(() => total.value.totalSks === 0)
  const butuhIps = computed(() =>
    ipsDibutuhkan({
      ipkSekarang: pakaiManual.value ? Number(target.ipkManual) || 0 : total.value.ip,
      sksSekarang: pakaiManual.value ? Number(target.sksManual) || 0 : total.value.totalSks,
      targetIpk: target.ipk,
      sksBerikutnya: target.sks,
    })
  )

  // ── Nilai akhir mata kuliah ──
  const komponen = ref<KomponenNilai[]>([
    { nama: 'Tugas', persen: 20, nilai: 85 },
    { nama: 'Kuis', persen: 10, nilai: 80 },
    { nama: 'UTS', persen: 30, nilai: 75 },
    { nama: 'UAS', persen: 40, nilai: null },
  ])
  const targetNilai = ref(80)
  const hasilAkhir = computed(() => hitungNilaiAkhir(komponen.value, targetNilai.value))
  function setNilai(k: KomponenNilai, v: string) {
    k.nilai = v === '' ? null : Math.max(0, Math.min(100, Number(v)))
  }
</script>

<template>
  <div class="container mx-auto max-w-3xl px-4 py-8">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">🎓 Kalkulator IPK & IPS</h1>
    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
      Ketik nama mata kuliah, pilih SKS dan nilai huruf, lalu klik <strong>Tambah</strong> — IPS dan
      IPK dihitung otomatis.
      <template v-if="!pakaiCloud">
        Data tersimpan di browser ini —
        <NuxtLink to="/login" class="text-primary-600 hover:underline">masuk</NuxtLink>
        agar tersimpan di semua perangkat.
      </template>
    </p>

    <!-- Ringkasan -->
    <div class="mt-6 grid grid-cols-3 gap-3">
      <div class="card py-4 text-center">
        <p class="text-xs text-gray-500">IPK</p>
        <p class="mt-1 text-3xl font-bold tabular-nums text-primary-600">
          {{ total.ip.toFixed(2) }}
        </p>
      </div>
      <div class="card py-4 text-center">
        <p class="text-xs text-gray-500">Total SKS</p>
        <p class="mt-1 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
          {{ total.totalSks }}
        </p>
      </div>
      <div class="card flex flex-col justify-center py-4 text-center">
        <p class="text-xs text-gray-500">Predikat</p>
        <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
          {{ predikat ?? '—' }}
        </p>
      </div>
    </div>

    <div class="mt-4 flex items-center gap-2 text-xs text-gray-500">
      <span>Skala nilai kampusmu:</span>
      <select v-model="skala" class="input w-auto py-1 text-xs">
        <option v-for="(s, k) in SKALA_NILAI" :key="k" :value="k">{{ s.label }}</option>
      </select>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>

    <!-- Semester -->
    <div v-if="loading" class="mt-6 h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
    <div v-else class="mt-6 space-y-4">
      <section v-for="sem in semesters" :key="sem" class="card">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-gray-900 dark:text-white">Semester {{ sem }}</h2>
          <p class="text-sm text-gray-500">
            IPS
            <strong class="tabular-nums text-gray-900 dark:text-white">{{
              ipsPer(sem).ip.toFixed(2)
            }}</strong>
            · {{ ipsPer(sem).totalSks }} SKS
          </p>
        </div>

        <ul class="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
          <li
            v-for="r in rows.filter((x) => x.semester === sem)"
            :key="r.id"
            class="flex items-center gap-2 py-2 text-sm"
          >
            <span class="min-w-0 flex-1 break-words text-gray-800 dark:text-gray-200">{{
              r.mata_kuliah
            }}</span>
            <input
              type="number"
              min="1"
              max="24"
              class="input w-16 px-2 py-1 text-center text-sm"
              :value="r.sks"
              aria-label="SKS"
              @change="ubahMk(r, { sks: Number(($event.target as HTMLInputElement).value) })"
            />
            <select
              class="input w-20 px-2 py-1 text-sm"
              :value="r.huruf"
              aria-label="Nilai huruf"
              @change="ubahMk(r, { huruf: ($event.target as HTMLSelectElement).value })"
            >
              <option v-if="!hurufOpsi.some(([h]) => h === r.huruf)" :value="r.huruf">
                {{ r.huruf }}
              </option>
              <option v-for="[h] in hurufOpsi" :key="h" :value="h">{{ h }}</option>
            </select>
            <button
              type="button"
              class="px-1 text-gray-400 hover:text-red-600"
              aria-label="Hapus"
              @click="hapusMk(r)"
            >
              ✕
            </button>
          </li>
        </ul>

        <form class="mt-2 flex items-center gap-2" @submit.prevent="submitBaru(sem)">
          <input
            v-model="form(sem).mata_kuliah"
            class="input min-w-0 flex-1 py-1.5 text-sm"
            placeholder="+ Mata kuliah"
            maxlength="120"
          />
          <input
            v-model.number="form(sem).sks"
            type="number"
            min="1"
            max="24"
            class="input w-16 px-2 py-1.5 text-center text-sm"
            aria-label="SKS"
          />
          <select
            v-model="form(sem).huruf"
            class="input w-20 px-2 py-1.5 text-sm"
            aria-label="Nilai huruf"
          >
            <option v-for="[h] in hurufOpsi" :key="h" :value="h">{{ h }}</option>
          </select>
          <button
            type="submit"
            class="btn-primary px-3 py-1.5 text-sm"
            :disabled="!form(sem).mata_kuliah.trim()"
          >
            Tambah
          </button>
        </form>
      </section>

      <button type="button" class="btn-secondary w-full" @click="tambahSemester">
        + Tambah Semester
      </button>
    </div>

    <!-- Target IPK -->
    <section class="card mt-8">
      <h2 class="font-semibold text-gray-900 dark:text-white">🎯 Target IPK</h2>
      <div
        v-if="pakaiManual"
        class="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
      >
        IPK saat ini
        <input
          v-model.number="target.ipkManual"
          type="number"
          step="0.01"
          min="0"
          max="4"
          class="input w-20 px-2 py-1 text-center"
        />
        dari
        <input
          v-model.number="target.sksManual"
          type="number"
          min="0"
          max="300"
          class="input w-20 px-2 py-1 text-center"
        />
        SKS yang sudah ditempuh
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        Ingin IPK
        <input
          v-model.number="target.ipk"
          type="number"
          step="0.01"
          min="0"
          max="4"
          class="input w-20 px-2 py-1 text-center"
        />
        dengan
        <input
          v-model.number="target.sks"
          type="number"
          min="1"
          max="30"
          class="input w-16 px-2 py-1 text-center"
        />
        SKS semester depan
      </div>
      <p class="mt-3 text-sm">
        <template v-if="Number.isNaN(butuhIps)">Isi jumlah SKS semester depan.</template>
        <template v-else-if="butuhIps > 4">
          <span class="text-red-600">Belum bisa tercapai semester depan</span> — butuh IPS
          {{ butuhIps.toFixed(2) }} (di atas 4,00). Coba target bertahap.
        </template>
        <template v-else-if="butuhIps <= 0">
          <span class="text-green-600">Target sudah aman</span> berapa pun IPS-mu semester depan.
        </template>
        <template v-else>
          Kamu butuh IPS minimal
          <strong class="text-primary-600">{{ butuhIps.toFixed(2) }}</strong> semester depan.
        </template>
      </p>
    </section>

    <!-- Nilai akhir -->
    <section class="card mt-4">
      <h2 class="font-semibold text-gray-900 dark:text-white">🧮 Butuh Nilai UAS Berapa?</h2>
      <p class="mt-1 text-xs text-gray-500">
        Isi bobot & nilai tiap komponen. Kosongkan satu komponen untuk menghitung nilai minimalnya.
      </p>
      <div class="mt-3 space-y-2">
        <div v-for="(k, i) in komponen" :key="i" class="flex items-center gap-2 text-sm">
          <input
            v-model="k.nama"
            class="input min-w-0 flex-1 py-1.5 text-sm"
            aria-label="Nama komponen"
          />
          <input
            v-model.number="k.persen"
            type="number"
            min="0"
            max="100"
            class="input w-16 px-2 py-1.5 text-center text-sm"
            aria-label="Bobot persen"
          />
          <span class="text-gray-400">%</span>
          <input
            type="number"
            min="0"
            max="100"
            class="input w-20 px-2 py-1.5 text-center text-sm"
            :value="k.nilai ?? ''"
            placeholder="?"
            aria-label="Nilai"
            @input="setNilai(k, ($event.target as HTMLInputElement).value)"
          />
          <button
            type="button"
            class="px-1 text-gray-400 hover:text-red-600"
            aria-label="Hapus"
            @click="komponen.splice(i, 1)"
          >
            ✕
          </button>
        </div>
        <button
          type="button"
          class="text-xs text-primary-600 hover:underline"
          @click="komponen.push({ nama: 'Komponen', persen: 0, nilai: null })"
        >
          + Komponen
        </button>
      </div>
      <div class="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        Target nilai akhir
        <input
          v-model.number="targetNilai"
          type="number"
          min="0"
          max="100"
          class="input w-20 px-2 py-1 text-center"
        />
      </div>
      <p v-if="hasilAkhir.totalPersen !== 100" class="mt-2 text-xs text-orange-600">
        Total bobot {{ hasilAkhir.totalPersen }}% — seharusnya 100%.
      </p>
      <p class="mt-3 text-sm">
        <template v-if="hasilAkhir.nilaiAkhir !== null">
          Nilai akhir: <strong class="text-primary-600">{{ hasilAkhir.nilaiAkhir }}</strong>
        </template>
        <template v-else-if="hasilAkhir.butuh">
          <template v-if="hasilAkhir.butuh.nilai > 100">
            <span class="text-red-600">Target tidak tercapai</span> —
            {{ hasilAkhir.butuh.nama }} butuh {{ hasilAkhir.butuh.nilai }} (di atas 100).
          </template>
          <template v-else-if="hasilAkhir.butuh.nilai <= 0">
            <span class="text-green-600">Target sudah tercapai</span> tanpa nilai
            {{ hasilAkhir.butuh.nama }}.
          </template>
          <template v-else>
            Kamu butuh nilai {{ hasilAkhir.butuh.nama }} minimal
            <strong class="text-primary-600">{{ hasilAkhir.butuh.nilai }}</strong
            >.
          </template>
        </template>
        <template v-else>Kosongkan tepat satu komponen untuk menghitung nilai minimalnya.</template>
      </p>
    </section>

    <p class="mt-6 text-xs text-gray-400">
      Bobot huruf & predikat kelulusan mengikuti ketentuan umum di Indonesia; cek pedoman akademik
      kampusmu karena bisa berbeda.
    </p>
  </div>
</template>
