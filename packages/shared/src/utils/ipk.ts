// Perhitungan IPK/IPS & nilai akhir — murni fungsi, dipakai di halaman Kalkulator IPK

export type SkalaNilai = 'umum' | 'ab'

/** Skala bobot huruf yang umum di kampus Indonesia (bisa berbeda per kampus) */
export const SKALA_NILAI: Record<SkalaNilai, { label: string; huruf: [string, number][] }> = {
  umum: {
    label: 'A, A-, B+, B, B-, C+, C, D, E',
    huruf: [
      ['A', 4],
      ['A-', 3.7],
      ['B+', 3.3],
      ['B', 3],
      ['B-', 2.7],
      ['C+', 2.3],
      ['C', 2],
      ['D', 1],
      ['E', 0],
    ],
  },
  ab: {
    label: 'A, AB, B, BC, C, D, E',
    huruf: [
      ['A', 4],
      ['AB', 3.5],
      ['B', 3],
      ['BC', 2.5],
      ['C', 2],
      ['D', 1],
      ['E', 0],
    ],
  },
}

export function bobotHuruf(skala: SkalaNilai, huruf: string): number | null {
  const hit = SKALA_NILAI[skala].huruf.find(([h]) => h === huruf)
  return hit ? hit[1] : null
}

const bulat2 = (n: number) => Math.round(n * 100) / 100

/** IP (IPS untuk satu semester, IPK untuk semua) = Σ(sks × bobot) / Σ sks */
export function hitungIp(daftar: { sks: number; bobot: number }[]): {
  totalSks: number
  totalMutu: number
  ip: number
} {
  const totalSks = daftar.reduce((n, m) => n + m.sks, 0)
  const totalMutu = daftar.reduce((n, m) => n + m.sks * m.bobot, 0)
  return { totalSks, totalMutu: bulat2(totalMutu), ip: totalSks ? bulat2(totalMutu / totalSks) : 0 }
}

/** Predikat kelulusan S1/D4 (umum di Indonesia; kampus bisa punya syarat tambahan) */
export function predikatLulus(ipk: number): string | null {
  if (ipk > 3.5) return 'Dengan Pujian (Cumlaude)'
  if (ipk > 3) return 'Sangat Memuaskan'
  if (ipk >= 2.76) return 'Memuaskan'
  return null
}

/**
 * Rata-rata bobot yang dibutuhkan di SKS berikutnya agar IPK mencapai target.
 * Hasil > 4 berarti tidak mungkin dicapai dengan SKS tersebut; ≤ 0 berarti sudah pasti tercapai.
 */
export function ipsDibutuhkan(opts: {
  ipkSekarang: number
  sksSekarang: number
  targetIpk: number
  sksBerikutnya: number
}): number {
  const { ipkSekarang, sksSekarang, targetIpk, sksBerikutnya } = opts
  if (sksBerikutnya <= 0) return NaN
  const butuh =
    (targetIpk * (sksSekarang + sksBerikutnya) - ipkSekarang * sksSekarang) / sksBerikutnya
  return bulat2(butuh)
}

export type KomponenNilai = { nama: string; persen: number; nilai: number | null }

/**
 * Nilai akhir berbobot (0–100). Jika tepat satu komponen belum diisi (nilai null),
 * hitung nilai minimal komponen itu agar nilai akhir mencapai target.
 */
export function hitungNilaiAkhir(
  komponen: KomponenNilai[],
  target?: number
): {
  totalPersen: number
  nilaiAkhir: number | null
  butuh: { nama: string; nilai: number } | null
} {
  const totalPersen = komponen.reduce((n, k) => n + k.persen, 0)
  const kosong = komponen.filter((k) => k.nilai === null)
  const terisi = komponen.reduce((n, k) => n + (k.nilai ?? 0) * (k.persen / 100), 0)

  if (kosong.length === 0) {
    return { totalPersen, nilaiAkhir: bulat2(terisi), butuh: null }
  }
  if (kosong.length === 1 && target !== undefined && kosong[0]!.persen > 0) {
    const k = kosong[0]!
    return {
      totalPersen,
      nilaiAkhir: null,
      butuh: { nama: k.nama, nilai: bulat2((target - terisi) / (k.persen / 100)) },
    }
  }
  return { totalPersen, nilaiAkhir: null, butuh: null }
}
