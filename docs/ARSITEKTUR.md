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

## Alur Pembayaran (Midtrans)

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
