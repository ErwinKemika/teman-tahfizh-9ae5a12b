import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import AyatDetailSheet from "./AyatDetailSheet";
import ReadingSettings from "./ReadingSettings";

interface ReadingViewProps {
  surahNumber: number;
  initialAyat?: number;
  onBack: () => void;
}

interface AyahData {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  surah: { number: number; name: string; englishName: string };
}

export default function ReadingView({ surahNumber, initialAyat = 1, onBack }: ReadingViewProps) {
  const [selectedAyat, setSelectedAyat] = useState<AyahData | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem("mushaf-font-size");
    return saved ? parseInt(saved) : 28;
  });
  const [showTranslation, setShowTranslation] = useState(() => {
    return localStorage.getItem("mushaf-show-translation") !== "false";
  });

  const { data: surahData, isLoading } = useQuery({
    queryKey: ["surah-reading", surahNumber],
    queryFn: async () => {
      const res = await fetch(
        `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani`
      );
      const json = await res.json();
      return json.data?.[0];
    },
    staleTime: 1000 * 60 * 30,
  });

  const { data: translationData } = useQuery({
    queryKey: ["surah-translation", surahNumber],
    queryFn: async () => {
      const res = await fetch(
        `https://api.alquran.cloud/v1/surah/${surahNumber}/id.indonesian`
      );
      const json = await res.json();
      return json.data;
    },
    staleTime: 1000 * 60 * 30,
    enabled: showTranslation,
  });

  const ayahs: AyahData[] = surahData?.ayahs || [];
  const surahName = surahData?.name || "";
  const surahEnglishName = surahData?.englishName || "";
  const currentJuz = ayahs[0]?.juz || 1;
  const currentHizb = ayahs[0]?.hizbQuarter ? Math.ceil(ayahs[0].hizbQuarter / 4) : 1;
  const currentPage = ayahs[0]?.page || 1;

  const saveFontSize = (size: number) => {
    setFontSize(size);
    localStorage.setItem("mushaf-font-size", size.toString());
  };

  const saveShowTranslation = (v: boolean) => {
    setShowTranslation(v);
    localStorage.setItem("mushaf-show-translation", v.toString());
  };

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-3 py-2 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 flex items-center gap-2 justify-center overflow-hidden">
          <Badge variant="secondary" className="text-xs shrink-0">
            {surahNumber}. {surahEnglishName}
          </Badge>
          <Badge variant="outline" className="text-xs shrink-0">
            Juz {currentJuz}, Hizb {currentHizb}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} className="shrink-0">
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6 max-w-3xl mx-auto w-full">
        {isLoading ? (
          <div className="space-y-4 py-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <>
            {/* Bismillah */}
            {surahNumber !== 1 && surahNumber !== 9 && (
              <div className="text-center py-4 mb-4 rounded-xl bg-primary/5">
                <p className="font-arabic text-2xl text-primary" dir="rtl">
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                </p>
              </div>
            )}

            {/* Arabic text */}
            <div
              className="font-arabic leading-loose text-foreground text-right"
              dir="rtl"
              style={{ fontSize: `${fontSize}px`, lineHeight: 2.2 }}
            >
              {ayahs.map((ayah) => (
                <span
                  key={ayah.number}
                  className="cursor-pointer hover:bg-primary/5 rounded px-0.5 transition-colors"
                  onClick={() => setSelectedAyat(ayah)}
                >
                  {ayah.text}{" "}
                  <span className="text-primary font-sans inline-block" style={{ fontSize: `${Math.max(12, fontSize - 10)}px` }}>
                    ﴿{ayah.numberInSurah}﴾
                  </span>{" "}
                </span>
              ))}
            </div>

            {/* Translation */}
            {showTranslation && translationData?.ayahs && (
              <div className="mt-8 space-y-3 border-t border-border pt-6">
                <p className="text-sm font-semibold text-muted-foreground">Terjemahan</p>
                {translationData.ayahs.map((a: any) => (
                  <div key={a.number} className="flex gap-2 text-sm">
                    <span className="text-primary font-semibold shrink-0">{a.numberInSurah}.</span>
                    <span className="text-foreground/80">{a.text}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-16 lg:bottom-0 bg-card border-t border-border px-4 py-2 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          disabled={surahNumber <= 1}
          onClick={() => {
            // Navigate to prev surah handled by parent
          }}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Sebelumnya
        </Button>
        <Badge variant="outline" className="text-xs">Hal. {currentPage}</Badge>
        <Button
          variant="ghost"
          size="sm"
          disabled={surahNumber >= 114}
          onClick={() => {
            // Navigate to next surah handled by parent
          }}
        >
          Selanjutnya <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Ayat Detail */}
      {selectedAyat && (
        <AyatDetailSheet
          ayah={selectedAyat}
          surahNumber={surahNumber}
          surahName={surahEnglishName}
          open={!!selectedAyat}
          onClose={() => setSelectedAyat(null)}
        />
      )}

      {/* Settings */}
      <ReadingSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fontSize={fontSize}
        onFontSizeChange={saveFontSize}
        showTranslation={showTranslation}
        onShowTranslationChange={saveShowTranslation}
      />
    </div>
  );
}
