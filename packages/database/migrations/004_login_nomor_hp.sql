-- Migrasi 004 — Dukungan login nomor HP (OTP SMS) untuk admin
-- Akun yang dibuat lewat nomor HP tidak punya email, sedangkan profiles.email
-- sebelumnya NOT NULL sehingga trigger handle_new_user gagal dan pendaftaran batal.
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;
