import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SurahListPage from "@/components/mushaf/SurahListPage";
import MushafPageView from "@/components/mushaf/MushafPageView";
import { toast } from "sonner";

// Juz start pages (approximate standard mapping)
const JUZ_START_PAGE: Record<number, number> = {
  1:1,2:22,3:42,4:62,5:82,6:102,7:121,8:142,9:162,10:182,
  11:201,12:222,13:242,14:262,15:282,16:302,17:322,18:342,19:362,20:382,
  21:402,22:422,23:442,24:462,25:482,26:502,27:522,28:542,29:562,30:582,
};

export default function MushafViewer() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState<number | null>(null);
  const [resumeChecked, setResumeChecked] = useState(false);

  // Fetch last read position
  const { data: readingProgress } = useQuery({
    queryKey: ["reading-progress", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reading_progress")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Auto-resume on first load
  useEffect(() => {
    if (readingProgress && !resumeChecked && currentPage === null) {
      setResumeChecked(true);
      setCurrentPage(readingProgress.last_page);
      toast(`Lanjut dari halaman ${readingProgress.last_page}`, {
        action: {
          label: "Mulai dari Awal",
          onClick: () => setCurrentPage(1),
        },
      });
    } else if (!readingProgress && !resumeChecked) {
      setResumeChecked(true);
    }
  }, [readingProgress, resumeChecked, currentPage]);

  const handleSelectSurah = async (surahNumber: number) => {
    try {
      const res = await fetch(`https://api.quran.com/api/v4/chapters/${surahNumber}?language=en`);
      const json = await res.json();
      const firstPage = json.chapter?.pages?.[0] || 1;
      setCurrentPage(firstPage);
    } catch {
      setCurrentPage(1);
    }
  };

  const handleSelectJuz = (juz: number) => {
    setCurrentPage(JUZ_START_PAGE[juz] || 1);
  };

  const handleSelectPage = (page: number) => {
    setCurrentPage(page);
  };

  if (currentPage) {
    return (
      <MushafPageView
        initialPage={currentPage}
        onBack={() => setCurrentPage(null)}
      />
    );
  }

  return (
    <SurahListPage
      onSelectSurah={handleSelectSurah}
      onSelectJuz={handleSelectJuz}
      onSelectPage={handleSelectPage}
      lastReadPage={readingProgress?.last_page}
    />
  );
}
