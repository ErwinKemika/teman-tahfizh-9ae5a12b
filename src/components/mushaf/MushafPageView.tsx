import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import AyatDetailSheet from "./AyatDetailSheet";

const QURAN_API = "https://api.quran.com/api/v4";
const TOTAL_PAGES = 604;
const PAGE_IMG = (p: number) => `https://cdn.myquran.com/img/page/${p}.png`;

interface AyahData {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  hizbQuarter: number;
  page: number;
  surah: { number: number; name: string; englishName: string };
}

interface QuranComVerse {
  id: number;
  verse_number: number;
  verse_key: string;
  juz_number: number;
  hizb_number: number;
  page_number: number;
  text_uthmani: string;
}

function usePageData(pageNumber: number) {
  return useQuery<QuranComVerse[]>({
    queryKey: ["mushaf-page", pageNumber],
    queryFn: async () => {
      const res = await fetch(
        `${QURAN_API}/verses/by_page/${pageNumber}?words=false&fields=text_uthmani&per_page=50`
      );
      const json = await res.json();
      return json.verses || [];
    },
    retry: 2,
    retryDelay: 800,
    staleTime: 1000 * 60 * 60,
    enabled: pageNumber >= 1 && pageNumber <= TOTAL_PAGES,
  });
}

function useSurahNames() {
  return useQuery<Record<number, { name: string; englishName: string }>>({
    queryKey: ["surat-names"],
    queryFn: async () => {
      const res = await fetch(`${QURAN_API}/chapters?language=en`);
      const json = await res.json();
      const map: Record<number, { name: string; englishName: string }> = {};
      (json.chapters || []).forEach(
        (ch: { id: number; name_arabic: string; name_simple: string }) => {
          map[ch.id] = { name: ch.name_arabic, englishName: ch.name_simple };
        }
      );
      return map;
    },
    staleTime: Infinity,
    retry: 2,
  });
}

// ── Single page panel — image from CDN ───────────────────────────────────────

function PagePanel({ page, onTap }: { page: number; onTap: () => void }) {
  return (
    <div
      className="h-full w-full flex items-center justify-center"
      style={{ backgroundColor: "#f8f4eb" }}
      onClick={onTap}
    >
      <img
        src={PAGE_IMG(page)}
        alt={`Halaman ${page}`}
        className="h-full w-auto max-w-full select-none"
        draggable={false}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MushafPageView({
  initialPage,
  onBack,
}: {
  initialPage: number;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(initialPage);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showTopBar, setShowTopBar] = useState(true);
  const [showVerseList, setShowVerseList] = useState(false);
  const [verseListPage, setVerseListPage] = useState(page);
  const [selectedAyat, setSelectedAyat] = useState<AyahData | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isSwipingH = useRef(false);

  const spreadLeft = page % 2 === 1 ? page : page - 1;
  const spreadRight = spreadLeft + 1;

  // Orientation detection
  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape) and (min-width: 768px)");
    setIsLandscape(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Fetch verse data (used only for verse list sheet)
  const { data: pageVerses } = usePageData(page);
  const { data: leftVerses } = usePageData(spreadLeft);
  const { data: rightVerses } = usePageData(Math.min(spreadRight, TOTAL_PAGES));
  const { data: surahNamesMap = {} } = useSurahNames();

  // Preload adjacent page images
  useEffect(() => {
    const preload = (p: number) => {
      if (p >= 1 && p <= TOTAL_PAGES) {
        const img = new Image();
        img.src = PAGE_IMG(p);
      }
    };
    preload(page + 2);
    preload(page - 2);
  }, [page]);

  // Save reading progress
  const saveProgress = useMutation({
    mutationFn: async (pg: number) => {
      if (!user) return;
      const cached = queryClient.getQueryData<QuranComVerse[]>(["mushaf-page", pg]);
      const first = cached?.[0];
      const surahNum = first ? parseInt(first.verse_key.split(":")[0]) : 1;
      const payload = {
        user_id: user.id,
        last_page: pg,
        last_surah: surahNum,
        last_ayat: first?.verse_number || 1,
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

  useEffect(() => {
    saveProgress.mutate(page);
    queryClient.invalidateQueries({ queryKey: ["reading-progress"] });
  }, [page]);

  // Auto-hide top bar
  const resetHideTimer = useCallback(() => {
    setShowTopBar(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowTopBar(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [resetHideTimer]);

  // Navigation
  const goNext = useCallback(() => {
    if (isLandscape) {
      if (spreadRight < TOTAL_PAGES) setPage(spreadRight + 1);
    } else {
      if (page < TOTAL_PAGES) setPage((p) => p + 1);
    }
  }, [page, isLandscape, spreadRight]);

  const goPrev = useCallback(() => {
    if (isLandscape) {
      if (spreadLeft > 1) setPage(spreadLeft - 1);
    } else {
      if (page > 1) setPage((p) => p - 1);
    }
  }, [page, isLandscape, spreadLeft]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    isSwipingH.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isLandscape) return;
      const dx = e.touches[0].clientX - touchStart.current.x;
      const dy = e.touches[0].clientY - touchStart.current.y;
      if (!isSwipingH.current) {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
          isSwipingH.current = true;
        } else {
          return;
        }
      }
      setSwipeOffset(dx);
    },
    [isLandscape]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (isLandscape) {
        const diffX = touchStart.current.x - e.changedTouches[0].clientX;
        const diffY = touchStart.current.y - e.changedTouches[0].clientY;
        if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
          if (diffX > 0) goNext();
          else goPrev();
        }
        return;
      }

      const diffX = touchStart.current.x - e.changedTouches[0].clientX;
      const diffY = touchStart.current.y - e.changedTouches[0].clientY;
      isSwipingH.current = false;

      if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
        const w = window.innerWidth;
        setIsTransitioning(true);
        if (diffX > 0 && page < TOTAL_PAGES) {
          setSwipeOffset(-w);
          setTimeout(() => {
            goNext();
            setSwipeOffset(0);
            setIsTransitioning(false);
          }, 280);
        } else if (diffX < 0 && page > 1) {
          setSwipeOffset(w);
          setTimeout(() => {
            goPrev();
            setSwipeOffset(0);
            setIsTransitioning(false);
          }, 280);
        } else {
          setSwipeOffset(0);
          setTimeout(() => setIsTransitioning(false), 280);
        }
      } else {
        setIsTransitioning(true);
        setSwipeOffset(0);
        setTimeout(() => setIsTransitioning(false), 280);
      }
    },
    [isLandscape, page, goNext, goPrev]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goNext();
      if (e.key === "ArrowRight") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  const handlePageTap = (targetPage: number) => {
    setVerseListPage(targetPage);
    setShowVerseList(true);
    resetHideTimer();
  };

  const verseListData = useMemo<AyahData[]>(() => {
    const target = isLandscape
      ? verseListPage === spreadLeft
        ? leftVerses
        : rightVerses
      : pageVerses;
    return (target || []).map((v) => {
      const surahNum = parseInt(v.verse_key.split(":")[0]);
      return {
        number: v.id,
        text: v.text_uthmani,
        numberInSurah: v.verse_number,
        juz: v.juz_number,
        hizbQuarter: v.hizb_number * 4,
        page: v.page_number,
        surah: {
          number: surahNum,
          name: surahNamesMap[surahNum]?.name || "",
          englishName: surahNamesMap[surahNum]?.englishName || `Surah ${surahNum}`,
        },
      };
    });
  }, [verseListPage, isLandscape, spreadLeft, leftVerses, rightVerses, pageVerses, surahNamesMap]);

  const panelStyle = (slot: "prev" | "current" | "next") => {
    const px = `${swipeOffset}px`;
    const transform =
      slot === "prev"
        ? `translateX(calc(${px} - 100%))`
        : slot === "next"
        ? `translateX(calc(${px} + 100%))`
        : `translateX(${px})`;
    return {
      transform,
      transition: isTransitioning
        ? "transform 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
        : "none",
      willChange: "transform" as const,
    };
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col select-none"
      style={{
        backgroundColor: "#f8f4eb",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar — auto-hide */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 bg-card/95 backdrop-blur-sm border-b border-border flex items-center gap-2 px-3 py-2 transition-all duration-300 ${
          showTopBar
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-full pointer-events-none"
        }`}
        style={{ paddingTop: `calc(0.5rem + env(safe-area-inset-top))` }}
        onClick={resetHideTimer}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 text-center">
          <p className="text-xs font-semibold text-foreground">Mushaf Al-Qur'an</p>
          <p className="text-[10px] text-muted-foreground">
            {isLandscape
              ? `Halaman ${spreadLeft}–${Math.min(spreadRight, TOTAL_PAGES)}`
              : `Halaman ${page}`}
          </p>
        </div>
        {/* spacer to balance back button */}
        <div className="w-10" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden pt-[52px]">
        {isLandscape ? (
          /* ── Landscape: two-page spread ── */
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-hidden" style={{ borderRight: "2px solid hsl(var(--primary) / 0.25)" }}>
              <PagePanel
                page={Math.min(spreadRight, TOTAL_PAGES)}
                onTap={() => handlePageTap(Math.min(spreadRight, TOTAL_PAGES))}
              />
            </div>
            <div className="flex-1 overflow-hidden">
              <PagePanel
                page={spreadLeft}
                onTap={() => handlePageTap(spreadLeft)}
              />
            </div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-l-none rounded-r-xl bg-card/80 hover:bg-card shadow-md h-14 w-9"
                onClick={goPrev}
                disabled={spreadLeft <= 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-r-none rounded-l-xl bg-card/80 hover:bg-card shadow-md h-14 w-9"
                onClick={goNext}
                disabled={spreadRight >= TOTAL_PAGES}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* ── Portrait: 3-panel swipe carousel ── */
          <div className="relative flex-1 overflow-hidden">
            {page > 1 && (
              <div className="absolute inset-0" style={panelStyle("prev")}>
                <PagePanel page={page - 1} onTap={() => {}} />
              </div>
            )}
            <div className="absolute inset-0" style={panelStyle("current")}>
              <PagePanel page={page} onTap={() => handlePageTap(page)} />
            </div>
            {page < TOTAL_PAGES && (
              <div className="absolute inset-0" style={panelStyle("next")}>
                <PagePanel page={page + 1} onTap={() => {}} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Verse list sheet */}
      <Sheet open={showVerseList} onOpenChange={setShowVerseList}>
        <SheetContent side="bottom" className="max-h-[72vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-sm font-semibold">
              Ayat Halaman {verseListPage}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-1.5 pb-4">
            {verseListData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Memuat ayat...
              </p>
            ) : (
              verseListData.map((ayah) => (
                <button
                  key={ayah.number}
                  className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-primary/5 border border-border/40 transition-colors"
                  onClick={() => {
                    setSelectedAyat(ayah);
                    setShowVerseList(false);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                      <span className="text-[9px] font-bold text-primary">
                        {ayah.numberInSurah}
                      </span>
                    </div>
                    <p
                      className="flex-1 font-mushaf text-sm text-foreground leading-relaxed"
                      dir="rtl"
                    >
                      {ayah.text.length > 80
                        ? ayah.text.slice(0, 80) + "..."
                        : ayah.text}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-left mt-1 ml-9">
                    {ayah.surah.englishName} : {ayah.numberInSurah}
                  </p>
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {selectedAyat && (
        <AyatDetailSheet
          ayah={selectedAyat}
          surahNumber={selectedAyat.surah.number}
          surahName={selectedAyat.surah.englishName}
          open={!!selectedAyat}
          onClose={() => setSelectedAyat(null)}
        />
      )}
    </div>
  );
}
