// Simulasi Ujian — utilitas tanpa AI: acak urutan, susun soal pilihan ganda dari Kartu Hafalan,
// dan hitung nilai.

/** Soal siap dikerjakan (dari paket soal atau hasil konversi kartu) */
export type SoalUjianSiap = {
  id: string
  pertanyaan: string
  opsi: string[]
  kunci: number
  pembahasan: string | null
}

/** Minimal kartu agar bisa dibuat soal pilihan ganda 4 opsi (1 benar + 3 pengecoh) */
export const MIN_KARTU_UNTUK_UJIAN = 4

export function acak<T>(arr: readonly T[], rand: () => number = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/**
 * Ubah kartu (depan = pertanyaan, belakang = jawaban) jadi soal pilihan ganda.
 * Pengecoh diambil dari jawaban kartu lain di dek yang sama (jawaban kembar diabaikan).
 */
export function soalDariKartu(
  kartu: readonly { id: string; depan: string; belakang: string }[],
  jumlah: number,
  rand: () => number = Math.random
): SoalUjianSiap[] {
  const jawabanUnik = [...new Set(kartu.map((k) => k.belakang.trim()))]
  if (jawabanUnik.length < 2) return []

  return acak(kartu, rand)
    .slice(0, Math.max(0, jumlah))
    .map((k) => {
      const benar = k.belakang.trim()
      const pengecoh = acak(
        jawabanUnik.filter((j) => j !== benar),
        rand
      ).slice(0, 3)
      const opsi = acak([benar, ...pengecoh], rand)
      return {
        id: k.id,
        pertanyaan: k.depan,
        opsi,
        kunci: opsi.indexOf(benar),
        pembahasan: null,
      }
    })
}

export type HasilNilai = { benar: number; total: number; nilai: number }

/** jawaban[i] = indeks opsi yang dipilih untuk soal ke-i, atau null bila kosong */
export function hitungNilai(
  soal: readonly Pick<SoalUjianSiap, 'kunci'>[],
  jawaban: readonly (number | null)[]
): HasilNilai {
  const total = soal.length
  const benar = soal.filter((s, i) => jawaban[i] === s.kunci).length
  return { benar, total, nilai: total ? Math.round((benar / total) * 100) : 0 }
}

/** "mm:ss" atau "h:mm:ss" */
export function formatSisaWaktu(detik: number): string {
  const d = Math.max(0, Math.floor(detik))
  const j = Math.floor(d / 3600)
  const m = Math.floor((d % 3600) / 60)
  const s = d % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return j ? `${j}:${mm}:${ss}` : `${mm}:${ss}`
}
