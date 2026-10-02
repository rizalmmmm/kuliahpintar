<script setup lang="ts">
  // Ulasan pengguna — publik bisa membaca, menulis wajib login dengan Google.
  // Data langsung ke Supabase; aturan akses dijaga RLS di migrasi 003_ulasan.sql.
  import {
    ULASAN_MAX_KARAKTER,
    ULASAN_MIN_KARAKTER,
    formatDate,
    type Ulasan,
  } from '@kuliahpintar/shared'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Ulasan Pengguna' })
  useSeoMeta({
    description:
      'Baca ulasan dan rating mahasiswa yang sudah memakai KuliahPintar.id, atau tulis ulasanmu sendiri.',
  })

  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const daftar = ref<Ulasan[]>([])
  const loading = ref(true)
  const errorMuat = ref<string | null>(null)

  const form = reactive({ rating: 0, isi: '' })
  const menyimpan = ref(false)
  const errorSimpan = ref<string | null>(null)
  const sedangEdit = ref(false)

  // Akun yang sudah tertaut ke Google (login Google, atau email yang sama sudah ditautkan)
  const loginGoogle = computed(() => {
    const providers = user.value?.app_metadata?.providers as string[] | undefined
    return !!providers?.includes('google') || user.value?.app_metadata?.provider === 'google'
  })

  const ulasanSaya = computed(() => daftar.value.find((u) => u.user_id === user.value?.id) ?? null)
  const ulasanPublik = computed(() => daftar.value.filter((u) => u.tampil))

  const rataRata = computed(() => {
    const list = ulasanPublik.value
    if (!list.length) return 0
    return list.reduce((s, u) => s + u.rating, 0) / list.length
  })

  const sebaran = computed(() =>
    [5, 4, 3, 2, 1].map((bintang) => {
      const jumlah = ulasanPublik.value.filter((u) => u.rating === bintang).length
      const persen = ulasanPublik.value.length ? (jumlah / ulasanPublik.value.length) * 100 : 0
      return { bintang, jumlah, persen }
    })
  )

  async function muat() {
    loading.value = true
    errorMuat.value = null
    const { data, error } = await supabase
      .from('ulasan')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) errorMuat.value = 'Gagal memuat ulasan. Coba muat ulang halaman.'
    else daftar.value = (data ?? []) as Ulasan[]
    loading.value = false
  }

  async function masukGoogle() {
    // Setelah login, halaman /confirm mengembalikan user ke sini
    try {
      sessionStorage.setItem('kp_setelah_login', '/ulasan')
    } catch {
      // sessionStorage tidak tersedia — user akan diarahkan ke dashboard
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/confirm` },
    })
  }

  function mulaiEdit() {
    if (!ulasanSaya.value) return
    form.rating = ulasanSaya.value.rating
    form.isi = ulasanSaya.value.isi
    sedangEdit.value = true
  }

  async function simpan() {
    errorSimpan.value = null
    const isi = form.isi.trim()
    if (form.rating < 1) {
      errorSimpan.value = 'Pilih rating 1–5 bintang dulu.'
      return
    }
    if (isi.length < ULASAN_MIN_KARAKTER) {
      errorSimpan.value = `Ulasan minimal ${ULASAN_MIN_KARAKTER} karakter.`
      return
    }

    menyimpan.value = true
    const { error } = ulasanSaya.value
      ? await supabase
          .from('ulasan')
          .update({ rating: form.rating, isi })
          .eq('id', ulasanSaya.value.id)
      : await supabase.from('ulasan').insert({ rating: form.rating, isi })
    menyimpan.value = false

    if (error) {
      errorSimpan.value = 'Gagal menyimpan ulasan. Pastikan kamu masuk dengan Google.'
      return
    }
    sedangEdit.value = false
    form.rating = 0
    form.isi = ''
    await muat()
  }

  async function hapus() {
    if (!ulasanSaya.value || !confirm('Hapus ulasanmu?')) return
    const { error } = await supabase.from('ulasan').delete().eq('id', ulasanSaya.value.id)
    if (error) {
      errorSimpan.value = 'Gagal menghapus ulasan.'
      return
    }
    await muat()
  }

  function inisial(nama: string | null) {
    return (nama?.trim()?.[0] ?? '?').toUpperCase()
  }

  onMounted(muat)
</script>

<template>
  <div class="container mx-auto max-w-3xl px-4 py-12">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Ulasan Pengguna</h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        Apa kata mahasiswa yang sudah memakai KuliahPintar.id
      </p>
    </div>

    <!-- Ringkasan rating -->
    <div
      v-if="ulasanPublik.length"
      class="card mt-8 flex flex-col gap-6 sm:flex-row sm:items-center"
    >
      <div class="text-center sm:w-40">
        <p class="text-4xl font-bold text-gray-900 dark:text-white">
          {{ rataRata.toFixed(1) }}
        </p>
        <p class="text-yellow-400" aria-hidden="true">
          {{ '★'.repeat(Math.round(rataRata)) }}{{ '☆'.repeat(5 - Math.round(rataRata)) }}
        </p>
        <p class="mt-1 text-xs text-gray-500">{{ ulasanPublik.length }} ulasan</p>
      </div>
      <div class="flex-1 space-y-1.5">
        <div v-for="s in sebaran" :key="s.bintang" class="flex items-center gap-2 text-xs">
          <span class="w-6 text-gray-500">{{ s.bintang }}★</span>
          <div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div class="h-full rounded-full bg-yellow-400" :style="{ width: `${s.persen}%` }" />
          </div>
          <span class="w-6 text-right text-gray-500">{{ s.jumlah }}</span>
        </div>
      </div>
    </div>

    <!-- Tulis ulasan -->
    <div class="card mt-6">
      <template v-if="!user || !loginGoogle">
        <p class="font-medium text-gray-900 dark:text-white">Tulis ulasanmu</p>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Untuk menjaga ulasan tetap asli, menulis ulasan wajib masuk dengan akun Google.
        </p>
        <button class="btn-secondary mt-4 inline-flex items-center gap-2" @click="masukGoogle">
          <svg class="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
            />
          </svg>
          Masuk dengan Google
        </button>
      </template>

      <template v-else-if="ulasanSaya && !sedangEdit">
        <p class="font-medium text-gray-900 dark:text-white">Terima kasih atas ulasanmu! 🙏</p>
        <p v-if="!ulasanSaya.tampil" class="mt-1 text-xs text-amber-600">
          Ulasanmu sedang disembunyikan oleh admin.
        </p>
        <div class="mt-3 flex gap-3">
          <button class="btn-secondary px-4 py-2 text-sm" @click="mulaiEdit">Ubah ulasan</button>
          <button class="px-4 py-2 text-sm text-red-600 hover:underline" @click="hapus">
            Hapus
          </button>
        </div>
      </template>

      <form v-else class="space-y-4" @submit.prevent="simpan">
        <p class="font-medium text-gray-900 dark:text-white">
          {{ sedangEdit ? 'Ubah ulasanmu' : 'Tulis ulasanmu' }}
        </p>
        <div class="flex gap-1" role="radiogroup" aria-label="Rating">
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            role="radio"
            :aria-checked="form.rating === n"
            :aria-label="`${n} bintang`"
            class="text-3xl leading-none transition"
            :class="n <= form.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-700'"
            @click="form.rating = n"
          >
            ★
          </button>
        </div>
        <div>
          <textarea
            v-model="form.isi"
            rows="4"
            :maxlength="ULASAN_MAX_KARAKTER"
            class="input"
            placeholder="Ceritakan pengalamanmu memakai KuliahPintar.id..."
          />
          <p class="mt-1 text-right text-xs text-gray-400">
            {{ form.isi.length }}/{{ ULASAN_MAX_KARAKTER }}
          </p>
        </div>
        <p v-if="errorSimpan" class="text-sm text-red-500">{{ errorSimpan }}</p>
        <div class="flex gap-3">
          <button :disabled="menyimpan" class="btn-primary px-5 py-2 disabled:opacity-60">
            {{ menyimpan ? 'Menyimpan...' : 'Kirim ulasan' }}
          </button>
          <button
            v-if="sedangEdit"
            type="button"
            class="btn-secondary px-5 py-2"
            @click="sedangEdit = false"
          >
            Batal
          </button>
        </div>
      </form>
    </div>

    <!-- Daftar ulasan -->
    <div class="mt-8 space-y-4">
      <p v-if="loading" class="text-center text-sm text-gray-500">Memuat ulasan...</p>
      <p v-else-if="errorMuat" class="text-center text-sm text-red-500">{{ errorMuat }}</p>
      <p v-else-if="!ulasanPublik.length" class="text-center text-sm text-gray-500">
        Belum ada ulasan. Jadilah yang pertama!
      </p>

      <article v-for="u in ulasanPublik" :key="u.id" class="card">
        <div class="flex items-center gap-3">
          <img
            v-if="u.avatar_url"
            :src="u.avatar_url"
            :alt="u.nama ?? 'Pengguna'"
            class="h-10 w-10 rounded-full object-cover"
            referrerpolicy="no-referrer"
            loading="lazy"
          />
          <div
            v-else
            class="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-300"
          >
            {{ inisial(u.nama) }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium text-gray-900 dark:text-white">
              {{ u.nama ?? 'Pengguna KuliahPintar' }}
            </p>
            <p class="text-xs text-gray-500">{{ formatDate(u.created_at) }}</p>
          </div>
          <p class="text-yellow-400" :aria-label="`${u.rating} dari 5 bintang`">
            {{ '★'.repeat(u.rating)
            }}<span class="text-gray-300 dark:text-gray-700">{{ '★'.repeat(5 - u.rating) }}</span>
          </p>
        </div>
        <p class="mt-3 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">
          {{ u.isi }}
        </p>
      </article>
    </div>
  </div>
</template>
