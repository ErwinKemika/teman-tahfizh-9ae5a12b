
-- 1. Remove overly-permissive profile visibility
DROP POLICY IF EXISTS "same lembaga can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "users can read own profile" ON public.profiles;

-- 2. Lock search_path on get_my_lembaga_id
ALTER FUNCTION public.get_my_lembaga_id() SET search_path = public;

-- 3. Avatars bucket RLS (files named like "<uid>.<ext>")
DROP POLICY IF EXISTS "Avatars: users read own" ON storage.objects;
DROP POLICY IF EXISTS "Avatars: users insert own" ON storage.objects;
DROP POLICY IF EXISTS "Avatars: users update own" ON storage.objects;
DROP POLICY IF EXISTS "Avatars: users delete own" ON storage.objects;

CREATE POLICY "Avatars: users read own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND split_part(name, '.', 1) = auth.uid()::text);

CREATE POLICY "Avatars: users insert own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND split_part(name, '.', 1) = auth.uid()::text);

CREATE POLICY "Avatars: users update own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND split_part(name, '.', 1) = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND split_part(name, '.', 1) = auth.uid()::text);

CREATE POLICY "Avatars: users delete own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND split_part(name, '.', 1) = auth.uid()::text);
