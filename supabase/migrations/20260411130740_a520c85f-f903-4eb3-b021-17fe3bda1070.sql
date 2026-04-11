
-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('guru', 'siswa');

-- Create user_roles table (per security guidelines)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  role app_role NOT NULL DEFAULT 'siswa',
  class TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Surat reference table
CREATE TABLE public.surat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER NOT NULL UNIQUE,
  name_arabic TEXT NOT NULL,
  name_latin TEXT NOT NULL,
  juz INTEGER NOT NULL,
  total_ayat INTEGER NOT NULL
);
ALTER TABLE public.surat ENABLE ROW LEVEL SECURITY;

-- Halaman Quran reference table
CREATE TABLE public.halaman_quran (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_number INTEGER NOT NULL UNIQUE,
  juz_number INTEGER NOT NULL,
  surat_id UUID REFERENCES public.surat(id),
  ayat_start INTEGER,
  ayat_end INTEGER
);
ALTER TABLE public.halaman_quran ENABLE ROW LEVEL SECURITY;

-- Tahfizh status enum
CREATE TYPE public.tahfizh_status AS ENUM ('belum_dihafalkan', 'murajaah', 'tasmi_done', 'mutqin');

-- Tahfizh entries
CREATE TABLE public.tahfizh_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  halaman_id UUID REFERENCES public.halaman_quran(id),
  page_number INTEGER NOT NULL,
  kuantitas_murojaah INTEGER NOT NULL DEFAULT 0,
  kualitas_hafalan INTEGER NOT NULL DEFAULT 0 CHECK (kualitas_hafalan >= 0 AND kualitas_hafalan <= 100),
  tanggal_hafalan DATE,
  catatan TEXT,
  is_mutqin BOOLEAN NOT NULL DEFAULT false,
  status tahfizh_status NOT NULL DEFAULT 'belum_dihafalkan',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tahfizh_entries ENABLE ROW LEVEL SECURITY;

-- Mutabaah status enum
CREATE TYPE public.mutabaah_status AS ENUM ('lulus', 'mengulang', 'libur', 'sakit');

-- Mutabaah entries
CREATE TABLE public.mutabaah_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  murojaah_hifdzul_jadid_dari INTEGER,
  murojaah_hifdzul_jadid_hingga INTEGER,
  murojaah_tsnai TEXT,
  murojaah_hifdzul_qodim TEXT,
  ziyadah_surat TEXT,
  ziyadah_ayat_start INTEGER,
  ziyadah_ayat_end INTEGER,
  ziyadah_jumlah INTEGER,
  status mutabaah_status NOT NULL DEFAULT 'lulus',
  keterangan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mutabaah_entries ENABLE ROW LEVEL SECURITY;

-- Ujian table
CREATE TABLE public.ujian (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bulan INTEGER NOT NULL CHECK (bulan >= 1 AND bulan <= 12),
  tahun INTEGER NOT NULL,
  juz_tested TEXT NOT NULL,
  nilai INTEGER NOT NULL DEFAULT 0 CHECK (nilai >= 0 AND nilai <= 100),
  catatan_guru TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ujian ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- user_roles: users can read their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- profiles: all authenticated can view, own user can update
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- surat & halaman: readable by all authenticated
CREATE POLICY "Surat readable by authenticated" ON public.surat
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Halaman readable by authenticated" ON public.halaman_quran
  FOR SELECT TO authenticated USING (true);

-- tahfizh_entries
CREATE POLICY "Students view own tahfizh" ON public.tahfizh_entries
  FOR SELECT TO authenticated USING (
    auth.uid() = student_id OR public.has_role(auth.uid(), 'guru')
  );
CREATE POLICY "Students insert own tahfizh" ON public.tahfizh_entries
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = student_id OR public.has_role(auth.uid(), 'guru')
  );
CREATE POLICY "Students update own tahfizh" ON public.tahfizh_entries
  FOR UPDATE TO authenticated USING (
    auth.uid() = student_id OR public.has_role(auth.uid(), 'guru')
  );

-- mutabaah_entries
CREATE POLICY "Students view own mutabaah" ON public.mutabaah_entries
  FOR SELECT TO authenticated USING (
    auth.uid() = student_id OR public.has_role(auth.uid(), 'guru')
  );
CREATE POLICY "Students insert own mutabaah" ON public.mutabaah_entries
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = student_id OR public.has_role(auth.uid(), 'guru')
  );
CREATE POLICY "Students update own mutabaah" ON public.mutabaah_entries
  FOR UPDATE TO authenticated USING (
    auth.uid() = student_id OR public.has_role(auth.uid(), 'guru')
  );

-- ujian
CREATE POLICY "View ujian" ON public.ujian
  FOR SELECT TO authenticated USING (
    auth.uid() = student_id OR public.has_role(auth.uid(), 'guru')
  );
CREATE POLICY "Guru insert ujian" ON public.ujian
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'guru')
  );
CREATE POLICY "Guru update ujian" ON public.ujian
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'guru')
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tahfizh_updated_at
  BEFORE UPDATE ON public.tahfizh_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'siswa')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'siswa')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
