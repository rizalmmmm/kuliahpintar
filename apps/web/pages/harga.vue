<script setup lang="ts">
  import { PREMIUM_PRICE_IDR, formatRupiah } from '@kuliahpintar/shared'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Harga' })

  const user = useSupabaseUser()

  const fiturFree = [
    '5 request AI per hari',
    'Rangkum Materi',
    'Tanya AI (tutor)',
    'Bantu Tulis',
    'Latihan Soal & Flashcard',
    'Semua dalam Bahasa Indonesia',
  ]

  const fiturPremium = [
    'Request AI tanpa batas',
    'Semua fitur tier gratis',
    'Prioritas kecepatan respons',
    'Riwayat percakapan lebih panjang',
    'Dukungan prioritas',
    'Akses fitur baru lebih awal',
  ]

  // Tujuan tombol CTA: kalau belum login → daftar, kalau sudah → alur upgrade (Midtrans, segera)
  const ctaTo = computed(() => (user.value ? '/dashboard' : '/daftar'))
</script>

<template>
  <div class="container mx-auto max-w-4xl px-4 py-16">
    <!-- Header -->
    <div class="text-center">
      <span
        class="inline-block rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-950 dark:text-primary-300"
      >
        💎 Harga Sederhana
      </span>
      <h1 class="mt-4 text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
        Mulai gratis, upgrade saat butuh lebih
      </h1>
      <p class="mx-auto mt-3 max-w-xl text-gray-600 dark:text-gray-400">
        Tanpa kartu kredit untuk memulai. Batalkan kapan saja.
      </p>
    </div>

    <!-- Pricing cards -->
    <div class="mt-12 grid gap-6 md:grid-cols-2">
      <!-- Free -->
      <div class="card flex flex-col">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Gratis</h2>
        <p class="mt-1 text-sm text-gray-500">Untuk mulai mencoba</p>
        <div class="mt-4">
          <span class="text-4xl font-bold text-gray-900 dark:text-white">Rp0</span>
          <span class="text-sm text-gray-500">/selamanya</span>
        </div>
        <ul class="mt-6 space-y-3">
          <li
            v-for="f in fiturFree"
            :key="f"
            class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <span class="text-green-500">✓</span>
            {{ f }}
          </li>
        </ul>
        <NuxtLink
          :to="user ? '/dashboard' : '/daftar'"
          class="btn-secondary mt-8 w-full py-2.5 text-center"
        >
          {{ user ? 'Ke Dashboard' : 'Daftar Gratis' }}
        </NuxtLink>
      </div>

      <!-- Premium -->
      <div
        class="card relative flex flex-col border-primary-500 ring-1 ring-primary-500 dark:border-primary-500"
      >
        <span
          class="absolute -top-3 left-6 rounded-full bg-primary-600 px-3 py-0.5 text-xs font-medium text-white"
        >
          Paling Populer
        </span>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Premium</h2>
        <p class="mt-1 text-sm text-gray-500">Untuk belajar tanpa batas</p>
        <div class="mt-4">
          <span class="text-4xl font-bold text-gray-900 dark:text-white">
            {{ formatRupiah(PREMIUM_PRICE_IDR) }}
          </span>
          <span class="text-sm text-gray-500">/bulan</span>
        </div>
        <ul class="mt-6 space-y-3">
          <li
            v-for="f in fiturPremium"
            :key="f"
            class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <span class="text-primary-500">✓</span>
            {{ f }}
          </li>
        </ul>
        <div class="mt-8">
          <NuxtLink :to="ctaTo" class="btn-primary block w-full py-2.5 text-center">
            {{ user ? 'Upgrade ke Premium' : 'Mulai Premium' }}
          </NuxtLink>
          <p class="mt-2 text-center text-xs text-gray-400">
            Pembayaran via Midtrans akan segera hadir
          </p>
        </div>
      </div>
    </div>

    <!-- FAQ singkat -->
    <div class="mx-auto mt-16 max-w-2xl">
      <h3 class="text-center text-lg font-semibold text-gray-900 dark:text-white">
        Pertanyaan Umum
      </h3>
      <div class="mt-6 space-y-4">
        <div class="card">
          <p class="font-medium text-gray-900 dark:text-white">Apa itu "5 request per hari"?</p>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Setiap kali kamu memakai fitur AI (merangkum, bertanya, membuat soal, dll.) dihitung 1
            request. Batas ini kembali penuh setiap hari untuk pengguna gratis.
          </p>
        </div>
        <div class="card">
          <p class="font-medium text-gray-900 dark:text-white">Bisa berhenti kapan saja?</p>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Bisa. Premium berlaku per bulan tanpa kontrak. Jika berhenti, akunmu otomatis kembali ke
            tier gratis di periode berikutnya.
          </p>
        </div>
        <div class="card">
          <p class="font-medium text-gray-900 dark:text-white">Metode pembayaran apa saja?</p>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Nantinya via Midtrans — transfer bank, e-wallet (GoPay, OVO, Dana), dan kartu kredit.
            Semua harga dalam Rupiah.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
