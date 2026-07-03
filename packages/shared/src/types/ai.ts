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

export type AiFeature = 'rangkum' | 'tanya' | 'tulis' | 'flashcard' | 'latihan_soal'

export type UsageSummary = {
  used: number
  limit: number
  sisa: number
  resetAt: string
}
