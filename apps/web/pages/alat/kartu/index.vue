<script setup lang="ts">
  // Kartu Hafalan — daftar dek milik user. Tanpa AI: kartu ditulis sendiri, jadwal ulang
  // pakai sistem Leitner (lihat packages/shared/src/utils/leitner.ts). Data via Supabase + RLS.
  import type { DekKartu } from '@kuliahpintar/shared'

  definePageMeta({ middleware: 'auth', layout: 'default' })
  useHead({ title: 'Kartu Hafalan' })

  type DekRingkas = DekKartu & { total: number; jatuhTempo: number }

  const supabase = useSupabaseClient()
  const router = useRouter()

  const daftar = ref<DekRingkas[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const form = reactive({ judul: '', deskripsi: '' })
  const menyimpan = ref(false)

  async function muat() {
    loading.value = true
    error.value = null
    const user = (await supabase.auth.getUser()).data.user
    const [dek, kartu] = await Promise.all([
      supabase
        .from('dek_kartu')
        .select('*')
        .eq('user_id', user?.id ?? '')
        .order('updated_at', { ascending: false }),
      supabase
        .from('kartu')
        .select('dek_id, jatuh_tempo')
        .eq('user_id', user?.id ?? '')
        .limit(10_000),
    ])
    if (dek.error || kartu.error) {
      error.value = 'Gagal memuat dek. Coba muat ulang halaman.'
      loading.value = false
      return
    }
    const sekarang = Date.now()
    const hitung = new Map<string, { total: number; jatuhTempo: number }>()
    for (const k of kartu.data ?? []) {
      const h = hitung.get(k.dek_id) ?? { total: 0, jatuhTempo: 0 }
      h.total++
      if (new Date(k.jatuh_tempo).getTime() <= sekarang) h.jatuhTempo++
      hitung.set(k.dek_id, h)
    }
    daftar.value = ((dek.data ?? []) as DekKartu[]).map((d) => ({
      ...d,
      ...(hitung.get(d.id) ?? { total: 0, jatuhTempo: 0 }),
    }))
    loading.value = false
  }

  async function buatDek() {
    const judul = form.judul.trim()
    if (!judul) return
    menyimpan.value = true
    const { data, error: e } = await supabase
      .from('dek_kartu')
      .insert({ judul, deskripsi: form.deskripsi.trim() || null })
      .select('id')
      .single()
    menyimpan.value = false
    if (e || !data) {
      error.value = 'Gagal membuat dek.'
      return
    }
    await router.push(`/alat/kartu/${data.id}`)
  }

  const totalJatuhTempo = computed(() => daftar.value.reduce((n, d) => n + d.jatuhTempo, 0))

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
    <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">🃏 Kartu Hafalan</h1>
    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
      Tulis kartu sendiri, lalu ulangi dengan sistem Leitner: kartu yang sering salah muncul lebih
      sering, yang sudah hafal muncul makin jarang.
    </p>

    <p
      v-if="totalJatuhTempo"
      class="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300"
    >
      📌 {{ totalJatuhTempo }} kartu perlu diulang hari ini.
    </p>

    <!-- Buat dek -->
    <form class="card mt-6 space-y-3" @submit.prevent="buatDek">
      <p class="font-medium text-gray-900 dark:text-white">Buat dek baru</p>
      <input
        v-model="form.judul"
        required
        maxlength="120"
        class="input"
        placeholder="Judul dek, mis. Anatomi — Sistem Saraf"
      />
      <input
        v-model="form.deskripsi"
        maxlength="500"
        class="input"
        placeholder="Deskripsi (opsional)"
      />
      <button :disabled="menyimpan" class="btn-primary px-5 py-2 disabled:opacity-60">
        {{ menyimpan ? 'Membuat...' : 'Buat dek' }}
      </button>
    </form>

    <!-- Daftar dek -->
    <div class="mt-6 space-y-3">
      <p v-if="loading" class="text-center text-sm text-gray-500">Memuat dek...</p>
      <p v-else-if="error" class="text-center text-sm text-red-500">{{ error }}</p>
      <p v-else-if="!daftar.length" class="text-center text-sm text-gray-500">
        Belum ada dek. Buat dek pertamamu di atas.
      </p>

      <div v-for="d in daftar" :key="d.id" class="card flex flex-wrap items-center gap-3">
        <NuxtLink :to="`/alat/kartu/${d.id}`" class="min-w-0 flex-1">
          <p class="truncate font-medium text-gray-900 hover:text-primary-600 dark:text-white">
            {{ d.judul }}
            <span
              v-if="d.publik"
              class="ml-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-normal text-green-700 dark:bg-green-950 dark:text-green-300"
            >
              Publik
            </span>
          </p>
          <p class="text-xs text-gray-500">
            {{ d.total }} kartu · {{ d.jatuhTempo }} perlu diulang
          </p>
        </NuxtLink>
        <NuxtLink
          :to="`/alat/kartu/${d.id}/belajar`"
          class="btn-primary px-4 py-1.5 text-sm"
          :class="{ 'pointer-events-none opacity-50': !d.total }"
        >
          Belajar
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
