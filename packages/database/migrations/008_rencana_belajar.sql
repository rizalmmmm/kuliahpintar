-- Migrasi 008 — Rencana Belajar menuju UTS/UAS (tanpa AI)
-- Jalankan di Supabase SQL Editor atau via: supabase db push
--
-- - rencana_belajar: satu ujian (judul, tanggal ujian, daftar topik, hari libur belajar)
-- - sesi_rencana: jadwal harian hasil pembagian topik (utils/rencana.ts), bisa dicentang

CREATE TABLE rencana_belajar (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  judul          TEXT        NOT NULL CHECK (char_length(judul) BETWEEN 1 AND 120),
  tanggal_ujian  DATE        NOT NULL,
  topik          TEXT[]      NOT NULL CHECK (cardinality(topik) BETWEEN 1 AND 100),
  -- 0 = Minggu … 6 = Sabtu (sama dengan Date.getDay())
  hari_libur     SMALLINT[]  NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX rencana_belajar_user ON rencana_belajar (user_id, tanggal_ujian);

CREATE TRIGGER rencana_belajar_updated_at
  BEFORE UPDATE ON rencana_belajar
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE sesi_rencana (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rencana_id  UUID        NOT NULL REFERENCES rencana_belajar(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  tanggal     DATE        NOT NULL,
  judul       TEXT        NOT NULL CHECK (char_length(judul) BETWEEN 1 AND 200),
  -- materi = belajar topik pertama kali, ulang = mengulang topik, review = review semua
  jenis       TEXT        NOT NULL CHECK (jenis IN ('materi', 'ulang', 'review')),
  urutan      SMALLINT    NOT NULL DEFAULT 0,
  selesai     BOOLEAN     NOT NULL DEFAULT FALSE,
  selesai_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sesi_rencana_rencana ON sesi_rencana (rencana_id, tanggal, urutan);
CREATE INDEX sesi_rencana_user_tanggal ON sesi_rencana (user_id, tanggal);

-- Sesi harus berada di rencana milik user yang sama
CREATE OR REPLACE FUNCTION sesi_cek_pemilik_rencana()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM rencana_belajar WHERE id = NEW.rencana_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Rencana tidak ditemukan atau bukan milikmu';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sesi_pemilik_rencana
  BEFORE INSERT OR UPDATE OF rencana_id, user_id ON sesi_rencana
  FOR EACH ROW EXECUTE FUNCTION sesi_cek_pemilik_rencana();

-- ============================================================
-- ROW LEVEL SECURITY — semua milik sendiri
-- ============================================================
ALTER TABLE rencana_belajar ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesi_rencana    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rencana_belajar: user kelola milik sendiri" ON rencana_belajar
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sesi_rencana: user kelola milik sendiri" ON sesi_rencana
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
