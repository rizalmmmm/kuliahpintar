<script setup lang="ts">
  // Generator Daftar Pustaka — tanpa AI, publik (tanpa login) untuk menarik pengunjung dari Google.
  // Sumber ber-DOI diformat oleh Crossref/doi.org (lewat API kita); buku/website diformat lokal.
  import {
    GAYA_SITASI,
    formatSitasiManual,
    type GayaSitasi,
    type HasilCariPustaka,
    type SitasiResponse,
    type SumberManual,
  } from '@kuliahpintar/shared'

  definePageMeta({ layout: 'default' })
  useSeoMeta({
    title: 'Generator Daftar Pustaka Otomatis (APA, IEEE, Harvard)',
    description:
      'Buat daftar pustaka otomatis dari DOI, link jurnal, atau judul artikel. Gaya APA 7, IEEE, Harvard, MLA, Chicago. Gratis untuk mahasiswa.',
  })

  const api = useApi()

  type Item =
    | { id: string; tipe: 'doi'; doi: string; teks: string; kunci: string }
    | { id: string; tipe: 'manual'; sumber: SumberManual; teks: string; kunci: string }

  const KUNCI_STORAGE = 'kp-daftar-pustaka'
  const gaya = ref<GayaSitasi>('apa')
  const bahasa = ref<'id' | 'en'>('id')
  const items = ref<Item[]>([])
  const error = ref<string | null>(null)
  const memformat = ref(false)

  onMounted(() => {
    try {
      const simpan = JSON.parse(localStorage.getItem(KUNCI_STORAGE) ?? 'null') as {
        gaya?: GayaSitasi
        bahasa?: 'id' | 'en'
        items?: Item[]
      } | null
      if (simpan?.items) items.value = simpan.items
      if (simpan?.gaya) gaya.value = simpan.gaya
      if (simpan?.bahasa) bahasa.value = simpan.bahasa
    } catch {
      // storage kosong/rusak — mulai dari awal
    }
  })

  watch(
    [items, gaya, bahasa],
    () => {
      try {
        localStorage.setItem(
          KUNCI_STORAGE,
          JSON.stringify({ gaya: gaya.value, bahasa: bahasa.value, items: items.value })
        )
      } catch {
        // abaikan (mode privat / storage penuh)
      }
    },
    { deep: true }
  )

  const uid = () => Math.random().toString(36).slice(2, 10)

  async function ambilSitasi(doi: string): Promise<SitasiResponse> {
    const q = new URLSearchParams({ doi, gaya: gaya.value, bahasa: bahasa.value })
    const res = await api.get<{ data: SitasiResponse }>(`/api/v1/pustaka/sitasi?${q}`)
    return res.data
  }

  // Ganti gaya/bahasa → format ulang semua item
  watch([gaya, bahasa], async () => {
    if (!items.value.length) return
    memformat.value = true
    error.value = null
    for (const it of items.value) {
      try {
        if (it.tipe === 'doi') {
          const s = await ambilSitasi(it.doi)
          it.teks = s.teks
          it.kunci = s.kunciUrut
        } else {
          it.teks = formatSitasiManual(it.sumber, gaya.value, bahasa.value)
          it.kunci = it.teks.toLowerCase()
        }
      } catch {
        error.value = 'Sebagian sitasi gagal diformat ulang. Coba ganti gaya lagi.'
      }
    }
    memformat.value = false
  })

  const daftarUrut = computed(() =>
    gaya.value === 'ieee'
      ? items.value
      : [...items.value].sort((a, b) => a.kunci.localeCompare(b.kunci, 'id'))
  )

  function teksTampil(it: Item, i: number) {
    return gaya.value === 'ieee' ? `[${i + 1}] ${it.teks}` : it.teks
  }

  // ── Tambah via DOI / link / judul ──
  const mode = ref<'cari' | 'manual'>('cari')
  const input = ref('')
  const loading = ref(false)
  const hasilCari = ref<HasilCariPustaka[] | null>(null)

  const POLA_DOI = /10\.\d{4,9}\/[^\s"<>]+/i

  async function tambahDoi(doi: string) {
    const bersih = doi.replace(/[.,;:)\]}>]+$/, '')
    if (
      items.value.some((it) => it.tipe === 'doi' && it.doi.toLowerCase() === bersih.toLowerCase())
    ) {
      error.value = 'Referensi ini sudah ada di daftar.'
      return
    }
    const s = await ambilSitasi(bersih)
    items.value.push({ id: uid(), tipe: 'doi', doi: s.doi, teks: s.teks, kunci: s.kunciUrut })
  }

  async function prosesInput() {
    const teks = input.value.trim()
    if (!teks) return
    loading.value = true
    error.value = null
    hasilCari.value = null
    try {
      const doi = decodeURIComponent(teks).match(POLA_DOI)?.[0]
      if (doi) {
        await tambahDoi(doi)
        input.value = ''
      } else if (/^https?:\/\//i.test(teks)) {
        error.value =
          'Link ini tidak mengandung DOI. Cari pakai judul artikel, atau isi manual lewat tab "Buku / Website".'
      } else {
        const res = await api.get<{ data: HasilCariPustaka[] }>(
          `/api/v1/pustaka/cari?${new URLSearchParams({ q: teks })}`
        )
        hasilCari.value = res.data
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.'
    } finally {
      loading.value = false
    }
  }

  async function pilihHasil(h: HasilCariPustaka) {
    loading.value = true
    error.value = null
    try {
      await tambahDoi(h.doi)
      hasilCari.value = null
      input.value = ''
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal menambahkan referensi.'
    } finally {
      loading.value = false
    }
  }

  // ── Tambah manual ──
  const manual = reactive({
    jenis: 'buku' as 'buku' | 'website',
    penulis: '',
    tahun: '',
    judul: '',
    penerbit: '',
    kota: '',
    edisi: '',
    namaSitus: '',
    url: '',
    tanggalAkses: new Date().toISOString().slice(0, 10),
  })

  function tambahManual() {
    if (!manual.judul.trim()) return
    const sumber: SumberManual = {
      jenis: manual.jenis,
      penulis: manual.penulis
        .split(/[;\n]/)
        .map((p) => p.trim())
        .filter(Boolean),
      tahun: manual.tahun,
      judul: manual.judul,
      penerbit: manual.penerbit,
      kota: manual.kota,
      edisi: manual.edisi,
      namaSitus: manual.namaSitus,
      url: manual.url,
      tanggalAkses: manual.tanggalAkses,
    }
    const teks = formatSitasiManual(sumber, gaya.value, bahasa.value)
    items.value.push({ id: uid(), tipe: 'manual', sumber, teks, kunci: teks.toLowerCase() })
    Object.assign(manual, {
      penulis: '',
      tahun: '',
      judul: '',
      penerbit: '',
      kota: '',
      edisi: '',
      namaSitus: '',
      url: '',
    })
  }

  // ── Aksi daftar ──
  const copied = ref<string | null>(null)
  async function salin(teks: string, kunci: string) {
    await navigator.clipboard.writeText(teks)
    copied.value = kunci
    setTimeout(() => (copied.value = null), 2_000)
  }
  function salinSemua() {
    salin(daftarUrut.value.map((it, i) => teksTampil(it, i)).join('\n\n'), 'semua')
  }
  function hapus(id: string) {
    items.value = items.value.filter((it) => it.id !== id)
  }
  function kosongkan() {
    if (window.confirm('Hapus semua referensi di daftar?')) items.value = []
  }
</script>

<template>
  <div class="container mx-auto max-w-3xl px-4 py-8">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">📚 Generator Daftar Pustaka</h1>
    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
      Tempel DOI, link jurnal, atau judul artikel — sitasi dibuat otomatis dari data resmi Crossref.
      Buku & website bisa diisi manual.
    </p>

    <!-- Gaya & bahasa -->
    <div class="mt-6 flex flex-wrap items-center gap-3">
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="g in GAYA_SITASI"
          :key="g.value"
          type="button"
          :class="[
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            gaya === g.value
              ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
              : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400',
          ]"
          :disabled="memformat"
          @click="gaya = g.value"
        >
          {{ g.label }}
        </button>
      </div>
      <select v-model="bahasa" class="input w-auto py-1 text-xs" :disabled="memformat">
        <option value="id">Bahasa Indonesia (dkk., diakses)</option>
        <option value="en">English (et al., accessed)</option>
      </select>
    </div>

    <!-- Input -->
    <div class="card mt-4 space-y-3">
      <div class="flex gap-4 border-b border-gray-100 text-sm dark:border-gray-800">
        <button
          v-for="m in ['cari', 'manual'] as const"
          :key="m"
          type="button"
          :class="[
            '-mb-px border-b-2 pb-2 font-medium',
            mode === m
              ? 'border-primary-500 text-primary-700 dark:text-primary-300'
              : 'border-transparent text-gray-500 hover:text-gray-700',
          ]"
          @click="mode = m"
        >
          {{ m === 'cari' ? 'DOI / Link / Judul' : 'Buku / Website' }}
        </button>
      </div>

      <form v-if="mode === 'cari'" class="flex gap-2" @submit.prevent="prosesInput">
        <input
          v-model="input"
          class="input flex-1"
          placeholder="Contoh: 10.1038/nature14539 atau judul artikel"
          :disabled="loading"
        />
        <button
          type="submit"
          class="btn-primary whitespace-nowrap"
          :disabled="loading || !input.trim()"
        >
          {{ loading ? '...' : 'Tambah' }}
        </button>
      </form>

      <form v-else class="space-y-3" @submit.prevent="tambahManual">
        <div class="flex gap-2">
          <button
            v-for="j in ['buku', 'website'] as const"
            :key="j"
            type="button"
            :class="[
              'rounded-lg border px-3 py-1.5 text-xs font-medium',
              manual.jenis === j
                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400',
            ]"
            @click="manual.jenis = j"
          >
            {{ j === 'buku' ? '📖 Buku' : '🌐 Website' }}
          </button>
        </div>
        <input
          v-model="manual.penulis"
          class="input"
          placeholder="Penulis — pisahkan dengan titik koma. Contoh: Budi Santoso; Ani Wijaya"
        />
        <div class="grid gap-3 sm:grid-cols-[1fr_7rem]">
          <input v-model="manual.judul" class="input" placeholder="Judul" required />
          <input
            v-model="manual.tahun"
            class="input"
            placeholder="Tahun"
            inputmode="numeric"
            maxlength="4"
          />
        </div>
        <div v-if="manual.jenis === 'buku'" class="grid gap-3 sm:grid-cols-3">
          <input v-model="manual.penerbit" class="input" placeholder="Penerbit" />
          <input v-model="manual.kota" class="input" placeholder="Kota terbit" />
          <input v-model="manual.edisi" class="input" placeholder="Edisi (mis. 2)" />
        </div>
        <div v-else class="grid gap-3 sm:grid-cols-2">
          <input
            v-model="manual.namaSitus"
            class="input"
            placeholder="Nama situs (mis. Kompas.com)"
          />
          <input v-model="manual.tanggalAkses" type="date" class="input" title="Tanggal diakses" />
          <input
            v-model="manual.url"
            class="input sm:col-span-2"
            placeholder="https://..."
            type="url"
          />
        </div>
        <button type="submit" class="btn-primary" :disabled="!manual.judul.trim()">
          + Tambah ke daftar
        </button>
      </form>

      <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>

      <!-- Hasil pencarian judul -->
      <div v-if="hasilCari" class="space-y-2">
        <p class="text-xs text-gray-500">
          {{
            hasilCari.length
              ? 'Pilih artikel yang sesuai:'
              : 'Tidak ditemukan. Coba kata kunci lain atau isi manual.'
          }}
        </p>
        <button
          v-for="h in hasilCari"
          :key="h.doi"
          type="button"
          class="block w-full rounded-lg border border-gray-200 p-3 text-left text-sm hover:border-primary-400 dark:border-gray-700"
          :disabled="loading"
          @click="pilihHasil(h)"
        >
          <span class="font-medium text-gray-900 dark:text-white">{{ h.judul }}</span>
          <span class="mt-0.5 block text-xs text-gray-500">
            {{ h.penulis }}<template v-if="h.tahun"> · {{ h.tahun }}</template>
            <template v-if="h.sumber"> · {{ h.sumber }}</template>
          </span>
        </button>
      </div>
    </div>

    <!-- Daftar pustaka -->
    <div class="mt-6">
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
          Daftar Pustaka ({{ items.length }})
          <span v-if="memformat" class="ml-1 font-normal text-gray-400">memformat ulang...</span>
        </h2>
        <div v-if="items.length" class="flex gap-2">
          <button type="button" class="btn-secondary px-3 py-1.5 text-xs" @click="salinSemua">
            {{ copied === 'semua' ? '✓ Tersalin!' : '📋 Salin semua' }}
          </button>
          <button
            type="button"
            class="px-2 text-xs text-gray-400 hover:text-red-600"
            @click="kosongkan"
          >
            Kosongkan
          </button>
        </div>
      </div>

      <div
        v-if="!items.length"
        class="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500 dark:border-gray-700"
      >
        Belum ada referensi. Tambahkan dari kolom di atas.
      </div>

      <ol v-else class="space-y-2">
        <li v-for="(it, i) in daftarUrut" :key="it.id" class="card group flex gap-3 py-3">
          <p
            class="min-w-0 flex-1 break-words pl-6 -indent-6 text-sm leading-relaxed text-gray-800 dark:text-gray-200"
          >
            {{ teksTampil(it, i) }}
          </p>
          <div class="flex shrink-0 flex-col gap-1 text-xs">
            <button
              type="button"
              class="text-gray-400 hover:text-gray-700"
              @click="salin(teksTampil(it, i), it.id)"
            >
              {{ copied === it.id ? '✓' : 'Salin' }}
            </button>
            <button type="button" class="text-gray-400 hover:text-red-600" @click="hapus(it.id)">
              Hapus
            </button>
          </div>
        </li>
      </ol>

      <p v-if="items.length" class="mt-3 text-xs text-gray-400">
        Tips: setelah ditempel di Word, miringkan judul buku / nama jurnal sesuai gaya, dan cek
        ulang dengan pedoman kampusmu. Daftar tersimpan di browser ini.
      </p>
    </div>
  </div>
</template>
