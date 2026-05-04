import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, Play } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const QURAN_API = "https://api.quran.com/api/v4";

interface SurahListPageProps {
  onSelectSurah: (number: number) => void;
  onSelectJuz: (juz: number) => void;
  onSelectPage: (page: number) => void;
  lastReadPage?: number;
}

interface SurahInfo {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export default function SurahListPage({ onSelectSurah, onSelectJuz, onSelectPage, lastReadPage }: SurahListPageProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: surahs, isLoading } = useQuery({
    queryKey: ["quran-surahs"],
    queryFn: async () => {
      const res = await fetch(`${QURAN_API}/chapters?language=en`);
      const json = await res.json();
      return (json.chapters || []).map((ch: {
        id: number;
        name_arabic: string;
        name_simple: string;
        translated_name?: { name: string };
        verses_count: number;
        revelation_place: string;
      }) => ({
        number: ch.id,
        name: ch.name_arabic,
        englishName: ch.name_simple,
        englishNameTranslation: ch.translated_name?.name || "",
        numberOfAyahs: ch.verses_count,
        revelationType: ch.revelation_place,
      })) as SurahInfo[];
    },
    staleTime: Infinity,
    retry: 2,
  });

  const { data: bookmarks } = useQuery({
    queryKey: ["bookmarks", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const filtered = surahs?.filter(
    (s) =>
      s.name.includes(search) ||
      s.englishName.toLowerCase().includes(search.toLowerCase()) ||
      s.number.toString() === search
  );

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Al-Qur'an</h1>
          <p className="text-xs text-muted-foreground">Baca & hafal Al-Qur'an</p>
        </div>
        {lastReadPage && (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => onSelectPage(lastReadPage)}
          >
            <Play className="w-3.5 h-3.5" />
            Lanjut Hal. {lastReadPage}
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari nomor atau nama surah..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="surah">
        <TabsList className="w-full">
          <TabsTrigger value="surah" className="flex-1">SURAH</TabsTrigger>
          <TabsTrigger value="juz" className="flex-1">JUZ</TabsTrigger>
          <TabsTrigger value="riwayat" className="flex-1">RIWAYAT</TabsTrigger>
        </TabsList>

        <TabsContent value="surah" className="space-y-1 mt-3">
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))
            : filtered?.map((s) => (
                <button
                  key={s.number}
                  onClick={() => onSelectSurah(s.number)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{s.number}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{s.englishName}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.numberOfAyahs} ayat · {s.revelationType === "makkah" ? "Makkiyyah" : "Madaniyyah"}
                    </p>
                  </div>
                  <p className="font-mushaf text-lg text-highlight shrink-0" dir="rtl">
                    {s.name}
                  </p>
                </button>
              ))}
        </TabsContent>

        <TabsContent value="juz" className="mt-3">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
              <Card
                key={juz}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onSelectJuz(juz)}
              >
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold text-primary">{juz}</p>
                  <p className="text-[10px] text-muted-foreground">Juz</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="riwayat" className="mt-3 space-y-2">
          {!bookmarks?.length ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Belum ada riwayat bookmark
            </div>
          ) : (
            bookmarks.map((b: any) => (
              <button
                key={b.id}
                onClick={() => onSelectPage(b.page_number || 1)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-highlight/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-highlight">{b.surah_number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Surah {b.surah_number} : Ayat {b.ayat_number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {b.label || new Date(b.created_at).toLocaleDateString("id-ID")}
                  </p>
                </div>
              </button>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
