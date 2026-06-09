
-- 1) Restrict profiles SELECT: guru can only see profiles within same lembaga
DROP POLICY IF EXISTS "Profiles viewable by self or guru" ON public.profiles;
CREATE POLICY "Profiles viewable by self or same-lembaga guru"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    has_role(auth.uid(), 'guru'::app_role)
    AND public.guru_shares_lembaga_with_student(user_id)
  )
);

-- 2) Lock down user_roles writes — only service_role may write
CREATE POLICY "No client inserts on user_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No client updates on user_roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No client deletes on user_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (false);
