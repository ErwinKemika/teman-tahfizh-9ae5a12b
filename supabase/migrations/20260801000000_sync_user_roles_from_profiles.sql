
-- Fix: sync user_roles for gurus whose entries are missing.
-- The newer handle_new_user trigger no longer inserts into user_roles,
-- so gurus promoted via profiles.role update may lack user_roles entries,
-- causing has_role() to return false and blocking ujian INSERT via RLS.

INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'guru'::public.app_role
FROM public.profiles
WHERE role = 'guru'
ON CONFLICT (user_id, role) DO NOTHING;

-- Also patch handle_new_user to keep user_roles in sync for new users
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

  -- Always insert siswa role into user_roles so has_role() works consistently
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'siswa'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END;
$function$;
