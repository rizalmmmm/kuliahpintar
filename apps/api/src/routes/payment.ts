// Route pembayaran — Midtrans Snap untuk upgrade Premium + webhook notifikasi
import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { createSnapTransaction, verifyNotificationSignature } from '../lib/midtrans.js'
import { PREMIUM_PRICE_IDR, PREMIUM_DURATION_DAYS } from '@kuliahpintar/shared'
import type { AppEnv } from '../types/env.js'

export const paymentRoutes = new Hono<AppEnv>()

// ============================================================
// POST /api/v1/payment/create — mulai transaksi upgrade Premium
// ============================================================
paymentRoutes.post('/create', requireAuth, async (c) => {
  const userId = c.get('userId')
  const db = getSupabaseAdmin()

  const { data: profile, error: profileErr } = await db
    .from('profiles')
    .select('email, name, tier')
    .eq('id', userId)
    .single()

  if (profileErr || !profile) {
    return c.json({ error: 'Profil tidak ditemukan' }, 404)
  }

  if (profile.tier === 'premium') {
    return c.json({ error: 'Kamu sudah berlangganan Premium' }, 409)
  }

  // Order ID unik: KP-<8 char user>-<timestamp>
  const orderId = `KP-${userId.slice(0, 8)}-${Date.now()}`

  // Catat subscription pending sebelum ke Midtrans, supaya webhook punya rujukan
  const { error: insertErr } = await db.from('subscriptions').insert({
    user_id: userId,
    status: 'inactive',
    tier: 'premium',
    midtrans_order_id: orderId,
  })

  if (insertErr) {
    return c.json({ error: 'Gagal membuat transaksi. Coba lagi.' }, 500)
  }

  try {
    const { token, redirectUrl } = await createSnapTransaction({
      orderId,
      amount: PREMIUM_PRICE_IDR,
      itemName: `KuliahPintar Premium (${PREMIUM_DURATION_DAYS} hari)`,
      customerEmail: profile.email,
      customerName: profile.name ?? undefined,
      finishUrl: `${process.env['APP_URL'] ?? 'http://localhost:3000'}/pembayaran/selesai`,
    })

    return c.json({ data: { token, redirectUrl, orderId } })
  } catch (err) {
    console.error('Midtrans create error:', err)
    // Bersihkan subscription pending yang gagal dibuat di Midtrans
    await db.from('subscriptions').delete().eq('midtrans_order_id', orderId)
    return c.json({ error: 'Gagal menghubungi payment gateway. Coba lagi.' }, 502)
  }
})

// ============================================================
// POST /api/v1/payment/notification — webhook Midtrans
// Tidak pakai requireAuth: keaslian dijamin verifikasi signature.
// ============================================================
paymentRoutes.post('/notification', async (c) => {
  const body = (await c.req.json()) as {
    order_id: string
    status_code: string
    gross_amount: string
    signature_key: string
    transaction_status: string
    fraud_status?: string
  }

  if (!verifyNotificationSignature(body)) {
    return c.json({ error: 'Signature tidak valid' }, 403)
  }

  const db = getSupabaseAdmin()

  const { data: sub } = await db
    .from('subscriptions')
    .select('id, user_id, status')
    .eq('midtrans_order_id', body.order_id)
    .single()

  // Order tak dikenal → balas 200 supaya Midtrans berhenti retry (idempotent)
  if (!sub) return c.json({ received: true })

  const status = body.transaction_status
  const fraudOk = !body.fraud_status || body.fraud_status === 'accept'
  const lunas = (status === 'settlement' || status === 'capture') && fraudOk

  if (lunas) {
    // Idempoten: kalau sudah active, jangan perpanjang lagi dari notifikasi duplikat
    if (sub.status === 'active') return c.json({ received: true })

    const now = new Date()
    const end = new Date(now.getTime() + PREMIUM_DURATION_DAYS * 24 * 60 * 60 * 1000)

    await db
      .from('subscriptions')
      .update({ status: 'active', start_date: now.toISOString(), end_date: end.toISOString() })
      .eq('id', sub.id)

    await db.from('profiles').update({ tier: 'premium' }).eq('id', sub.user_id)
  } else if (status === 'expire' || status === 'cancel' || status === 'deny') {
    await db.from('subscriptions').update({ status: 'cancelled' }).eq('id', sub.id)
  } else if (status === 'refund' || status === 'partial_refund') {
    await db.from('subscriptions').update({ status: 'cancelled' }).eq('id', sub.id)
    await db.from('profiles').update({ tier: 'free' }).eq('id', sub.user_id)
  }
  // status 'pending' → biarkan inactive

  return c.json({ received: true })
})
