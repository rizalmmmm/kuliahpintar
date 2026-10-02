// Tipe domain untuk subscription dan billing Midtrans
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'past_due'

export type Subscription = {
  id: string
  userId: string
  status: SubscriptionStatus
  tier: 'premium'
  startDate: string
  endDate: string
  midtransOrderId: string | null
  createdAt: string
}

export const PREMIUM_PRICE_IDR = 39_000

/** Durasi premium per pembayaran (hari) */
export const PREMIUM_DURATION_DAYS = 30

export type CreatePaymentResponse = {
  /** Snap token untuk membuka popup pembayaran */
  token: string
  /** URL redirect Snap sebagai fallback bila popup gagal */
  redirectUrl: string
  orderId: string
}

/** Rekening tujuan pembayaran manual (sementara, sebelum Midtrans aktif) */
export const MANUAL_PAYMENT_ACCOUNT = {
  bank: 'BCA',
  accountNumber: '3728200300',
  accountName: 'Rizal.A',
  /** Nomor WhatsApp untuk kirim bukti transfer (format lokal & internasional) */
  whatsappDisplay: '082210002535',
  whatsappIntl: '6282210002535',
} as const

/** Link WhatsApp berisi pesan konfirmasi transfer yang sudah terisi */
export function manualPaymentWhatsappUrl(orderId?: string, email?: string): string {
  const baris = ['Halo, saya sudah transfer untuk KuliahPintar Premium.']
  if (orderId) baris.push(`Kode pesanan: ${orderId}`)
  if (email) baris.push(`Email akun: ${email}`)
  baris.push('Berikut bukti transfernya:')
  return `https://wa.me/${MANUAL_PAYMENT_ACCOUNT.whatsappIntl}?text=${encodeURIComponent(baris.join('\n'))}`
}

export type CreateManualPaymentResponse = {
  /** Kode pesanan — dicantumkan di berita transfer untuk dicocokkan admin */
  orderId: string
  amount: number
}
