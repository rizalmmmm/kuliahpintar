-- Migrasi 007 — Catatan harian Kartu Hafalan untuk widget Progres Belajar di dashboard
-- Jalankan di Supabase SQL Editor atau via: supabase db push
--
-- Tabel kartu (migrasi 005) hanya menyimpan jadwal terakhir, bukan riwayat. Tabel ini
-- menghitung berapa kartu yang diulang per hari (tanggal lokal pengguna) agar bisa dipakai
-- untuk streak & statistik mingguan.

CREATE TABLE aktivitas_kartu_harian (
  user_id   UUID     NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  tanggal   DATE     NOT NULL,
  jumlah    INTEGER  NOT NULL DEFAULT 0 CHECK (jumlah >= 0),
  PRIMARY KEY (user_id, tanggal)
);

ALTER TABLE aktivitas_kartu_harian ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aktivitas_kartu_harian: user kelola milik sendiri" ON aktivitas_kartu_harian
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tambah 1 ke hitungan hari itu (dipanggil tiap kartu dijawab). SECURITY INVOKER → RLS berlaku.
-- Tanggal dari client (zona waktu lokal), dibatasi ±1 hari dari waktu server.
CREATE OR REPLACE FUNCTION catat_ulang_kartu(p_tanggal DATE)
RETURNS VOID
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  INSERT INTO aktivitas_kartu_harian (user_id, tanggal, jumlah)
  SELECT auth.uid(), p_tanggal, 1
  WHERE auth.uid() IS NOT NULL
    AND p_tanggal BETWEEN (NOW() AT TIME ZONE 'UTC')::date - 1 AND (NOW() AT TIME ZONE 'UTC')::date + 1
  ON CONFLICT (user_id, tanggal)
  DO UPDATE SET jumlah = aktivitas_kartu_harian.jumlah + 1;
$$;

REVOKE ALL ON FUNCTION catat_ulang_kartu(DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION catat_ulang_kartu(DATE) TO authenticated;
