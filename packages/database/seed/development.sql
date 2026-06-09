-- Seed data untuk development environment
-- Jalankan setelah migrasi dan setelah ada user yang signup via Supabase.
--
-- Cara pakai:
--   1. Signup user via Supabase Auth (atau lewat app)
--   2. Ganti UUID di bawah dengan user_id asli dari tabel auth.users
--   3. Jalankan file ini di Supabase SQL Editor

-- Jadikan user admin:
-- UPDATE profiles SET role = 'admin' WHERE email = 'kamu@example.com';

-- Beri akses premium sementara (untuk testing):
-- INSERT INTO subscriptions (user_id, status, tier, start_date, end_date)
-- VALUES (
--   'ganti-dengan-user-id-asli',
--   'active',
--   'premium',
--   NOW(),
--   NOW() + INTERVAL '30 days'
-- );

SELECT 'Seed file siap. Uncomment dan sesuaikan query di atas.' AS info;
