// Simpan Materi Kuliah — batas ukuran, tipe file, dan format tampilan (migrasi 009)

export const MAKS_UKURAN_MATERI_MB = 20
export const KUOTA_MATERI_MB = { free: 100, premium: 1024 } as const

/** Tipe file yang diterima bucket "materi" (harus sama dengan allowed_mime_types di migrasi) */
export const TIPE_MATERI: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'text/plain': 'TXT',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
}

/** Atribut accept untuk <input type="file"> */
export const ACCEPT_MATERI = '.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg'

export function formatUkuran(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** Nama file aman untuk path Storage: huruf/angka/titik/strip, maks 100 karakter */
export function namaFileAman(nama: string): string {
  const titik = nama.lastIndexOf('.')
  const dasar = (titik > 0 ? nama.slice(0, titik) : nama)
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const ext =
    titik > 0
      ? nama
          .slice(titik)
          .toLowerCase()
          .replace(/[^\w.]/g, '')
      : ''
  return `${(dasar || 'file').slice(0, 100 - ext.length)}${ext}`
}

/** Label tipe file untuk ditampilkan (dari mime, fallback ke ekstensi) */
export function labelTipe(mime: string | null, nama: string): string {
  if (mime && TIPE_MATERI[mime]) return TIPE_MATERI[mime]!
  const ext = nama.split('.').pop()
  return ext && ext !== nama ? ext.toUpperCase() : 'FILE'
}
