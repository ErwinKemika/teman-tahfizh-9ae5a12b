import { useState } from "react";
import SurahListPage from "@/components/mushaf/SurahListPage";
import ReadingView from "@/components/mushaf/ReadingView";

export default function MushafViewer() {
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [initialAyat, setInitialAyat] = useState<number>(1);

  if (selectedSurah) {
    return (
      <ReadingView
        surahNumber={selectedSurah}
        initialAyat={initialAyat}
        onBack={() => setSelectedSurah(null)}
      />
    );
  }

  return (
    <SurahListPage
      onSelectSurah={(num, ayat) => {
        setSelectedSurah(num);
        setInitialAyat(ayat || 1);
      }}
    />
  );
}
