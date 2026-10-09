-- Migrasi 005 — Kartu Hafalan (flashcard manual tanpa AI) dengan sistem Leitner
-- Jalankan di Supabase SQL Editor atau via: supabase db push
--
-- - dek_kartu: kumpulan kartu milik user; bisa dibuat publik agar dibagikan lewat link
-- - kartu: sisi depan/belakang + posisi kotak Leitner (1–5) dan jadwal ulang (jatuh_tempo)
-- - Dek publik bisa dibaca siapa saja (termasuk belum login) untuk dilihat & disalin

CREATE TABLE dek_kartu (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  judul       TEXT        NOT NULL CHECK (char_length(judul) BETWEEN 1 AND 120),
  deskripsi   TEXT        CHECK (char_length(deskripsi) <= 500),
  publik      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX dek_kartu_user ON dek_kartu (user_id, created_at DESC);

CREATE TRIGGER dek_kartu_updated_at
  BEFORE UPDATE ON dek_kartu
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE kartu (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dek_id       UUID        NOT NULL REFERENCES dek_kartu(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  depan        TEXT        NOT NULL CHECK (char_length(depan) BETWEEN 1 AND 1000),
  belakang     TEXT        NOT NULL CHECK (char_length(belakang) BETWEEN 1 AND 2000),
  -- Kotak Leitner: 1 = baru/sering salah … 5 = sudah hafal
  kotak        SMALLINT    NOT NULL DEFAULT 1 CHECK (kotak BETWEEN 1 AND 5),
  jatuh_tempo  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX kartu_dek ON kartu (dek_id, created_at);
CREATE INDEX kartu_jatuh_tempo ON kartu (user_id, jatuh_tempo);

-- Kartu harus berada di dek milik user yang sama
CREATE OR REPLACE FUNCTION kartu_cek_pemilik_dek()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dek_kartu WHERE id = NEW.dek_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Dek tidak ditemukan atau bukan milikmu';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER kartu_pemilik_dek
  BEFORE INSERT OR UPDATE OF dek_id, user_id ON kartu
  FOR EACH ROW EXECUTE FUNCTION kartu_cek_pemilik_dek();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE dek_kartu ENABLE ROW LEVEL SECURITY;
ALTER TABLE kartu     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dek_kartu: user kelola milik sendiri" ON dek_kartu
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dek_kartu: baca dek publik" ON dek_kartu
  FOR SELECT USING (publik);

CREATE POLICY "kartu: user kelola milik sendiri" ON kartu
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "kartu: baca kartu di dek publik" ON kartu
  FOR SELECT USING (EXISTS (SELECT 1 FROM dek_kartu d WHERE d.id = dek_id AND d.publik));
