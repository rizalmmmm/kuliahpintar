// Supabase admin client — lazy init, untyped sampai `supabase gen types` dijalankan
import { createClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = ReturnType<typeof createClient<any>>

let _client: AnySupabaseClient | null = null

export function getSupabaseAdmin(): AnySupabaseClient {
  if (_client) return _client

  const url = process.env['SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!url || !key) {
    throw new Error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus di-set di .env')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _client = createClient<any>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return _client
}
