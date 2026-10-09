<script setup lang="ts">
  // Halaman publik dek Kartu Hafalan yang dibagikan. Bisa dilihat tanpa login; menyalin ke dek
  // sendiri butuh login. Hanya dek dengan publik = true yang terbaca (RLS).
  import type { DekKartu, Kartu } from '@kuliahpintar/shared'

  definePageMeta({ layout: 'default' })

  type KartuPublik = Pick<Kartu, 'id' | 'depan' | 'belakang'>

  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const route = useRoute()
  const router = useRouter()
  const dekId = route.params['id'] as string

  const { data } = await useAsyncData(`kartu-publik-${dekId}`, async () => {
    const [d, k] = await Promise.all([
      supabase
        .from('dek_kartu')
        .select('id, judul, deskripsi, publik')
        .eq('id', dekId)
        .eq('publik', true)
        .maybeSingle(),
      supabase
        .from('kartu')
        .select('id, depan, belakang')
        .eq('dek_id', dekId)
        .order('created_at', { ascending: true }),
    ])
    return {
      dek: (d.data ?? null) as Pick<DekKartu, 'id' | 'judul' | 'deskripsi' | 'publik'> | null,
      kartu: (k.data ?? []) as KartuPublik[],
    }
  })

  const dek = computed(() => data.value?.dek ?? null)
  const kartu = computed(() => data.value?.kartu ?? [])
  const terbuka = ref<Set<string>>(new Set())
  const menyalin = ref(false)
  const errorSalin = ref<string | null>(null)

  useHead(() => ({ title: dek.value ? `${dek.value.judul} — Kartu Hafalan` : 'Kartu Hafalan' }))
  useSeoMeta({
    description: () =>
      dek.value
        ? `${kartu.value.length} kartu hafalan "${dek.value.judul}". ${dek.value.deskripsi ?? 'Pelajari dan salin gratis di KuliahPintar.id.'}`
        : 'Dek kartu hafalan tidak ditemukan.',
  })

  function balik(id: string) {
    const s = new Set(terbuka.value)
    s.has(id) ? s.delete(id) : s.add(id)
    terbuka.value = s
  }

  async function salinKeDekSaya() {
    if (!dek.value) return
    if (!user.value) {
      await router.push('/login')
      return
    }
    menyalin.value = true
    errorSalin.value = null
    const { data: baru, error: e } = await supabase
      .from('dek_kartu')
      .insert({ judul: dek.value.judul.slice(0, 120), deskripsi: dek.value.deskripsi })
      .select('id')
      .single()
    if (e || !baru) {
      menyalin.value = false
      errorSalin.value = 'Gagal menyalin dek.'
      return
    }
    if (kartu.value.length) {
      const { error: e2 } = await supabase
        .from('kartu')
        .insert(kartu.value.map((k) => ({ dek_id: baru.id, depan: k.depan, belakang: k.belakang })))
      if (e2) {
        menyalin.value = false
        errorSalin.value = 'Dek dibuat, tapi sebagian kartu gagal disalin.'
        return
      }
    }
    await router.push(`/alat/kartu/${baru.id}`)
  }
</script>

<template>
  <div class="container mx-auto max-w-2xl px-4 py-10">
    <div v-if="!dek" class="card text-center">
      <p class="font-medium text-gray-900 dark:text-white">Dek tidak ditemukan</p>
      <p class="mt-1 text-sm text-gray-500">
        Link salah, atau pemiliknya sudah berhenti membagikan.
      </p>
      <NuxtLink to="/" class="btn-primary mt-4 inline-block px-5 py-2">Ke beranda</NuxtLink>
    </div>

    <template v-else>
      <p class="text-xs font-medium uppercase tracking-wide text-primary-600">🃏 Kartu Hafalan</p>
      <h1 class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{{ dek.judul }}</h1>
      <p v-if="dek.deskripsi" class="mt-1 text-gray-600 dark:text-gray-400">{{ dek.deskripsi }}</p>
      <p class="mt-1 text-sm text-gray-500">{{ kartu.length }} kartu</p>

      <div class="card mt-5 flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Salin ke akunmu untuk belajar dengan sistem pengulangan Leitner, gratis.
        </p>
        <button
          :disabled="menyalin"
          class="btn-primary px-5 py-2 disabled:opacity-60"
          @click="salinKeDekSaya"
        >
          {{ menyalin ? 'Menyalin...' : user ? 'Salin ke dek saya' : 'Masuk untuk menyalin' }}
        </button>
        <p v-if="errorSalin" class="w-full text-sm text-red-500">{{ errorSalin }}</p>
      </div>

      <div class="mt-6 space-y-2">
        <button
          v-for="k in kartu"
          :key="k.id"
          type="button"
          class="card block w-full py-3 text-left"
          @click="balik(k.id)"
        >
          <p class="whitespace-pre-line font-medium text-gray-900 dark:text-white">{{ k.depan }}</p>
          <p
            v-if="terbuka.has(k.id)"
            class="mt-2 whitespace-pre-line text-sm text-gray-600 dark:text-gray-400"
          >
            {{ k.belakang }}
          </p>
          <p v-else class="mt-1 text-xs text-gray-400">Ketuk untuk lihat jawaban</p>
        </button>
      </div>
    </template>
  </div>
</template>
