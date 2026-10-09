-- Migrasi 009 — Simpan Materi Kuliah (PDF, slide, dokumen) per mata kuliah
-- Jalankan di Supabase SQL Editor atau via: supabase db push
--
-- - Bucket Storage privat "materi": file di <user_id>/<uuid>-<nama file>, maks 20 MB per file
-- - Kuota total per user: Gratis 100 MB, Premium 1 GB (dicek di policy upload Storage)
-- - Tabel materi_kuliah: metadata file (mata kuliah, nama, ukuran, tipe)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'materi',
  'materi',
  FALSE,
  20 * 1024 * 1024,
  ARRAY[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/png',
    'image/jpeg'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Kuota (byte) user yang sedang login, menurut tier profil
CREATE OR REPLACE FUNCTION materi_kuota_bytes()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN p.tier = 'premium' THEN 1024::BIGINT ELSE 100::BIGINT END * 1024 * 1024
  FROM profiles p
  WHERE p.id = auth.uid();
$$;

-- Total byte yang sudah dipakai user yang sedang login di bucket "materi"
CREATE OR REPLACE FUNCTION materi_terpakai_bytes()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT COALESCE(SUM((o.metadata ->> 'size')::BIGINT), 0)
  FROM storage.objects o
  WHERE o.bucket_id = 'materi'
    AND (storage.foldername(o.name))[1] = auth.uid()::TEXT;
$$;

REVOKE ALL ON FUNCTION materi_kuota_bytes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION materi_terpakai_bytes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION materi_kuota_bytes() TO authenticated;
GRANT EXECUTE ON FUNCTION materi_terpakai_bytes() TO authenticated;

-- Storage: user hanya bisa mengakses folder miliknya; upload ditolak bila kuota sudah penuh
CREATE POLICY "materi: baca milik sendiri" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'materi' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE POLICY "materi: unggah ke folder sendiri dalam kuota" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'materi'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND public.materi_terpakai_bytes() < public.materi_kuota_bytes()
  );

CREATE POLICY "materi: hapus milik sendiri" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'materi' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

-- ============================================================
-- METADATA MATERI
-- ============================================================
CREATE TABLE materi_kuliah (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  mata_kuliah   TEXT        NOT NULL CHECK (char_length(mata_kuliah) BETWEEN 1 AND 120),
  nama          TEXT        NOT NULL CHECK (char_length(nama) BETWEEN 1 AND 255),
  path          TEXT        NOT NULL UNIQUE CHECK (char_length(path) <= 500),
  ukuran_bytes  BIGINT      NOT NULL CHECK (ukuran_bytes >= 0),
  tipe          TEXT        CHECK (char_length(tipe) <= 120),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX materi_kuliah_user ON materi_kuliah (user_id, mata_kuliah, created_at DESC);

ALTER TABLE materi_kuliah ENABLE ROW LEVEL SECURITY;

-- Path wajib di folder milik sendiri (<user_id>/...)
CREATE POLICY "materi_kuliah: user kelola milik sendiri" ON materi_kuliah
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND split_part(path, '/', 1) = auth.uid()::TEXT);
