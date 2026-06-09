<script setup lang="ts">
  definePageMeta({ layout: 'default' })
  useHead({ title: 'Beranda' })

  const fiturList = [
    {
      emoji: '📄',
      judul: 'Rangkum Materi',
      deskripsi: 'Upload PDF atau tempel teks, dapatkan rangkuman padat dalam hitungan detik.',
    },
    {
      emoji: '💬',
      judul: 'Tanya Jawab AI',
      deskripsi: 'Ajukan pertanyaan tentang materi kuliahmu, AI menjawab dengan bahasa yang mudah.',
    },
    {
      emoji: '✍️',
      judul: 'Bantu Tulis',
      deskripsi: 'Asisten penulisan untuk essay, laporan, dan makalah akademik.',
    },
    {
      emoji: '🔍',
      judul: 'Cek Plagiarisme',
      deskripsi: 'Periksa originalitas tulisanmu sebelum dikumpulkan ke dosen.',
    },
    {
      emoji: '🗂️',
      judul: 'Buat Flashcard',
      deskripsi: 'Generate kartu belajar otomatis dari materi untuk memudahkan hafalan.',
    },
    {
      emoji: '🎯',
      judul: 'Latihan Soal',
      deskripsi: 'Buat latihan soal dari materi apapun untuk mempersiapkan ujian.',
    },
  ]
</script>

<template>
  <main>
    <!-- Hero Section -->
    <section class="container mx-auto px-4 py-20 text-center">
      <span
        class="inline-block rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-950 dark:text-primary-300"
      >
        🎓 Untuk Mahasiswa Indonesia
      </span>

      <h1 class="mt-4 text-4xl font-bold tracking-tight text-gray-900 dark:text-white md:text-6xl">
        Belajar Lebih Cerdas
        <br />
        <span class="text-primary-600">dengan Bantuan AI</span>
      </h1>

      <p class="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
        KuliahPintar.id membantu kamu merangkum materi, membuat catatan, memahami konsep sulit, dan
        mempercepat pengerjaan tugas — semua dalam Bahasa Indonesia.
      </p>

      <div class="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <NuxtLink to="/daftar" class="btn-primary px-8 py-3 text-base">
          Mulai Gratis Sekarang
        </NuxtLink>
        <NuxtLink to="/fitur" class="btn-secondary px-8 py-3 text-base">
          Lihat Semua Fitur
        </NuxtLink>
      </div>

      <p class="mt-4 text-xs text-gray-500">Gratis selamanya · Tidak perlu kartu kredit</p>
    </section>

    <!-- Feature Cards -->
    <section class="bg-gray-50 py-16 dark:bg-gray-900">
      <div class="container mx-auto px-4">
        <h2 class="text-center text-2xl font-bold text-gray-900 dark:text-white">
          Apa yang Bisa KuliahPintar Lakukan?
        </h2>
        <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="fitur in fiturList" :key="fitur.judul" class="card">
            <div class="text-3xl">{{ fitur.emoji }}</div>
            <h3 class="mt-3 font-semibold text-gray-900 dark:text-white">{{ fitur.judul }}</h3>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ fitur.deskripsi }}</p>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
