// Sistem Leitner untuk Kartu Hafalan — kartu yang dijawab benar naik kotak dan muncul
// makin jarang; yang salah kembali ke kotak 1 dan muncul lagi hari ini.

export const KOTAK_MAKS = 5

/** Jeda (hari) sebelum kartu di kotak N muncul lagi. Kotak 1 = hari ini juga. */
export const JEDA_KOTAK_HARI: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 }

export type HasilJawab = { kotak: number; jatuhTempo: Date }

export function jawabKartu(
  kotakSekarang: number,
  benar: boolean,
  sekarang = new Date()
): HasilJawab {
  const kotak = benar ? Math.min(kotakSekarang + 1, KOTAK_MAKS) : 1
  const jeda = JEDA_KOTAK_HARI[kotak] ?? 0
  return { kotak, jatuhTempo: new Date(sekarang.getTime() + jeda * 24 * 60 * 60 * 1000) }
}

export function sudahJatuhTempo(jatuhTempo: string | Date, sekarang = new Date()): boolean {
  return new Date(jatuhTempo).getTime() <= sekarang.getTime()
}
