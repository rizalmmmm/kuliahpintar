// Entry point — boot server Hono di Node.js
import { serve } from '@hono/node-server'
import { app } from './app.js'

const port = parseInt(process.env['PORT'] ?? '3001', 10)

serve({ fetch: app.fetch, port }, (info) => {
  console.info(`KuliahPintar API berjalan di http://localhost:${info.port}`)
  console.info(`Environment: ${process.env['NODE_ENV'] ?? 'development'}`)
})
