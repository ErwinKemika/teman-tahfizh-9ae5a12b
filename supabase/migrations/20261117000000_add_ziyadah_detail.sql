-- Ziyadah bisa berisi lebih dari satu surat, jadi detailnya perlu teks bebas (mis. "An-Naba' 1-20, Abasa 1-10").
-- ziyadah_jumlah (angka halaman) tetap dipakai kalau yang diisi angka.
ALTER TABLE public.mutabaah_entries ADD COLUMN IF NOT EXISTS ziyadah_detail text;
NOTIFY pgrst, 'reload schema';
