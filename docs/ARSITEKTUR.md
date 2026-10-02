# Arsitektur KuliahPintar.id

## Gambaran Umum

```
Browser/Mobile
      │
      ▼
┌─────────────┐       ┌──────────────┐       ┌─────────────────┐
│  apps/web   │──────▶│  apps/api    │──────▶│  Supabase (DB)  │
│  (Nuxt 3)   │       │  (Hono/Node) │       │  PostgreSQL+RLS │
│  Vercel     │       │  Railway     │       └─────────────────┘
└─────────────┘       └──────┬───────┘
                             │
                    ┌────────┼────────┐
                    ▼        ▼        ▼
              Supabase   Gemini    Midtrans
               Auth      AI       Payment
```

## Prinsip Desain

| Prinsip           | Penerapan                                                     |
| ----------------- | ------------------------------------------------------------- |
| API-first         | Frontend dan backend sepenuhnya terpisah, komunikasi via REST |
| Stateless backend | Semua state ada di Supabase / client                          |
| Raw SQL           | Tidak pakai ORM — query langsung via Supabase client          |
| TypeScript strict | `strict: true`, tidak ada `any`                               |
| Mobile-first      | Tailwind ditulis dari breakpoint terkecil                     |

## Alur Autentikasi

```
1. User login di web (Supabase Auth)
2. Supabase kembalikan JWT access_token
3. Frontend simpan session di cookie (dihandle @nuxtjs/supabase)
4. Setiap request ke API, frontend kirim: Authorization: Bearer <token>
5. Middleware auth di API verifikasi token ke Supabase
6. Jika valid, lanjut ke handler dengan userId di context
```

## Pembayaran manual (aktif saat ini)

Sementara Midtrans belum dipakai, Premium dibayar lewat transfer manual ke
**BCA 3728200300 a.n. Rizal.A**.

1. User klik "Upgrade ke Premium" di `/harga`
2. Frontend panggil `POST /api/v1/payment/manual` → backend mencatat baris
   `subscriptions` berstatus `inactive` dengan kode `MANUAL-<user>-<timestamp>`
   (disimpan di kolom `midtrans_order_id`)
3. User transfer sesuai nominal, mencantumkan kode pesanan di berita transfer,
   lalu kirim bukti transfer via WhatsApp ke **082210002535** (tombol di web
   membuka `wa.me` dengan kode pesanan & email akun sudah terisi)
4. Admin cek bukti WA + mutasi BCA, lalu aktifkan Premium lewat SQL Editor Supabase:

```sql
-- Ganti kode pesanan sesuai berita transfer
WITH sub AS (
  UPDATE subscriptions
  SET status = 'active', start_date = NOW(), end_date = NOW() + INTERVAL '30 days'
  WHERE midtrans_order_id = 'MANUAL-xxxxxxxx-0000000000000' AND status = 'inactive'
  RETURNING user_id
)
UPDATE profiles SET tier = 'premium' WHERE id IN (SELECT user_id FROM sub);
```

Daftar pesanan manual yang menunggu verifikasi:

```sql
SELECT s.midtrans_order_id, p.email, p.name, s.created_at
FROM subscriptions s JOIN profiles p ON p.id = s.user_id
WHERE s.status = 'inactive' AND s.midtrans_order_id LIKE 'MANUAL-%'
ORDER BY s.created_at DESC;
```

### Panel admin (`/admin`)

Cara yang lebih mudah daripada SQL: buka `/admin/masuk`, masuk dengan nomor HP
admin (**082210002535**) + kode OTP SMS, lalu di `/admin`:

- **Menunggu verifikasi** — pesanan `MANUAL-*`, tombol Aktifkan / Tolak
- **Aktifkan lewat email** — untuk yang transfer tanpa membuat pesanan
  (memperpanjang 30 hari bila Premium masih aktif)
- **Premium aktif** — tanggal berakhir, tombol Cabut

Premium turun ke gratis otomatis setelah 30 hari: dicek setiap kali tier dibaca
(`apps/api/src/lib/premium.ts`) dan disapu tiap jam oleh workflow
`premium-kedaluwarsa.yml` (`POST /api/v1/cron/premium-kedaluwarsa`). Langganan yang
habis berstatus `past_due`.

Akses dicek di server (`apps/api/src/middleware/admin.ts`): hanya akun dengan nomor
HP terverifikasi yang ada di env `ADMIN_PHONES` (default `6282210002535`).

Setup sekali:

1. Jalankan migrasi `004_login_nomor_hp.sql` (akun nomor HP tidak punya email)
2. Supabase Dashboard → Authentication → Sign In / Providers → **Phone**: aktifkan dan
   isi kredensial penyedia SMS (Twilio, MessageBird, Vonage, atau Textlocal).
   Ada biaya per SMS dari penyedia tersebut.
3. Atur batas kirim SMS di Authentication → Rate Limits supaya kredit SMS tidak
   dihabiskan orang lain yang iseng meminta OTP.

## Alur Pembayaran (Midtrans — belum aktif)

```
1. User klik "Upgrade ke Premium"
2. Frontend request POST /api/v1/payment/create ke backend
3. Backend buat order di Midtrans, kembalikan snap_token
4. Frontend load Midtrans Snap popup dengan snap_token
5. User bayar (transfer/QRIS/dll)
6. Midtrans kirim webhook ke POST /api/v1/payment/webhook
7. Backend verifikasi signature, update subscriptions table
8. User otomatis dapat akses premium
```

## Rate Limiting Free Tier

Free tier dibatasi **5 AI request per hari**. Implementasi:

- Setiap AI request dicatat ke tabel `usage_logs`
- Backend query count usage hari ini sebelum proses request
- Jika `>= 5`, kembalikan `429 Too Many Requests`

## Struktur Direktori API

```
src/
├── index.ts          # Entry point, boot server
├── app.ts            # Registrasi middleware & routes
├── routes/           # Satu file per domain (health, auth, ai, payment)
├── middleware/       # auth, rateLimit, dll
└── lib/              # Client eksternal (supabase, gemini, resend, midtrans)
```

## Environment

| Env         | URL                                      |
| ----------- | ---------------------------------------- |
| Development | web: localhost:3000, api: localhost:3001 |
| Staging     | Supabase sandbox + Midtrans sandbox      |
| Production  | Vercel + Railway + Supabase prod         |
