-- 1) Guru boleh menambah mutaba'ah/hafalan untuk siswa di lembaganya sendiri.
--    (Policy guru_insert_* lama sudah dihapus karena tidak membatasi lembaga.)
DROP POLICY IF EXISTS "Guru insert same-lembaga mutabaah" ON public.mutabaah_entries;
CREATE POLICY "Guru insert same-lembaga mutabaah"
ON public.mutabaah_entries FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'guru'::app_role)
  AND public.guru_shares_lembaga_with_student(student_id)
);

DROP POLICY IF EXISTS "Guru insert same-lembaga tahfizh" ON public.tahfizh_entries;
CREATE POLICY "Guru insert same-lembaga tahfizh"
ON public.tahfizh_entries FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'guru'::app_role)
  AND public.guru_shares_lembaga_with_student(student_id)
);

-- 2) User tidak boleh memindahkan dirinya ke lembaga lain lewat API
--    (policy "update own profile" mengizinkan semua kolom; trigger lama hanya menjaga role).
--    Perubahan lembaga hanya lewat SQL Editor / service role.
CREATE OR REPLACE FUNCTION public.prevent_lembaga_self_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.lembaga_id IS DISTINCT FROM OLD.lembaga_id AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Lembaga tidak bisa diubah sendiri';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_lembaga_self_change_trg ON public.profiles;
CREATE TRIGGER prevent_lembaga_self_change_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_lembaga_self_change();
