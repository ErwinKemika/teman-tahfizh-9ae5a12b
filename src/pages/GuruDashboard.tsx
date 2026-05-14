import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Activity, BookOpen, TrendingUp, ClipboardCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const statusConfig = {
  lulus: { label: "Lulus", className: "bg-success/10 text-success border-success/20" },
  mengulang: { label: "Mengulang", className: "bg-warning/10 text-warning border-warning/20" },
  libur: { label: "Libur", className: "bg-muted text-muted-foreground border-border" },
  sakit: { label: "Sakit", className: "bg-destructive/10 text-destructive border-destructive/20" },
} as const;

export default function GuruDashboard() {
  const { profile } = useAuth();
  const [search, setSearch] = useState("");

  const { data: students } = useQuery({
    queryKey: ["all-students"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "siswa")
        .order("full_name");
      return data || [];
    },
  });

  const { data: todayActivity } = useQuery({
    queryKey: ["today-activity"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("mutabaah_entries")
        .select("student_id")
        .eq("date", today);
      return data?.length || 0;
    },
  });

  const { data: todayMutabaahEntries } = useQuery({
    queryKey: ["today-mutabaah-entries"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("mutabaah_entries")
        .select("*")
        .eq("date", today)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: studentProgress } = useQuery({
    queryKey: ["student-progress"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tahfizh_entries")
        .select("student_id, is_mutqin");
      if (!data) return {};
      const map: Record<string, number> = {};
      data.forEach((e) => {
        if (e.is_mutqin) {
          map[e.student_id] = (map[e.student_id] || 0) + 1;
        }
      });
      return map;
    },
  });

  const filteredStudents = students?.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-xl lg:text-2xl font-bold text-foreground">
          Assalamu'alaikum, Ustadz {profile?.full_name?.split(" ")[0] || ""} 👋
        </h1>
        <p className="text-sm text-muted-foreground">Dashboard Guru — Pantau progress siswa</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-card">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Siswa</p>
              <p className="text-lg font-bold text-foreground">{students?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aktif Hari Ini</p>
              <p className="text-lg font-bold text-foreground">{todayActivity}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rata-rata Progress</p>
              <p className="text-lg font-bold text-foreground">
                {students?.length
                  ? Math.round(
                      Object.values(studentProgress || {}).reduce((a, b) => a + b, 0) /
                        Math.max(students.length, 1) /
                        604 *
                        100
                    )
                  : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-highlight/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-highlight" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Partisipasi</p>
              <p className="text-lg font-bold text-foreground">
                {students?.length ? Math.round((todayActivity || 0) / students.length * 100) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Daftar Siswa</CardTitle>
          </div>
          <Input
            placeholder="Cari siswa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-2"
          />
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredStudents?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Belum ada siswa terdaftar
            </p>
          )}
          {filteredStudents?.map((student) => {
            const mutqin = studentProgress?.[student.user_id] || 0;
            const pct = Math.round((mutqin / 604) * 100);
            return (
              <div
                key={student.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  {student.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{student.full_name}</p>
                  <p className="text-xs text-muted-foreground">{student.class || "Tanpa kelas"}</p>
                </div>
                <div className="w-24 text-right">
                  <p className="text-xs font-medium text-foreground">{pct}%</p>
                  <Progress value={pct} className="h-1.5 mt-1" />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Today's Mutabaah Review */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            Mutaba'ah Hari Ini
            <Badge variant="outline" className="ml-auto text-xs">
              {todayMutabaahEntries?.length || 0} siswa
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {todayMutabaahEntries?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">
              Belum ada siswa yang mengisi mutaba'ah hari ini
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Siswa</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Ziyadah</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Hifdzul Jadid</th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todayMutabaahEntries?.map((entry) => {
                    const student = students?.find((s) => s.user_id === entry.student_id);
                    const sc = statusConfig[entry.status as keyof typeof statusConfig] ?? statusConfig.libur;
                    return (
                      <tr key={entry.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-foreground">
                          {student?.full_name || "—"}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
