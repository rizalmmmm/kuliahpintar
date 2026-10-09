<script setup lang="ts">
  // Kelola satu paket Simulasi Ujian: pengaturan durasi, tambah/hapus soal pilihan ganda.
  import type { PaketUjian, SoalUjian } from '@kuliahpintar/shared'

  definePageMeta({ middleware: 'auth', layout: 'default' })

  const HURUF = ['A', 'B', 'C', 'D', 'E']

  const supabase = useSupabaseClient()
  const route = useRoute()
  const router = useRouter()
  const paketId = computed(() => route.params['id'] as string)

  const paket = ref<PaketUjian | null>(null)
  const soal = ref<SoalUjian[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const menyimpan = ref(false)
  const form = reactive({ pertanyaan: '', opsi: ['', '', '', ''], kunci: 0, pembahasan: '' })
  const pengaturan = reactive({ judul: '', durasi: 30, acak: true })

  useHead(() => ({ title: paket.value?.judul ?? 'Simulasi Ujian' }))

  async function muat() {
    loading.value = true
    const [p, s] = await Promise.all([
      supabase.from('paket_ujian').select('*').eq('id', paketId.value).maybeSingle(),
      supabase
        .from('soal_ujian')
        .select('*')
        .eq('paket_id', paketId.value)
        .order('created_at', { ascending: true }),
    ])
    if (p.error || s.error || !p.data) {
      error.value = 'Paket tidak ditemukan.'
    } else {
      paket.value = p.data as PaketUjian
      soal.value = (s.data ?? []) as SoalUjian[]
      pengaturan.judul = paket.value.judul
      pengaturan.durasi = paket.value.durasi_menit
      pengaturan.acak = paket.value.acak_soal
    }
    loading.value = false
  }

  async function simpanPengaturan() {
    const judul = pengaturan.judul.trim()
    if (!judul) return
    const { data, error: e } = await supabase
      .from('paket_ujian')
      .update({
        judul,
        durasi_menit: Math.min(300, Math.max(1, Math.round(pengaturan.durasi))),
        acak_soal: pengaturan.acak,
      })
      .eq('id', paketId.value)
      .select('*')
      .single()
    if (e || !data) error.value = 'Gagal menyimpan pengaturan.'
    else paket.value = data as PaketUjian
  }

  function tambahOpsi() {
    if (form.opsi.length < 5) form.opsi.push('')
  }

  function hapusOpsi(i: number) {
    if (form.opsi.length <= 2) return
    form.opsi.splice(i, 1)
    if (form.kunci >= form.opsi.length) form.kunci = 0
  }

  async function tambahSoal() {
    error.value = null
    const pertanyaan = form.pertanyaan.trim()
    const opsi = form.opsi.map((o) => o.trim())
    if (!pertanyaan) return
    if (opsi.some((o) => !o)) {
      error.value = 'Semua pilihan jawaban wajib diisi (hapus yang tidak dipakai).'
      return
    }
    if (new Set(opsi).size !== opsi.length) {
      error.value = 'Pilihan jawaban tidak boleh sama.'
      return
    }
    menyimpan.value = true
    const { data, error: e } = await supabase
      .from('soal_ujian')
      .insert({
        paket_id: paketId.value,
        pertanyaan,
        opsi,
        kunci: form.kunci,
        pembahasan: form.pembahasan.trim() || null,
      })
      .select('*')
      .single()
    menyimpan.value = false
    if (e || !data) {
      error.value = 'Gagal menyimpan soal.'
      return
    }
    soal.value.push(data as SoalUjian)
    form.pertanyaan = ''
    form.opsi = ['', '', '', '']
    form.kunci = 0
    form.pembahasan = ''
  }

  async function hapusSoal(s: SoalUjian) {
    const { error: e } = await supabase.from('soal_ujian').delete().eq('id', s.id)
    if (!e) soal.value = soal.value.filter((x) => x.id !== s.id)
  }

  async function hapusPaket() {
    if (!window.confirm(`Hapus paket "${paket.value?.judul}" beserta semua soalnya?`)) return
    const { error: e } = await supabase.from('paket_ujian').delete().eq('id', paketId.value)
    if (!e) await router.push('/alat/ujian')
  }

  onMounted(muat)
</script>

<template>
  <div class="container mx-auto max-w-2xl px-4 py-8">
    <NuxtLink
      to="/alat/ujian"
      class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
    >
      ← Simulasi Ujian
    </NuxtLink>

    <p v-if="loading" class="mt-8 text-center text-sm text-gray-500">Memuat...</p>
    <p v-else-if="!paket" class="mt-8 text-center text-sm text-red-500">{{ error }}</p>

    <template v-else>
      <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{{ paket.judul }}</h1>
      <p class="mt-1 text-sm text-gray-500">
        {{ soal.length }} soal · {{ paket.durasi_menit }} menit
      </p>

      <NuxtLink
        :to="`/alat/ujian/kerjakan?paket=${paket.id}`"
        class="btn-primary mt-4 inline-block px-5 py-2"
        :class="{ 'pointer-events-none opacity-50': !soal.length }"
      >
        Mulai ujian
      </NuxtLink>

      <!-- Pengaturan -->
      <form class="card mt-6 space-y-3" @submit.prevent="simpanPengaturan">
        <p class="font-medium text-gray-900 dark:text-white">Pengaturan</p>
        <input v-model="pengaturan.judul" required maxlength="120" class="input" />
        <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <label class="flex items-center gap-2">
            Durasi
            <input
              v-model.number="pengaturan.durasi"
              type="number"
              min="1"
              max="300"
              required
              class="input w-24"
            />
            menit
          </label>
          <label class="flex items-center gap-2">
            <input v-model="pengaturan.acak" type="checkbox" class="h-4 w-4" />
            Acak urutan soal
          </label>
        </div>
        <button class="btn-secondary px-4 py-1.5 text-sm">Simpan pengaturan</button>
      </form>

      <!-- Tambah soal -->
      <form class="card mt-4 space-y-3" @submit.prevent="tambahSoal">
        <p class="font-medium text-gray-900 dark:text-white">Tambah soal</p>
        <textarea
          v-model="form.pertanyaan"
          required
          rows="3"
          maxlength="2000"
          class="input"
          placeholder="Tulis pertanyaan..."
        />
        <p class="text-xs text-gray-500">Pilihan jawaban — klik huruf untuk menandai kunci</p>
        <div v-for="(_, i) in form.opsi" :key="i" class="flex items-center gap-2">
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold"
            :class="
              form.kunci === i
                ? 'border-green-500 bg-green-500 text-white'
                : 'border-gray-300 text-gray-500 dark:border-gray-700'
            "
            :aria-label="`Jadikan ${HURUF[i]} kunci jawaban`"
            @click="form.kunci = i"
          >
            {{ HURUF[i] }}
          </button>
          <input
            v-model="form.opsi[i]"
            maxlength="500"
            class="input flex-1"
            :placeholder="`Pilihan ${HURUF[i]}`"
          />
          <button
            v-if="form.opsi.length > 2"
            type="button"
            class="text-xs text-gray-400 hover:text-red-500"
            :aria-label="`Hapus pilihan ${HURUF[i]}`"
            @click="hapusOpsi(i)"
          >
            ✕
          </button>
        </div>
        <button
          v-if="form.opsi.length < 5"
          type="button"
          class="text-sm text-primary-600 hover:underline"
          @click="tambahOpsi"
        >
          + Tambah pilihan
        </button>
        <textarea
          v-model="form.pembahasan"
          rows="2"
          maxlength="2000"
          class="input"
          placeholder="Pembahasan (opsional) — ditampilkan setelah ujian selesai"
        />
        <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
        <button :disabled="menyimpan" class="btn-primary px-5 py-2 disabled:opacity-60">
          {{ menyimpan ? 'Menyimpan...' : 'Simpan soal' }}
        </button>
      </form>

      <!-- Daftar soal -->
      <div class="mt-6 space-y-2">
        <div v-for="(s, n) in soal" :key="s.id" class="card py-3 text-sm">
          <div class="flex items-start gap-3">
            <p class="min-w-0 flex-1 whitespace-pre-line font-medium text-gray-900 dark:text-white">
              {{ n + 1 }}. {{ s.pertanyaan }}
            </p>
            <button class="shrink-0 text-xs text-red-500 hover:underline" @click="hapusSoal(s)">
              Hapus
            </button>
          </div>
          <ul class="mt-2 space-y-0.5">
            <li
              v-for="(o, i) in s.opsi"
              :key="i"
              :class="
                i === s.kunci ? 'font-medium text-green-600' : 'text-gray-600 dark:text-gray-400'
              "
            >
              {{ HURUF[i] }}. {{ o }} <span v-if="i === s.kunci">✓</span>
            </li>
          </ul>
        </div>
      </div>

      <button class="mt-8 text-sm text-red-600 hover:underline" @click="hapusPaket">
        Hapus paket ini
      </button>
    </template>
  </div>
</template>
