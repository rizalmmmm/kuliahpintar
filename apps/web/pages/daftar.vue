<script setup lang="ts">
  definePageMeta({ layout: 'default' })
  useHead({ title: 'Daftar' })

  const supabase = useSupabaseClient()

  const form = reactive({ name: '', email: '', password: '', confirmPassword: '' })
  const errorMsg = ref<string | null>(null)
  const loading = ref(false)
  const success = ref(false)

  async function handleRegister() {
    if (form.password !== form.confirmPassword) {
      errorMsg.value = 'Password dan konfirmasi password tidak cocok.'
      return
    }
    if (form.password.length < 8) {
      errorMsg.value = 'Password minimal 8 karakter.'
      return
    }

    loading.value = true
    errorMsg.value = null

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name } },
    })

    if (error) {
      errorMsg.value = error.message
    } else {
      success.value = true
    }

    loading.value = false
  }
</script>

<template>
  <div class="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
    <div class="w-full max-w-sm">
      <template v-if="!success">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Buat Akun Gratis</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Sudah punya akun?
          <NuxtLink to="/login" class="text-primary-600 hover:underline">Masuk di sini</NuxtLink>
        </p>

        <form class="mt-6 space-y-4" @submit.prevent="handleRegister">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nama Lengkap
            </label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              required
              class="input mt-1"
              placeholder="Nama kamu"
            />
          </div>
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              autocomplete="email"
              class="input mt-1"
              placeholder="kamu@email.com"
            />
          </div>
          <div>
            <label
              for="password"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              required
              class="input mt-1"
              placeholder="Min. 8 karakter"
            />
          </div>
          <div>
            <label
              for="confirm-password"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Konfirmasi Password
            </label>
            <input
              id="confirm-password"
              v-model="form.confirmPassword"
              type="password"
              required
              class="input mt-1"
              placeholder="Ulangi password"
            />
          </div>

          <p
            v-if="errorMsg"
            class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400"
          >
            {{ errorMsg }}
          </p>

          <button type="submit" :disabled="loading" class="btn-primary w-full py-2.5">
            {{ loading ? 'Membuat akun...' : 'Daftar Gratis' }}
          </button>

          <p class="text-center text-xs text-gray-500">
            Dengan mendaftar, kamu menyetujui
            <NuxtLink to="/syarat" class="underline">Syarat & Ketentuan</NuxtLink> kami.
          </p>
        </form>
      </template>

      <template v-else>
        <div
          class="rounded-xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950"
        >
          <div class="text-4xl">📧</div>
          <h2 class="mt-3 font-semibold text-green-800 dark:text-green-200">Cek Email Kamu!</h2>
          <p class="mt-2 text-sm text-green-700 dark:text-green-300">
            Kami sudah kirim link konfirmasi ke <strong>{{ form.email }}</strong
            >. Klik link tersebut untuk mengaktifkan akun.
          </p>
        </div>
      </template>
    </div>
  </div>
</template>
