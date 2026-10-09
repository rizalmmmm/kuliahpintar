// Daftar semua fitur & alat KuliahPintar.id — satu sumber untuk beranda, dashboard, dan footer.
// Tambah fitur baru di sini saja supaya semua menu tetap sinkron.

export type ItemFitur = {
  to: string
  ikon: string
  judul: string
  /** Deskripsi singkat (kartu dashboard) */
  ringkas: string
  /** Deskripsi lengkap (kartu beranda) */
  desc: string
  /** Memakai kuota harian (fitur berbasis model bahasa) */
  kuota?: boolean
  /** Bisa dipakai tanpa login */
  publik?: boolean
}

export type KategoriFitur = {
  id: string
  ikon: string
  judul: string
  desc: string
  item: ItemFitur[]
}

export const KATEGORI_FITUR: KategoriFitur[] = [
  {
    id: 'pahami',
    ikon: '📖',
    judul: 'Pahami Materi',
    desc: 'Simpan materi kuliah dan pahami isinya lebih cepat.',
    item: [
      {
        to: '/fitur/rangkum',
        ikon: '📄',
        judul: 'Rangkum Materi',
        ringkas: 'Materi panjang jadi ringkasan',
        desc: 'Materi panjang jadi ringkasan padat — pilih singkat, detail, atau poin-poin.',
        kuota: true,
      },
      {
        to: '/fitur/tanya',
        ikon: '💬',
        judul: 'Tanya Materi',
        ringkas: 'Tanya konsep yang belum paham',
        desc: 'Bingung dengan konsep kuliah? Tanyakan dan dapatkan penjelasan yang mudah dipahami.',
        kuota: true,
      },
      {
        to: '/alat/materi',
        ikon: '📁',
        judul: 'Materi Kuliah',
        ringkas: 'Simpan PDF & slide per matkul',
        desc: 'Simpan PDF, slide, dan dokumen per mata kuliah — buka dari HP atau laptop mana saja.',
      },
    ],
  },
  {
    id: 'latihan',
    ikon: '🧠',
    judul: 'Latihan & Hafalan',
    desc: 'Uji pemahaman dan hafalkan materi sebelum ujian.',
    item: [
      {
        to: '/alat/kartu',
        ikon: '🃏',
        judul: 'Kartu Hafalan',
        ringkas: 'Flashcard + pengulangan Leitner',
        desc: 'Tulis kartu sendiri; yang sering salah muncul lebih sering. Bisa dibagikan ke teman.',
      },
      {
        to: '/alat/ujian',
        ikon: '📝',
        judul: 'Simulasi Ujian',
        ringkas: 'Pilihan ganda + timer',
        desc: 'Latihan ujian pilihan ganda dengan batas waktu, nilai, dan pembahasan.',
      },
      {
        to: '/fitur/flashcard',
        ikon: '✨',
        judul: 'Flashcard Otomatis',
        ringkas: 'Kartu dibuat dari materimu',
        desc: 'Tempel materi, kartu hafalan istilah dan konsep penting langsung jadi.',
        kuota: true,
      },
      {
        to: '/fitur/latihan',
        ikon: '🧩',
        judul: 'Latihan Soal Otomatis',
        ringkas: 'Soal dibuat dari materimu',
        desc: 'Soal pilihan ganda atau isian dari materimu sendiri, lengkap dengan pembahasan.',
        kuota: true,
      },
    ],
  },
  {
    id: 'atur',
    ikon: '🗓️',
    judul: 'Atur Waktu',
    desc: 'Deadline, jadwal belajar, dan fokus — semua terpantau.',
    item: [
      {
        to: '/alat/jadwal',
        ikon: '🗓️',
        judul: 'Jadwal & Tugas',
        ringkas: 'Deadline + pengingat email H-1',
        desc: 'Jadwal kuliah dan semua deadline di satu tempat, diingatkan lewat email H-1.',
      },
      {
        to: '/alat/rencana',
        ikon: '🗂️',
        judul: 'Rencana Belajar',
        ringkas: 'Jadwal belajar menuju UTS/UAS',
        desc: 'Masukkan tanggal ujian & daftar materi — jadwal belajar harian tersusun otomatis.',
      },
      {
        to: '/alat/fokus',
        ikon: '⏱️',
        judul: 'Timer Fokus',
        ringkas: 'Pomodoro + streak belajar',
        desc: 'Belajar dengan teknik Pomodoro, pantau jam belajar dan streak harianmu.',
      },
    ],
  },
  {
    id: 'tugas',
    ikon: '🎓',
    judul: 'Tugas & Nilai',
    desc: 'Rapikan tulisan akademik dan pantau IPK.',
    item: [
      {
        to: '/fitur/tulis',
        ikon: '✍️',
        judul: 'Bantu Tulis',
        ringkas: 'Kerangka & rapikan essay',
        desc: 'Susun kerangka, kembangkan poin, dan rapikan bahasa essay, laporan, atau makalah.',
        kuota: true,
      },
      {
        to: '/alat/daftar-pustaka',
        ikon: '📚',
        judul: 'Daftar Pustaka',
        ringkas: 'APA, IEEE, Harvard otomatis',
        desc: 'Sitasi APA, IEEE, Harvard, MLA, Chicago otomatis dari DOI atau judul artikel.',
        publik: true,
      },
      {
        to: '/alat/kalkulator-ipk',
        ikon: '🎓',
        judul: 'Kalkulator IPK',
        ringkas: 'IPS, IPK, target nilai',
        desc: 'Hitung IPS & IPK, target IPK, dan nilai UAS minimal yang kamu butuhkan.',
        publik: true,
      },
    ],
  },
]

export const JUMLAH_FITUR = KATEGORI_FITUR.reduce((n, k) => n + k.item.length, 0)
