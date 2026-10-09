// Rencana Belajar menuju ujian — membagi daftar topik ke hari-hari sebelum ujian tanpa AI.
// Aturan:
// 1. Hari yang dipakai: dari tanggal mulai sampai H-1 ujian, kecuali hari libur belajar.
// 2. Bila tersedia ≥ 2 hari, hari terakhir khusus "Review semua materi".
// 3. Topik dibagi rata dan berurutan ke hari belajar (topik > hari → beberapa topik per hari).
// 4. Bila hari lebih banyak dari topik, hari sisa diisi mengulang topik secara bergiliran.
import { kunciTanggal } from './progres.js'

export type JenisSesi = 'materi' | 'ulang' | 'review'

export type SesiTersusun = {
  /** "YYYY-MM-DD" (tanggal lokal) */
  tanggal: string
  judul: string
  jenis: JenisSesi
  urutan: number
}

export type OpsiSusun = {
  topik: readonly string[]
  /** Hari pertama belajar (biasanya hari ini) */
  mulai: Date
  tanggalUjian: Date
  /** 0 = Minggu … 6 = Sabtu */
  hariLibur?: readonly number[]
}

export const JUDUL_REVIEW = 'Review semua materi + latihan soal'

function tanpaJam(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Selisih hari kalender (tanggal lokal) dari a ke b */
export function selisihHari(a: Date, b: Date): number {
  return Math.round((tanpaJam(b).getTime() - tanpaJam(a).getTime()) / 86_400_000)
}

/** Hari belajar yang tersedia sebelum ujian (tidak termasuk hari ujian) */
export function hariTersedia(mulai: Date, tanggalUjian: Date, hariLibur: readonly number[] = []) {
  const hari: Date[] = []
  const libur = new Set(hariLibur)
  for (
    let d = tanpaJam(mulai);
    d < tanpaJam(tanggalUjian);
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  ) {
    if (!libur.has(d.getDay())) hari.push(d)
  }
  return hari
}

export function susunRencana({
  topik,
  mulai,
  tanggalUjian,
  hariLibur = [],
}: OpsiSusun): SesiTersusun[] {
  const daftar = topik.map((t) => t.trim()).filter(Boolean)
  if (!daftar.length) return []

  let hari = hariTersedia(mulai, tanggalUjian, hariLibur)
  // Ujian hari ini / besok tapi semua hari libur → tetap belajar hari ini
  if (!hari.length) hari = [tanpaJam(mulai)]

  const hasil: SesiTersusun[] = []
  const tambah = (d: Date, judul: string, jenis: JenisSesi) => {
    const tanggal = kunciTanggal(d)
    const urutan = hasil.filter((s) => s.tanggal === tanggal).length
    hasil.push({ tanggal, judul, jenis, urutan })
  }

  const adaReview = hari.length >= 2
  const hariBelajar = adaReview ? hari.slice(0, -1) : hari

  // Topik dibagi rata & berurutan: topik ke-i jatuh di hari floor(i * nHari / nTopik)
  if (daftar.length >= hariBelajar.length) {
    daftar.forEach((t, i) => {
      tambah(hariBelajar[Math.floor((i * hariBelajar.length) / daftar.length)]!, t, 'materi')
    })
  } else {
    daftar.forEach((t, i) => tambah(hariBelajar[i]!, t, 'materi'))
    hariBelajar.slice(daftar.length).forEach((d, i) => {
      tambah(d, `Ulang: ${daftar[i % daftar.length]}`, 'ulang')
    })
  }

  if (adaReview) tambah(hari[hari.length - 1]!, JUDUL_REVIEW, 'review')
  return hasil
}
