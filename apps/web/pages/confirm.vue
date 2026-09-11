<script setup lang="ts">
  // Halaman callback setelah OAuth (Google) atau klik link konfirmasi email.
  //
  // Sudah diverifikasi pada versi yang terpasang (@supabase/ssr 0.7.0 +
  // @supabase/auth-js 2.106.1) bahwa penukaran `code` berjalan otomatis:
  //   - createBrowserClient memaksa flowType 'pkce' dan detectSessionInUrl di browser.
  //   - parseParametersFromURL() membaca url.searchParams, bukan hanya hash —
  //     jadi `?code=` memang diproses, bukan cuma fragment.
  //   - _isPKCECallback() mencari verifier di storage dengan kunci
  //     `<storageKey>-code-verifier`, dan @nuxtjs/supabase menyetel storageKey ke
  //     `sb-<ref>-auth-token` — persis nama cookie verifier yang terlihat di diagnostik.
  // Karena itu exchangeCodeForSession manual TIDAK diperlukan di sini; memanggilnya
  // hanya akan memakai code verifier untuk kedua kalinya dan selalu gagal.
  //
  // Yang tidak otomatis adalah pelaporan error: _initialize() menangkap kegagalan
  // penukaran lalu mengembalikannya sebagai { error }, sedangkan getSession() hanya
  // `await this.initializePromise` dan membuang hasilnya. Jadi exchange yang gagal
  // benar-benar senyap — tanpa throw, tanpa event, tanpa error dari getSession().
  // initialize() bersifat publik dan hasilnya di-memo, jadi memanggilnya di sini
  // mengembalikan { error } yang sama dan membuka kegagalan yang tersembunyi itu.
  definePageMeta({ layout: false })
  useHead({ title: 'Memproses Masuk' })

  const route = useRoute()
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

  // Hasil pemeriksaan awal serta event auth dicatat tanpa mengekspos token.
  const initializeResult = ref('belum diperiksa')
  const initialSessionResult = ref('belum diperiksa')
  const authEvents = ref<string[]>([])
  let diagnosticsStartedAt = 0
  let diagnosticsDeadline = 0

  function elapsedMs() {
    return Math.round(performance.now() - diagnosticsStartedAt)
  }

  function formatAuthError(error: { name: string; message: string }) {
    return `${error.name}: ${error.message}`
  }

  function recordAuthEvent(event: string, eventSession: unknown) {
    if (performance.now() > diagnosticsDeadline) return
    authEvents.value.push(
      `+${elapsedMs()} ms ${event}: sesi ${eventSession ? 'tersedia' : 'tidak tersedia'}`
    )
  }

  // Dibaca langsung dari window, bukan route.query: saat penukaran berhasil
  // auth-js membuang `code` lewat history.replaceState, dan vue-router tidak ikut
  // memperbarui route.query. Jadi kalau `code` masih ada di sini, artinya
  // _getSessionFromURL() tidak pernah sampai ke tahap sukses.
  const codeStillInUrl = ref('belum diperiksa')

  const diagnosticReport = computed(() => [
    ...snapshot.value,
    `initialize() (exchange PKCE): ${initializeResult.value}`,
    `getSession saat halaman dimuat: ${initialSessionResult.value}`,
    `code masih di URL setelah initialize: ${codeStillInUrl.value}`,
    'event auth selama 10 detik:',
    ...(authEvents.value.length > 0 ? authEvents.value : ['  (belum ada event)']),
    `authError: ${authError.value ?? '(tidak ada)'}`,
  ])

  const copied = ref(false)
  async function copyReport() {
    await navigator.clipboard.writeText(diagnosticReport.value.join('\n'))
    copied.value = true
  }
  // --- akhir diagnostik ----------------------------------------------------

  let timer: ReturnType<typeof setTimeout> | undefined
  let unsubscribeAuthListener: (() => void) | undefined
  let redirecting = false

  function redirectToDashboard() {
    if (redirecting) return
    redirecting = true
    clearTimeout(timer)
    void navigateTo('/dashboard', { replace: true })
  }

  onMounted(async () => {
    diagnosticsStartedAt = performance.now()
    diagnosticsDeadline = diagnosticsStartedAt + 10_000

    // Listener dipasang sebelum await pertama. Client dibuat oleh plugin Nuxt yang
    // langsung memanggil initialize(), jadi sesi bisa terbentuk sebelum halaman ini
    // sempat mounted — memasang listener belakangan berarti kehilangan SIGNED_IN.
    const { data: listener } = supabase.auth.onAuthStateChange((event, eventSession) => {
      recordAuthEvent(event, eventSession)
      if (eventSession) redirectToDashboard()
    })
    unsubscribeAuthListener = () => listener.subscription.unsubscribe()

    // Satu-satunya tempat error penukaran PKCE bisa dilihat.
    const { error: initError } = await supabase.auth.initialize()
    initializeResult.value = initError
      ? `+${elapsedMs()} ms GAGAL — ${formatAuthError(initError)}`
      : `+${elapsedMs()} ms selesai tanpa error`
    if (initError) authError.value = formatAuthError(initError)

    codeStillInUrl.value = new URLSearchParams(window.location.search).has('code') ? 'YA' : 'TIDAK'

    // Pemeriksaan eksplisit: kalau sesi sudah terbentuk, langsung pindah tanpa
    // menunggu event apa pun.
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      authError.value ??= formatAuthError(error)
      initialSessionResult.value = `error (${formatAuthError(error)})`
    } else {
      initialSessionResult.value = data.session ? 'sesi tersedia' : 'tidak ada sesi'
    }

    if (data?.session) {
      redirectToDashboard()
      return
    }

    // Supabase mengembalikan kegagalan OAuth lewat query, bukan lewat exception
    const oauthError = queryString('error_description') ?? queryString('error')
    if (oauthError) {
      errorMsg.value = oauthError
      return
    }

    if (!queryString('code')) {
      errorMsg.value = 'Link konfirmasi tidak lengkap. Silakan ulangi proses masuk.'
      return
    }

    if (initError) {
      errorMsg.value = `Penukaran kode gagal: ${formatAuthError(initError)}`
      return
    }

    // initialize() selesai tanpa error tapi sesi belum ada — sisakan jendela
    // singkat untuk SIGNED_IN yang dikirim auth-js lewat setTimeout.
    timer = setTimeout(() => {
      errorMsg.value = 'Sesi gagal dibuat. Link mungkin sudah pernah dipakai atau kedaluwarsa.'
    }, 10_000)
  })

  onBeforeUnmount(() => {
    clearTimeout(timer)
    unsubscribeAuthListener?.()
  })
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
            >{{ diagnosticReport.join('\n') }}</pre
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
