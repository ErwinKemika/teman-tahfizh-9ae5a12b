
-- 1) Hardcode role to 'siswa' on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lembaga_id UUID := NULL;
BEGIN
  BEGIN
    IF new.raw_user_meta_data->>'lembaga_id' IS NOT NULL
       AND new.raw_user_meta_data->>'lembaga_id' != '' THEN
      v_lembaga_id := (new.raw_user_meta_data->>'lembaga_id')::UUID;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_lembaga_id := NULL;
  END;

  INSERT INTO public.profiles (user_id, full_name, role, lembaga_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'siswa'::public.app_role,
    v_lembaga_id
  );
  RETURN new;
END;
$function$;

-- 2) Helper: does a guru share the same lembaga as a given student?
CREATE OR REPLACE FUNCTION public.guru_shares_lembaga_with_student(_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles guru
    JOIN public.profiles stud ON stud.user_id = _student_id
    WHERE guru.user_id = auth.uid()
      AND guru.lembaga_id IS NOT NULL
      AND guru.lembaga_id = stud.lembaga_id
  );
$$;

-- 3) Tighten RLS on mutabaah_entries
DROP POLICY IF EXISTS "Students view own mutabaah" ON public.mutabaah_entries;
DROP POLICY IF EXISTS "Students insert own mutabaah" ON public.mutabaah_entries;
DROP POLICY IF EXISTS "Students update own mutabaah" ON public.mutabaah_entries;

CREATE POLICY "View own or same-lembaga mutabaah"
ON public.mutabaah_entries FOR SELECT
USING (
  auth.uid() = student_id
  OR (public.has_role(auth.uid(), 'guru'::app_role) AND public.guru_shares_lembaga_with_student(student_id))
);

CREATE POLICY "Insert own or same-lembaga mutabaah"
ON public.mutabaah_entries FOR INSERT
WITH CHECK (
  auth.uid() = student_id
  OR (public.has_role(auth.uid(), 'guru'::app_role) AND public.guru_shares_lembaga_with_student(student_id))
);

CREATE POLICY "Update own or same-lembaga mutabaah"
ON public.mutabaah_entries FOR UPDATE
USING (
  auth.uid() = student_id
  OR (public.has_role(auth.uid(), 'guru'::app_role) AND public.guru_shares_lembaga_with_student(student_id))
);

-- 4) Tighten RLS on tahfizh_entries
DROP POLICY IF EXISTS "Students view own tahfizh" ON public.tahfizh_entries;
DROP POLICY IF EXISTS "Students insert own tahfizh" ON public.tahfizh_entries;
DROP POLICY IF EXISTS "Students update own tahfizh" ON public.tahfizh_entries;

CREATE POLICY "View own or same-lembaga tahfizh"
ON public.tahfizh_entries FOR SELECT
USING (
  auth.uid() = student_id
  OR (public.has_role(auth.uid(), 'guru'::app_role) AND public.guru_shares_lembaga_with_student(student_id))
);

CREATE POLICY "Insert own or same-lembaga tahfizh"
ON public.tahfizh_entries FOR INSERT
WITH CHECK (
  auth.uid() = student_id
  OR (public.has_role(auth.uid(), 'guru'::app_role) AND public.guru_shares_lembaga_with_student(student_id))
);

CREATE POLICY "Update own or same-lembaga tahfizh"
ON public.tahfizh_entries FOR UPDATE
USING (
  auth.uid() = student_id
  OR (public.has_role(auth.uid(), 'guru'::app_role) AND public.guru_shares_lembaga_with_student(student_id))
);

-- 5) Tighten RLS on ujian
DROP POLICY IF EXISTS "View ujian" ON public.ujian;
DROP POLICY IF EXISTS "Guru insert ujian" ON public.ujian;
DROP POLICY IF EXISTS "Guru update ujian" ON public.ujian;
DROP POLICY IF EXISTS "Guru delete ujian" ON public.ujian;

CREATE POLICY "View own or same-lembaga ujian"
ON public.ujian FOR SELECT
USING (
  auth.uid() = student_id
  OR (public.has_role(auth.uid(), 'guru'::app_role) AND public.guru_shares_lembaga_with_student(student_id))
);

CREATE POLICY "Guru insert same-lembaga ujian"
ON public.ujian FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'guru'::app_role)
  AND public.guru_shares_lembaga_with_student(student_id)
);

CREATE POLICY "Guru update same-lembaga ujian"
ON public.ujian FOR UPDATE
USING (
  public.has_role(auth.uid(), 'guru'::app_role)
  AND public.guru_shares_lembaga_with_student(student_id)
);

CREATE POLICY "Guru delete same-lembaga ujian"
ON public.ujian FOR DELETE
USING (
  public.has_role(auth.uid(), 'guru'::app_role)
  AND public.guru_shares_lembaga_with_student(student_id)
);
