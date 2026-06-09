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

export type AiFeature = 'rangkum' | 'tanya' | 'tulis' | 'flashcard' | 'latihan_soal'

export type UsageSummary = {
  used: number
  limit: number
  sisa: number
  resetAt: string
}
