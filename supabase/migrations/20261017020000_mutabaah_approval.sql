-- Mutaba'ah yang diisi siswa sendiri harus disetujui ustadzah.

ALTER TABLE public.mutabaah_entries
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE INDEX IF NOT EXISTS mutabaah_entries_pending_idx
  ON public.mutabaah_entries (date DESC)
  WHERE NOT is_approved;

-- Ditegakkan di database supaya siswa tidak bisa menyetujui entrinya sendiri lewat API:
-- - guru: apa pun yang disimpan guru dianggap sudah disetujui.
-- - siswa: entri selalu kembali "menunggu", dan status (lulus/mengulang) tidak bisa diubah siswa.
-- - tanpa user (SQL Editor, service role): dibiarkan apa adanya.
CREATE OR REPLACE FUNCTION public.enforce_mutabaah_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'guru'::app_role) THEN
    NEW.is_approved := true;
    NEW.approved_by := auth.uid();
    NEW.approved_at := now();
  ELSE
    NEW.is_approved := false;
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    IF TG_OP = 'INSERT' THEN
      NEW.status := 'mengulang';
    ELSE
      NEW.status := OLD.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_mutabaah_approval ON public.mutabaah_entries;
CREATE TRIGGER enforce_mutabaah_approval
BEFORE INSERT OR UPDATE ON public.mutabaah_entries
FOR EACH ROW EXECUTE FUNCTION public.enforce_mutabaah_approval();
