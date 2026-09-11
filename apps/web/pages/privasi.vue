<script setup lang="ts">
  definePageMeta({ layout: 'default' })
  useHead({ title: 'Kebijakan Privasi' })
</script>

<template>
  <div class="container mx-auto max-w-3xl px-4 py-16">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Kebijakan Privasi</h1>
    <p class="mt-2 text-sm text-gray-500">Berlaku efektif: 11 September 2026</p>

    <div class="mt-8 space-y-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
      <section>
        <p>
          KuliahPintar.id ("kami") menyediakan alat bantu belajar berbasis AI untuk mahasiswa di
          Indonesia. Halaman ini menjelaskan data apa yang kami kumpulkan, untuk apa data itu
          dipakai, dan siapa saja yang menerimanya. Kami hanya mengumpulkan data yang benar-benar
          diperlukan untuk menjalankan layanan.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          1. Data yang kami kumpulkan
        </h2>
        <ul class="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong>Data akun.</strong> Saat kamu daftar, kami menyimpan email dan nama. Jika kamu
            masuk lewat Google, kami menerima email, nama, dan foto profil dari akun Google-mu (data
            ini disediakan Google berdasarkan izin yang kamu setujui saat login).
          </li>
          <li>
            <strong>Password.</strong> Jika kamu daftar dengan email & password, password disimpan
            dan dienkripsi oleh Supabase Auth (penyedia layanan autentikasi kami) — kami sendiri
            tidak pernah menyimpan atau melihat password-mu dalam bentuk terbuka.
          </li>
          <li>
            <strong>Status langganan.</strong> Tier akun (gratis/premium), status transaksi, dan ID
            pesanan dari Midtrans untuk keperluan aktivasi Premium.
          </li>
          <li>
            <strong>Data pemakaian.</strong> Setiap kali kamu memakai fitur AI, kami mencatat nama
            fitur yang dipakai dan waktunya — dipakai untuk menghitung kuota harian tier gratis.
            Kami <strong>tidak menyimpan isi</strong> teks yang kamu masukkan ke fitur AI.
          </li>
          <li>
            <strong>Teks yang kamu masukkan ke fitur AI</strong> (materi kuliah, pertanyaan, draft
            tulisan, dll). Teks ini diteruskan ke Google Gemini semata-mata untuk menghasilkan
            jawaban/rangkuman/soal yang kamu minta, dan tidak kami simpan di server atau database
            kami setelah respons dikirim balik ke kamu.
          </li>
        </ul>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          2. Untuk apa data ini dipakai
        </h2>
        <ul class="mt-3 list-disc space-y-2 pl-5">
          <li>Membuat dan mengelola akunmu, serta mengautentikasi login.</li>
          <li>
            Menjalankan fitur AI (merangkum, menjawab pertanyaan, membantu menulis, membuat soal &
            flashcard).
          </li>
          <li>Menghitung dan menegakkan batas kuota harian tier gratis.</li>
          <li>Memproses pembayaran dan mengaktifkan/memperpanjang langganan Premium.</li>
          <li>Menjaga keamanan layanan dan mencegah penyalahgunaan.</li>
          <li>Menghubungimu terkait akun atau layanan bila diperlukan.</li>
        </ul>
        <p class="mt-3">
          Kami tidak menjual data pribadimu, dan tidak memakainya untuk iklan pihak ketiga.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          3. Pihak ketiga yang menerima data
        </h2>
        <p class="mt-3">
          Kami memakai beberapa penyedia layanan untuk menjalankan KuliahPintar.id:
        </p>
        <ul class="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong>Supabase</strong> — menyimpan data akun, status langganan, dan log pemakaian,
            serta menangani autentikasi (termasuk login Google).
          </li>
          <li>
            <strong>Google Gemini API</strong> — memproses teks yang kamu masukkan ke fitur AI untuk
            menghasilkan output. Penggunaan API ini tunduk pada kebijakan data Google sendiri untuk
            layanan API generatif mereka.
          </li>
          <li>
            <strong>Google OAuth</strong> — dipakai untuk opsi "Masuk dengan Google"; Google
            membagikan email, nama, dan foto profilmu ke kami sesuai izin yang kamu berikan.
          </li>
          <li>
            <strong>Midtrans</strong> — memproses pembayaran langganan Premium. Detail pembayaran
            (nomor kartu, rekening, e-wallet) ditangani langsung oleh Midtrans dan mitra
            pembayarannya — kami tidak pernah menerima atau menyimpan detail tersebut. Kami hanya
            menerima status transaksi dan ID pesanan dari Midtrans.
          </li>
          <li><strong>Vercel</strong> — menghosting aplikasi web (frontend) KuliahPintar.id.</li>
          <li><strong>Railway</strong> — menghosting server API (backend) KuliahPintar.id.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          4. Berapa lama data disimpan
        </h2>
        <ul class="mt-3 list-disc space-y-2 pl-5">
          <li>Data akun dan langganan disimpan selama akunmu aktif.</li>
          <li>
            Log pemakaian (nama fitur, waktu) disimpan selama akun aktif untuk keperluan kuota dan
            riwayat transaksi.
          </li>
          <li>
            Teks yang kamu masukkan ke fitur AI tidak disimpan sama sekali di sisi kami — hanya
            diteruskan ke Google Gemini untuk diproses lalu dibuang.
          </li>
          <li>Jika kamu meminta penghapusan akun, data akan dihapus sesuai bagian 5 di bawah.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">5. Hakmu atas data</h2>
        <p class="mt-3">Kamu berhak untuk:</p>
        <ul class="mt-3 list-disc space-y-2 pl-5">
          <li>Meminta salinan data pribadi yang kami simpan tentangmu.</li>
          <li>Meminta koreksi data yang tidak akurat.</li>
          <li>
            Meminta penghapusan akun beserta data pribadi yang terkait — saat ini permintaan
            dilakukan lewat email ke kontak di bawah, karena penghapusan mandiri belum tersedia di
            aplikasi.
          </li>
        </ul>
        <p class="mt-3">
          Kami akan memproses permintaan penghapusan dalam waktu wajar, kecuali ada data yang wajib
          kami simpan lebih lama untuk kepatuhan hukum (misalnya catatan transaksi pembayaran).
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">6. Keamanan data</h2>
        <p class="mt-3">
          Kami memakai koneksi terenkripsi (HTTPS) untuk seluruh komunikasi antara perangkatmu dan
          server kami, serta membatasi akses ke database hanya untuk sistem yang membutuhkannya.
          Meski begitu, tidak ada sistem yang 100% aman — segera hubungi kami bila kamu mencurigai
          ada penyalahgunaan akunmu.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">7. Perubahan kebijakan</h2>
        <p class="mt-3">
          Kami dapat memperbarui kebijakan ini dari waktu ke waktu. Perubahan signifikan akan kami
          umumkan di halaman ini dengan tanggal berlaku yang diperbarui.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">8. Kontak</h2>
        <p class="mt-3">
          Ada pertanyaan soal privasi atau ingin mengajukan permintaan terkait datamu? Hubungi kami
          di
          <a href="mailto:privasi@kuliahpintar.id" class="text-primary-600 hover:underline"
            >privasi@kuliahpintar.id</a
          >.
        </p>
      </section>
    </div>
  </div>
</template>
