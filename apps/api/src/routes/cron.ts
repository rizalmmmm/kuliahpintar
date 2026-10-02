// Route cron — dipanggil terjadwal tiap jam oleh GitHub Actions
// (.github/workflows/pengingat-tugas.yml dan premium-kedaluwarsa.yml)
// Diamankan dengan header Authorization: Bearer <CRON_SECRET>.
import { Hono } from 'hono'
import { timingSafeEqual } from 'node:crypto'
import { Resend } from 'resend'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { turunkanPremiumKedaluwarsa } from '../lib/premium.js'

export const cronRoutes = new Hono()

function tokenValid(header: string | undefined): boolean {
  const secret = process.env['CRON_SECRET']
  if (!secret || !header?.startsWith('Bearer ')) return false
  const a = Buffer.from(header.slice(7))
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!
  )

// Tampilkan waktu dalam WIB — mayoritas pengguna; deadline tetap tersimpan UTC
function formatWib(iso: string) {
  return (
    new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso)) + ' WIB'
  )
}

type BarisTugas = {
  id: string
  judul: string
  mata_kuliah: string | null
  deadline: string
  user_id: string
  profiles: { email: string; name: string | null; pengingat_email: boolean }
}

export function susunEmail(nama: string | null, daftar: BarisTugas[], appUrl: string) {
  const sapaan = nama ? `Hai ${escapeHtml(nama.split(' ')[0]!)},` : 'Hai,'
  const item = daftar
    .map(
      (t) => `<li style="margin-bottom:10px">
  <strong>${escapeHtml(t.judul)}</strong>${t.mata_kuliah ? ` <span style="color:#6b7280">— ${escapeHtml(t.mata_kuliah)}</span>` : ''}<br>
  <span style="color:#dc2626">Deadline: ${formatWib(t.deadline)}</span>
</li>`
    )
    .join('')
  const subject =
    daftar.length === 1
      ? `⏰ Deadline < 24 jam: ${daftar[0]!.judul}`.slice(0, 120)
      : `⏰ ${daftar.length} tugas deadline dalam 24 jam`
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:auto;color:#111827">
<p>${sapaan}</p>
<p>Tugas berikut deadline-nya kurang dari 24 jam lagi:</p>
<ul style="padding-left:18px">${item}</ul>
<p><a href="${appUrl}/alat/jadwal" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Lihat daftar tugas</a></p>
<p style="color:#9ca3af;font-size:12px">Semangat! — KuliahPintar.id<br>Matikan pengingat email di halaman Jadwal & Tugas.</p>
</div>`
  return { subject, html }
}

// POST /api/v1/cron/pengingat-tugas — email H-1 untuk tugas yang deadline-nya ≤ 24 jam lagi
cronRoutes.post('/pengingat-tugas', async (c) => {
  if (!tokenValid(c.req.header('Authorization'))) {
    return c.json({ error: 'Tidak diizinkan' }, 401)
  }
  const resendKey = process.env['RESEND_API_KEY']
  const from = process.env['RESEND_FROM_EMAIL'] ?? 'noreply@kuliahpintar.id'
  const appUrl = process.env['APP_URL'] ?? 'https://kuliahpintar.id'
  if (!resendKey) return c.json({ error: 'RESEND_API_KEY belum di-set' }, 500)

  const now = new Date()
  const batas = new Date(now.getTime() + 24 * 3600 * 1000)

  const { data, error } = await getSupabaseAdmin()
    .from('tugas')
    .select(
      'id, judul, mata_kuliah, deadline, user_id, profiles!inner(email, name, pengingat_email)'
    )
    .eq('selesai', false)
    .is('diingatkan_at', null)
    .gt('deadline', now.toISOString())
    .lte('deadline', batas.toISOString())
    .eq('profiles.pengingat_email', true)
    .order('deadline')
    .limit(2000)

  if (error) {
    console.error('Query pengingat gagal:', error.message)
    return c.json({ error: 'Query gagal' }, 500)
  }

  // Satu email per user berisi semua tugasnya
  const perUser = new Map<string, BarisTugas[]>()
  for (const t of (data ?? []) as unknown as BarisTugas[]) {
    perUser.set(t.user_id, [...(perUser.get(t.user_id) ?? []), t])
  }

  const resend = new Resend(resendKey)
  let terkirim = 0
  let gagal = 0
  for (const daftar of perUser.values()) {
    const profil = daftar[0]!.profiles
    const { subject, html } = susunEmail(profil.name, daftar, appUrl)
    const res = await resend.emails.send({ from, to: profil.email, subject, html })
    if (res.error) {
      gagal++
      console.error('Kirim pengingat gagal:', res.error)
      continue
    }
    const { error: e } = await getSupabaseAdmin()
      .from('tugas')
      .update({ diingatkan_at: new Date().toISOString() })
      .in(
        'id',
        daftar.map((t) => t.id)
      )
    if (e) console.error('Tandai diingatkan gagal:', e.message)
    terkirim++
  }

  return c.json({ data: { user: perUser.size, terkirim, gagal } })
})

// POST /api/v1/cron/premium-kedaluwarsa — turunkan ke gratis Premium yang lewat 30 hari
cronRoutes.post('/premium-kedaluwarsa', async (c) => {
  if (!tokenValid(c.req.header('Authorization'))) {
    return c.json({ error: 'Tidak diizinkan' }, 401)
  }
  try {
    return c.json({ data: await turunkanPremiumKedaluwarsa() })
  } catch (err) {
    console.error('Turunkan Premium kedaluwarsa gagal:', err)
    return c.json({ error: 'Gagal memproses' }, 500)
  }
})
