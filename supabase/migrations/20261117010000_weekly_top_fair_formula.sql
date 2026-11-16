-- Rumus Top 10 pekanan yang adil: berdasarkan yang dikerjakan santri pada pekan itu,
-- bukan angka kumulatif Tracker (yang menguntungkan santri lama dan terdongkrak tombol massal).
--   Ujian     60% : rata-rata nilai semua ujian (harian/pekanan/bulanan) pekan itu
--   Mutaba'ah 40% : hari mutaba'ah Lulus & disetujui pada pekan itu, 5 hari = 100
-- Kolom skor_hafalan menyimpan skor mutaba'ah; skor_murojaah tidak dipakai lagi (0).
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
    SELECT u.student_id, round(avg(u.nilai_total)) AS skor
    FROM public.ujian u
    WHERE u.nilai_total IS NOT NULL
      AND COALESCE(u.tanggal, (u.created_at AT TIME ZONE 'Asia/Jakarta')::date)
          BETWEEN v_week_start AND v_week_start + 6
    GROUP BY u.student_id
  ),
  mt AS (
    SELECT m.student_id,
           LEAST(100, round(100.0 * count(DISTINCT m.date) FILTER (WHERE m.status = 'lulus') / 5)) AS skor
    FROM public.mutabaah_entries m
    WHERE m.is_approved IS DISTINCT FROM false
      AND m.date BETWEEN v_week_start AND v_week_start + 6
    GROUP BY m.student_id
  ),
  fin AS (
    SELECT s.user_id, s.full_name, s.lembaga_id,
           COALESCE(uj.skor, 0) AS skor_ujian,
           COALESCE(mt.skor, 0) AS skor_mutabaah,
           round(COALESCE(uj.skor, 0) * 0.6 + COALESCE(mt.skor, 0) * 0.4) AS skor_akhir
    FROM students s
    LEFT JOIN uj ON uj.student_id = s.user_id
    LEFT JOIN mt ON mt.student_id = s.user_id
  ),
  ranked AS (
    SELECT f.*,
           row_number() OVER (PARTITION BY f.lembaga_id
                              ORDER BY f.skor_akhir DESC, f.skor_ujian DESC, f.full_name ASC) AS rk
    FROM fin f
  )
  SELECT lembaga_id, v_week_start, user_id, full_name, rk::int,
         skor_akhir::int, skor_ujian::int, skor_mutabaah::int, 0
  FROM ranked
  WHERE rk <= 10 AND skor_akhir > 0;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.snapshot_weekly_top(date) FROM PUBLIC, anon, authenticated;

-- Hitung ulang pekan-pekan yang sudah lewat dengan rumus baru (Senin 12 Okt s.d. 9 Nov 2026).
SELECT public.snapshot_weekly_top(d::date)
FROM generate_series('2026-10-12'::date, '2026-11-09'::date, interval '7 days') AS d;
