import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookMarked, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function MushafViewer() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpTo, setJumpTo] = useState("");

  const { data: pageData, isLoading } = useQuery({
    queryKey: ["mushaf-page", currentPage],
    queryFn: async () => {
      const res = await fetch(`https://api.alquran.cloud/v1/page/${currentPage}/quran-uthmani`);
      const json = await res.json();
      return json.data?.ayahs || [];
    },
  });

  const { data: tahfizhEntry } = useQuery({
    queryKey: ["tahfizh-page-status", user?.id, currentPage],
    queryFn: async () => {
      const { data } = await supabase
        .from("tahfizh_entries")
        .select("status, is_mutqin, kualitas_hafalan")
        .eq("student_id", user!.id)
        .eq("page_number", currentPage)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const handleJump = () => {
    const p = parseInt(jumpTo);
    if (p >= 1 && p <= 604) {
      setCurrentPage(p);
      setJumpTo("");
    }
  };

  const statusLabel = tahfizhEntry?.is_mutqin
    ? "Mutqin ⭐"
    : tahfizhEntry?.status === "tasmi_done"
    ? "Tasmi' ✓"
    : tahfizhEntry?.status === "murajaah"
    ? "Muraja'ah"
    : "Belum dihafalkan";

  const statusClass = tahfizhEntry?.is_mutqin
    ? "bg-highlight/10 text-highlight"
    : tahfizhEntry?.status === "tasmi_done"
    ? "bg-success/10 text-success"
    : tahfizhEntry?.status === "murajaah"
    ? "bg-warning/10 text-warning"
    : "bg-muted text-muted-foreground";

  // Group ayahs by surah
  const surahGroups: { name: string; number: number; ayahs: typeof pageData }[] = [];
  pageData?.forEach((ayah: any) => {
    const last = surahGroups[surahGroups.length - 1];
    if (last && last.number === ayah.surah.number) {
      last.ayahs.push(ayah);
    } else {
      surahGroups.push({
        name: ayah.surah.name,
        number: ayah.surah.number,
        ayahs: [ayah],
      });
    }
  });

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-primary" /> Mushaf Digital
        </h1>
        <p className="text-sm text-muted-foreground">Baca Al-Qur'an dengan pelacakan hafalan</p>
      </div>

      {/* Navigation */}
      <Card className="shadow-card">
        <CardContent className="py-3 flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-foreground">Halaman {currentPage}</p>
            <p className="text-[11px] text-muted-foreground">Juz {Math.ceil(currentPage / 20)}</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage >= 604}
            onClick={() => setCurrentPage((p) => Math.min(604, p + 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Jump to page */}
      <div className="flex gap-2">
        <Input
          placeholder="Lompat ke halaman..."
          value={jumpTo}
          onChange={(e) => setJumpTo(e.target.value)}
          type="number"
          min={1}
          max={604}
          className="flex-1"
        />
        <Button variant="outline" onClick={handleJump}>
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Hafalan status */}
      <div className="flex items-center gap-2">
        <Badge className={statusClass}>{statusLabel}</Badge>
        {tahfizhEntry?.kualitas_hafalan != null && (
          <span className="text-xs text-muted-foreground">
            Kualitas: {tahfizhEntry.kualitas_hafalan}%
          </span>
        )}
      </div>

      {/* Quran Text */}
      <Card className="shadow-card">
        <CardContent className="py-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Memuat...</div>
          ) : (
            <div className="space-y-6">
              {surahGroups.map((group) => (
                <div key={group.number}>
                  <div className="text-center mb-4 py-2 rounded-lg bg-primary/5">
                    <p className="font-arabic text-lg text-primary" dir="rtl">{group.name}</p>
                  </div>
                  <div className="font-arabic text-xl leading-[2.5] text-foreground text-right" dir="rtl">
                    {group.ayahs.map((ayah: any) => (
                      <span key={ayah.number}>
                        {ayah.text}{" "}
                        <span className="text-primary text-sm font-sans">﴿{ayah.numberInSurah}﴾</span>{" "}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
