-- Histori Top 10 pekanan: disimpan permanen tiap Sabtu 12:00 WIB.

CREATE TABLE IF NOT EXISTS public.weekly_top_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lembaga_id    uuid NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
  week_start    date NOT NULL,
  student_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name  text NOT NULL,
  peringkat     integer NOT NULL CHECK (peringkat BETWEEN 1 AND 10),
  skor_akhir    integer NOT NULL,
  skor_ujian    integer NOT NULL,
  skor_hafalan  integer NOT NULL,
  skor_murojaah integer NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lembaga_id, week_start, student_id),
  UNIQUE (lembaga_id, week_start, peringkat)
);

CREATE INDEX IF NOT EXISTS weekly_top_snapshots_lembaga_week_idx
  ON public.weekly_top_snapshots (lembaga_id, week_start DESC);

ALTER TABLE public.weekly_top_snapshots ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.weekly_top_snapshots TO authenticated;

-- Guru & siswa hanya bisa BACA data lembaganya sendiri. Tidak ada policy tulis:
-- hanya fungsi di bawah (SECURITY DEFINER) yang bisa mengisi tabel ini.
DROP POLICY IF EXISTS "Read own lembaga weekly top" ON public.weekly_top_snapshots;
CREATE POLICY "Read own lembaga weekly top"
ON public.weekly_top_snapshots FOR SELECT TO authenticated
USING (lembaga_id = public.get_my_lembaga_id());

-- Menghitung & menyimpan Top 10 untuk semua lembaga.
-- p_week_start = tanggal Senin pekan yang dihitung (default: pekan berjalan, zona Asia/Jakarta).
-- Rumus sama dengan useWeeklyRanking: ujian 40% + hafalan 35% + murojaah 25%.
-- Aman dijalankan ulang: baris pekan itu ditimpa.
CREATE OR REPLACE FUNCTION public.snapshot_weekly_top(p_week_start date DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start date := COALESCE(
    p_week_start,
    date_trunc('week', now() AT TIME ZONE 'Asia/Jakarta')::date
  );
  v_from_ts timestamptz := v_week_start::timestamp AT TIME ZONE 'Asia/Jakarta';
  v_to_ts   timestamptz := LEAST(
    now(),
    ((v_week_start + 6)::timestamp) AT TIME ZONE 'Asia/Jakarta'
  );
  v_count integer;
BEGIN
  DELETE FROM public.weekly_top_snapshots WHERE week_start = v_week_start;

  INSERT INTO public.weekly_top_snapshots
    (lembaga_id, week_start, student_id, student_name, peringkat,
     skor_akhir, skor_ujian, skor_hafalan, skor_murojaah)
  WITH students AS (
    SELECT user_id, full_name, lembaga_id
    FROM public.profiles
    WHERE role = 'siswa' AND lembaga_id IS NOT NULL
  ),
  uj AS (
    SELECT student_id, round(avg(nilai_total)) AS skor
    FROM public.ujian
    WHERE tanggal BETWEEN v_week_start AND v_week_start + 5
      AND nilai_total IS NOT NULL
    GROUP BY student_id
  ),
  hf AS (
    SELECT student_id,
           round(avg(kualitas_hafalan) FILTER (WHERE kualitas_hafalan > 0)) AS skor_h,
           COALESCE(sum(kuantitas_murojaah), 0) AS muro
    FROM public.tahfizh_entries
    WHERE updated_at >= v_from_ts AND updated_at <= v_to_ts
    GROUP BY student_id
  ),
  base AS (
    SELECT s.user_id, s.full_name, s.lembaga_id,
           COALESCE(uj.skor, 0)   AS skor_ujian,
           COALESCE(hf.skor_h, 0) AS skor_hafalan,
           COALESCE(hf.muro, 0)   AS muro
    FROM students s
    LEFT JOIN uj ON uj.student_id = s.user_id
    LEFT JOIN hf ON hf.student_id = s.user_id
  ),
  scored AS (
    SELECT b.*,
           round(b.muro::numeric / GREATEST(max(b.muro) OVER (PARTITION BY b.lembaga_id), 1) * 100) AS skor_murojaah
    FROM base b
  ),
  fin AS (
    SELECT sc.*,
           round(sc.skor_ujian * 0.4 + sc.skor_hafalan * 0.35 + sc.skor_murojaah * 0.25) AS skor_akhir
    FROM scored sc
  ),
  ranked AS (
    SELECT f.*,
           row_number() OVER (PARTITION BY f.lembaga_id ORDER BY f.skor_akhir DESC, f.full_name ASC) AS rk
    FROM fin f
  )
  SELECT lembaga_id, v_week_start, user_id, full_name, rk::int,
         skor_akhir::int, skor_ujian::int, skor_hafalan::int, skor_murojaah::int
  FROM ranked
  WHERE rk <= 10 AND skor_akhir > 0;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.snapshot_weekly_top(date) FROM PUBLIC, anon, authenticated;

-- Jadwal: Sabtu 12:00 WIB = Sabtu 05:00 UTC. Butuh ekstensi pg_cron
-- (kalau error, aktifkan dulu di Dashboard > Database > Extensions > pg_cron).
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('snapshot-weekly-top')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'snapshot-weekly-top');

SELECT cron.schedule(
  'snapshot-weekly-top',
  '0 5 * * 6',
  $$SELECT public.snapshot_weekly_top()$$
);
