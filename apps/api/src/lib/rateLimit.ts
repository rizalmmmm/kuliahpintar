// Rate limiting free tier — 5 AI request per hari (calendar day UTC). Premium: unlimited.
import { getSupabaseAdmin } from './supabase.js'
import type { UsageSummary } from '@kuliahpintar/shared'

const FREE_TIER_LIMIT = 5

function todayUtcStart(): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

function tomorrowUtcStart(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

async function getUserTier(userId: string): Promise<'free' | 'premium'> {
  const { data, error } = await getSupabaseAdmin()
    .from('profiles')
    .select('tier')
    .eq('id', userId)
    .single()

  // Default ke 'free' bila gagal — jangan pernah memberi unlimited karena error
  if (error || !data) return 'free'
  return data.tier === 'premium' ? 'premium' : 'free'
}

export async function checkRateLimit(userId: string): Promise<{
  allowed: boolean
  summary: UsageSummary
}> {
  const tier = await getUserTier(userId)

  // Premium: tanpa batas, tidak perlu hitung usage_logs
  if (tier === 'premium') {
    return {
      allowed: true,
      summary: {
        used: 0,
        limit: FREE_TIER_LIMIT,
        sisa: FREE_TIER_LIMIT,
        resetAt: tomorrowUtcStart(),
        tier: 'premium',
        unlimited: true,
      },
    }
  }

  const { count, error } = await getSupabaseAdmin()
    .from('usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', todayUtcStart())

  if (error) throw new Error(`Rate limit check gagal: ${error.message}`)

  const used = count ?? 0
  const summary: UsageSummary = {
    used,
    limit: FREE_TIER_LIMIT,
    sisa: Math.max(0, FREE_TIER_LIMIT - used),
    resetAt: tomorrowUtcStart(),
    tier: 'free',
    unlimited: false,
  }

  return { allowed: used < FREE_TIER_LIMIT, summary }
}

export async function logUsage(
  userId: string,
  feature: string,
  tokensEstimate: number
): Promise<void> {
  await getSupabaseAdmin()
    .from('usage_logs')
    .insert({ user_id: userId, feature, tokens_used: Math.round(tokensEstimate) })
}
