<script setup lang="ts">
  // Halaman callback setelah OAuth (Google) atau klik link konfirmasi email.
  // Client dibuat lewat @supabase/ssr dengan flowType 'pkce' + detectSessionInUrl,
  // jadi penukaran `code` sudah berjalan otomatis. Memanggil exchangeCodeForSession
  // manual di sini akan memakai code verifier untuk kedua kalinya dan selalu gagal —
  // tugas halaman ini hanya menunggu sesi terbentuk sebelum pindah ke dashboard.
  definePageMeta({ layout: false })
  useHead({ title: 'Memproses Masuk' })

  const route = useRoute()
  const session = useSupabaseSession()
  const supabase = useSupabaseClient()

  const errorMsg = ref<string | null>(null)

  function queryString(key: string): string | null {
    const value = route.query[key]
    return typeof value === 'string' && value.length > 0 ? value : null
  }

  // --- Diagnostik sementara ------------------------------------------------
  // Snapshot diambil saat setup, BUKAN saat error muncul: begitu penukaran PKCE
  // gagal, auth-js langsung menghapus cookie verifier-nya. Kalau kita membaca
  // cookie setelah timeout 10 detik, verifier selalu terlihat "hilang" walau
  // sebenarnya tadi ada — jadi snapshot harus mendahului proses exchange.
  function namesWithSize(entries: [string, string][]): string[] {
    return entries.map(([name, value]) => `${name} (${value.length} char)`)
  }

  function takeSnapshot(): string[] {
    const lines: string[] = [`origin: ${window.location.origin}`]

    const params = Object.entries(route.query).map(([key, value]): [string, string] => {
      const raw = Array.isArray(value) ? value.join('|') : String(value ?? '')
      return [key, raw]
    })
    lines.push(`query: ${params.length > 0 ? namesWithSize(params).join(', ') : '(kosong)'}`)

    const cookies = document.cookie
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part): [string, string] => {
        const eq = part.indexOf('=')
        return eq === -1 ? [part, ''] : [part.slice(0, eq), part.slice(eq + 1)]
      })
    const authCookies = cookies.filter(([name]) => name.startsWith('sb-'))
    lines.push(`cookie total: ${cookies.length}, cookie sb-*: ${authCookies.length}`)
    for (const line of namesWithSize(authCookies)) lines.push(`  ${line}`)

    const stored: [string, string][] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-')) stored.push([key, localStorage.getItem(key) ?? ''])
    }
    lines.push(`localStorage sb-*: ${stored.length}`)
    for (const line of namesWithSize(stored)) lines.push(`  ${line}`)

    const verifier = [...authCookies, ...stored].some(([name]) => name.endsWith('-code-verifier'))
    lines.push(`VERIFIER DITEMUKAN: ${verifier ? 'YA' : 'TIDAK'}`)

    return lines
  }

  // Nilai cookie/token sengaja tidak ditampilkan — hanya nama dan panjangnya.
  const snapshot = ref<string[]>(import.meta.client ? takeSnapshot() : [])
  const authError = ref<string | null>(null)

  // Kegagalan exchange otomatis tidak dilempar ke halaman, jadi ditanyakan ulang
  // ke client untuk mendapat pesan aslinya.
  async function captureAuthError() {
    const { error } = await supabase.auth.getSession()
    if (error) authError.value = `${error.name}: ${error.message}`
  }

  const copied = ref(false)
  async function copyReport() {
    const report = [...snapshot.value, `authError: ${authError.value ?? '(tidak ada)'}`].join('\n')
    await navigator.clipboard.writeText(report)
    copied.value = true
  }
  // --- akhir diagnostik ----------------------------------------------------

  let timer: ReturnType<typeof setTimeout> | undefined

  watch(
    session,
    (value) => {
      if (!value) return
      clearTimeout(timer)
      navigateTo('/dashboard', { replace: true })
    },
    { immediate: true }
  )

  onMounted(() => {
    // Supabase mengembalikan kegagalan OAuth lewat query, bukan lewat exception
    const oauthError = queryString('error_description') ?? queryString('error')
    if (oauthError) {
      errorMsg.value = oauthError
      return
    }

    if (session.value) return

    if (!queryString('code')) {
      errorMsg.value = 'Link konfirmasi tidak lengkap. Silakan ulangi proses masuk.'
      return
    }

    timer = setTimeout(() => {
      errorMsg.value = 'Sesi gagal dibuat. Link mungkin sudah pernah dipakai atau kedaluwarsa.'
      captureAuthError()
    }, 10_000)
  })

  onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4 py-12">
    <div class="w-full max-w-xl text-center">
      <template v-if="errorMsg">
        <div class="text-4xl">⚠️</div>
        <h1 class="mt-3 text-lg font-semibold text-gray-900 dark:text-white">Gagal masuk</h1>
        <p
          class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400"
        >
          {{ errorMsg }}
        </p>

        <div class="mt-6 text-left">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Diagnostik</p>
          <pre
            class="mt-2 overflow-x-auto rounded-lg bg-gray-100 p-3 text-left text-xs leading-relaxed text-gray-800 dark:bg-gray-800 dark:text-gray-200"
            >{{ snapshot.join('\n') }}
authError: {{ authError ?? '(tidak ada)' }}</pre
          >
          <button type="button" class="btn-secondary mt-2 px-3 py-1.5 text-xs" @click="copyReport">
            {{ copied ? 'Tersalin' : 'Salin diagnostik' }}
          </button>
        </div>

        <NuxtLink to="/login" class="btn-primary mt-5 inline-block px-5 py-2.5">
          Kembali ke halaman masuk
        </NuxtLink>
      </template>

      <template v-else>
        <div class="text-4xl">⏳</div>
        <p class="mt-3 text-gray-600 dark:text-gray-400">Memproses autentikasi...</p>
      </template>
    </div>
  </div>
</template>
