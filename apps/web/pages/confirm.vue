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

  const errorMsg = ref<string | null>(null)

  function queryString(key: string): string | null {
    const value = route.query[key]
    return typeof value === 'string' && value.length > 0 ? value : null
  }

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
    }, 10_000)
  })

  onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4">
    <div class="w-full max-w-sm text-center">
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
