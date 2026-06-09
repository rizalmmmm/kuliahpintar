// Aplikasi Hono utama — registrasi middleware global dan routes
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'
import { aiRoutes } from './routes/ai.js'
import type { AppEnv } from './types/env.js'

export const app = new Hono<AppEnv>()

app.use('*', logger())
app.use('*', secureHeaders())
app.use(
  '*',
  cors({
    origin: process.env['APP_URL'] ?? 'http://localhost:3000',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
)

app.route('/health', healthRoutes)
app.route('/api/v1/auth', authRoutes)
app.route('/api/v1/ai', aiRoutes)

app.notFound((c) => c.json({ error: 'Endpoint tidak ditemukan' }, 404))

app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ error: 'Terjadi kesalahan pada server' }, 500)
})
