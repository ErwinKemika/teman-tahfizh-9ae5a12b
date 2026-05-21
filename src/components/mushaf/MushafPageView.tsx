import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, Brain } from "lucide-react";
import AyatDetailSheet from "./AyatDetailSheet";
import { quranFetch, QURAN_API_BASE } from "@/services/quranAuth";

const QURAN_API = QURAN_API_BASE;
const TOTAL_PAGES = 604;

const toArabicNum = (n: number) =>
  n.toString().replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);

interface AyahData {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  hizbQuarter: number;
  page: number;
  surah: { number: number; name: string; englishName: string };
}

interface QuranWord {
  id: number;
  text_uthmani: string;
  transliteration?: { text: string };
}

interface QuranComVerse {
  id: number;
  verse_number: number;
  verse_key: string;
  juz_number: number;
  hizb_number: number;
  page_number: number;
  text_uthmani: string;
  words?: QuranWord[];
}

function usePageData(pageNumber: number) {
  return useQuery<QuranComVerse[]>({
    queryKey: ["mushaf-page", pageNumber],
    queryFn: async () => {
      const res = await quranFetch(
        `${QURAN_API}/verses/by_page/${pageNumber}?words=true&word_fields=text_uthmani,transliteration,translation&fields=text_uthmani,juz_number,hizb_number,page_number&per_page=50&word_type=word&language=id`
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
      const res = await quranFetch(`${QURAN_API}/chapters?language=en`);
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

// ── Text-based page panel ─────────────────────────────────────────────────────

function PagePanel({
  page,
  verses,
  surahNames,
  isLoading,
  onAyatTap,
  hafalanMode,
  revealedVerses,
  onRevealVerse,
}: {
  page: number;
  verses: QuranComVerse[];
  surahNames: Record<number, { name: string; englishName: string }>;
  isLoading: boolean;
  onAyatTap?: (ayah: AyahData) => void;
  hafalanMode?: boolean;
  revealedVerses?: Set<number>;
  onRevealVerse?: (verseId: number) => void;
}) {
  const juz = verses[0]?.juz_number;
  const surahNums = [...new Set(verses.map((v) => parseInt(v.verse_key.split(":")[0])))];
  const headerLabel = surahNums
    .map((n) => surahNames[n]?.englishName?.toUpperCase())
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="w-full h-full flex flex-col bg-[#f8f4eb] dark:bg-[#1c1917]">
      {/* Page header */}
      <div className="shrink-0 flex items-center justify-between px-5 pt-2 pb-1.5 border-b border-primary/15">
        <span className="text-[11px] font-bold tracking-widest text-primary/70 uppercase truncate max-w-[60%]">
          {headerLabel || "—"}
        </span>
        {juz != null && (
          <span className="text-[11px] font-bold text-primary/70">Juz {juz}</span>
        )}
      </div>

      {/* Arabic text */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-3">
        {isLoading ? (
          <div className="space-y-4 pt-2 animate-pulse">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-7 rounded-full bg-primary/10"
                style={{ width: `${65 + (i % 4) * 8}%`, marginLeft: "auto" }}
              />
            ))}
          </div>
        ) : (
          <p
            className="font-mushaf text-[20px] leading-[2.0] text-foreground"
            dir="rtl"
            style={{ textAlign: "justify", textAlignLast: "right" }}
          >
            {verses.map((verse, idx) => {
              const surahNum = parseInt(verse.verse_key.split(":")[0]);
              const prevSurahNum =
                idx > 0 ? parseInt(verses[idx - 1].verse_key.split(":")[0]) : null;
              const showSurahHeader = idx > 0 && surahNum !== prevSurahNum;

              return (
                <span key={verse.id}>
                  {showSurahHeader && (
                    <span className="block my-3">
                      <span className="block text-center">
                        <span className="inline-block border border-primary/30 rounded px-6 py-1.5 font-mushaf text-lg text-primary">
                          سُورَةُ {surahNames[surahNum]?.name || ""}
                        </span>
                      </span>
                      {surahNum !== 9 && (
                        <span className="block text-center font-mushaf text-xl text-primary/60 mt-1.5">
                          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                        </span>
                      )}
                    </span>
                  )}
                  <span
                    onClick={() => {
                      if (hafalanMode && !revealedVerses?.has(verse.id)) {
                        onRevealVerse?.(verse.id);
                      } else {
                        onAyatTap?.({
                          number: verse.id,
                          text: verse.text_uthmani,
                          numberInSurah: verse.verse_number,
                          juz: verse.juz_number,
                          hizbQuarter: verse.hizb_number * 4,
                          page: verse.page_number,
                          surah: {
                            number: surahNum,
                            name: surahNames[surahNum]?.name || "",
                            englishName:
                              surahNames[surahNum]?.englishName || `Surah ${surahNum}`,
                          },
                        });
                      }
                    }}
                    className={`transition-[filter] duration-300 ${
                      hafalanMode && !revealedVerses?.has(verse.id)
                        ? "blur-[6px] cursor-pointer select-none"
                        : onAyatTap
                        ? "cursor-pointer hover:bg-primary/10 active:bg-primary/20 rounded-sm transition-colors"
                        : ""
                    }`}
                  >
                    {verse.text_uthmani}
                  </span>
                  <span
                    className="font-mushaf mx-1 align-middle"
                    style={{ color: "#F4C430", fontSize: "20px" }}
                  >
                    ﴿{toArabicNum(verse.verse_number)}﴾
                  </span>
                </span>
              );
            })}
          </p>
        )}
      </div>

      {/* Page number footer */}
      <div className="shrink-0 py-1.5 text-center border-t border-primary/10">
        <span className="font-mushaf text-sm text-primary/50">{toArabicNum(page)}</span>
      </div>
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
  const [selectedAyat, setSelectedAyat] = useState<AyahData | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hafalanMode, setHafalanMode] = useState(false);
  const [revealedVerses, setRevealedVerses] = useState<Set<number>>(new Set());

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

  // Fetch verse data for carousel + landscape
  const { data: prevVerses = [], isLoading: prevLoading } = usePageData(page - 1);
  const { data: currVerses = [], isLoading: currLoading } = usePageData(page);
  const { data: nextVerses = [], isLoading: nextLoading } = usePageData(page + 1);
  const { data: leftVerses = [], isLoading: leftLoading } = usePageData(spreadLeft);
  const { data: rightVerses = [], isLoading: rightLoading } = usePageData(
    Math.min(spreadRight, TOTAL_PAGES)
  );
  const { data: surahNamesMap = {} } = useSurahNames();

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

  const revealVerse = useCallback((verseId: number) => {
    setRevealedVerses((prev) => new Set([...prev, verseId]));
  }, []);

  const revealAll = useCallback(() => {
    const visibleVerses = isLandscape
      ? [...leftVerses, ...rightVerses]
      : currVerses;
    setRevealedVerses(new Set(visibleVerses.map((v) => v.id)));
  }, [currVerses, leftVerses, rightVerses, isLandscape]);

  useEffect(() => {
    setRevealedVerses(new Set());
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
          if (diffX < 0) goNext();
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
        if (diffX < 0 && page < TOTAL_PAGES) {
          setSwipeOffset(w);
          setTimeout(() => {
            goNext();
            setSwipeOffset(0);
            setIsTransitioning(false);
          }, 280);
        } else if (diffX > 0 && page > 1) {
          setSwipeOffset(-w);
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
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  const panelStyle = (slot: "prev" | "current" | "next") => {
    const px = `${swipeOffset}px`;
    const transform =
      slot === "prev"
        ? `translateX(calc(${px} + 100%))`
        : slot === "next"
        ? `translateX(calc(${px} - 100%))`
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
      className="fixed inset-0 z-[60] flex flex-col select-none bg-[#f8f4eb] dark:bg-[#1c1917]"
      style={{
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
        <Button
          variant={hafalanMode ? "default" : "ghost"}
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setHafalanMode((v) => !v);
            setRevealedVerses(new Set());
          }}
          title="Mode Hafalan"
        >
          <Brain className="w-5 h-5" />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden pt-[52px]" onClick={resetHideTimer}>
        {isLandscape ? (
          /* ── Landscape: two-page spread ── */
          <div className="flex-1 flex overflow-hidden">
            <div
              className="flex-1 relative overflow-hidden"
              style={{ borderRight: "2px solid hsl(var(--primary) / 0.25)" }}
            >
              <PagePanel
                page={Math.min(spreadRight, TOTAL_PAGES)}
                verses={rightVerses}
                surahNames={surahNamesMap}
                isLoading={rightLoading}
                onAyatTap={setSelectedAyat}
                hafalanMode={hafalanMode}
                revealedVerses={revealedVerses}
                onRevealVerse={revealVerse}
              />
            </div>
            <div className="flex-1 relative overflow-hidden">
              <PagePanel
                page={spreadLeft}
                verses={leftVerses}
                surahNames={surahNamesMap}
                isLoading={leftLoading}
                onAyatTap={setSelectedAyat}
                hafalanMode={hafalanMode}
                revealedVerses={revealedVerses}
                onRevealVerse={revealVerse}
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
                <PagePanel
                  page={page - 1}
                  verses={prevVerses}
                  surahNames={surahNamesMap}
                  isLoading={prevLoading}
                />
              </div>
            )}
            <div className="absolute inset-0" style={panelStyle("current")}>
              <PagePanel
                page={page}
                verses={currVerses}
                surahNames={surahNamesMap}
                isLoading={currLoading}
                onAyatTap={setSelectedAyat}
                hafalanMode={hafalanMode}
                revealedVerses={revealedVerses}
                onRevealVerse={revealVerse}
              />
            </div>
            {page < TOTAL_PAGES && (
              <div className="absolute inset-0" style={panelStyle("next")}>
                <PagePanel
                  page={page + 1}
                  verses={nextVerses}
                  surahNames={surahNamesMap}
                  isLoading={nextLoading}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {hafalanMode && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-primary/10 backdrop-blur-sm border-t border-primary/20 flex items-center justify-between px-4 py-2">
          <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5" /> Mode Hafalan Aktif
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/20"
            onClick={revealAll}
          >
            Tampilkan Semua
          </Button>
        </div>
      )}

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
