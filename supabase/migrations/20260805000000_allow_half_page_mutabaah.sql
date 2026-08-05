-- Allow decimal page values (e.g. 0.5 for half a page) in mutabaah_entries.
-- Changing from INTEGER to NUMERIC preserves all existing whole-number data.

ALTER TABLE public.mutabaah_entries
  ALTER COLUMN ziyadah_jumlah            TYPE NUMERIC USING ziyadah_jumlah::NUMERIC,
  ALTER COLUMN murojaah_hifdzul_jadid_dari   TYPE NUMERIC USING murojaah_hifdzul_jadid_dari::NUMERIC,
  ALTER COLUMN murojaah_hifdzul_jadid_hingga TYPE NUMERIC USING murojaah_hifdzul_jadid_hingga::NUMERIC;
