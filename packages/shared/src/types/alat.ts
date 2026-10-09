// Tipe untuk Alat Belajar tanpa AI — sesuai tabel di migrasi 002_alat_belajar.sql

/** 1 = Senin … 7 = Minggu */
export type Hari = 1 | 2 | 3 | 4 | 5 | 6 | 7

export const NAMA_HARI: Record<Hari, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  7: 'Minggu',
}

export type JadwalKuliah = {
  id: string
  user_id: string
  mata_kuliah: string
  hari: Hari
  /** "HH:MM:SS" waktu lokal */
  jam_mulai: string
  jam_selesai: string
  ruang: string | null
  dosen: string | null
  created_at: string
}

export type Tugas = {
  id: string
  user_id: string
  judul: string
  mata_kuliah: string | null
  catatan: string | null
  /** ISO timestamp (UTC) */
  deadline: string
  selesai: boolean
  selesai_at: string | null
  diingatkan_at: string | null
  created_at: string
}

export type NilaiMk = {
  id: string
  user_id?: string
  semester: number
  mata_kuliah: string
  sks: number
  huruf: string
  bobot: number
  created_at?: string
}

export type SesiFokus = {
  id: string
  user_id: string
  durasi_menit: number
  label: string | null
  selesai_at: string
}

// ── Daftar Pustaka ──
export type GayaSitasi = 'apa' | 'ieee' | 'harvard' | 'mla' | 'chicago'

export const GAYA_SITASI: { value: GayaSitasi; label: string }[] = [
  { value: 'apa', label: 'APA 7' },
  { value: 'ieee', label: 'IEEE' },
  { value: 'harvard', label: 'Harvard' },
  { value: 'mla', label: 'MLA 9' },
  { value: 'chicago', label: 'Chicago (author-date)' },
]

export type HasilCariPustaka = {
  doi: string
  judul: string
  penulis: string
  tahun: number | null
  sumber: string | null
}

export type SitasiResponse = {
  doi: string
  gaya: GayaSitasi
  /** Teks sitasi siap pakai */
  teks: string
  /** Kunci pengurutan (nama belakang penulis pertama / judul) */
  kunciUrut: string
}

// ── Kartu Hafalan (migrasi 005) ──
export type DekKartu = {
  id: string
  user_id: string
  judul: string
  deskripsi: string | null
  publik: boolean
  created_at: string
  updated_at: string
}

export type Kartu = {
  id: string
  dek_id: string
  user_id: string
  depan: string
  belakang: string
  /** Kotak Leitner 1–5 */
  kotak: number
  jatuh_tempo: string
  created_at: string
}
