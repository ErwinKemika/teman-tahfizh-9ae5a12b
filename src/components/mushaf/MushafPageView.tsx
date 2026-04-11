import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bookmark, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import AyatDetailSheet from "./AyatDetailSheet";
import ReadingSettings from "./ReadingSettings";
import TrackerBadge from "./TrackerBadge";

interface AyahData {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  hizbQuarter: number;
  page: number;
  surah: { number: number; name: string; englishName: string };
}

interface PageData {
  ayahs: AyahData[];
}

const TOTAL_PAGES = 604;

function usePageData(pageNumber: number) {
  return useQuery<PageData>({
    queryKey: ["mushaf-page", pageNumber],
    queryFn: async () => {
      const res = await fetch(`https://api.alquran.cloud/v1/page/${pageNumber}/quran-uthmani`);
      const json = await res.json();
      return { ayahs: json.data?.ayahs || [] };
    },
    staleTime: 1000 * 60 * 60,
    enabled: pageNumber >= 1 && pageNumber <= TOTAL_PAGES,
  });
}

export default function MushafPageView({
  initialPage,
  onBack,
}: {
  initialPage: number;
  onBack: () => void;
}) {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(initialPage);
  const [selectedAyat, setSelectedAyat] = useState<AyahData | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showTopBar, setShowTopBar] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [fontSize, setFontSize] = useState(() => {
    const s = localStorage.getItem("mushaf-font-size");
    return s ? parseInt(s) : 22;
  });

  // Current page data
  const { data: pageData, isLoading } = usePageData(page);

  // Pre-fetch adjacent pages
  usePageData(page + 1);
  usePageData(page - 1);

  // Save reading progress
  const saveProgress = useMutation({
    mutationFn: async (pg: number) => {
      if (!user) return;
      const ayahs = queryClient.getQueryData<PageData>(["mushaf-page", pg])?.ayahs;
      const firstAyah = ayahs?.[0];
      const payload = {
        user_id: user.id,
        last_page: pg,
        last_surah: firstAyah?.surah?.number || 1,
        last_ayat: firstAyah?.numberInSurah || 1,
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase
        .from("reading_progress")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        await supabase.from("reading_progress").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("reading_progress").insert(payload);
      }
    },
  });

  // Auto-hide top bar
  const resetHideTimer = useCallback(() => {
    setShowTopBar(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowTopBar(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [resetHideTimer]);

  // Save progress on page change
  useEffect(() => {
    saveProgress.mutate(page);
    queryClient.invalidateQueries({ queryKey: ["reading-progress"] });
  }, [page]);

  // Navigate
  const goNext = useCallback(() => {
    if (page < TOTAL_PAGES) setPage((p) => p + 1);
  }, [page]);

  const goPrev = useCallback(() => {
    if (page > 1) setPage((p) => p - 1);
  }, [page]);

  // Touch handling for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) {
      // RTL: swipe left = next page (in Quran: higher page number)
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goNext();
      if (e.key === "ArrowRight") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  // Tap to toggle top bar
  const handlePageTap = (e: React.MouseEvent) => {
    // Don't toggle if tapping an ayat
    if ((e.target as HTMLElement).closest("[data-ayat]")) return;
    resetHideTimer();
  };

  const ayahs = pageData?.ayahs || [];
  const firstAyah = ayahs[0];
  const juz = firstAyah?.juz || 1;
  const hizb = firstAyah?.hizbQuarter ? Math.ceil(firstAyah.hizbQuarter / 4) : 1;

  // Group ayahs by surah for surah headers
  const surahGroups = useMemo(() => {
    const groups: { surah: AyahData["surah"]; ayahs: AyahData[]; isStart: boolean }[] = [];
    let lastSurah = -1;
    for (const a of ayahs) {
      if (a.surah.number !== lastSurah) {
        groups.push({
          surah: a.surah,
          ayahs: [a],
          isStart: a.numberInSurah === 1,
        });
        lastSurah = a.surah.number;
      } else {
        groups[groups.length - 1].ayahs.push(a);
      }
    }
    return groups;
  }, [ayahs]);

  // Page info string
  const surahNames = [...new Set(ayahs.map((a) => a.surah.englishName))].join(" - ");

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-card flex flex-col select-none"
      onClick={handlePageTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar - auto-hide */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 bg-card/90 backdrop-blur-sm border-b border-border px-3 py-2 flex items-center gap-2 transition-all duration-300 ${
          showTopBar ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        }`}
      >
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onBack(); }}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 text-center min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{surahNames}</p>
          <p className="text-[10px] text-muted-foreground">Juz {juz} · Hizb {hizb}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSettingsOpen(true); }}>
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Main page content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-4 py-14">
        {isLoading ? (
          <div className="w-full max-w-2xl mx-auto space-y-3 px-2">
            {Array.from({ length: 15 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full rounded" />
            ))}
          </div>
        ) : (
          <div
            className="w-full max-w-2xl mx-auto h-full flex flex-col justify-between"
            dir="rtl"
          >
            <div className="flex-1 flex flex-col justify-center">
              {surahGroups.map((group, gi) => (
                <div key={gi}>
                  {/* Surah header banner */}
                  {group.isStart && (
                    <div className="my-3 py-2 px-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
                      <p className="font-mushaf text-lg text-primary leading-relaxed">
                        {group.surah.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-sans" dir="ltr">
                        {group.surah.englishName}
                      </p>
                      {/* Basmallah */}
                      {group.surah.number !== 1 && group.surah.number !== 9 && (
                        <p className="font-mushaf text-base text-foreground mt-1 leading-relaxed">
                          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                        </p>
                      )}
                    </div>
                  )}

                  {/* Ayahs - flowing text */}
                  <p
                    className="font-mushaf text-foreground leading-[2.4] text-justify"
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    {group.ayahs.map((ayah) => (
                      <span
                        key={ayah.number}
                        data-ayat
                        className="cursor-pointer hover:bg-primary/5 rounded-sm transition-colors relative inline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAyat(ayah);
                        }}
                      >
                        {/* Remove basmallah from first ayat if surah start (it's shown separately) */}
                        {group.isStart && ayah.numberInSurah === 1 && group.surah.number !== 1 && group.surah.number !== 9
                          ? ayah.text.replace(/بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ\s*/, "")
                          : ayah.text}
                        {" "}
                        <span className="text-primary/70 inline-block" style={{ fontSize: `${Math.max(14, fontSize - 4)}px` }}>
                          ۝{toArabicNum(ayah.numberInSurah)}
                        </span>
                        {" "}
                      </span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Page number */}
      <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
        <span className="text-xs text-muted-foreground font-sans bg-card/80 px-3 py-1 rounded-full">
          {page}
        </span>
      </div>

      {/* Desktop navigation arrows */}
      <div className="hidden lg:flex absolute inset-y-0 left-2 items-center">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-card/60 hover:bg-card shadow"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          disabled={page >= TOTAL_PAGES}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>
      <div className="hidden lg:flex absolute inset-y-0 right-2 items-center">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-card/60 hover:bg-card shadow"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          disabled={page <= 1}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Ayat Detail Sheet */}
      {selectedAyat && (
        <AyatDetailSheet
          ayah={selectedAyat}
          surahNumber={selectedAyat.surah.number}
          surahName={selectedAyat.surah.englishName}
          open={!!selectedAyat}
          onClose={() => setSelectedAyat(null)}
        />
      )}

      {/* Settings */}
      <ReadingSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fontSize={fontSize}
        onFontSizeChange={(s) => {
          setFontSize(s);
          localStorage.setItem("mushaf-font-size", s.toString());
        }}
        showTranslation={false}
        onShowTranslationChange={() => {}}
      />
    </div>
  );
}

function toArabicNum(n: number): string {
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return n.toString().split("").map((d) => arabicDigits[parseInt(d)]).join("");
}
