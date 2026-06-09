# KuliahPintar.id

> Tools AI untuk mahasiswa Indonesia. Belajar lebih cerdas, bukan lebih keras.

## Teknologi

| Layer    | Stack                                      |
| -------- | ------------------------------------------ |
| Frontend | Nuxt 3 + Vue 3 + TypeScript + Tailwind CSS |
| Backend  | Node.js + Hono + TypeScript                |
| Database | PostgreSQL via Supabase                    |
| Auth     | Supabase Auth (Email + Google OAuth)       |
| AI       | Google Gemini 2.0 Flash                    |
| Payment  | Midtrans Snap                              |
| Email    | Resend                                     |
| Hosting  | Vercel (web) + Railway (api)               |

## Struktur Monorepo

```
kuliahpintar/
├── apps/
│   ├── web/          # Frontend Nuxt 3 (port 3000)
│   └── api/          # Backend Hono (port 3001)
├── packages/
│   ├── shared/       # Types & utilities bersama
│   └── database/     # Migrasi & schema SQL
├── docs/
│   └── ARSITEKTUR.md
├── .env.example
└── README.md         # ← kamu di sini
```

## Prerequisites

- [Node.js](https://nodejs.org) v20 atau lebih baru
- [pnpm](https://pnpm.io) v9 (`npm install -g pnpm`)
- Akun [Supabase](https://supabase.com) (gratis)
- API key [Google AI Studio](https://aistudio.google.com) (gratis)
- Akun [Midtrans](https://midtrans.com) (gunakan Sandbox untuk dev)
- Akun [Resend](https://resend.com) (gratis 3.000 email/bulan)

## Setup Cepat

### 1. Install dependencies

```bash
pnpm install
```

### 2. Konfigurasi environment

```bash
cp .env.example .env
```

Buka `.env` dan isi semua nilai. Lihat komentar di `.env.example` untuk panduan tiap variabel.

### 3. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Salin URL dan keys ke `.env`
3. Jalankan migrasi database:

   ```bash
   # Install Supabase CLI (sekali saja)
   pnpm add -g supabase

   # Login dan link ke project
   supabase login
   supabase link --project-ref <project-ref-kamu>

   # Jalankan migrasi
   cd packages/database
   supabase db push
   ```

4. Aktifkan Google OAuth:
   - Buka Supabase Dashboard → Authentication → Providers
   - Enable Google, isi Client ID & Secret dari [Google Cloud Console](https://console.cloud.google.com)

### 4. Jalankan development server

```bash
pnpm dev
```

| Service          | URL                          |
| ---------------- | ---------------------------- |
| Frontend (Nuxt)  | http://localhost:3000        |
| Backend (API)    | http://localhost:3001        |
| API Health Check | http://localhost:3001/health |

## Scripts

| Script           | Fungsi                            |
| ---------------- | --------------------------------- |
| `pnpm dev`       | Jalankan semua apps (paralel)     |
| `pnpm build`     | Build semua apps untuk production |
| `pnpm lint`      | Jalankan ESLint                   |
| `pnpm format`    | Format semua file dengan Prettier |
| `pnpm typecheck` | Cek TypeScript di semua workspace |

## Menambahkan Fitur Baru

1. **Types** → `packages/shared/src/types/`
2. **Migrasi DB** → `packages/database/migrations/`
3. **API route** → `apps/api/src/routes/`
4. **Halaman/komponen** → `apps/web/pages/` atau `apps/web/components/`

## Business Model

| Tier    | Harga           | Limit                   |
| ------- | --------------- | ----------------------- |
| Free    | Gratis          | 5 AI request/hari       |
| Premium | Rp 39.000/bulan | Unlimited + semua fitur |

## Deployment

### Frontend → Vercel

1. Connect repo di [vercel.com](https://vercel.com)
2. Set root directory ke `apps/web`
3. Tambahkan semua `NUXT_PUBLIC_*` env vars di Vercel dashboard

### Backend → Railway

1. Connect repo di [railway.app](https://railway.app)
2. Set root directory ke `apps/api`
3. Tambahkan semua env vars (tanpa prefix NUXT*PUBLIC*)

## Dokumentasi

- [Arsitektur & Alur Sistem](docs/ARSITEKTUR.md)

---

© 2024 KuliahPintar.id · Proprietary
