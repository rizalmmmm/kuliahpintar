// Tipe domain untuk entitas User
export type UserRole = 'user' | 'admin'
export type SubscriptionTier = 'free' | 'premium'

export type User = {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: UserRole
  tier: SubscriptionTier
  createdAt: string
  updatedAt: string
}

export type UserProfile = Pick<User, 'id' | 'email' | 'name' | 'avatarUrl' | 'tier'>
