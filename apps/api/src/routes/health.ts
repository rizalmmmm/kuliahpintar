// Health check endpoint untuk monitoring, load balancer, dan deployment probes
import { Hono } from 'hono'
import type { AppEnv } from '../types/env.js'

export const healthRoutes = new Hono<AppEnv>()

healthRoutes.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'kuliahpintar-api',
    timestamp: new Date().toISOString(),
    version: process.env['npm_package_version'] ?? '0.0.0',
  })
})
