<script setup lang="ts">
  definePageMeta({ layout: 'default' })

  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl

  const judulSeo = 'KuliahPintar.id — Teman Belajar & Alat Kuliah untuk Mahasiswa Indonesia'
  const deskripsiSeo =
    'Rangkum materi, kartu hafalan, simulasi ujian, rencana belajar menuju UTS/UAS, atur deadline, simpan materi kuliah, hitung IPK, dan daftar pustaka APA/IEEE otomatis. Gratis untuk mahasiswa Indonesia.'

  useHead({ title: judulSeo, titleTemplate: '%s' })
  useSeoMeta({
    description: deskripsiSeo,
    ogTitle: judulSeo,
    ogDescription: deskripsiSeo,
    twitterTitle: judulSeo,
    twitterDescription: deskripsiSeo,
  })

  const langkah = [
    {
      no: '1',
      judul: 'Daftar gratis',
      desc: 'Cukup email — tanpa kartu kredit, tanpa install aplikasi.',
    },
    {
      no: '2',
      judul: 'Masukkan materimu',
      desc: 'Simpan slide & PDF, isi jadwal dan deadline, lalu buat kartu hafalan atau rencana belajar.',
    },
    {
      no: '3',
      judul: 'Belajar lebih terarah',
      desc: 'Latihan, pengingat, progres belajar, dan IPK — semua rapi di dashboard.',
    },
  ]

  const faq = [
    {
      q: 'Apakah KuliahPintar.id gratis?',
      a: 'Ya. Daftar gratis tanpa kartu kredit. Sebagian besar alat — Kartu Hafalan, Simulasi Ujian, Rencana Belajar, Jadwal & Tugas, Timer Fokus — gratis tanpa batas; Kalkulator IPK dan Daftar Pustaka bahkan bisa dipakai tanpa login. Rangkum Materi, Tanya Materi, Bantu Tulis, serta soal & flashcard otomatis punya kuota harian gratis, dan paket Premium tersedia untuk pemakaian tanpa batas.',
    },
    {
      q: 'Bisa dipakai di HP?',
      a: 'Bisa. KuliahPintar.id berjalan langsung di browser HP maupun laptop — tidak perlu install aplikasi.',
    },
    {
      q: 'Gaya daftar pustaka apa saja yang didukung?',
      a: 'APA 7, IEEE, Harvard, MLA 9, dan Chicago (author-date), dalam Bahasa Indonesia maupun Inggris. Sumber ber-DOI diformat dari data resmi Crossref, sedangkan buku dan website bisa diisi manual.',
    },
    {
      q: 'Apakah data saya aman?',
      a: 'Jadwal, tugas, nilai, kartu hafalan, dan file materi yang kamu simpan hanya bisa diakses oleh akunmu sendiri (kecuali dek kartu yang sengaja kamu bagikan). Detailnya ada di halaman Kebijakan Privasi.',
    },
    {
      q: 'Boleh dipakai untuk mengerjakan tugas kuliah?',
      a: 'KuliahPintar.id dirancang sebagai alat bantu belajar: memahami materi, berlatih, dan mengatur waktu. Hasilnya sebaiknya kamu pahami dan kembangkan sendiri, serta sesuaikan dengan aturan akademik kampusmu.',
    },
  ]

  // Structured data untuk Google: identitas situs, aplikasi, dan FAQ (rich result)
  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify([
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'KuliahPintar.id',
            url: siteUrl,
            inLanguage: 'id-ID',
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'KuliahPintar.id',
            url: siteUrl,
            logo: `${siteUrl}/icon-512.png`,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'KuliahPintar.id',
            url: siteUrl,
            applicationCategory: 'EducationalApplication',
            operatingSystem: 'Web',
            inLanguage: 'id-ID',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'IDR' },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          },
        ]),
      },
    ],
  })

  const faqTerbuka = ref<number | null>(0)
</script>

<template>
  <div>
    <!-- ═══════════ HERO ═══════════ -->
    <section class="relative overflow-hidden">
      <!-- Latar gradasi halus -->
      <div
        class="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary-50 via-white to-white dark:from-primary-950/40 dark:via-gray-950 dark:to-gray-950"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl dark:bg-primary-800/20"
        aria-hidden="true"
      />

      <div class="container mx-auto grid items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-2">
        <div class="text-center lg:text-left">
          <span
            class="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1 text-xs font-medium text-primary-700 shadow-sm dark:border-primary-800 dark:bg-gray-900 dark:text-primary-300"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-primary-500" />
            Dibuat untuk mahasiswa Indonesia
          </span>

          <h1
            class="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-[3.25rem]"
          >
            Semua Urusan Kuliah,
            <span
              class="block bg-gradient-to-r from-primary-600 to-indigo-500 bg-clip-text text-transparent"
            >
              Beres di Satu Tempat
            </span>
          </h1>

          <p
            class="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-600 dark:text-gray-400 lg:mx-0"
          >
            Pahami materi, latihan dengan kartu hafalan & simulasi ujian, susun rencana belajar
            menuju UAS, sampai hitung IPK dan bikin daftar pustaka — rapi, dalam Bahasa Indonesia.
          </p>

          <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <NuxtLink
              to="/daftar"
              class="btn-primary px-7 py-3 text-base shadow-lg shadow-primary-600/20"
            >
              Mulai Gratis
            </NuxtLink>
            <a href="#fitur" class="btn-secondary px-7 py-3 text-base">Lihat Fitur</a>
          </div>

          <ul
            class="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-gray-500 lg:justify-start"
          >
            <li class="flex items-center gap-1.5">
              <span class="text-green-600">✓</span> Gratis untuk mulai
            </li>
            <li class="flex items-center gap-1.5">
              <span class="text-green-600">✓</span> Tanpa install
            </li>
            <li class="flex items-center gap-1.5">
              <span class="text-green-600">✓</span> Bisa di HP
            </li>
          </ul>
        </div>

        <!-- Pratinjau produk (ilustrasi tampilan dashboard) -->
        <div class="relative mx-auto w-full max-w-md" aria-hidden="true">
          <div
            class="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl shadow-primary-900/10 dark:border-gray-800 dark:bg-gray-900 sm:pb-12"
          >
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold text-gray-900 dark:text-white">📅 Hari ini</p>
              <span class="text-xs text-gray-400">Senin</span>
            </div>
            <div class="mt-4 space-y-2">
              <div class="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                <span class="font-mono text-xs text-gray-500">08.00</span>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">Kalkulus II</p>
                  <p class="text-xs text-gray-500">Ruang 301</p>
                </div>
                <span
                  class="ml-auto rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-200"
                >
                  Berlangsung
                </span>
              </div>
              <div
                class="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950"
              >
                <span class="text-lg">📌</span>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">Laporan Praktikum</p>
                  <p class="text-xs text-orange-600">Deadline besok, 23.59</p>
                </div>
              </div>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-2">
              <div class="rounded-xl bg-primary-600 p-3 text-white">
                <p class="text-xs opacity-80">IPK</p>
                <p class="text-2xl font-bold">3,62</p>
              </div>
              <div class="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                <p class="text-xs text-gray-500">Fokus minggu ini</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">6 j 40 m</p>
              </div>
            </div>
          </div>
          <div
            class="absolute -bottom-6 left-6 hidden rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg dark:border-gray-800 dark:bg-gray-900 sm:block"
          >
            <p class="text-xs text-gray-500">Ringkasan Bab 4</p>
            <p class="text-sm font-semibold text-green-600">✓ Siap dipelajari</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════ SOROTAN ═══════════ -->
    <section class="border-y border-gray-100 bg-white py-8 dark:border-gray-800 dark:bg-gray-950">
      <dl class="container mx-auto grid grid-cols-2 gap-6 px-4 text-center md:grid-cols-4">
        <div>
          <dt class="text-xs text-gray-500">Fitur & alat belajar</dt>
          <dd class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ JUMLAH_FITUR }} dalam 1
          </dd>
        </div>
        <div>
          <dt class="text-xs text-gray-500">Bahasa</dt>
          <dd class="text-2xl font-bold text-gray-900 dark:text-white">Indonesia</dd>
        </div>
        <div>
          <dt class="text-xs text-gray-500">Gaya sitasi</dt>
          <dd class="text-2xl font-bold text-gray-900 dark:text-white">5 gaya</dd>
        </div>
        <div>
          <dt class="text-xs text-gray-500">Untuk mulai</dt>
          <dd class="text-2xl font-bold text-gray-900 dark:text-white">Rp0</dd>
        </div>
      </dl>
    </section>

    <!-- ═══════════ FITUR ═══════════ -->
    <section id="fitur" class="scroll-mt-20 bg-gray-50 py-20 dark:bg-gray-900/50">
      <div class="container mx-auto px-4">
        <div class="mx-auto max-w-2xl text-center">
          <p class="text-sm font-semibold uppercase tracking-wider text-primary-600">Fitur</p>
          <h2 class="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Belajar lebih efektif, tugas lebih teratur
          </h2>
          <p class="mt-3 text-gray-600 dark:text-gray-400">
            Dari memahami materi sampai menyusun daftar pustaka — semua yang kamu butuhkan selama
            kuliah.
          </p>
        </div>

        <!-- Pintasan kategori -->
        <nav class="mt-10 flex flex-wrap justify-center gap-2" aria-label="Kategori fitur">
          <a
            v-for="k in KATEGORI_FITUR"
            :key="k.id"
            :href="`#fitur-${k.id}`"
            class="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:border-primary-400 hover:text-primary-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            {{ k.ikon }} {{ k.judul }}
          </a>
        </nav>

        <div
          v-for="k in KATEGORI_FITUR"
          :id="`fitur-${k.id}`"
          :key="k.id"
          class="mt-14 scroll-mt-24"
        >
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ k.ikon }} {{ k.judul }}
            </h3>
            <p class="text-sm text-gray-500">{{ k.desc }}</p>
          </div>
          <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NuxtLink
              v-for="f in k.item"
              :key="f.to"
              :to="f.to"
              class="group relative rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary-700"
            >
              <span
                v-if="f.publik"
                class="absolute right-4 top-4 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-950 dark:text-green-300"
              >
                Tanpa login
              </span>
              <span
                class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-xl dark:bg-primary-950"
              >
                {{ f.ikon }}
              </span>
              <p class="mt-4 font-semibold text-gray-900 dark:text-white">{{ f.judul }}</p>
              <p class="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {{ f.desc }}
              </p>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════ CARA KERJA ═══════════ -->
    <section class="py-20">
      <div class="container mx-auto px-4">
        <h2 class="text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Mulai dalam 3 langkah
        </h2>
        <ol class="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-3">
          <li v-for="l in langkah" :key="l.no" class="text-center">
            <span
              class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white shadow-lg shadow-primary-600/30"
            >
              {{ l.no }}
            </span>
            <p class="mt-4 font-semibold text-gray-900 dark:text-white">{{ l.judul }}</p>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ l.desc }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- ═══════════ COBA TANPA DAFTAR ═══════════ -->
    <section class="pb-20">
      <div class="container mx-auto px-4">
        <div
          class="grid gap-6 rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-primary-50 p-8 dark:border-gray-800 dark:from-gray-900 dark:to-primary-950/40 md:grid-cols-2 md:p-12"
        >
          <div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
              Coba dulu, tanpa daftar
            </h2>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              Dua alat paling sering dicari mahasiswa bisa langsung kamu pakai sekarang juga.
            </p>
          </div>
          <div class="grid gap-3">
            <NuxtLink
              to="/alat/kalkulator-ipk"
              class="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-primary-400 dark:border-gray-700 dark:bg-gray-900"
            >
              <span class="text-2xl">🎓</span>
              <span class="flex-1">
                <span class="block font-semibold text-gray-900 dark:text-white"
                  >Kalkulator IPK</span
                >
                <span class="block text-sm text-gray-500">Hitung IPS, IPK, dan target nilai</span>
              </span>
              <span class="text-primary-600">→</span>
            </NuxtLink>
            <NuxtLink
              to="/alat/daftar-pustaka"
              class="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-primary-400 dark:border-gray-700 dark:bg-gray-900"
            >
              <span class="text-2xl">📚</span>
              <span class="flex-1">
                <span class="block font-semibold text-gray-900 dark:text-white">
                  Generator Daftar Pustaka
                </span>
                <span class="block text-sm text-gray-500">APA, IEEE, Harvard otomatis</span>
              </span>
              <span class="text-primary-600">→</span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════ FAQ ═══════════ -->
    <section class="bg-gray-50 py-20 dark:bg-gray-900/50">
      <div class="container mx-auto max-w-3xl px-4">
        <h2 class="text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Pertanyaan yang sering ditanyakan
        </h2>
        <div class="mt-10 space-y-3">
          <div
            v-for="(f, i) in faq"
            :key="f.q"
            class="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
          >
            <button
              type="button"
              class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium text-gray-900 dark:text-white"
              :aria-expanded="faqTerbuka === i"
              @click="faqTerbuka = faqTerbuka === i ? null : i"
            >
              {{ f.q }}
              <span class="text-gray-400 transition" :class="{ 'rotate-45': faqTerbuka === i }"
                >+</span
              >
            </button>
            <!-- v-show agar jawaban tetap ada di HTML untuk mesin pencari -->
            <p
              v-show="faqTerbuka === i"
              class="px-5 pb-5 text-sm leading-relaxed text-gray-600 dark:text-gray-400"
            >
              {{ f.a }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════ CTA ═══════════ -->
    <section class="py-20">
      <div class="container mx-auto px-4">
        <div
          class="rounded-3xl bg-gradient-to-r from-primary-600 to-indigo-600 px-6 py-14 text-center shadow-xl md:px-12"
        >
          <h2 class="text-3xl font-bold tracking-tight text-white">
            Semester ini, kuliah lebih terarah
          </h2>
          <p class="mx-auto mt-3 max-w-xl text-primary-100">
            Gabung gratis dan rapikan materi, tugas, serta nilaimu mulai hari ini.
          </p>
          <NuxtLink
            to="/daftar"
            class="mt-8 inline-block rounded-lg bg-white px-8 py-3 text-base font-semibold text-primary-700 shadow transition hover:bg-primary-50"
          >
            Daftar Gratis
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
