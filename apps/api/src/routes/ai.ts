// Route AI — semua fitur generative (rangkum, tanya, tulis, dst)
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { generateTextWithSystem, generateChat, generateJson } from '../lib/gemini.js'
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

// ============================================================
// POST /api/v1/ai/tanya
// ============================================================
const tanyaSchema = z.object({
  pertanyaan: z
    .string()
    .min(3, 'Pertanyaan minimal 3 karakter')
    .max(2_000, 'Pertanyaan maksimal 2.000 karakter'),
  riwayat: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.string().max(8_000),
      })
    )
    .max(20, 'Riwayat maksimal 20 pesan')
    .default([]),
})

aiRoutes.post('/tanya', requireAuth, zValidator('json', tanyaSchema), async (c) => {
  const userId = c.get('userId')
  const { pertanyaan, riwayat } = c.req.valid('json')

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

  const systemPrompt = `Kamu adalah tutor akademik untuk mahasiswa Indonesia (S1-S2).
Jawab pertanyaan seputar materi kuliah dengan jelas, terstruktur, dan mudah dipahami.
Gunakan Bahasa Indonesia yang baku tapi tetap santai dan ramah.
Jika pertanyaan ambigu, jawab interpretasi paling umum lalu tawarkan klarifikasi.
Jika kamu tidak yakin, katakan terus terang — jangan mengarang fakta.
Untuk konsep sulit, beri contoh konkret atau analogi sederhana.
Jawab langsung ke inti, jangan awali dengan kalimat pembuka seperti "Tentu, berikut jawabannya".`

  // Gemini mensyaratkan history diawali role 'user' — buang pesan 'model' di awal
  const firstUserIdx = riwayat.findIndex((m) => m.role === 'user')
  const history = firstUserIdx === -1 ? [] : riwayat.slice(firstUserIdx)

  const jawaban = await generateChat(systemPrompt, history, pertanyaan)

  const totalChars = pertanyaan.length + history.reduce((n, m) => n + m.content.length, 0)
  logUsage(userId, 'tanya', totalChars / 4).catch(console.error)

  return c.json({
    data: {
      jawaban,
      sisaHarian: summary.sisa - 1,
      limitHarian: summary.limit,
    },
  })
})

// ============================================================
// POST /api/v1/ai/tulis
// ============================================================
const tulisSchema = z.object({
  teks: z.string().min(10, 'Teks minimal 10 karakter').max(10_000, 'Teks maksimal 10.000 karakter'),
  mode: z.enum(['kerangka', 'kembangkan', 'perbaiki']),
  jenis: z.enum(['essay', 'laporan', 'makalah']).default('essay'),
})

aiRoutes.post('/tulis', requireAuth, zValidator('json', tulisSchema), async (c) => {
  const userId = c.get('userId')
  const { teks, mode, jenis } = c.req.valid('json')

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

  const namaJenis: Record<typeof jenis, string> = {
    essay: 'essay akademik',
    laporan: 'laporan praktikum/penelitian',
    makalah: 'makalah ilmiah',
  }

  const instruksiMode: Record<typeof mode, string> = {
    kerangka: `Input adalah TOPIK. Buat kerangka (outline) ${namaJenis[jenis]} yang terstruktur:
judul yang menarik, lalu bagian-bagian utama (pendahuluan, isi 2-4 sub-bagian, kesimpulan)
dengan 2-3 poin penting per bagian. Format: heading bernomor + poin dengan tanda -.`,
    kembangkan: `Input adalah POIN/KERANGKA. Kembangkan menjadi paragraf ${namaJenis[jenis]} yang utuh
dan mengalir. Setiap poin jadi 1 paragraf dengan kalimat topik, penjelasan, dan transisi antar paragraf.`,
    perbaiki: `Input adalah DRAFT tulisan. Perbaiki menjadi ${namaJenis[jenis]} yang lebih baik:
tata bahasa, pilihan kata akademik, struktur kalimat, dan koherensi antar kalimat.
Pertahankan ide dan argumen asli penulis — jangan menambah klaim atau fakta baru.`,
  }

  const systemPrompt = `Kamu adalah asisten penulisan akademik untuk mahasiswa Indonesia (S1-S2).
${instruksiMode[mode]}
Gunakan Bahasa Indonesia baku sesuai kaidah penulisan ilmiah.
Ini alat bantu belajar — hasilmu adalah bahan yang akan dikembangkan mahasiswa sendiri.
Langsung ke hasil, jangan awali dengan kalimat pembuka seperti "Berikut hasilnya".`

  const hasil = await generateTextWithSystem(systemPrompt, teks)

  logUsage(userId, 'tulis', teks.length / 4).catch(console.error)

  return c.json({
    data: {
      hasil,
      sisaHarian: summary.sisa - 1,
      limitHarian: summary.limit,
    },
  })
})

// ============================================================
// POST /api/v1/ai/latihan
// ============================================================
const latihanSchema = z.object({
  teks: z
    .string()
    .min(100, 'Teks materi minimal 100 karakter')
    .max(10_000, 'Teks maksimal 10.000 karakter'),
  jumlah: z.number().int().min(3).max(10).default(5),
  jenis: z.enum(['pilihan_ganda', 'isian']).default('pilihan_ganda'),
})

// Validasi output AI — jangan percaya format JSON dari model begitu saja
const soalPgSchema = z.object({
  pertanyaan: z.string().min(1),
  opsi: z.array(z.string().min(1)).length(4),
  jawabanIndex: z.number().int().min(0).max(3),
  penjelasan: z.string().min(1),
})

const soalIsianSchema = z.object({
  pertanyaan: z.string().min(1),
  jawaban: z.string().min(1),
  penjelasan: z.string().min(1),
})

aiRoutes.post('/latihan', requireAuth, zValidator('json', latihanSchema), async (c) => {
  const userId = c.get('userId')
  const { teks, jumlah, jenis } = c.req.valid('json')

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

  const formatJson =
    jenis === 'pilihan_ganda'
      ? `{"soal":[{"pertanyaan":"...","opsi":["...","...","...","..."],"jawabanIndex":0,"penjelasan":"..."}]}
- opsi harus tepat 4 pilihan, hanya 1 yang benar
- jawabanIndex adalah index opsi yang benar (0-3), acak posisinya antar soal
- semua opsi salah harus masuk akal (distraktor yang menguji pemahaman, bukan asal)`
      : `{"soal":[{"pertanyaan":"...","jawaban":"...","penjelasan":"..."}]}
- jawaban adalah jawaban singkat yang benar (1-10 kata)`

  const systemPrompt = `Kamu adalah pembuat soal latihan untuk mahasiswa Indonesia.
Buat tepat ${jumlah} soal ${jenis === 'pilihan_ganda' ? 'pilihan ganda' : 'isian singkat'} HANYA berdasarkan materi yang diberikan — jangan tambahkan fakta di luar materi.
Soal harus menguji pemahaman konsep, bukan sekadar hafalan kata.
Penjelasan menjelaskan KENAPA jawaban itu benar, singkat dan jelas.
Gunakan Bahasa Indonesia baku.
Balas HANYA dengan JSON valid berformat:
${formatJson}`

  const mentah = await generateJson(systemPrompt, teks)

  const parsed = z
    .object({
      soal: z
        .array(jenis === 'pilihan_ganda' ? soalPgSchema : soalIsianSchema)
        .min(1)
        .max(jumlah),
    })
    .safeParse(mentah)

  if (!parsed.success) {
    console.error('Output AI tidak valid:', parsed.error.message)
    return c.json({ error: 'AI menghasilkan format tidak valid. Silakan coba lagi.' }, 502)
  }

  logUsage(userId, 'latihan_soal', teks.length / 4).catch(console.error)

  return c.json({
    data: {
      soal: parsed.data.soal,
      sisaHarian: summary.sisa - 1,
      limitHarian: summary.limit,
    },
  })
})

// ============================================================
// POST /api/v1/ai/flashcard
// ============================================================
const flashcardSchema = z.object({
  teks: z
    .string()
    .min(100, 'Teks materi minimal 100 karakter')
    .max(10_000, 'Teks maksimal 10.000 karakter'),
  jumlah: z.number().int().min(4).max(15).default(8),
})

const kartuSchema = z.object({
  depan: z.string().min(1),
  belakang: z.string().min(1),
})

aiRoutes.post('/flashcard', requireAuth, zValidator('json', flashcardSchema), async (c) => {
  const userId = c.get('userId')
  const { teks, jumlah } = c.req.valid('json')

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

  const systemPrompt = `Kamu adalah pembuat flashcard belajar untuk mahasiswa Indonesia.
Buat tepat ${jumlah} flashcard HANYA berdasarkan materi yang diberikan — jangan tambahkan info di luar materi.
Sisi depan: istilah, konsep, atau pertanyaan singkat (maksimal 1 kalimat).
Sisi belakang: definisi atau jawaban yang jelas dan padat (1-3 kalimat).
Fokus pada konsep kunci yang penting untuk dihafal. Gunakan Bahasa Indonesia baku.
Balas HANYA dengan JSON valid berformat:
{"kartu":[{"depan":"...","belakang":"..."}]}`

  const mentah = await generateJson(systemPrompt, teks)

  const parsed = z.object({ kartu: z.array(kartuSchema).min(1).max(jumlah) }).safeParse(mentah)

  if (!parsed.success) {
    console.error('Output AI tidak valid:', parsed.error.message)
    return c.json({ error: 'AI menghasilkan format tidak valid. Silakan coba lagi.' }, 502)
  }

  logUsage(userId, 'flashcard', teks.length / 4).catch(console.error)

  return c.json({
    data: {
      kartu: parsed.data.kartu,
      sisaHarian: summary.sisa - 1,
      limitHarian: summary.limit,
    },
  })
})
