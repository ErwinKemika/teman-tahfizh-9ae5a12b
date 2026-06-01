
-- 1. Fix profiles SELECT: students see own only, guru sees all
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "Profiles viewable by self or guru"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'guru'::app_role));

-- 2. Prevent role escalation via trigger
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.has_role(auth.uid(), 'guru'::app_role) THEN
      RAISE EXCEPTION 'Only guru can change roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_self_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_role_self_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- 3. Add UPDATE/DELETE storage policies for tafsir-audio (guru only)
CREATE POLICY "Guru can update tafsir audio"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'tafsir-audio' AND public.has_role(auth.uid(), 'guru'::app_role));

CREATE POLICY "Guru can delete tafsir audio"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'tafsir-audio' AND public.has_role(auth.uid(), 'guru'::app_role));
