// Route autentikasi — endpoint yang membutuhkan Supabase JWT yang valid
import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'
import { getSupabaseAdmin } from '../lib/supabase.js'
import type { AppEnv } from '../types/env.js'

export const authRoutes = new Hono<AppEnv>()

authRoutes.get('/me', requireAuth, async (c) => {
  const userId = c.get('userId')

  const { data, error } = await getSupabaseAdmin()
    .from('profiles')
    .select('id, email, name, avatar_url, tier, role, created_at')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return c.json({ error: 'Profil tidak ditemukan' }, 404)
  }

  return c.json({ data })
})
