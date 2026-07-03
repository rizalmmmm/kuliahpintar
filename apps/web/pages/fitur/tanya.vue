<script setup lang="ts">
  import type { TanyaResponse, ChatMessage } from '@kuliahpintar/shared'

  definePageMeta({ middleware: 'auth', layout: 'default' })
  useHead({ title: 'Tanya AI' })

  const api = useApi()

  const pertanyaan = ref('')
  const pesan = ref<ChatMessage[]>([])
  const sisaHarian = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const chatContainer = ref<HTMLElement | null>(null)
  const inputEl = ref<HTMLTextAreaElement | null>(null)

  const isValid = computed(() => {
    const len = pertanyaan.value.trim().length
    return len >= 3 && len <= 2_000
  })

  const contohPertanyaan = [
    'Jelaskan perbedaan penelitian kualitatif dan kuantitatif',
    'Apa itu supply dan demand dalam ekonomi mikro?',
    'Bagaimana cara kerja fotosintesis?',
  ]

  async function scrollKeBawah() {
    await nextTick()
    chatContainer.value?.scrollTo({ top: chatContainer.value.scrollHeight, behavior: 'smooth' })
  }

  async function handleTanya() {
    if (!isValid.value || loading.value) return

    const teks = pertanyaan.value.trim()
    pertanyaan.value = ''
    error.value = null
    loading.value = true

    // Kirim maksimal 20 pesan terakhir sebagai konteks
    const riwayat = pesan.value.slice(-20)
    pesan.value.push({ role: 'user', content: teks })
    scrollKeBawah()

    try {
      const res = await api.post<{ data: TanyaResponse }>('/api/v1/ai/tanya', {
        pertanyaan: teks,
        riwayat,
      })
      pesan.value.push({ role: 'model', content: res.data.jawaban })
      sisaHarian.value = res.data.sisaHarian
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.'
      // Kembalikan pertanyaan ke input agar tidak hilang
      pesan.value.pop()
      pertanyaan.value = teks
    } finally {
      loading.value = false
      scrollKeBawah()
      inputEl.value?.focus()
    }
  }

  function pakaiContoh(teks: string) {
    pertanyaan.value = teks
    inputEl.value?.focus()
  }

  function resetChat() {
    pesan.value = []
    error.value = null
  }
</script>

<template>
  <div class="container mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-6">
    <!-- Header -->
    <div class="mb-4 flex items-start justify-between">
      <div>
        <NuxtLink
          to="/dashboard"
          class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ← Dashboard
        </NuxtLink>
        <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">💬 Tanya AI</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Tanyakan apa saja seputar materi kuliah, AI menjawab seperti tutor pribadi.
        </p>
      </div>
      <button
        v-if="pesan.length > 0"
        class="btn-secondary px-3 py-1.5 text-xs"
        :disabled="loading"
        @click="resetChat"
      >
        🗑 Chat Baru
      </button>
    </div>

    <!-- ── Area Chat ── -->
    <div
      ref="chatContainer"
      class="flex-1 space-y-4 overflow-y-auto rounded-xl border border-gray-200 p-4 dark:border-gray-700"
    >
      <!-- Empty state -->
      <div
        v-if="pesan.length === 0"
        class="flex h-full flex-col items-center justify-center text-center"
      >
        <div class="text-4xl">💬</div>
        <p class="mt-3 text-sm text-gray-500">Mulai bertanya, atau coba salah satu contoh:</p>
        <div class="mt-4 flex flex-col gap-2">
          <button
            v-for="contoh in contohPertanyaan"
            :key="contoh"
            class="rounded-lg border border-gray-200 px-4 py-2 text-left text-sm text-gray-600 transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-primary-950"
            @click="pakaiContoh(contoh)"
          >
            {{ contoh }}
          </button>
        </div>
      </div>

      <!-- Pesan -->
      <div
        v-for="(msg, i) in pesan"
        :key="i"
        class="flex"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
          :class="
            msg.role === 'user'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
          "
        >
          <p class="whitespace-pre-wrap">{{ msg.content }}</p>
        </div>
      </div>

      <!-- Loading indicator -->
      <div v-if="loading" class="flex justify-start">
        <div class="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
          <div class="flex gap-1">
            <span class="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
            <span class="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
            <span class="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950"
    >
      <p class="text-sm text-red-700 dark:text-red-300">{{ error }}</p>
      <NuxtLink
        v-if="error.includes('Upgrade')"
        to="/harga"
        class="mt-1 inline-block text-sm font-medium text-primary-600 hover:underline"
      >
        Lihat paket Premium →
      </NuxtLink>
    </div>

    <!-- ── Input ── -->
    <div class="mt-3">
      <div class="flex items-end gap-2">
        <textarea
          ref="inputEl"
          v-model="pertanyaan"
          rows="2"
          class="input flex-1 resize-none text-sm leading-relaxed"
          placeholder="Ketik pertanyaanmu... (Enter untuk kirim, Shift+Enter untuk baris baru)"
          :disabled="loading"
          @keydown.enter.exact.prevent="handleTanya"
        />
        <button :disabled="!isValid || loading" class="btn-primary px-4 py-3" @click="handleTanya">
          <span v-if="loading">...</span>
          <span v-else>Kirim ➤</span>
        </button>
      </div>
      <p
        v-if="sisaHarian !== null && sisaHarian >= 0"
        class="mt-2 text-center text-xs text-gray-500"
      >
        Sisa hari ini:
        <strong :class="sisaHarian <= 1 ? 'text-orange-500' : 'text-gray-700 dark:text-gray-300'">
          {{ sisaHarian }} request gratis
        </strong>
        ·
        <NuxtLink to="/harga" class="text-primary-600 hover:underline">Upgrade Premium</NuxtLink>
      </p>
    </div>
  </div>
</template>
