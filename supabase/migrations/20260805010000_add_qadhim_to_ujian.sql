-- Move Muraja'ah Hifdzul Qadhim fields from mutabaah to ujian (harian & pekanan).
ALTER TABLE public.ujian
  ADD COLUMN IF NOT EXISTS murojaah_qadhim_tsnai  TEXT,
  ADD COLUMN IF NOT EXISTS murojaah_qadhim_fardhi TEXT;
