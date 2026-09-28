// Route Daftar Pustaka — tanpa AI. Metadata & format sitasi dari Crossref/doi.org
// (content negotiation CSL), sehingga akurat dan tidak mengarang referensi.
// Endpoint publik (tanpa login) untuk halaman /alat/daftar-pustaka — dilindungi rate limit per IP.
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { GayaSitasi, HasilCariPustaka, SitasiResponse } from '@kuliahpintar/shared'

export const pustakaRoutes = new Hono()

const CSL_STYLE: Record<GayaSitasi, string> = {
  apa: 'apa',
  ieee: 'ieee',
  harvard: 'harvard-cite-them-right',
  mla: 'modern-language-association',
  chicago: 'chicago-author-date',
}

// Crossref meminta identitas kontak ("polite pool") agar tidak dibatasi
const USER_AGENT = `KuliahPintar.id/1.0 (https://kuliahpintar.id; mailto:${process.env['CROSSREF_MAILTO'] ?? 'halo@kuliahpintar.id'})`

// ── Rate limit sederhana per IP (in-memory, cukup untuk 1 instance Railway) ──
const RATE_MAX = 60
const RATE_WINDOW_MS = 60_000
const hits = new Map<string, number[]>()

pustakaRoutes.use('*', async (c, next) => {
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'lokal'
  const now = Date.now()
  const daftar = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (daftar.length >= RATE_MAX) {
    return c.json({ error: 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.' }, 429)
  }
  daftar.push(now)
  hits.set(ip, daftar)
  if (hits.size > 10_000) hits.clear() // cegah memori membengkak
  await next()
})

// ── Cache hasil sitasi (DOI+gaya+bahasa jarang berubah) ──
const cache = new Map<string, SitasiResponse>()
function simpanCache(k: string, v: SitasiResponse) {
  if (cache.size >= 1_000) cache.delete(cache.keys().next().value!)
  cache.set(k, v)
}

/** Ambil DOI dari teks bebas: "10.xxxx/...", "doi:10...", atau link doi.org / jurnal */
export function ekstrakDoi(input: string): string | null {
  const m = decodeURIComponent(input.trim()).match(/10\.\d{4,9}\/[^\s"<>]+/i)
  if (!m) return null
  return m[0].replace(/[.,;:)\]}>]+$/, '')
}

// ── GET /api/v1/pustaka/sitasi?doi=...&gaya=apa&bahasa=id ──
const sitasiSchema = z.object({
  doi: z.string().min(1).max(500),
  gaya: z.enum(['apa', 'ieee', 'harvard', 'mla', 'chicago']).default('apa'),
  bahasa: z.enum(['id', 'en']).default('id'),
})

pustakaRoutes.get('/sitasi', zValidator('query', sitasiSchema), async (c) => {
  const { gaya, bahasa } = c.req.valid('query')
  const doi = ekstrakDoi(c.req.valid('query').doi)
  if (!doi) return c.json({ error: 'DOI tidak valid. Contoh: 10.1038/nature14539' }, 400)

  const kunci = `${doi.toLowerCase()}|${gaya}|${bahasa}`
  const ada = cache.get(kunci)
  if (ada) return c.json({ data: ada })

  let res: Response
  try {
    res = await fetch(`https://doi.org/${encodeURI(doi)}`, {
      headers: {
        Accept: `text/x-bibliography; style=${CSL_STYLE[gaya]}; locale=${bahasa === 'id' ? 'id-ID' : 'en-US'}`,
        'User-Agent': USER_AGENT,
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    return c.json({ error: 'Layanan DOI sedang lambat. Coba lagi sebentar.' }, 504)
  }

  if (res.status === 404) return c.json({ error: 'DOI tidak ditemukan.' }, 404)
  const teksMentah = (await res.text()).trim()
  // doi.org mengembalikan HTML landing page bila agensi DOI tidak mendukung format sitasi
  if (!res.ok || !teksMentah || teksMentah.startsWith('<')) {
    return c.json({ error: 'Format sitasi untuk DOI ini tidak tersedia. Coba isi manual.' }, 422)
  }

  // IEEE diberi nomor "[1]" oleh CSL — nomor diatur ulang di frontend
  const teks = teksMentah.replace(/^\[\d+\]\s*/, '').replace(/\s+/g, ' ')
  const hasil: SitasiResponse = { doi, gaya, teks, kunciUrut: teks.toLowerCase() }
  simpanCache(kunci, hasil)
  return c.json({ data: hasil })
})

// ── GET /api/v1/pustaka/cari?q=judul artikel ──
const cariSchema = z.object({ q: z.string().trim().min(3).max(300) })

type CrossrefItem = {
  DOI: string
  title?: string[]
  author?: { family?: string; given?: string; name?: string }[]
  issued?: { 'date-parts'?: (number | null)[][] }
  'container-title'?: string[]
}

pustakaRoutes.get('/cari', zValidator('query', cariSchema), async (c) => {
  const { q } = c.req.valid('query')
  const url = new URL('https://api.crossref.org/works')
  url.searchParams.set('query.bibliographic', q)
  url.searchParams.set('rows', '6')
  url.searchParams.set('select', 'DOI,title,author,issued,container-title')

  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    return c.json({ error: 'Pencarian sedang lambat. Coba lagi sebentar.' }, 504)
  }
  if (!res.ok) return c.json({ error: 'Pencarian gagal. Coba lagi.' }, 502)

  const body = (await res.json()) as { message?: { items?: CrossrefItem[] } }
  const hasil: HasilCariPustaka[] = (body.message?.items ?? []).map((it) => {
    const penulis = (it.author ?? [])
      .slice(0, 3)
      .map((a) => a.family ?? a.name ?? '')
      .filter(Boolean)
    return {
      doi: it.DOI,
      judul: it.title?.[0] ?? '(tanpa judul)',
      penulis:
        penulis.join(', ') + ((it.author?.length ?? 0) > 3 ? ', dkk.' : '') || 'Tanpa penulis',
      tahun: it.issued?.['date-parts']?.[0]?.[0] ?? null,
      sumber: it['container-title']?.[0] ?? null,
    }
  })
  return c.json({ data: hasil })
})
