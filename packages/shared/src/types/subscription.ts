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
