// Route AI — semua fitur generative (rangkum, tanya, tulis, dst)
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { generateTextWithSystem } from '../lib/gemini.js'
import { checkRateLimit, logUsage } from '../lib/rateLimit.js'
import type { AppEnv } from '../types/env.js'

export const aiRoutes = new Hono<AppEnv>()

// ============================================================
// POST /api/v1/ai/rangkum
// ============================================================
const rangkumSchema = z.object({
  teks: z
    .string()
    .min(100, 'Teks minimal 100 karakter')
    .max(10_000, 'Teks maksimal 10.000 karakter'),
  gaya: z.enum(['singkat', 'detail', 'poin']).default('singkat'),
})

aiRoutes.post('/rangkum', requireAuth, zValidator('json', rangkumSchema), async (c) => {
  const userId = c.get('userId')
  const { teks, gaya } = c.req.valid('json')

  const { allowed, summary } = await checkRateLimit(userId)
  if (!allowed) {
    return c.json(
      {
        error: `Batas ${summary.limit} request/hari tercapai. Upgrade ke Premium untuk unlimited.`,
        code: 'RATE_LIMIT_EXCEEDED',
        data: { summary },
      },
      429
    )
  }

  const instruksiGaya: Record<typeof gaya, string> = {
    singkat: 'Buat rangkuman singkat dan padat dalam 3-5 kalimat.',
    detail: 'Buat rangkuman detail yang mencakup semua poin penting dengan penjelasan singkat.',
    poin: 'Buat rangkuman dalam bentuk poin-poin (gunakan tanda - di awal setiap poin).',
  }

  const systemPrompt = `Kamu adalah asisten akademik untuk mahasiswa Indonesia.
Tugasmu adalah merangkum teks kuliah dengan jelas dan mudah dipahami.
${instruksiGaya[gaya]}
Gunakan Bahasa Indonesia yang baku tapi tetap mudah dipahami.
Fokus pada konsep kunci, jangan sertakan kalimat pembuka seperti "Berikut rangkuman...".`

  const hasil = await generateTextWithSystem(systemPrompt, teks)

  // Log usage best-effort — estimasi token dari panjang teks
  logUsage(userId, 'rangkum', teks.length / 4).catch(console.error)

  return c.json({
    data: {
      hasil,
      sisaHarian: summary.sisa - 1,
      limitHarian: summary.limit,
    },
  })
})
