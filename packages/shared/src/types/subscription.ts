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
