-- Migrasi 003 — Ulasan pengguna (rating + komentar) untuk halaman /ulasan
-- Jalankan di Supabase SQL Editor atau via: supabase db push
--
-- Aturan:
-- - Semua orang (termasuk belum login) bisa membaca ulasan yang tampil.
-- - Menulis/mengubah/menghapus ulasan hanya untuk user yang login dengan Google,
--   dan hanya ulasan miliknya sendiri. Satu user = satu ulasan.
-- - Nama & foto diambil otomatis dari profil (tidak bisa dipalsukan dari client).
-- - Admin bisa menyembunyikan ulasan lewat SQL Editor: UPDATE ulasan SET tampil = FALSE WHERE id = '...';

CREATE TABLE ulasan (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  isi         TEXT        NOT NULL CHECK (char_length(isi) BETWEEN 10 AND 1000),
  nama        TEXT,
  avatar_url  TEXT,
  tampil      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ulasan_terbaru ON ulasan (created_at DESC) WHERE tampil;

-- Nama & foto selalu dari profil; kolom tampil hanya boleh diubah admin (service role / SQL Editor)
CREATE OR REPLACE FUNCTION isi_identitas_ulasan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  SELECT name, avatar_url INTO NEW.nama, NEW.avatar_url FROM profiles WHERE id = NEW.user_id;

  IF auth.role() IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.tampil := TRUE;
    ELSE
      NEW.tampil := OLD.tampil;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER ulasan_isi_identitas
  BEFORE INSERT OR UPDATE ON ulasan
  FOR EACH ROW EXECUTE FUNCTION isi_identitas_ulasan();

CREATE TRIGGER ulasan_updated_at
  BEFORE UPDATE ON ulasan
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE ulasan ENABLE ROW LEVEL SECURITY;

-- Publik: lihat ulasan yang tampil; pemilik: selalu lihat ulasannya sendiri
CREATE POLICY "ulasan: baca publik" ON ulasan
  FOR SELECT USING (tampil OR auth.uid() = user_id);

-- Tulis hanya untuk akun yang tertaut ke Google (providers berisi 'google')
CREATE POLICY "ulasan: tulis milik sendiri via Google" ON ulasan
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (auth.jwt() -> 'app_metadata' -> 'providers') ? 'google'
  );

CREATE POLICY "ulasan: ubah milik sendiri via Google" ON ulasan
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (auth.jwt() -> 'app_metadata' -> 'providers') ? 'google'
  );

CREATE POLICY "ulasan: hapus milik sendiri" ON ulasan
  FOR DELETE USING (auth.uid() = user_id);
