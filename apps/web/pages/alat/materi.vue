<script setup lang="ts">
  // Simpan Materi Kuliah — unggah PDF/slide/dokumen per mata kuliah ke Supabase Storage (bucket
  // privat "materi", migrasi 009). File dibuka lewat signed URL yang berlaku 1 jam.
  import {
    ACCEPT_MATERI,
    MAKS_UKURAN_MATERI_MB,
    TIPE_MATERI,
    formatDate,
    formatUkuran,
    labelTipe,
    namaFileAman,
    type MateriKuliah,
  } from '@kuliahpintar/shared'

  definePageMeta({ middleware: 'auth', layout: 'default' })
  useHead({ title: 'Materi Kuliah' })

  const BUCKET = 'materi'
  const MAKS_BYTES = MAKS_UKURAN_MATERI_MB * 1024 * 1024

  const supabase = useSupabaseClient()

  const daftar = ref<MateriKuliah[]>([])
  const saranMatkul = ref<string[]>([])
  const terpakai = ref(0)
  const kuota = ref(100 * 1024 * 1024)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const cari = ref('')
  const mataKuliah = ref('')
  const fileDipilih = ref<File[]>([])
  const inputFile = ref<HTMLInputElement | null>(null)
  const mengunggah = ref(false)
  const progres = ref('')
  const sibuk = ref<string | null>(null)

  async function userId() {
    return (await supabase.auth.getUser()).data.user?.id ?? ''
  }

  async function muatKuota() {
    const [t, k] = await Promise.all([
      supabase.rpc('materi_terpakai_bytes'),
      supabase.rpc('materi_kuota_bytes'),
    ])
    if (typeof t.data === 'number') terpakai.value = t.data
    if (typeof k.data === 'number') kuota.value = k.data
  }

  async function muat() {
    loading.value = true
    error.value = null
    const uid = await userId()
    const [m, j] = await Promise.all([
      supabase
        .from('materi_kuliah')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false }),
      supabase.from('jadwal_kuliah').select('mata_kuliah').eq('user_id', uid),
      muatKuota(),
    ])
    if (m.error) {
      error.value =
        m.error.code === '42P01' || m.error.code === 'PGRST205'
          ? 'Fitur materi belum siap di database (migrasi 009).'
          : 'Gagal memuat materi. Coba muat ulang halaman.'
    } else {
      daftar.value = (m.data ?? []) as MateriKuliah[]
    }
    saranMatkul.value = [
      ...new Set([
        ...(j.data ?? []).map((x) => x.mata_kuliah),
        ...daftar.value.map((x) => x.mata_kuliah),
      ]),
    ].sort((a, b) => a.localeCompare(b))
    loading.value = false
  }

  function pilihFile(e: Event) {
    fileDipilih.value = [...((e.target as HTMLInputElement).files ?? [])]
    error.value = null
  }

  function cekFile(f: File): string | null {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    const extDiizinkan = ACCEPT_MATERI.split(',').map((x) => x.slice(1))
    if (!(f.type in TIPE_MATERI) && !extDiizinkan.includes(ext)) {
      return `${f.name}: tipe file tidak didukung.`
    }
    if (f.size > MAKS_BYTES) return `${f.name}: lebih dari ${MAKS_UKURAN_MATERI_MB} MB.`
    return null
  }

  async function unggah() {
    const matkul = mataKuliah.value.trim()
    if (!matkul || !fileDipilih.value.length) return
    error.value = null

    const salah = fileDipilih.value.map(cekFile).filter(Boolean)
    if (salah.length) {
      error.value = salah.join(' ')
      return
    }
    const total = fileDipilih.value.reduce((n, f) => n + f.size, 0)
    if (terpakai.value + total > kuota.value) {
      error.value = `Kuota penyimpanan tidak cukup (sisa ${formatUkuran(Math.max(0, kuota.value - terpakai.value))}). Hapus materi lama atau upgrade ke Premium.`
      return
    }

    mengunggah.value = true
    const uid = await userId()
    const gagal: string[] = []
    for (const [i, f] of fileDipilih.value.entries()) {
      progres.value = `Mengunggah ${i + 1}/${fileDipilih.value.length}: ${f.name}`
      const path = `${uid}/${crypto.randomUUID()}-${namaFileAman(f.name)}`
      const up = await supabase.storage
        .from(BUCKET)
        .upload(path, f, { contentType: f.type || undefined, upsert: false })
      if (up.error) {
        gagal.push(f.name)
        continue
      }
      const { error: e } = await supabase.from('materi_kuliah').insert({
        mata_kuliah: matkul,
        nama: f.name.slice(0, 255),
        path,
        ukuran_bytes: f.size,
        tipe: f.type || null,
      })
      if (e) {
        // Jangan tinggalkan file yatim di Storage bila metadata gagal disimpan
        await supabase.storage.from(BUCKET).remove([path])
        gagal.push(f.name)
      }
    }
    mengunggah.value = false
    progres.value = ''
    fileDipilih.value = []
    if (inputFile.value) inputFile.value.value = ''
    if (gagal.length) {
      error.value = `Gagal mengunggah: ${gagal.join(', ')}. Periksa koneksi atau sisa kuota.`
    }
    await muat()
  }

  async function buka(m: MateriKuliah, unduh = false) {
    // Tab dibuka langsung saat klik (sebelum await) supaya tidak diblokir sebagai pop-up
    const tab = window.open('', '_blank')
    sibuk.value = m.id
    const { data, error: e } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(m.path, 3600, unduh ? { download: m.nama } : undefined)
    sibuk.value = null
    if (e || !data) {
      tab?.close()
      error.value = 'Gagal membuka file.'
      return
    }
    if (tab) {
      tab.opener = null
      tab.location.href = data.signedUrl
    } else {
      window.location.href = data.signedUrl
    }
  }

  async function hapus(m: MateriKuliah) {
    if (!window.confirm(`Hapus "${m.nama}"?`)) return
    sibuk.value = m.id
    const { error: e1 } = await supabase.storage.from(BUCKET).remove([m.path])
    const { error: e2 } = e1
      ? { error: e1 }
      : await supabase.from('materi_kuliah').delete().eq('id', m.id)
    sibuk.value = null
    if (e2) {
      error.value = 'Gagal menghapus materi.'
      return
    }
    daftar.value = daftar.value.filter((x) => x.id !== m.id)
    await muatKuota()
  }

  const persenKuota = computed(() => Math.min(100, (terpakai.value / kuota.value) * 100))

  const perMatkul = computed(() => {
    const q = cari.value.trim().toLowerCase()
    const grup = new Map<string, MateriKuliah[]>()
    for (const m of daftar.value) {
      if (q && !m.nama.toLowerCase().includes(q) && !m.mata_kuliah.toLowerCase().includes(q)) {
        continue
      }
      grup.set(m.mata_kuliah, [...(grup.get(m.mata_kuliah) ?? []), m])
    }
    return [...grup].sort(([a], [b]) => a.localeCompare(b))
  })

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
    <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">📁 Materi Kuliah</h1>
    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
      Simpan PDF, slide, dan dokumen kuliah per mata kuliah — bisa dibuka dari HP atau laptop mana
      saja.
    </p>

    <!-- Kuota -->
    <div class="card mt-6">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-600 dark:text-gray-400">Penyimpanan terpakai</span>
        <span class="font-medium text-gray-900 dark:text-white">
          {{ formatUkuran(terpakai) }} / {{ formatUkuran(kuota) }}
        </span>
      </div>
      <div class="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          class="h-full rounded-full"
          :class="persenKuota >= 90 ? 'bg-red-500' : 'bg-primary-600'"
          :style="{ width: `${persenKuota}%` }"
        />
      </div>
      <p v-if="kuota <= 100 * 1024 * 1024" class="mt-2 text-xs text-gray-500">
        Akun Gratis: 100 MB.
        <NuxtLink to="/harga" class="text-primary-600 hover:underline">Premium: 1 GB</NuxtLink>
      </p>
    </div>

    <!-- Unggah -->
    <form class="card mt-4 space-y-3" @submit.prevent="unggah">
      <p class="font-medium text-gray-900 dark:text-white">Unggah materi</p>
      <input
        v-model="mataKuliah"
        required
        maxlength="120"
        list="saran-matkul"
        class="input"
        placeholder="Mata kuliah, mis. Statistika"
      />
      <datalist id="saran-matkul">
        <option v-for="m in saranMatkul" :key="m" :value="m" />
      </datalist>
      <input
        ref="inputFile"
        type="file"
        multiple
        required
        :accept="ACCEPT_MATERI"
        class="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700 dark:text-gray-400 dark:file:bg-primary-950 dark:file:text-primary-300"
        @change="pilihFile"
      />
      <p class="text-xs text-gray-500">
        PDF, PPT/PPTX, DOC/DOCX, XLS/XLSX, TXT, PNG, JPG · maks {{ MAKS_UKURAN_MATERI_MB }} MB per
        file
      </p>
      <p v-if="progres" class="text-sm text-gray-600 dark:text-gray-400">{{ progres }}</p>
      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
      <button
        :disabled="mengunggah || !fileDipilih.length"
        class="btn-primary px-5 py-2 disabled:opacity-60"
      >
        {{ mengunggah ? 'Mengunggah...' : 'Unggah' }}
      </button>
    </form>

    <!-- Daftar -->
    <div class="mt-6">
      <input
        v-if="daftar.length > 5"
        v-model="cari"
        type="search"
        class="input"
        placeholder="Cari nama file atau mata kuliah..."
      />
      <p v-if="loading" class="mt-4 text-center text-sm text-gray-500">Memuat...</p>
      <p v-else-if="!daftar.length" class="mt-4 text-center text-sm text-gray-500">
        Belum ada materi tersimpan.
      </p>
      <p v-else-if="!perMatkul.length" class="mt-4 text-center text-sm text-gray-500">
        Tidak ada yang cocok dengan "{{ cari }}".
      </p>

      <section v-for="[matkul, isi] in perMatkul" :key="matkul" class="mt-5">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
          {{ matkul }} <span class="font-normal text-gray-400">· {{ isi.length }}</span>
        </h2>
        <div class="card mt-2 divide-y divide-gray-100 py-1 dark:divide-gray-800">
          <div v-for="m in isi" :key="m.id" class="flex items-center gap-3 py-2.5">
            <span
              class="w-11 shrink-0 rounded bg-gray-100 py-1 text-center text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              {{ labelTipe(m.tipe, m.nama) }}
            </span>
            <button
              type="button"
              class="min-w-0 flex-1 text-left"
              :disabled="sibuk === m.id"
              @click="buka(m)"
            >
              <p class="truncate text-sm text-gray-900 hover:text-primary-600 dark:text-white">
                {{ m.nama }}
              </p>
              <p class="text-xs text-gray-500">
                {{ formatUkuran(m.ukuran_bytes) }} · {{ formatDate(m.created_at) }}
              </p>
            </button>
            <button
              type="button"
              class="shrink-0 text-xs text-gray-500 hover:text-primary-600"
              :disabled="sibuk === m.id"
              :aria-label="`Unduh ${m.nama}`"
              @click="buka(m, true)"
            >
              Unduh
            </button>
            <button
              type="button"
              class="shrink-0 text-xs text-red-500 hover:underline"
              :disabled="sibuk === m.id"
              :aria-label="`Hapus ${m.nama}`"
              @click="hapus(m)"
            >
              Hapus
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
