// Middleware admin — hanya akun yang login dengan nomor HP admin (sudah terverifikasi OTP)
import { createMiddleware } from 'hono/factory'
import { createClient } from '@supabase/supabase-js'
import { MANUAL_PAYMENT_ACCOUNT } from '@kuliahpintar/shared'
import type { AppEnv } from '../types/env.js'

/** Nomor admin format internasional tanpa "+", mis. 6282210002535. Bisa diganti via ADMIN_PHONES. */
function nomorAdmin(): string[] {
  const env = process.env['ADMIN_PHONES']
  const daftar = env ? env.split(',') : [MANUAL_PAYMENT_ACCOUNT.whatsappIntl]
  return daftar.map((n) => n.replace(/\D/g, '')).filter(Boolean)
}

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const authorization = c.req.header('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return c.json({ error: 'Autentikasi diperlukan' }, 401)
  }

  const supabase = createClient(
    process.env['SUPABASE_URL'] ?? '',
    process.env['SUPABASE_ANON_KEY'] ?? ''
  )
  const { data, error } = await supabase.auth.getUser(authorization.slice(7))
  if (error || !data.user) {
    return c.json({ error: 'Token tidak valid atau sudah kedaluwarsa' }, 401)
  }

  const phone = (data.user.phone ?? '').replace(/\D/g, '')
  if (!data.user.phone_confirmed_at || !phone || !nomorAdmin().includes(phone)) {
    return c.json({ error: 'Khusus admin' }, 403)
  }

  c.set('userId', data.user.id)
  await next()
})
