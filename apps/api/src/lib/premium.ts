// Masa aktif Premium — turunkan ke gratis otomatis setelah end_date lewat.
// Dua lapis: cron tiap jam (turunkanPremiumKedaluwarsa) dan pengecekan saat tier dibaca
// (getTierEfektif), jadi Premium tetap berakhir tepat waktu walau cron terlambat.
import { getSupabaseAdmin } from './supabase.js'

/** Tandai langganan aktif yang sudah lewat end_date sebagai 'past_due' (kedaluwarsa) */
async function tandaiLanggananKedaluwarsa(userId?: string): Promise<void> {
  let q = getSupabaseAdmin()
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('status', 'active')
    .lt('end_date', new Date().toISOString())
  if (userId) q = q.eq('user_id', userId)
  const { error } = await q
  if (error) throw new Error(`Gagal menandai langganan kedaluwarsa: ${error.message}`)
}

async function adaLanggananAktif(userId: string): Promise<boolean> {
  const { count, error } = await getSupabaseAdmin()
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('end_date', new Date().toISOString())
  if (error) throw new Error(error.message)
  return (count ?? 0) > 0
}

/**
 * Tier yang berlaku sekarang. Profil 'premium' tanpa langganan aktif yang masih berlaku
 * langsung diturunkan ke 'free'. Gagal baca → 'free' (jangan beri unlimited karena error).
 */
export async function getTierEfektif(userId: string): Promise<'free' | 'premium'> {
  const db = getSupabaseAdmin()
  const { data, error } = await db.from('profiles').select('tier').eq('id', userId).single()
  if (error || !data || data.tier !== 'premium') return 'free'

  try {
    if (await adaLanggananAktif(userId)) return 'premium'
    await tandaiLanggananKedaluwarsa(userId)
    await db.from('profiles').update({ tier: 'free' }).eq('id', userId)
  } catch (err) {
    console.error('Cek masa aktif Premium gagal:', err)
  }
  return 'free'
}

/** Untuk cron: turunkan semua Premium yang masa aktifnya sudah habis */
export async function turunkanPremiumKedaluwarsa(): Promise<{ diturunkan: number }> {
  const db = getSupabaseAdmin()
  await tandaiLanggananKedaluwarsa()

  const [premium, aktif] = await Promise.all([
    db.from('profiles').select('id').eq('tier', 'premium').limit(10_000),
    db
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString())
      .limit(10_000),
  ])
  if (premium.error || aktif.error) {
    throw new Error(premium.error?.message ?? aktif.error?.message)
  }

  const masihAktif = new Set((aktif.data ?? []).map((s) => s.user_id as string))
  const turun = (premium.data ?? []).map((p) => p.id as string).filter((id) => !masihAktif.has(id))
  if (turun.length) {
    const { error } = await db.from('profiles').update({ tier: 'free' }).in('id', turun)
    if (error) throw new Error(error.message)
  }
  return { diturunkan: turun.length }
}
