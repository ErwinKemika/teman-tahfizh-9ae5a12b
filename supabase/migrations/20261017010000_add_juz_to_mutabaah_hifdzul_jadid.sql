-- Juz untuk Muroja'ah Hifdzul Jadid (opsional, boleh lebih dari satu juz).
ALTER TABLE public.mutabaah_entries
  ADD COLUMN IF NOT EXISTS murojaah_hifdzul_jadid_juz integer[];
