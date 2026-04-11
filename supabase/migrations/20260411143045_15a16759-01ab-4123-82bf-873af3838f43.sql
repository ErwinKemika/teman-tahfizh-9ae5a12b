
-- Create bookmarks table
CREATE TABLE public.bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  surah_number INTEGER NOT NULL,
  ayat_number INTEGER NOT NULL,
  page_number INTEGER,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmarks"
ON public.bookmarks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookmarks"
ON public.bookmarks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
ON public.bookmarks FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create tafsir-audio storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('tafsir-audio', 'tafsir-audio', true);

CREATE POLICY "Public read tafsir audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'tafsir-audio');

CREATE POLICY "Guru can upload tafsir audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tafsir-audio' AND public.has_role(auth.uid(), 'guru'));
