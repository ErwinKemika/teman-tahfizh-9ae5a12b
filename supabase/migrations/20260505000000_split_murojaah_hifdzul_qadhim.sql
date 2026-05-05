-- Split murojaah_hifdzul_qodim into two separate evaluation columns
ALTER TABLE public.mutabaah_entries
  ADD COLUMN IF NOT EXISTS murojaah_hifdzul_qadhim_tsnai TEXT,
  ADD COLUMN IF NOT EXISTS murojaah_hifdzul_qadhim_fardhi TEXT;

-- Existing rows automatically receive NULL in both new columns
ALTER TABLE public.mutabaah_entries
  DROP COLUMN IF EXISTS murojaah_hifdzul_qodim;
