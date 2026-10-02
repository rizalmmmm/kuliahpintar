// Tipe ulasan pengguna — sesuai tabel di migrasi 003_ulasan.sql

export type Ulasan = {
  id: string
  user_id: string
  /** 1–5 bintang */
  rating: number
  isi: string
  nama: string | null
  avatar_url: string | null
  tampil: boolean
  created_at: string
  updated_at: string
}

export const ULASAN_MIN_KARAKTER = 10
export const ULASAN_MAX_KARAKTER = 1000
