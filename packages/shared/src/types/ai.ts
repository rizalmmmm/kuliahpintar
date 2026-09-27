// Tipe untuk semua fitur AI KuliahPintar.id
export type GayaRangkum = 'singkat' | 'detail' | 'poin'

export type RangkumRequest = {
  teks: string
  gaya?: GayaRangkum
}

export type RangkumResponse = {
  hasil: string
  sisaHarian: number
  limitHarian: number
}

// ── Tanya AI ──
export type ChatRole = 'user' | 'model'

export type ChatMessage = {
  role: ChatRole
  content: string
}

export type TanyaRequest = {
  pertanyaan: string
  /** Riwayat percakapan sebelumnya (untuk konteks multi-turn), maksimal 20 pesan */
  riwayat?: ChatMessage[]
}

export type TanyaResponse = {
  jawaban: string
  sisaHarian: number
  limitHarian: number
}

// ── Bantu Tulis ──
export type ModeTulis = 'kerangka' | 'kembangkan' | 'perbaiki'

export type JenisTulisan = 'essay' | 'laporan' | 'makalah'

export type TulisRequest = {
  teks: string
  mode: ModeTulis
  jenis?: JenisTulisan
}

export type TulisResponse = {
  hasil: string
  sisaHarian: number
  limitHarian: number
}

// ── Latihan Soal ──
export type JenisSoal = 'pilihan_ganda' | 'isian'

export type SoalLatihan = {
  pertanyaan: string
  /** 4 opsi jawaban — hanya untuk pilihan_ganda */
  opsi?: string[]
  /** Index opsi yang benar (0-3) — hanya untuk pilihan_ganda */
  jawabanIndex?: number
  /** Jawaban benar — hanya untuk isian */
  jawaban?: string
  penjelasan: string
}

export type LatihanRequest = {
  teks: string
  jumlah?: number
  jenis?: JenisSoal
}

export type LatihanResponse = {
  soal: SoalLatihan[]
  sisaHarian: number
  limitHarian: number
}

// ── Flashcard ──
export type Flashcard = {
  /** Sisi depan — istilah/konsep/pertanyaan */
  depan: string
  /** Sisi belakang — definisi/jawaban */
  belakang: string
}

export type FlashcardRequest = {
  teks: string
  jumlah?: number
}

export type FlashcardResponse = {
  kartu: Flashcard[]
  sisaHarian: number
  limitHarian: number
}

// ── Upload Materi (ekstrak teks dari PDF/foto) ──
export type EkstrakResponse = {
  /** Teks hasil ekstraksi — sudah dipotong ke TEKS_MATERI_MAX */
  teks: string
  /** true bila materi lebih panjang dari batas dan teks dipotong */
  terpotong: boolean
  /** Sisa kuota ekstraksi hari ini, -1 untuk premium (tanpa batas) */
  sisaEkstrak: number
}

/** Batas upload per tier — dipakai API (enforcement) dan web (validasi awal & copy UI) */
export const UPLOAD_LIMITS = {
  free: { maxFiles: 1, maxTotalBytes: 5 * 1024 * 1024, ekstrakPerHari: 3 },
  premium: { maxFiles: 5, maxTotalBytes: 15 * 1024 * 1024, ekstrakPerHari: -1 },
} as const

export const UPLOAD_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

export type UploadMimeType = (typeof UPLOAD_MIME_TYPES)[number]

/** Panjang maksimal teks materi yang diterima endpoint AI */
export const TEKS_MATERI_MAX = 10_000

export type AiFeature = 'rangkum' | 'tanya' | 'tulis' | 'flashcard' | 'latihan_soal' | 'ekstrak'

export type UsageSummary = {
  used: number
  limit: number
  sisa: number
  resetAt: string
  tier: 'free' | 'premium'
  /** true untuk premium — tanpa batas harian */
  unlimited: boolean
}
