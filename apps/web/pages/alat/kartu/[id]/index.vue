<script setup lang="ts">
  // Kelola satu dek Kartu Hafalan: tambah/hapus kartu, ubah judul, bagikan lewat link publik.
  import type { DekKartu, Kartu } from '@kuliahpintar/shared'

  definePageMeta({ middleware: 'auth', layout: 'default' })

  const supabase = useSupabaseClient()
  const route = useRoute()
  const router = useRouter()
  const dekId = computed(() => route.params['id'] as string)

  const dek = ref<DekKartu | null>(null)
  const kartu = ref<Kartu[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const form = reactive({ depan: '', belakang: '' })
  const menyimpan = ref(false)
  const edit = reactive({ aktif: false, judul: '', deskripsi: '' })
  const disalin = ref(false)

  useHead(() => ({ title: dek.value?.judul ?? 'Kartu Hafalan' }))

  const linkPublik = computed(() =>
    import.meta.client ? `${window.location.origin}/kartu/${dekId.value}` : ''
  )
  const jatuhTempo = computed(
    () => kartu.value.filter((k) => new Date(k.jatuh_tempo).getTime() <= Date.now()).length
  )

  async function muat() {
    loading.value = true
    error.value = null
    const [d, k] = await Promise.all([
      supabase.from('dek_kartu').select('*').eq('id', dekId.value).maybeSingle(),
      supabase
        .from('kartu')
        .select('*')
        .eq('dek_id', dekId.value)
        .order('created_at', { ascending: true }),
    ])
    const user = (await supabase.auth.getUser()).data.user
    if (d.error || k.error || !d.data || d.data.user_id !== user?.id) {
      error.value = 'Dek tidak ditemukan.'
    } else {
      dek.value = d.data as DekKartu
      kartu.value = (k.data ?? []) as Kartu[]
    }
    loading.value = false
  }

  async function tambahKartu() {
    const depan = form.depan.trim()
    const belakang = form.belakang.trim()
    if (!depan || !belakang) return
    menyimpan.value = true
    const { data, error: e } = await supabase
      .from('kartu')
      .insert({ dek_id: dekId.value, depan, belakang })
      .select('*')
      .single()
    menyimpan.value = false
    if (e || !data) {
      error.value = 'Gagal menambah kartu.'
      return
    }
    kartu.value.push(data as Kartu)
    form.depan = ''
    form.belakang = ''
    // Sentuh dek supaya naik ke atas di daftar
    await supabase.from('dek_kartu').update({ judul: dek.value!.judul }).eq('id', dekId.value)
  }

  async function hapusKartu(k: Kartu) {
    const { error: e } = await supabase.from('kartu').delete().eq('id', k.id)
    if (!e) kartu.value = kartu.value.filter((x) => x.id !== k.id)
  }

  function mulaiEdit() {
    if (!dek.value) return
    edit.judul = dek.value.judul
    edit.deskripsi = dek.value.deskripsi ?? ''
    edit.aktif = true
  }

  async function simpanEdit() {
    const judul = edit.judul.trim()
    if (!judul) return
    const { data, error: e } = await supabase
      .from('dek_kartu')
      .update({ judul, deskripsi: edit.deskripsi.trim() || null })
      .eq('id', dekId.value)
      .select('*')
      .single()
    if (!e && data) {
      dek.value = data as DekKartu
      edit.aktif = false
    }
  }

  async function ubahPublik() {
    if (!dek.value) return
    const { data, error: e } = await supabase
      .from('dek_kartu')
      .update({ publik: !dek.value.publik })
      .eq('id', dekId.value)
      .select('*')
      .single()
    if (!e && data) dek.value = data as DekKartu
  }

  async function salinLink() {
    try {
      await navigator.clipboard.writeText(linkPublik.value)
      disalin.value = true
      setTimeout(() => (disalin.value = false), 2000)
    } catch {
      // Clipboard tidak tersedia — link tetap terlihat untuk disalin manual
    }
  }

  async function hapusDek() {
    if (!window.confirm(`Hapus dek "${dek.value?.judul}" beserta semua kartunya?`)) return
    const { error: e } = await supabase.from('dek_kartu').delete().eq('id', dekId.value)
    if (!e) await router.push('/alat/kartu')
  }

  onMounted(muat)
</script>

<template>
  <div class="container mx-auto max-w-2xl px-4 py-8">
    <NuxtLink
      to="/alat/kartu"
      class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
    >
      ← Semua dek
    </NuxtLink>

    <p v-if="loading" class="mt-8 text-center text-sm text-gray-500">Memuat...</p>
    <p v-else-if="error && !dek" class="mt-8 text-center text-sm text-red-500">{{ error }}</p>

    <template v-else-if="dek">
      <!-- Judul dek -->
      <div v-if="!edit.aktif" class="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ dek.judul }}</h1>
          <p v-if="dek.deskripsi" class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {{ dek.deskripsi }}
          </p>
        </div>
        <button class="text-sm text-gray-500 hover:underline" @click="mulaiEdit">Ubah</button>
      </div>
      <form v-else class="mt-2 space-y-2" @submit.prevent="simpanEdit">
        <input v-model="edit.judul" required maxlength="120" class="input" />
        <input
          v-model="edit.deskripsi"
          maxlength="500"
          class="input"
          placeholder="Deskripsi (opsional)"
        />
        <div class="flex gap-2">
          <button class="btn-primary px-4 py-1.5 text-sm">Simpan</button>
          <button
            type="button"
            class="btn-secondary px-4 py-1.5 text-sm"
            @click="edit.aktif = false"
          >
            Batal
          </button>
        </div>
      </form>

      <!-- Aksi -->
      <div class="mt-4 flex flex-wrap gap-2">
        <NuxtLink
          :to="`/alat/kartu/${dek.id}/belajar`"
          class="btn-primary px-5 py-2"
          :class="{ 'pointer-events-none opacity-50': !kartu.length }"
        >
          Belajar{{ jatuhTempo ? ` (${jatuhTempo} perlu diulang)` : '' }}
        </NuxtLink>
      </div>

      <!-- Bagikan -->
      <div class="card mt-4">
        <label class="flex cursor-pointer items-center justify-between gap-3">
          <span>
            <span class="block font-medium text-gray-900 dark:text-white">Bagikan dek</span>
            <span class="block text-xs text-gray-500">
              Siapa pun dengan link bisa melihat dan menyalin dek ini (progres belajarmu tidak
              ikut).
            </span>
          </span>
          <input type="checkbox" :checked="dek.publik" class="h-5 w-5" @change="ubahPublik" />
        </label>
        <div v-if="dek.publik" class="mt-3 flex gap-2">
          <input :value="linkPublik" readonly class="input flex-1 text-xs" />
          <button type="button" class="btn-secondary px-3 text-sm" @click="salinLink">
            {{ disalin ? 'Tersalin' : 'Salin' }}
          </button>
        </div>
      </div>

      <!-- Tambah kartu -->
      <form class="card mt-4 space-y-3" @submit.prevent="tambahKartu">
        <p class="font-medium text-gray-900 dark:text-white">Tambah kartu</p>
        <textarea
          v-model="form.depan"
          required
          rows="2"
          maxlength="1000"
          class="input"
          placeholder="Depan — pertanyaan / istilah"
        />
        <textarea
          v-model="form.belakang"
          required
          rows="3"
          maxlength="2000"
          class="input"
          placeholder="Belakang — jawaban / definisi"
        />
        <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
        <button :disabled="menyimpan" class="btn-primary px-5 py-2 disabled:opacity-60">
          {{ menyimpan ? 'Menyimpan...' : 'Tambah kartu' }}
        </button>
      </form>

      <!-- Daftar kartu -->
      <h2 class="mt-8 font-semibold text-gray-900 dark:text-white">{{ kartu.length }} kartu</h2>
      <div class="mt-3 space-y-2">
        <div v-for="k in kartu" :key="k.id" class="card flex items-start gap-3 py-3">
          <div class="min-w-0 flex-1 text-sm">
            <p class="whitespace-pre-line font-medium text-gray-900 dark:text-white">
              {{ k.depan }}
            </p>
            <p class="mt-1 whitespace-pre-line text-gray-600 dark:text-gray-400">
              {{ k.belakang }}
            </p>
          </div>
          <span class="shrink-0 text-xs text-gray-400" :title="`Kotak Leitner ${k.kotak} dari 5`">
            {{ '●'.repeat(k.kotak) }}{{ '○'.repeat(5 - k.kotak) }}
          </span>
          <button
            class="shrink-0 text-xs text-red-500 hover:underline"
            :aria-label="`Hapus kartu ${k.depan}`"
            @click="hapusKartu(k)"
          >
            Hapus
          </button>
        </div>
      </div>

      <button class="mt-8 text-sm text-red-600 hover:underline" @click="hapusDek">
        Hapus dek ini
      </button>
    </template>
  </div>
</template>
