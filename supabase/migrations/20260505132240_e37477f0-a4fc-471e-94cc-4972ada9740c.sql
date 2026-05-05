CREATE TYPE public.jenis_ujian_enum AS ENUM ('harian', 'pekanan', 'bulanan');

ALTER TABLE public.ujian
  ADD COLUMN jenis_ujian public.jenis_ujian_enum NOT NULL DEFAULT 'bulanan',
  ADD COLUMN tanggal date,
  ADD COLUMN pekan_ke integer,
  ADD COLUMN materi_surat text,
  ADD COLUMN ayat_start integer,
  ADD COLUMN ayat_end integer,
  ADD COLUMN jumlah_ayat integer,
  ADD COLUMN juz_diuji text[],
  ADD COLUMN nilai_kelancaran integer,
  ADD COLUMN nilai_tajwid integer,
  ADD COLUMN nilai_adab integer,
  ADD COLUMN nilai_total integer,
  ADD COLUMN nilai_akhir integer,
  ADD COLUMN jenis_penilaian text[],
  ADD COLUMN status_lulus boolean,
  ADD COLUMN status_naik_juz boolean,
  ADD COLUMN peringkat integer,
  ADD COLUMN rekomendasi text;

CREATE POLICY "Guru delete ujian"
ON public.ujian
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'guru'::app_role));