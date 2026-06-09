// Middleware autentikasi — verifikasi Supabase JWT dari header Authorization
import { createMiddleware } from 'hono/factory'
import { createClient } from '@supabase/supabase-js'
import type { AppEnv } from '../types/env.js'

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authorization = c.req.header('Authorization')

  if (!authorization?.startsWith('Bearer ')) {
    return c.json({ error: 'Autentikasi diperlukan' }, 401)
  }

  const token = authorization.slice(7)
  const supabase = createClient(
    process.env['SUPABASE_URL'] ?? '',
    process.env['SUPABASE_ANON_KEY'] ?? ''
  )

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return c.json({ error: 'Token tidak valid atau sudah kedaluwarsa' }, 401)
  }

  c.set('userId', data.user.id)
  await next()
})
