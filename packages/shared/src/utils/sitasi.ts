// Format sitasi manual (buku & website) — untuk sumber tanpa DOI.
// Aturan disederhanakan dari pedoman resmi tiap gaya; cetak miring (judul buku/situs) dilakukan
// pengguna di Word karena hasil berupa teks biasa.
import type { GayaSitasi } from '../types/alat.js'

export type SumberManual = {
  jenis: 'buku' | 'website'
  /** Nama lengkap penulis, satu per item — contoh: "Budi Santoso" */
  penulis: string[]
  tahun: string
  judul: string
  /** buku */
  penerbit?: string
  kota?: string
  edisi?: string
  /** website */
  namaSitus?: string
  url?: string
  /** YYYY-MM-DD */
  tanggalAkses?: string
}

type Nama = { depan: string; belakang: string }

function pecahNama(lengkap: string): Nama {
  const bagian = lengkap.trim().split(/\s+/).filter(Boolean)
  if (bagian.length <= 1) return { depan: '', belakang: bagian[0] ?? '' }
  return { depan: bagian.slice(0, -1).join(' '), belakang: bagian.at(-1)! }
}

const inisial = (depan: string) =>
  depan
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((d) => `${d[0]!.toUpperCase()}.`)
    .join(' ')

function gabung(daftar: string[], dan: string, pakaiKomaSerial: boolean): string {
  if (daftar.length <= 1) return daftar[0] ?? ''
  if (daftar.length === 2) return `${daftar[0]}${pakaiKomaSerial ? ',' : ''} ${dan} ${daftar[1]}`
  return `${daftar.slice(0, -1).join(', ')}, ${dan} ${daftar.at(-1)}`
}

const BULAN = {
  id: [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ],
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
}

function formatTanggal(iso: string | undefined, bahasa: 'id' | 'en', gaya: 'dmy' | 'mdy' = 'dmy') {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  const bulan = BULAN[bahasa][m - 1]!
  return gaya === 'mdy' ? `${bulan.slice(0, 3)}. ${d}, ${y}` : `${d} ${bulan} ${y}`
}

const titikAkhir = (s: string) => (/[.?!]$/.test(s) ? s : `${s}.`)

/** "2" → "ke-2" (id) / "2nd" (en); teks non-angka dibiarkan */
function urutan(edisi: string, bahasa: 'id' | 'en'): string {
  const n = Number(edisi)
  if (!Number.isInteger(n) || n <= 0) return edisi
  if (bahasa === 'id') return `ke-${n}`
  const akhir =
    n % 100 >= 11 && n % 100 <= 13
      ? 'th'
      : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th')
  return `${n}${akhir}`
}

/** Label edisi gaya bahasa: id → "Edisi ke-2", en → "2nd ed." / "2nd edn." */
function labelEdisi(edisi: string, bahasa: 'id' | 'en', singkatan = 'ed.'): string {
  return bahasa === 'id' ? `Edisi ${urutan(edisi, 'id')}` : `${urutan(edisi, 'en')} ${singkatan}`
}

export function formatSitasiManual(
  s: SumberManual,
  gaya: GayaSitasi,
  bahasa: 'id' | 'en' = 'id'
): string {
  const nama = s.penulis
    .map((p) => p.trim())
    .filter(Boolean)
    .map(pecahNama)
  const dan = bahasa === 'id' ? 'dan' : 'and'
  const tahun = s.tahun.trim() || (bahasa === 'id' ? 't.t.' : 'n.d.')
  const judul = s.judul.trim()
  const edisi = s.edisi?.trim()
  const penerbit = s.penerbit?.trim() ?? ''
  const kota = s.kota?.trim() ?? ''
  const situs = s.namaSitus?.trim() ?? ''
  const url = s.url?.trim() ?? ''
  const akses = formatTanggal(s.tanggalAkses, bahasa)

  switch (gaya) {
    case 'apa': {
      const daftar = nama.map((n) => (n.depan ? `${n.belakang}, ${inisial(n.depan)}` : n.belakang))
      const penulis = daftar.length ? gabung(daftar, '&', true) : ''
      const ed = edisi ? ` (${labelEdisi(edisi, bahasa)})` : ''
      const kepala = penulis
        ? `${titikAkhir(penulis)} (${tahun}). ${titikAkhir(judul + ed)}`
        : `${titikAkhir(judul + ed)} (${tahun}).`
      if (s.jenis === 'buku') return `${kepala} ${titikAkhir(penerbit)}`.trim()
      return [kepala, situs && situs !== penulis ? titikAkhir(situs) : '', url]
        .filter(Boolean)
        .join(' ')
    }
    case 'harvard': {
      const daftar = nama.map((n) => (n.depan ? `${n.belakang}, ${inisial(n.depan)}` : n.belakang))
      const penulis = gabung(daftar, dan, false) || situs
      const ed = edisi ? ` ${titikAkhir(labelEdisi(edisi, bahasa, 'edn.'))}` : ''
      if (s.jenis === 'buku') {
        const terbit = [kota, penerbit].filter(Boolean).join(': ')
        return `${penulis} (${tahun}) ${titikAkhir(judul)}${ed} ${titikAkhir(terbit)}`.trim()
      }
      const tersedia = bahasa === 'id' ? 'Tersedia di' : 'Available at'
      const diakses = bahasa === 'id' ? 'Diakses' : 'Accessed'
      return `${penulis} (${tahun}) ${titikAkhir(judul)} ${tersedia}: ${url}${akses ? ` (${diakses}: ${akses})` : ''}.`
    }
    case 'ieee': {
      const daftar = nama.map((n) => (n.depan ? `${inisial(n.depan)} ${n.belakang}` : n.belakang))
      const penulis = gabung(daftar, dan, daftar.length > 2)
      if (s.jenis === 'buku') {
        const ed = edisi ? `, ${labelEdisi(edisi, bahasa)}` : ''
        const terbit = [kota, penerbit].filter(Boolean).join(': ')
        return `${penulis ? `${penulis}, ` : ''}${titikAkhir(judul + ed)} ${terbit}${terbit ? ', ' : ''}${tahun}.`
      }
      const aksesEn = formatTanggal(s.tanggalAkses, bahasa, bahasa === 'en' ? 'mdy' : 'dmy')
      const diakses = bahasa === 'id' ? 'Diakses' : 'Accessed'
      const tersedia = bahasa === 'id' ? 'Tersedia' : 'Available'
      return `${penulis ? `${penulis}, ` : ''}"${judul}," ${situs ? `${situs}, ` : ''}${tahun}. ${aksesEn ? `${diakses}: ${aksesEn}. ` : ''}[Online]. ${tersedia}: ${url}`
    }
    case 'mla': {
      const [p1, ...lain] = nama
      let penulis = ''
      if (p1) {
        const pertama = p1.depan ? `${p1.belakang}, ${p1.depan}` : p1.belakang
        if (lain.length === 0) penulis = pertama
        else if (lain.length === 1)
          penulis = `${pertama}, ${dan} ${[lain[0]!.depan, lain[0]!.belakang].filter(Boolean).join(' ')}`
        else penulis = `${pertama}, et al`
      }
      const awal = penulis ? `${titikAkhir(penulis)} ` : ''
      if (s.jenis === 'buku') {
        const ed = edisi ? ` ${labelEdisi(edisi, bahasa)},` : ''
        return `${awal}${titikAkhir(judul)}${ed} ${penerbit}${penerbit ? ', ' : ''}${tahun}.`
      }
      return `${awal}"${titikAkhir(judul)}" ${situs ? `${situs}, ` : ''}${tahun}, ${url}.`
    }
    case 'chicago': {
      const daftar = nama.map((n, i) =>
        i === 0 && n.depan
          ? `${n.belakang}, ${n.depan}`
          : [n.depan, n.belakang].filter(Boolean).join(' ')
      )
      // Chicago: penulis pertama dibalik, jadi selalu pakai koma sebelum "and" (Santoso, Budi, and …)
      const penulis = gabung(daftar, dan, true)
      const awal = penulis ? `${titikAkhir(penulis)} ${tahun}. ` : ''
      const tahunAkhir = penulis ? '' : ` ${tahun}.`
      if (s.jenis === 'buku') {
        const ed = edisi ? ` ${titikAkhir(labelEdisi(edisi, bahasa))}` : ''
        const terbit = [kota, penerbit].filter(Boolean).join(': ')
        return `${awal}${titikAkhir(judul)}${ed}${tahunAkhir} ${titikAkhir(terbit)}`.trim()
      }
      return `${awal}"${titikAkhir(judul)}"${tahunAkhir} ${situs ? `${titikAkhir(situs)} ` : ''}${url}.`
    }
  }
}
