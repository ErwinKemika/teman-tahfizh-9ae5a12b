import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ClipboardCheck, Star, Flame, Plus, Eye, BookMarked } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const statusConfig = {
  lulus: { label: "Lulus", className: "bg-success/10 text-success border-success/20" },
  mengulang: { label: "Mengulang", className: "bg-warning/10 text-warning border-warning/20" },
  libur: { label: "Libur", className: "bg-muted text-muted-foreground border-border" },
  sakit: { label: "Sakit", className: "bg-destructive/10 text-destructive border-destructive/20" },
} as const;

const islamicQuotes = [
  { arabic: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ", id: "Sebaik-baik kalian adalah yang mempelajari Al-Qur'an dan mengajarkannya" },
  { arabic: "اقْرَأُوا الْقُرْآنَ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ شَفِيعًا لِأَصْحَابِهِ", id: "Bacalah Al-Qur'an, karena ia akan datang pada hari kiamat sebagai pemberi syafaat" },
  { arabic: "إِنَّ الَّذِي لَيْسَ فِي جَوْفِهِ شَيْءٌ مِنَ الْقُرْآنِ كَالْبَيْتِ الْخَرِبِ", id: "Sesungguhnya orang yang tidak memiliki hafalan Al-Qur'an sedikit pun bagaikan rumah yang runtuh" },
];

export default function SiswaDashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const quote = islamicQuotes[Math.floor(Math.random() * islamicQuotes.length)];

  const { data: tahfizhStats } = useQuery({
    queryKey: ["tahfizh-stats", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tahfizh_entries")
        .select("status, is_mutqin")
        .eq("student_id", user!.id);
      const total = data?.length || 0;
      const mutqin = data?.filter((e) => e.is_mutqin).length || 0;
      const tasmi = data?.filter((e) => e.status === "tasmi_done").length || 0;
      const murajaah = data?.filter((e) => e.status === "murajaah").length || 0;
      return { total, mutqin, tasmi, murajaah, percent: Math.round((mutqin / 604) * 100) };
    },
    enabled: !!user,
  });

  const { data: todayMutabaah } = useQuery({
    queryKey: ["today-mutabaah", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("mutabaah_entries")
        .select("*")
        .eq("student_id", user!.id)
        .eq("date", today);
      return data && data.length > 0;
    },
    enabled: !!user,
  });

  const { data: recentMutabaah } = useQuery({
    queryKey: ["recent-mutabaah", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mutabaah_entries")
        .select("*")
        .eq("student_id", user!.id)
        .order("date", { ascending: false })
        .limit(7);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: streakCount } = useQuery({
    queryKey: ["streak", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mutabaah_entries")
        .select("date")
        .eq("student_id", user!.id)
        .order("date", { ascending: false })
        .limit(30);
      if (!data || data.length === 0) return 0;
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < data.length; i++) {
        const expected = new Date(today);
        expected.setDate(today.getDate() - i);
        const expectedStr = expected.toISOString().split("T")[0];
        if (data[i].date === expectedStr) {
          streak++;
        } else {
          break;
        }
      }
      return streak;
    },
    enabled: !!user,
  });

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Greeting */}
      <div className="space-y-1">
        <h1 className="text-xl lg:text-2xl font-bold text-foreground">
          Assalamu'alaikum, {profile?.full_name?.split(" ")[0] || "Santri"} 👋
        </h1>
        <p className="text-sm text-muted-foreground">Semoga hari ini penuh berkah</p>
      </div>

      {/* Islamic Quote */}
      <Card className="gradient-primary border-0 shadow-card">
        <CardContent className="py-4">
          <p className="font-arabic text-lg text-primary-foreground/90 text-right leading-relaxed" dir="rtl">
            {quote.arabic}
          </p>
          <p className="text-xs text-primary-foreground/60 mt-2 italic">"{quote.id}"</p>
        </CardContent>
      </Card>

      {/* Progress Ring */}
      <Card className="shadow-card">
        <CardContent className="py-6 flex items-center gap-6">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="hsl(var(--primary))" strokeWidth="8"
                strokeDasharray={`${(tahfizhStats?.percent || 0) * 2.64} 264`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-foreground">{tahfizhStats?.percent || 0}%</span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">Progress Hafalan</h3>
            <p className="text-sm text-muted-foreground">
              {tahfizhStats?.mutqin || 0} dari 604 halaman mutqin
            </p>
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-success" /> Tasmi': {tahfizhStats?.tasmi || 0}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-warning" /> Muraja'ah: {tahfizhStats?.murajaah || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="shadow-card">
          <CardContent className="py-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${todayMutabaah ? "bg-success/10" : "bg-warning/10"}`}>
              <ClipboardCheck className={`w-5 h-5 ${todayMutabaah ? "text-success" : "text-warning"}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mutaba'ah Hari Ini</p>
              <p className="font-semibold text-foreground text-sm">
                {todayMutabaah ? "Sudah ✓" : "Belum"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-highlight/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-highlight" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Streak</p>
              <p className="font-semibold text-foreground text-sm">{streakCount || 0} hari</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground text-sm">Aksi Cepat</h3>
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2 text-xs"
            onClick={() => navigate("/mutabaah")}
          >
            <Plus className="w-5 h-5 text-primary" />
            Tambah Mutaba'ah
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2 text-xs"
            onClick={() => navigate("/tracker")}
          >
            <Eye className="w-5 h-5 text-secondary" />
            Lihat Tracker
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2 text-xs"
            onClick={() => navigate("/mushaf")}
          >
            <BookMarked className="w-5 h-5 text-accent" />
            Mushaf
          </Button>
        </div>
      </div>

      {/* Recent Mutabaah Table */}
      {recentMutabaah && recentMutabaah.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-primary" />
              Riwayat Mutaba'ah Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Tanggal</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Ziyadah</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Hifdzul Jadid</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMutabaah.map((entry) => {
                    const sc = statusConfig[entry.status as keyof typeof statusConfig] ?? statusConfig.libur;
                    return (
                      <tr key={entry.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">
                          {new Date(entry.date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {entry.ziyadah_surat
                            ? `${entry.ziyadah_surat} ${entry.ziyadah_ayat_start ?? ""}–${entry.ziyadah_ayat_end ?? ""} (${entry.ziyadah_jumlah ?? 0} ayat)`
                            : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                          {entry.murojaah_hifdzul_jadid_dari != null && entry.murojaah_hifdzul_jadid_hingga != null
                            ? `Hal. ${entry.murojaah_hifdzul_jadid_dari}–${entry.murojaah_hifdzul_jadid_hingga}`
                            : "-"}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className={`text-[10px] ${sc.className}`}>{sc.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
