-- Tutup kebocoran data antar lembaga.
-- Policy di Postgres bersifat "OR": satu policy longgar membatalkan semua policy ketat.
-- Policy berikut tidak ada di migrasi repo dan membuka data semua lembaga.

-- 1) Policy guru tanpa batas lembaga. Akses guru yang sah (satu lembaga) tetap dijamin oleh
--    "View/Insert/Update own or same-lembaga ..." yang sudah ada.
DROP POLICY IF EXISTS "guru_read_mutabaah_entries"   ON public.mutabaah_entries;
DROP POLICY IF EXISTS "guru_insert_mutabaah_entries" ON public.mutabaah_entries;
DROP POLICY IF EXISTS "guru_read_tahfizh_entries"    ON public.tahfizh_entries;
DROP POLICY IF EXISTS "guru_insert_tahfizh_entries"  ON public.tahfizh_entries;
DROP POLICY IF EXISTS "guru_update_tahfizh_entries"  ON public.tahfizh_entries;

-- 2) Semua user login bisa membaca profil semua siswa dari semua lembaga.
--    Dulu dipakai untuk ranking di browser; sekarang ranking dihitung di server (weekly_top_snapshots).
DROP POLICY IF EXISTS "Siswa can view all siswa profiles for ranking" ON public.profiles;
