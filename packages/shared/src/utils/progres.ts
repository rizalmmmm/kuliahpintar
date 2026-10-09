// Progres Belajar — streak harian & kisi heatmap. Semua tanggal memakai zona waktu lokal
// pengguna dengan kunci "YYYY-MM-DD" (sama dengan kolom DATE di aktivitas_kartu_harian).

export function kunciTanggal(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const h = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${h}`
}

function geserHari(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** Senin pada minggu yang memuat tanggal d */
export function awalMinggu(d: Date): Date {
  return geserHari(d, -((d.getDay() + 6) % 7))
}

/**
 * Streak = hari aktif berturut-turut sampai hari ini; bila hari ini belum aktif, dihitung
 * sampai kemarin (streak belum putus sebelum hari berganti).
 */
export function hitungStreak(
  hariAktif: ReadonlySet<string>,
  sekarang: Date = new Date()
): { sekarang: number; terpanjang: number } {
  let d = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate())
  if (!hariAktif.has(kunciTanggal(d))) d = geserHari(d, -1)
  let berjalan = 0
  while (hariAktif.has(kunciTanggal(d))) {
    berjalan++
    d = geserHari(d, -1)
  }

  let terpanjang = 0
  let deret = 0
  let sebelumnya: Date | null = null
  for (const k of [...hariAktif].sort()) {
    const [y, m, h] = k.split('-').map(Number) as [number, number, number]
    const tgl = new Date(y, m - 1, h)
    deret = sebelumnya && kunciTanggal(geserHari(sebelumnya, 1)) === k ? deret + 1 : 1
    terpanjang = Math.max(terpanjang, deret)
    sebelumnya = tgl
  }
  return { sekarang: berjalan, terpanjang: Math.max(terpanjang, berjalan) }
}

export type SelHeatmap = { kunci: string; tanggal: Date; masaDepan: boolean }

/** Kisi heatmap: `jumlahMinggu` kolom (minggu terlama → minggu ini), tiap kolom Senin–Minggu */
export function kisiHeatmap(jumlahMinggu: number, sekarang: Date = new Date()): SelHeatmap[][] {
  const hariIni = kunciTanggal(sekarang)
  const seninIni = awalMinggu(sekarang)
  return Array.from({ length: jumlahMinggu }, (_, w) => {
    const senin = geserHari(seninIni, -7 * (jumlahMinggu - 1 - w))
    return Array.from({ length: 7 }, (_, i) => {
      const tanggal = geserHari(senin, i)
      const kunci = kunciTanggal(tanggal)
      return { kunci, tanggal, masaDepan: kunci > hariIni }
    })
  })
}

/** Tingkat warna heatmap 0–4 dari skor aktivitas (0 = tidak aktif) */
export function tingkatAktivitas(skor: number): 0 | 1 | 2 | 3 | 4 {
  if (skor <= 0) return 0
  if (skor < 3) return 1
  if (skor < 8) return 2
  if (skor < 20) return 3
  return 4
}
