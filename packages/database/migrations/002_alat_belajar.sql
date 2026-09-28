-- Migrasi 002 — Alat Belajar tanpa AI: Jadwal Kuliah, Tugas & Pengingat, Nilai (IPK), Sesi Fokus
-- Jalankan di Supabase SQL Editor atau via: supabase db push
-- Semua tabel diakses langsung dari frontend (Supabase client) dengan RLS: user hanya bisa
-- membaca/mengubah baris miliknya sendiri.

-- ============================================================
-- KEAMANAN: user tidak boleh mengubah tier/role miliknya sendiri
-- Policy profiles "FOR ALL" di 001 mengizinkan user meng-update barisnya, termasuk kolom tier.
-- Trigger ini menolak perubahan tier/role dari request user (anon/authenticated);
-- service role (API, webhook pembayaran) dan SQL Editor tetap bisa.
-- ============================================================
CREATE OR REPLACE FUNCTION protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() IN ('anon', 'authenticated')
     AND (NEW.tier IS DISTINCT FROM OLD.tier OR NEW.role IS DISTINCT FROM OLD.role) THEN
    RAISE EXCEPTION 'Tidak diizinkan mengubah tier atau role';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_protect_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_columns();

-- Preferensi pengingat email tugas (default aktif)
ALTER TABLE profiles ADD COLUMN pengingat_email BOOLEAN NOT NULL DEFAULT TRUE;

-- ============================================================
-- JADWAL KULIAH — jadwal mingguan berulang
-- hari: 1 = Senin … 7 = Minggu; jam dalam waktu lokal user (WIB/WITA/WIT)
-- ============================================================
CREATE TABLE jadwal_kuliah (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  mata_kuliah  TEXT        NOT NULL CHECK (char_length(mata_kuliah) BETWEEN 1 AND 120),
  hari         SMALLINT    NOT NULL CHECK (hari BETWEEN 1 AND 7),
  jam_mulai    TIME        NOT NULL,
  jam_selesai  TIME        NOT NULL CHECK (jam_selesai > jam_mulai),
  ruang        TEXT        CHECK (char_length(ruang) <= 60),
  dosen        TEXT        CHECK (char_length(dosen) <= 120),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX jadwal_kuliah_user ON jadwal_kuliah (user_id, hari, jam_mulai);

-- ============================================================
-- TUGAS — daftar tugas dengan deadline + status pengingat email
-- ============================================================
CREATE TABLE tugas (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  judul         TEXT        NOT NULL CHECK (char_length(judul) BETWEEN 1 AND 200),
  mata_kuliah   TEXT        CHECK (char_length(mata_kuliah) <= 120),
  catatan       TEXT        CHECK (char_length(catatan) <= 2000),
  deadline      TIMESTAMPTZ NOT NULL,
  selesai       BOOLEAN     NOT NULL DEFAULT FALSE,
  selesai_at    TIMESTAMPTZ,
  -- Diisi oleh job pengingat (service role) setelah email H-1 terkirim
  diingatkan_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX tugas_user_deadline ON tugas (user_id, selesai, deadline);
-- Untuk job pengingat: tugas belum selesai & belum diingatkan, urut deadline
CREATE INDEX tugas_pengingat ON tugas (deadline) WHERE selesai = FALSE AND diingatkan_at IS NULL;

-- Deadline diubah → reset status pengingat agar diingatkan lagi untuk deadline baru
CREATE OR REPLACE FUNCTION tugas_reset_pengingat()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.deadline IS DISTINCT FROM OLD.deadline THEN
    NEW.diingatkan_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tugas_deadline_changed
  BEFORE UPDATE ON tugas
  FOR EACH ROW EXECUTE FUNCTION tugas_reset_pengingat();

-- ============================================================
-- NILAI MATA KULIAH — untuk Kalkulator IPK/IPS
-- huruf disimpan apa adanya (A, A-, AB, B+ …), bobot angka 0.00–4.00 dipakai untuk hitung
-- ============================================================
CREATE TABLE nilai_mk (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  semester     SMALLINT     NOT NULL CHECK (semester BETWEEN 1 AND 14),
  mata_kuliah  TEXT         NOT NULL CHECK (char_length(mata_kuliah) BETWEEN 1 AND 120),
  sks          SMALLINT     NOT NULL CHECK (sks BETWEEN 1 AND 24),
  huruf        TEXT         NOT NULL CHECK (char_length(huruf) <= 3),
  bobot        NUMERIC(3,2) NOT NULL CHECK (bobot BETWEEN 0 AND 4),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX nilai_mk_user ON nilai_mk (user_id, semester);

-- ============================================================
-- SESI FOKUS — riwayat sesi Pomodoro untuk statistik & streak
-- ============================================================
CREATE TABLE sesi_fokus (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  durasi_menit  SMALLINT    NOT NULL CHECK (durasi_menit BETWEEN 1 AND 180),
  label         TEXT        CHECK (char_length(label) <= 120),
  selesai_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sesi_fokus_user ON sesi_fokus (user_id, selesai_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE jadwal_kuliah ENABLE ROW LEVEL SECURITY;
ALTER TABLE tugas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE nilai_mk      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesi_fokus    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jadwal_kuliah: user kelola milik sendiri" ON jadwal_kuliah
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tugas: user kelola milik sendiri" ON tugas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nilai_mk: user kelola milik sendiri" ON nilai_mk
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sesi_fokus: user kelola milik sendiri" ON sesi_fokus
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
