<script setup lang="ts">
  // Panel admin — verifikasi transfer manual dan kelola Premium.
  // Semua aksi lewat API /api/v1/admin yang hanya menerima nomor HP admin terverifikasi.
  import { formatDate } from '@kuliahpintar/shared'

  definePageMeta({ middleware: 'auth', layout: 'default' })
  useHead({ title: 'Admin Premium', meta: [{ name: 'robots', content: 'noindex' }] })

  type Profil = { email: string | null; name: string | null } | null
  type Menunggu = { id: string; midtrans_order_id: string; created_at: string; profiles: Profil }
  type Aktif = {
    id: string
    midtrans_order_id: string | null
    start_date: string
    end_date: string
    profiles: Profil
  }

  const api = useApi()
  const supabase = useSupabaseClient()
  const router = useRouter()

  const status = ref<'memuat' | 'ok' | 'ditolak'>('memuat')
  const menunggu = ref<Menunggu[]>([])
  const aktif = ref<Aktif[]>([])
  const pesan = ref<{ jenis: 'ok' | 'error'; teks: string } | null>(null)
  const sibuk = ref<string | null>(null)
  const emailManual = ref('')

  async function muat() {
    try {
      const res = await api.get<{ data: { menunggu: Menunggu[]; aktif: Aktif[] } }>(
        '/api/v1/admin/premium'
      )
      menunggu.value = res.data.menunggu
      aktif.value = res.data.aktif
      status.value = 'ok'
    } catch {
      status.value = 'ditolak'
    }
  }

  async function aksi(kunci: string, path: string, body: unknown, sukses: string) {
    sibuk.value = kunci
    pesan.value = null
    try {
      await api.post(path, body)
      pesan.value = { jenis: 'ok', teks: sukses }
      await muat()
    } catch (err) {
      pesan.value = { jenis: 'error', teks: err instanceof Error ? err.message : 'Gagal.' }
    } finally {
      sibuk.value = null
    }
  }

  const aktifkan = (s: Menunggu) =>
    aksi(
      s.id,
      '/api/v1/admin/premium/aktifkan',
      { subscriptionId: s.id },
      `Premium aktif untuk ${s.profiles?.email ?? s.midtrans_order_id}`
    )

  function tolak(s: Menunggu) {
    if (!confirm(`Tolak pesanan ${s.midtrans_order_id}?`)) return
    aksi(s.id, '/api/v1/admin/premium/tolak', { subscriptionId: s.id }, 'Pesanan ditolak')
  }

  function cabut(s: Aktif) {
    if (!confirm(`Cabut Premium ${s.profiles?.email ?? ''}?`)) return
    aksi(s.id, '/api/v1/admin/premium/cabut', { subscriptionId: s.id }, 'Premium dicabut')
  }

  async function aktifkanEmail() {
    const email = emailManual.value.trim()
    if (!email) return
    await aksi('email', '/api/v1/admin/premium/aktifkan', { email }, `Premium aktif untuk ${email}`)
    if (pesan.value?.jenis === 'ok') emailManual.value = ''
  }

  const kedaluwarsa = (s: Aktif) => new Date(s.end_date).getTime() < Date.now()

  async function keluar() {
    await supabase.auth.signOut()
    await router.push('/admin/masuk')
  }

  onMounted(muat)
</script>

<template>
  <div class="container mx-auto max-w-4xl px-4 py-10">
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Admin Premium</h1>
      <button class="text-sm text-gray-500 hover:underline" @click="keluar">Keluar</button>
    </div>

    <p v-if="status === 'memuat'" class="mt-8 text-sm text-gray-500">Memuat...</p>

    <div v-else-if="status === 'ditolak'" class="card mt-8">
      <p class="font-medium text-gray-900 dark:text-white">Halaman ini khusus admin.</p>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Masuk dengan nomor HP admin untuk melanjutkan.
      </p>
      <NuxtLink to="/admin/masuk" class="btn-primary mt-4 inline-block px-5 py-2">
        Masuk Admin
      </NuxtLink>
    </div>

    <template v-else>
      <p
        v-if="pesan"
        class="mt-6 rounded-lg px-3 py-2 text-sm"
        :class="
          pesan.jenis === 'ok'
            ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
            : 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
        "
      >
        {{ pesan.teks }}
      </p>

      <!-- Pesanan transfer manual menunggu verifikasi -->
      <section class="mt-8">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Menunggu verifikasi ({{ menunggu.length }})
        </h2>
        <p class="mt-1 text-sm text-gray-500">
          Cocokkan kode pesanan dengan bukti transfer di WhatsApp & mutasi BCA.
        </p>
        <p v-if="!menunggu.length" class="mt-4 text-sm text-gray-500">Tidak ada pesanan.</p>
        <div v-for="s in menunggu" :key="s.id" class="card mt-3 flex flex-wrap items-center gap-3">
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium text-gray-900 dark:text-white">
              {{ s.profiles?.name ?? '—' }}
              <span class="text-sm font-normal text-gray-500">{{ s.profiles?.email }}</span>
            </p>
            <p class="font-mono text-xs text-gray-500">
              {{ s.midtrans_order_id }} · {{ formatDate(s.created_at, { timeStyle: 'short' }) }}
            </p>
          </div>
          <button
            :disabled="sibuk === s.id"
            class="btn-primary px-4 py-1.5 text-sm disabled:opacity-60"
            @click="aktifkan(s)"
          >
            Aktifkan
          </button>
          <button
            :disabled="sibuk === s.id"
            class="px-3 py-1.5 text-sm text-red-600 hover:underline"
            @click="tolak(s)"
          >
            Tolak
          </button>
        </div>
      </section>

      <!-- Aktifkan langsung lewat email -->
      <section class="card mt-8">
        <h2 class="font-semibold text-gray-900 dark:text-white">Aktifkan lewat email</h2>
        <p class="mt-1 text-sm text-gray-500">
          Untuk pengguna yang transfer tanpa membuat pesanan. Jika Premium masih aktif, masanya
          diperpanjang 30 hari.
        </p>
        <form class="mt-3 flex flex-col gap-2 sm:flex-row" @submit.prevent="aktifkanEmail">
          <input
            v-model="emailManual"
            type="email"
            required
            class="input flex-1"
            placeholder="email@pengguna.com"
          />
          <button :disabled="sibuk === 'email'" class="btn-primary px-5 py-2 disabled:opacity-60">
            Aktifkan Premium
          </button>
        </form>
      </section>

      <!-- Premium aktif -->
      <section class="mt-8">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Premium aktif ({{ aktif.length }})
        </h2>
        <p v-if="!aktif.length" class="mt-4 text-sm text-gray-500">Belum ada.</p>
        <div v-for="s in aktif" :key="s.id" class="card mt-3 flex flex-wrap items-center gap-3">
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium text-gray-900 dark:text-white">
              {{ s.profiles?.name ?? '—' }}
              <span class="text-sm font-normal text-gray-500">{{ s.profiles?.email }}</span>
            </p>
            <p class="text-xs" :class="kedaluwarsa(s) ? 'text-red-600' : 'text-gray-500'">
              {{ kedaluwarsa(s) ? 'Sudah berakhir' : 'Berakhir' }} {{ formatDate(s.end_date) }}
            </p>
          </div>
          <button
            :disabled="sibuk === s.id"
            class="px-3 py-1.5 text-sm text-red-600 hover:underline"
            @click="cabut(s)"
          >
            Cabut
          </button>
        </div>
      </section>
    </template>
  </div>
</template>
