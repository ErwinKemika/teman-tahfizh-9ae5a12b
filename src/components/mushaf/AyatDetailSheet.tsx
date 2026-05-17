import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Bookmark, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AudioPlayer from "./AudioPlayer";
import AudioTafsirPlayer from "./AudioTafsirPlayer";
import TrackerBadge from "./TrackerBadge";
import { QURAN_API_BASE } from "@/services/quranAuth";

const QURAN_API = QURAN_API_BASE;

interface AyatDetailSheetProps {
  ayah: {
    number: number;
    text: string;
    numberInSurah: number;
    page: number;
    surah: { number: number; name: string; englishName: string };
  };
  surahNumber: number;
  surahName: string;
  open: boolean;
  onClose: () => void;
}

export default function AyatDetailSheet({ ayah, surahNumber, surahName, open, onClose }: AyatDetailSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ayatRef = `${surahNumber}:${ayah.numberInSurah}`;
  const [tafsirSource, setTafsirSource] = useState<"ibnu-katsir" | "ringkas">("ibnu-katsir");

  const verseKey = `${surahNumber}:${ayah.numberInSurah}`;

  // Fetch translation only (simple request, no word complexity)
  const { data: translationText, isLoading: loadingTranslation, isError: errorTranslation } = useQuery({
    queryKey: ["verse-translation", surahNumber, ayah.numberInSurah],
    queryFn: async () => {
      const res = await fetch(
        `${QURAN_API}/verses/by_key/${verseKey}?translations=33`
      );
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      return (json.verse?.translations?.[0]?.text || "").replace(/<[^>]+>/g, "").trim();
    },
    enabled: open,
    staleTime: Infinity,
    retry: 1,
  });

  // Get kata-per-kata from cached page data (already fetched by MushafPageView)
  const pageVerses: any[] = queryClient.getQueryData(["mushaf-page", ayah.page]) || [];
  const cachedVerse = pageVerses.find((v: any) => v.verse_key === verseKey);
  const wordByWord = (cachedVerse?.words || [])
    .filter((w: any) => w.char_type_name === "word")
    .map((w: any) => ({
      ar: w.text_uthmani || "",
      tr: w.transliteration?.text || "",
    }));
  const transliteration = wordByWord.map((w: any) => w.tr).filter(Boolean).join(" ");

  // Tafsir Ibnu Katsir (ID 169, English abridged)
  const { data: tafsirIbnuKatsir, isLoading: loadingIbnuKatsir } = useQuery({
    queryKey: ["tafsir-ibnu-katsir", surahNumber, ayah.numberInSurah],
    queryFn: async () => {
      const res = await fetch(`${QURAN_API}/tafsirs/169/by_ayah/${verseKey}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      return (json.tafsir?.text || "").replace(/<[^>]+>/g, "").trim();
    },
    enabled: open,
    staleTime: Infinity,
    retry: 2,
  });

  // Tafsir Ringkas — Al-Muyassar (ID 16, Arabic)
  const { data: tafsirRingkas, isLoading: loadingRingkas } = useQuery({
    queryKey: ["tafsir-ringkas", surahNumber, ayah.numberInSurah],
    queryFn: async () => {
      const res = await fetch(`${QURAN_API}/tafsirs/16/by_ayah/${verseKey}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      return (json.tafsir?.text || "").replace(/<[^>]+>/g, "").trim();
    },
    enabled: open,
    staleTime: Infinity,
    retry: 2,
  });

  // Bookmark check
  const { data: isBookmarked } = useQuery({
    queryKey: ["bookmark-check", user?.id, surahNumber, ayah.numberInSurah],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", user!.id)
        .eq("surah_number", surahNumber)
        .eq("ayat_number", ayah.numberInSurah)
        .maybeSingle();
      return data;
    },
    enabled: !!user && open,
  });

  const toggleBookmark = useMutation({
    mutationFn: async () => {
      if (isBookmarked) {
        await supabase.from("bookmarks").delete().eq("id", isBookmarked.id);
      } else {
        await supabase.from("bookmarks").insert({
          user_id: user!.id,
          surah_number: surahNumber,
          ayat_number: ayah.numberInSurah,
          page_number: ayah.page,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmark-check"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success(isBookmarked ? "Bookmark dihapus" : "Bookmark ditambahkan");
    },
  });

  const activeTafsirText = tafsirSource === "ibnu-katsir" ? tafsirIbnuKatsir : tafsirRingkas;
  const activeTafsirLoading = tafsirSource === "ibnu-katsir" ? loadingIbnuKatsir : loadingRingkas;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-semibold">
              {surahNumber}. {surahName}: {ayah.numberInSurah}
            </SheetTitle>
            <div className="flex items-center gap-1">
              <TrackerBadge pageNumber={ayah.page} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleBookmark.mutate()}
                className="shrink-0"
              >
                <Bookmark
                  className={`w-4 h-4 ${isBookmarked ? "fill-highlight text-highlight" : "text-muted-foreground"}`}
                />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
          {/* Arabic text */}
          <div className="text-center py-4 rounded-xl bg-primary/5">
            <p className="font-arabic text-2xl leading-relaxed text-foreground px-4" dir="rtl">
              {ayah.text}
            </p>
          </div>

          {/* Accordion sections */}
          <Accordion type="multiple" defaultValue={["terjemahan"]} className="space-y-1">
            <AccordionItem value="terjemahan">
              <AccordionTrigger className="text-sm font-semibold">Terjemahan</AccordionTrigger>
              <AccordionContent>
                {loadingTranslation ? (
                  <Skeleton className="h-16" />
                ) : errorTranslation ? (
                  <p className="text-sm text-muted-foreground">Gagal memuat terjemahan</p>
                ) : (
                  <p className="text-sm text-foreground/80 leading-relaxed">{translationText}</p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="transliterasi">
              <AccordionTrigger className="text-sm font-semibold">Transliterasi</AccordionTrigger>
              <AccordionContent>
                {transliteration ? (
                  <p className="text-sm text-foreground/80 leading-relaxed italic">{transliteration}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Data transliterasi tidak tersedia</p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="kata-per-kata">
              <AccordionTrigger className="text-sm font-semibold">Kata per Kata</AccordionTrigger>
              <AccordionContent>
                {wordByWord?.length ? (
                  <div className="grid grid-cols-3 gap-2" dir="rtl">
                    {wordByWord.map((w: any, i: number) => (
                      <div key={i} className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="font-arabic text-base" style={{ color: "#F4C430" }}>{w.ar}</p>
                        <p className="text-[10px] text-muted-foreground mt-1" dir="ltr">
                          {w.tr}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Data kata per kata tidak tersedia</p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Media tabs */}
          <Tabs defaultValue="murattal">
            <TabsList className="w-full">
              <TabsTrigger value="murattal" className="flex-1 text-xs">Murattal</TabsTrigger>
              <TabsTrigger value="tafsir" className="flex-1 text-xs">Tafsir</TabsTrigger>
              <TabsTrigger value="audio-tafsir" className="flex-1 text-xs">Audio Tafsir</TabsTrigger>
            </TabsList>

            <TabsContent value="murattal" className="mt-3">
              <AudioPlayer ayahNumber={ayah.number} />
            </TabsContent>

            <TabsContent value="tafsir" className="mt-3 space-y-3">
              {/* Tafsir source toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setTafsirSource("ibnu-katsir")}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                    tafsirSource === "ibnu-katsir"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  Ibnu Katsir
                </button>
                <button
                  onClick={() => setTafsirSource("ringkas")}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                    tafsirSource === "ringkas"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  Ringkas
                </button>
              </div>

              {activeTafsirLoading ? (
                <Skeleton className="h-32" />
              ) : (
                <div
                  className="p-3 rounded-xl bg-muted/30 text-sm text-foreground/80 leading-relaxed"
                  dir={tafsirSource === "ringkas" ? "rtl" : "ltr"}
                >
                  {activeTafsirText || "Tafsir tidak tersedia untuk ayat ini."}
                </div>
              )}
            </TabsContent>

            <TabsContent value="audio-tafsir" className="mt-3">
              <AudioTafsirPlayer surahNumber={surahNumber} ayatNumber={ayah.numberInSurah} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Bottom nav */}
        <div className="border-t border-border px-4 py-2 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
          </Button>
          <Badge variant="outline" className="text-xs">{ayatRef}</Badge>
          <Button variant="ghost" size="sm" disabled>
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
