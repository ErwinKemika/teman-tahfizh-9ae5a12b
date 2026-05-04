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

const QURAN_API = "https://api.quran.com/api/v4";

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
  const [tafsirSource, setTafsirSource] = useState<"ibnu-katsir" | "al-muyassar">("ibnu-katsir");

  const verseKey = `${surahNumber}:${ayah.numberInSurah}`;

  // Fetch translation + word-by-word (language=id for Indonesian words)
  const { data: verseDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["verse-detail", surahNumber, ayah.numberInSurah],
    queryFn: async () => {
      const res = await fetch(
        `${QURAN_API}/verses/by_key/${verseKey}?translations=33&words=true&word_fields=text_uthmani,translation_text&language=id`
      );
      const json = await res.json();
      const v = json.verse;
      return {
        translation: (v?.translations?.[0]?.text || "").replace(/<[^>]+>/g, "").trim(),
        words: (v?.words || [])
          .filter((w: { char_type_name: string }) => w.char_type_name === "word")
          .map((w: { text_uthmani: string; translation?: { text: string } }) => ({
            ar: w.text_uthmani,
            id: w.translation?.text || "",
          })),
      };
    },
    enabled: open,
    staleTime: 1000 * 60 * 60,
    retry: 2,
  });

  // Tafsir Ibnu Katsir (ID 169, English abridged)
  const { data: tafsirIbnuKatsir, isLoading: loadingIbnuKatsir } = useQuery({
    queryKey: ["tafsir-ibnu-katsir", surahNumber, ayah.numberInSurah],
    queryFn: async () => {
      const res = await fetch(`${QURAN_API}/tafsirs/169/by_ayah/${verseKey}`, {
        headers: { Accept: "application/json" },
      });
      const json = await res.json();
      return (json.tafsir?.text || "").replace(/<[^>]+>/g, "").trim();
    },
    enabled: open,
    staleTime: 1000 * 60 * 60,
    retry: 2,
  });

  // Tafsir Al-Muyassar (ID 16, Arabic)
  const { data: tafsirMuyassar, isLoading: loadingMuyassar } = useQuery({
    queryKey: ["tafsir-muyassar", surahNumber, ayah.numberInSurah],
    queryFn: async () => {
      const res = await fetch(`${QURAN_API}/tafsirs/16/by_ayah/${verseKey}`, {
        headers: { Accept: "application/json" },
      });
      const json = await res.json();
      return (json.tafsir?.text || "").replace(/<[^>]+>/g, "").trim();
    },
    enabled: open,
    staleTime: 1000 * 60 * 60,
    retry: 2,
  });

  const translation = verseDetail?.translation;
  const wordByWord = verseDetail?.words;

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

  const activeTafsirText = tafsirSource === "ibnu-katsir" ? tafsirIbnuKatsir : tafsirMuyassar;
  const activeTafsirLoading = tafsirSource === "ibnu-katsir" ? loadingIbnuKatsir : loadingMuyassar;

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
                {loadingDetail ? (
                  <Skeleton className="h-16" />
                ) : (
                  <p className="text-sm text-foreground/80 leading-relaxed">{translation}</p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="kata-per-kata">
              <AccordionTrigger className="text-sm font-semibold">Kata per Kata</AccordionTrigger>
              <AccordionContent>
                {loadingDetail ? (
                  <Skeleton className="h-24" />
                ) : wordByWord?.length ? (
                  <div className="grid grid-cols-3 gap-2" dir="rtl">
                    {wordByWord.map((w: any, i: number) => (
                      <div key={i} className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="font-arabic text-base text-foreground">{w.ar}</p>
                        <p className="text-[10px] text-muted-foreground mt-1" dir="ltr">
                          {w.id}
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
                  onClick={() => setTafsirSource("al-muyassar")}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                    tafsirSource === "al-muyassar"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  Al-Muyassar
                </button>
              </div>

              {activeTafsirLoading ? (
                <Skeleton className="h-32" />
              ) : (
                <div
                  className="p-3 rounded-xl bg-muted/30 text-sm text-foreground/80 leading-relaxed"
                  dir={tafsirSource === "al-muyassar" ? "rtl" : "ltr"}
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
