<script setup lang="ts">
  // Halaman callback setelah OAuth (Google) atau klik link konfirmasi email.
  //
  // Client dibuat lewat @supabase/ssr dengan flowType 'pkce' + detectSessionInUrl,
  // jadi penukaran `code` di query string sudah berjalan otomatis lewat
  // supabase.auth.initialize() yang dipanggil plugin Nuxt saat client dibuat.
  // Memanggil exchangeCodeForSession manual di sini akan memakai code verifier
  // untuk kedua kalinya dan selalu gagal.
  //
  // initialize() dipanggil eksplisit di bawah (bukan cuma diandalkan dari plugin)
  // karena hasilnya di-memo dan itu satu-satunya tempat error penukaran PKCE bisa
  // dibaca — getSession() sendiri menunggu initializePromise yang sama tapi
  // membuang hasilnya, sehingga kegagalan penukaran kode akan senyap tanpa ini.
  definePageMeta({ layout: false })
  useHead({ title: 'Memproses Masuk' })

  const route = useRoute()
  const supabase = useSupabaseClient()

  const errorMsg = ref<string | null>(null)

  function queryString(key: string): string | null {
    const value = route.query[key]
    return typeof value === 'string' && value.length > 0 ? value : null
  }

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
    // Listener dipasang sebelum await pertama: sesi bisa terbentuk sebelum
    // halaman ini sempat mounted, jadi memasangnya belakangan berisiko
    // kehilangan event SIGNED_IN.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, eventSession) => {
      if (eventSession) redirectToDashboard()
    })
    unsubscribeAuthListener = () => listener.subscription.unsubscribe()

    const { error: initError } = await supabase.auth.initialize()

    const { data, error } = await supabase.auth.getSession()
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

    if (initError || error) {
      errorMsg.value = 'Gagal memverifikasi sesi masuk. Silakan coba masuk kembali.'
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
