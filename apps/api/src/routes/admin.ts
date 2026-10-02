// Route admin — verifikasi pembayaran manual & kelola Premium
import { Hono } from 'hono'
import { requireAdmin } from '../middleware/admin.js'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { PREMIUM_DURATION_DAYS } from '@kuliahpintar/shared'
import type { AppEnv } from '../types/env.js'

export const adminRoutes = new Hono<AppEnv>()

adminRoutes.use('*', requireAdmin)

function akhirPremium(dari: Date = new Date()): string {
  return new Date(dari.getTime() + PREMIUM_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

// GET /api/v1/admin/me — cek akses admin (dipakai frontend untuk menampilkan menu)
adminRoutes.get('/me', (c) => c.json({ data: { admin: true } }))

// GET /api/v1/admin/premium — pesanan manual menunggu + daftar Premium aktif
adminRoutes.get('/premium', async (c) => {
  const db = getSupabaseAdmin()

  const [pending, aktif] = await Promise.all([
    db
      .from('subscriptions')
      .select('id, midtrans_order_id, created_at, profiles(email, name)')
      .eq('status', 'inactive')
      .like('midtrans_order_id', 'MANUAL-%')
      .order('created_at', { ascending: false })
      .limit(100),
    db
      .from('subscriptions')
      .select('id, midtrans_order_id, start_date, end_date, profiles(email, name)')
      .eq('status', 'active')
      .order('end_date', { ascending: true })
      .limit(200),
  ])

  if (pending.error || aktif.error) {
    return c.json({ error: 'Gagal memuat data' }, 500)
  }

  return c.json({ data: { menunggu: pending.data, aktif: aktif.data } })
})

// POST /api/v1/admin/premium/aktifkan — { subscriptionId } atau { email }
adminRoutes.post('/premium/aktifkan', async (c) => {
  const body = (await c.req.json()) as { subscriptionId?: string; email?: string }
  const db = getSupabaseAdmin()
  const now = new Date()

  if (body.subscriptionId) {
    const { data: sub } = await db
      .from('subscriptions')
      .select('id, user_id, status')
      .eq('id', body.subscriptionId)
      .single()
    if (!sub) return c.json({ error: 'Pesanan tidak ditemukan' }, 404)
    if (sub.status === 'active') return c.json({ error: 'Pesanan sudah aktif' }, 409)

    await db
      .from('subscriptions')
      .update({ status: 'active', start_date: now.toISOString(), end_date: akhirPremium(now) })
      .eq('id', sub.id)
    await db.from('profiles').update({ tier: 'premium' }).eq('id', sub.user_id)
    return c.json({ data: { ok: true } })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email) return c.json({ error: 'Isi email pengguna' }, 400)

  const { data: profile } = await db
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle()
  if (!profile) return c.json({ error: 'Pengguna dengan email itu tidak ditemukan' }, 404)

  // Perpanjang dari masa aktif terakhir bila masih berjalan
  const { data: terakhir } = await db
    .from('subscriptions')
    .select('end_date')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  const mulai =
    terakhir?.end_date && new Date(terakhir.end_date) > now ? new Date(terakhir.end_date) : now

  const { error } = await db.from('subscriptions').insert({
    user_id: profile.id,
    status: 'active',
    tier: 'premium',
    start_date: now.toISOString(),
    end_date: akhirPremium(mulai),
    midtrans_order_id: `ADMIN-${profile.id.slice(0, 8)}-${Date.now()}`,
  })
  if (error) return c.json({ error: 'Gagal mengaktifkan Premium' }, 500)

  await db.from('profiles').update({ tier: 'premium' }).eq('id', profile.id)
  return c.json({ data: { ok: true } })
})

// POST /api/v1/admin/premium/tolak — { subscriptionId } untuk pesanan manual yang tidak valid
adminRoutes.post('/premium/tolak', async (c) => {
  const { subscriptionId } = (await c.req.json()) as { subscriptionId?: string }
  if (!subscriptionId) return c.json({ error: 'subscriptionId wajib diisi' }, 400)

  const { error } = await getSupabaseAdmin()
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('id', subscriptionId)
    .eq('status', 'inactive')
  if (error) return c.json({ error: 'Gagal menolak pesanan' }, 500)
  return c.json({ data: { ok: true } })
})

// POST /api/v1/admin/premium/cabut — { subscriptionId } hentikan Premium (mis. sudah lewat masa aktif)
adminRoutes.post('/premium/cabut', async (c) => {
  const { subscriptionId } = (await c.req.json()) as { subscriptionId?: string }
  if (!subscriptionId) return c.json({ error: 'subscriptionId wajib diisi' }, 400)
  const db = getSupabaseAdmin()

  const { data: sub } = await db
    .from('subscriptions')
    .select('id, user_id')
    .eq('id', subscriptionId)
    .single()
  if (!sub) return c.json({ error: 'Langganan tidak ditemukan' }, 404)

  await db.from('subscriptions').update({ status: 'cancelled' }).eq('id', sub.id)

  // Turunkan ke gratis hanya bila tidak ada langganan aktif lain
  const { count } = await db
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', sub.user_id)
    .eq('status', 'active')
  if (!count) await db.from('profiles').update({ tier: 'free' }).eq('id', sub.user_id)

  return c.json({ data: { ok: true } })
})
