-- Migrasi 006 — Simulasi Ujian (tanpa AI): paket soal pilihan ganda buatan sendiri + riwayat hasil
-- Jalankan di Supabase SQL Editor atau via: supabase db push
--
-- - paket_ujian: kumpulan soal + durasi ujian
-- - soal_ujian: pertanyaan, 2–5 opsi, indeks kunci jawaban (0-based), pembahasan
-- - hasil_ujian: riwayat nilai, dari paket soal atau dari dek Kartu Hafalan (migrasi 005)

CREATE TABLE paket_ujian (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  judul         TEXT        NOT NULL CHECK (char_length(judul) BETWEEN 1 AND 120),
  deskripsi     TEXT        CHECK (char_length(deskripsi) <= 500),
  durasi_menit  SMALLINT    NOT NULL DEFAULT 30 CHECK (durasi_menit BETWEEN 1 AND 300),
  acak_soal     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX paket_ujian_user ON paket_ujian (user_id, updated_at DESC);

CREATE TRIGGER paket_ujian_updated_at
  BEFORE UPDATE ON paket_ujian
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE soal_ujian (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  paket_id     UUID        NOT NULL REFERENCES paket_ujian(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  pertanyaan   TEXT        NOT NULL CHECK (char_length(pertanyaan) BETWEEN 1 AND 2000),
  opsi         TEXT[]      NOT NULL CHECK (cardinality(opsi) BETWEEN 2 AND 5),
  kunci        SMALLINT    NOT NULL CHECK (kunci >= 0 AND kunci < cardinality(opsi)),
  pembahasan   TEXT        CHECK (char_length(pembahasan) <= 2000),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX soal_ujian_paket ON soal_ujian (paket_id, created_at);

-- Soal harus berada di paket milik user yang sama
CREATE OR REPLACE FUNCTION soal_cek_pemilik_paket()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM paket_ujian WHERE id = NEW.paket_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Paket tidak ditemukan atau bukan milikmu';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER soal_pemilik_paket
  BEFORE INSERT OR UPDATE OF paket_id, user_id ON soal_ujian
  FOR EACH ROW EXECUTE FUNCTION soal_cek_pemilik_paket();

CREATE TABLE hasil_ujian (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  paket_id      UUID        REFERENCES paket_ujian(id) ON DELETE SET NULL,
  dek_id        UUID        REFERENCES dek_kartu(id) ON DELETE SET NULL,
  -- Judul disalin supaya riwayat tetap terbaca walau paket/dek sudah dihapus
  judul         TEXT        NOT NULL CHECK (char_length(judul) BETWEEN 1 AND 120),
  benar         SMALLINT    NOT NULL CHECK (benar >= 0),
  total         SMALLINT    NOT NULL CHECK (total > 0 AND benar <= total),
  durasi_detik  INTEGER     NOT NULL CHECK (durasi_detik >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX hasil_ujian_user ON hasil_ujian (user_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY — semua milik sendiri
-- ============================================================
ALTER TABLE paket_ujian ENABLE ROW LEVEL SECURITY;
ALTER TABLE soal_ujian  ENABLE ROW LEVEL SECURITY;
ALTER TABLE hasil_ujian ENABLE ROW LEVEL SECURITY;

CREATE POLICY "paket_ujian: user kelola milik sendiri" ON paket_ujian
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "soal_ujian: user kelola milik sendiri" ON soal_ujian
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hasil_ujian: user kelola milik sendiri" ON hasil_ujian
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
