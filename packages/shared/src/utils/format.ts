// Formatter untuk tampilan data ke user — currency, tanggal, waktu relatif
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    ...options,
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const rtf = new Intl.RelativeTimeFormat('id', { numeric: 'auto' })
  const diffSec = (new Date(date).getTime() - Date.now()) / 1000

  if (Math.abs(diffSec) < 60) return rtf.format(Math.round(diffSec), 'second')
  if (Math.abs(diffSec) < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (Math.abs(diffSec) < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  return rtf.format(Math.round(diffSec / 86400), 'day')
}
