<script setup lang="ts">
  // Login admin pakai nomor HP + OTP SMS (Supabase Phone Auth).
  // Akses admin tetap dicek di server (middleware requireAdmin) berdasarkan nomor terverifikasi.
  definePageMeta({ layout: 'default' })
  useHead({ title: 'Masuk Admin', meta: [{ name: 'robots', content: 'noindex' }] })

  const supabase = useSupabaseClient()
  const router = useRouter()

  const nomor = ref('')
  const kode = ref('')
  const tahap = ref<'nomor' | 'kode'>('nomor')
  const loading = ref(false)
  const errorMsg = ref<string | null>(null)

  // 08xx / 628xx / +628xx → +628xx
  const nomorE164 = computed(() => {
    const digit = nomor.value.replace(/\D/g, '')
    if (digit.startsWith('0')) return `+62${digit.slice(1)}`
    if (digit.startsWith('62')) return `+${digit}`
    return `+${digit}`
  })

  async function kirimKode() {
    loading.value = true
    errorMsg.value = null
    const { error } = await supabase.auth.signInWithOtp({ phone: nomorE164.value })
    loading.value = false
    if (error) {
      errorMsg.value = 'Gagal mengirim kode OTP. Periksa nomor atau coba lagi sebentar lagi.'
      return
    }
    tahap.value = 'kode'
  }

  async function verifikasi() {
    loading.value = true
    errorMsg.value = null
    const { error } = await supabase.auth.verifyOtp({
      phone: nomorE164.value,
      token: kode.value.trim(),
      type: 'sms',
    })
    loading.value = false
    if (error) {
      errorMsg.value = 'Kode OTP salah atau sudah kedaluwarsa.'
      return
    }
    await router.push('/admin')
  }
</script>

<template>
  <div class="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
    <div class="w-full max-w-sm">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Masuk Admin</h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Masuk dengan nomor HP admin. Kode OTP dikirim lewat SMS.
      </p>

      <form v-if="tahap === 'nomor'" class="mt-6 space-y-4" @submit.prevent="kirimKode">
        <div>
          <label for="nomor" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nomor HP
          </label>
          <input
            id="nomor"
            v-model="nomor"
            type="tel"
            required
            autocomplete="tel"
            inputmode="tel"
            class="input mt-1"
            placeholder="08xxxxxxxxxx"
          />
        </div>
        <p v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>
        <button type="submit" :disabled="loading" class="btn-primary w-full py-2.5">
          {{ loading ? 'Mengirim...' : 'Kirim Kode OTP' }}
        </button>
      </form>

      <form v-else class="mt-6 space-y-4" @submit.prevent="verifikasi">
        <div>
          <label for="kode" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Kode OTP dikirim ke {{ nomorE164 }}
          </label>
          <input
            id="kode"
            v-model="kode"
            type="text"
            required
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="10"
            class="input mt-1 tracking-widest"
            placeholder="123456"
          />
        </div>
        <p v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>
        <button type="submit" :disabled="loading" class="btn-primary w-full py-2.5">
          {{ loading ? 'Memverifikasi...' : 'Masuk' }}
        </button>
        <button
          type="button"
          class="w-full text-sm text-gray-500 hover:underline"
          @click="tahap = 'nomor'"
        >
          Ganti nomor
        </button>
      </form>
    </div>
  </div>
</template>
