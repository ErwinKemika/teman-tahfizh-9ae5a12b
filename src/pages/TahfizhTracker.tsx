import { useState, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, Star } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

const statusColors: Record<string, string> = {
  belum_dihafalkan: "bg-destructive/10 text-destructive",
  murajaah: "bg-warning/10 text-warning",
  tasmi_done: "bg-success/10 text-success",
  mutqin: "bg-highlight/10 text-highlight",
};

const statusLabels: Record<string, string> = {
  belum_dihafalkan: "Belum",
  murajaah: "Muraja'ah",
  tasmi_done: "Hafal",
  mutqin: "Mutqin",
};

const DONUT_COLORS = ["#27AE60", "#E74C3C"];

interface EditEntry {
  page_number: number;
  status: string;
  kualitas_hafalan: number;
  kuantitas_murojaah: number;
  is_mutqin: boolean;
  catatan: string;
  existing_id?: string;
}

export default function TahfizhTracker() {
  const { user, role } = useAuth();
  const isGuru = role === "guru";
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [selectedJuz, setSelectedJuz] = useState("1");
  const [editEntry, setEditEntry] = useState<EditEntry | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>("all");

  const { data: students } = useQuery({
    queryKey: ["students-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("role", "siswa");
      return data || [];
    },
    enabled: isGuru,
  });

  const chartStudentId = isGuru
    ? selectedStudent === "all" ? null : selectedStudent
    : user?.id;

  const { data: chartEntries } = useQuery({
    queryKey: ["chart-entries", chartStudentId, isGuru],
    queryFn: async () => {
      let query = supabase.from("tahfizh_entries").select("*");
      if (!isGuru) {
        query = query.eq("student_id", user!.id);
      } else if (chartStudentId) {
        query = query.eq("student_id", chartStudentId);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const totalDone = useMemo(
    () => chartEntries?.filter((e) => e.is_mutqin || e.status === "tasmi_done").length ?? 0,
    [chartEntries]
  );

  const totalMurojaah = useMemo(
    () => chartEntries?.reduce((sum, e) => sum + (e.kuantitas_murojaah || 0), 0) ?? 0,
    [chartEntries]
  );

  const donutData = useMemo(() => {
    if (!chartEntries) return [];
    const done = chartEntries.filter((e) => e.is_mutqin || e.status === "tasmi_done").length;
    const belum = Math.max(0, 604 - done);
    return [
      { name: "Hafal + Mutqin", value: done },
      { name: "Belum Hafal", value: belum },
    ];
  }, [chartEntries]);

  const barData = useMemo(() => {
    if (!chartEntries) return [];
    const juzMap: Record<number, { total: number; count: number }> = {};
    chartEntries.forEach((e) => {
      const juz = Math.ceil(e.page_number / 20);
      if (!juzMap[juz]) juzMap[juz] = { total: 0, count: 0 };
      juzMap[juz].total += e.kualitas_hafalan;
      juzMap[juz].count += 1;
    });
    return Object.entries(juzMap)
      .map(([juz, { total, count }]) => ({
        name: `J${juz}`,
        avg: Math.round(total / count),
        fullName: `Juz ${juz}`,
      }))
      .sort((a, b) => parseInt(a.name.slice(1)) - parseInt(b.name.slice(1)));
  }, [chartEntries]);

  const lineData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
      months[key] = 0;
    }
    chartEntries?.forEach((e) => {
      if (e.status === "tasmi_done" || e.is_mutqin) {
        const dateStr = e.tanggal_hafalan || e.created_at;
        const d = new Date(dateStr);
        const key = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
        if (key in months) months[key] = (months[key] || 0) + 1;
      }
    });
    return Object.entries(months).map(([month, count]) => ({ month, count }));
  }, [chartEntries]);

  const saveMutation = useMutation({
    mutationFn: async (entry: EditEntry) => {
      const payload = {
        student_id: chartStudentId || user!.id,
        page_number: entry.page_number,
        status: entry.is_mutqin
          ? ("mutqin" as const)
          : (entry.status as "belum_dihafalkan" | "tasmi_done" | "mutqin"),
        kualitas_hafalan: entry.kualitas_hafalan,
        kuantitas_murojaah: entry.kuantitas_murojaah,
        is_mutqin: entry.is_mutqin,
        catatan: entry.catatan,
        tanggal_hafalan: new Date().toISOString().split("T")[0],
      };

      if (entry.existing_id) {
        const { error } = await supabase
          .from("tahfizh_entries")
          .update(payload)
          .eq("id", entry.existing_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tahfizh_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Tersimpan!");
      queryClient.invalidateQueries({ queryKey: ["chart-entries"] });
      queryClient.invalidateQueries({ queryKey: ["tahfizh-stats"] });
      setEditEntry(null);
    },
    onError: (e) => toast.error("Gagal menyimpan: " + e.message),
  });

  const mutqinToggleMutation = useMutation({
    mutationFn: async ({
      entryId,
      value,
      pageNum,
    }: {
      entryId?: string;
      value: boolean;
      pageNum: number;
    }) => {
      if (entryId) {
        const { error } = await supabase
          .from("tahfizh_entries")
          .update({ is_mutqin: value, status: value ? "mutqin" : "tasmi_done" })
          .eq("id", entryId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tahfizh_entries").insert({
          student_id: chartStudentId || user!.id,
          page_number: pageNum,
          status: "mutqin",
          is_mutqin: true,
          kualitas_hafalan: 100,
          kuantitas_murojaah: 0,
          tanggal_hafalan: new Date().toISOString().split("T")[0],
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart-entries"] });
      queryClient.invalidateQueries({ queryKey: ["tahfizh-stats"] });
      toast.success("Status Mutqin diperbarui!");
    },
    onError: (e) => toast.error("Gagal: " + e.message),
  });

  const entriesByPage =
    chartStudentId && chartEntries
      ? chartEntries.reduce(
          (acc, e) => {
            acc[e.page_number] = e;
            return acc;
          },
          {} as Record<number, (typeof chartEntries)[0]>
        )
      : {};

  const juzStart = (parseInt(selectedJuz) - 1) * 20 + 1;
  const juzEnd = Math.min(parseInt(selectedJuz) * 20, 604);
  const pages = Array.from({ length: juzEnd - juzStart + 1 }, (_, i) => juzStart + i);

  const juzEntries = pages.map((p) => entriesByPage[p]);
  const juzMutqin = juzEntries.filter((e) => e?.is_mutqin).length;
  const juzHafal = juzEntries.filter((e) => e?.is_mutqin || e?.status === "tasmi_done").length;
  const juzMurajaah = juzEntries.reduce((sum, e) => sum + (e?.kuantitas_murojaah || 0), 0);

  const openEdit = (pageNum: number) => {
    const existing = entriesByPage[pageNum];
    setEditEntry({
      page_number: pageNum,
      status: existing?.status === "murajaah" ? "tasmi_done" : (existing?.status || "belum_dihafalkan"),
      kualitas_hafalan: existing?.kualitas_hafalan || 0,
      kuantitas_murojaah: existing?.kuantitas_murojaah || 0,
      is_mutqin: existing?.is_mutqin || false,
      catatan: existing?.catatan || "",
      existing_id: existing?.id,
    });
  };

  const studentSelector = (
    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
      <SelectTrigger className="w-full h-9 text-sm">
        <SelectValue placeholder="Pilih siswa..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua Siswa</SelectItem>
        {students?.map((s) => (
          <SelectItem key={s.user_id} value={s.user_id}>
            {s.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Tahfizh Tracker
        </h1>
        <p className="text-sm text-muted-foreground">Lacak hafalan per halaman Al-Qur'an</p>
      </div>

      {/* ── MOBILE Summary ── */}
      {isMobile && (
        <>
          {isGuru && (
            <Card className="shadow-card">
              <CardContent className="py-3">{studentSelector}</CardContent>
            </Card>
          )}

          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-center">📊 Ringkasan Progress</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-5 pb-5">
              {/* Progress ring */}
              {(() => {
                const pct = totalDone / 604;
                const r = 60;
                const circ = 2 * Math.PI * r;
                return (
                  <div className="relative w-[160px] h-[160px]">
                    <svg width="160" height="160" className="-rotate-90">
                      <circle cx="80" cy="80" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="14" />
                      <circle
                        cx="80" cy="80" r={r}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={circ * (1 - pct)}
                        style={{ transition: "stroke-dashoffset 0.7s ease" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-foreground">
                        {Math.round(pct * 100)}%
                      </span>
                      <span className="text-[11px] text-muted-foreground">dari 604 hal.</span>
                    </div>
                  </div>
                );
              })()}

              {/* 3 stat boxes */}
              <div className="grid grid-cols-3 gap-3 w-full">
                <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-success/10 border border-success/20">
                  <span className="text-2xl font-bold text-success">{totalDone}</span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">Hafal &amp; Mutqin</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-warning/10 border border-warning/20">
                  <span className="text-2xl font-bold text-warning">{totalMurojaah}</span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">Total Muraja'ah</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <span className="text-2xl font-bold text-destructive">{604 - totalDone}</span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">Belum Hafal</span>
                </div>
              </div>

              {/* Overall progress bar */}
              <div className="w-full space-y-1.5">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Progress keseluruhan</span>
                  <span>{totalDone} / 604</span>
                </div>
                <Progress value={(totalDone / 604) * 100} className="h-2.5" />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── DESKTOP Chart Section ── */}
      {!isMobile && (
        <Card className="shadow-card overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">📊 Ringkasan Progress</CardTitle>
              {isGuru && (
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger className="w-48 h-8 text-xs">
                    <SelectValue placeholder="Pilih siswa..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Siswa</SelectItem>
                    {students?.map((s) => (
                      <SelectItem key={s.user_id} value={s.user_id}>
                        {s.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 min-w-0">
              {/* Donut chart */}
              <div className="w-full md:w-[40%] min-w-0 overflow-hidden rounded-xl border border-border/40 bg-card/50 p-3 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground mb-2 text-center">
                  Status Hafalan Keseluruhan
                </p>
                <ResponsiveContainer width="99%" height={180}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                      label={false}
                    >
                      {donutData.map((_, idx) => (
                        <Cell key={idx} fill={DONUT_COLORS[idx]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number, name: string) => [`${value} hal.`, name]}
                      contentStyle={{
                        fontSize: 11,
                        borderRadius: 8,
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#27AE60" }} />
                    Hafal + Mutqin: <span className="font-medium text-foreground">{donutData[0]?.value ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#F39C12" }} />
                    Muraja'ah: <span className="font-medium text-foreground">{totalMurojaah}x</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#E74C3C" }} />
                    Belum Hafal: <span className="font-medium text-foreground">{donutData[1]?.value ?? 0}</span>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Selesai: <span className="font-bold text-foreground">{totalDone}</span> / 604
                </p>
              </div>

              {/* Bar chart */}
              <div className="w-full md:w-[60%] min-w-0 overflow-hidden rounded-xl border border-border/40 bg-card/50 p-3 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground mb-2 text-center">
                  Kualitas Hafalan per Juz
                </p>
                {barData.length === 0 ? (
                  <div className="flex items-center justify-center h-[160px] text-xs text-muted-foreground">
                    Belum ada data
                  </div>
                ) : (
                  <ResponsiveContainer width="99%" height={180}>
                    <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        formatter={(value: number) => [`${value}%`, "Rata-rata"]}
                        contentStyle={{ fontSize: 11, borderRadius: 8, backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
                      />
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2E86C1" />
                          <stop offset="100%" stopColor="#1B3A6B" />
                        </linearGradient>
                      </defs>
                      <Bar dataKey="avg" fill="url(#barGradient)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Line chart */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-border/40 bg-card/50 p-3 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground mb-2 text-center">
                Progress Hafal per Bulan (6 Bulan Terakhir)
              </p>
              <ResponsiveContainer width="99%" height={160}>
                <LineChart data={lineData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    formatter={(value: number) => [`${value} halaman`, "Tasmi'/Mutqin"]}
                    contentStyle={{ fontSize: 11, borderRadius: 8, backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#F4C430" strokeWidth={2.5} dot={{ fill: "#F4C430", r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Juz Tabs + Grid ── */}
      {isGuru && !chartStudentId ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Pilih siswa dari dropdown di atas untuk melihat tracker halaman</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Juz Tabs */}
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-1.5 pb-2 min-w-max">
              {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
                <Button
                  key={juz}
                  variant={selectedJuz === String(juz) ? "default" : "outline"}
                  size="sm"
                  className="text-xs px-3 h-8"
                  onClick={() => setSelectedJuz(String(juz))}
                >
                  Juz {juz}
                </Button>
              ))}
            </div>
          </div>

          {/* Juz Summary */}
          <Card className="shadow-card">
            <CardContent className="py-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Juz {selectedJuz} Progress</span>
                <span>{juzMutqin}/{pages.length} Mutqin</span>
              </div>
              <Progress value={(juzHafal / pages.length) * 100} className="h-2" />
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-success">Hafal: {juzHafal}</span>
                <span className="text-warning">Muraja'ah: {juzMurajaah}x</span>
                <span className="text-destructive">Belum: {pages.length - juzHafal}</span>
              </div>
            </CardContent>
          </Card>

          {/* Page Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {pages.map((pageNum) => {
              const entry = entriesByPage[pageNum];
              const status = entry?.is_mutqin ? "mutqin" : entry?.status || "belum_dihafalkan";
              return (
                <button
                  key={pageNum}
                  onClick={() => openEdit(pageNum)}
                  className="text-left p-3 rounded-xl border border-border/50 bg-card hover:shadow-card-hover transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Hal. {pageNum}</span>
                    {isGuru ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          mutqinToggleMutation.mutate({
                            entryId: entry?.id,
                            value: !entry?.is_mutqin,
                            pageNum,
                          });
                        }}
                        className="p-0.5 rounded hover:bg-accent transition-colors"
                        title={entry?.is_mutqin ? "Klik untuk hapus Mutqin" : "Klik untuk set Mutqin"}
                      >
                        <Star
                          className={`w-3.5 h-3.5 transition-colors ${
                            entry?.is_mutqin
                              ? "text-highlight fill-highlight"
                              : "text-muted-foreground/40 fill-transparent"
                          }`}
                        />
                      </button>
                    ) : (
                      entry?.is_mutqin && (
                        <span title="Hanya Ustadz yang dapat mengubah status Mutqin" style={{ cursor: "default" }}>
                          <Star className="w-3.5 h-3.5 text-highlight fill-highlight" />
                        </span>
                      )
                    )}
                  </div>
                  <Badge className={`text-[10px] ${statusColors[status]}`}>{statusLabels[status]}</Badge>
                  {entry && (
                    <div className="text-[10px] text-muted-foreground">
                      Kualitas: {entry.kualitas_hafalan}% • Muroja'ah: {entry.kuantitas_murojaah}x
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── Edit Modal ── */}
      <Dialog open={!!editEntry} onOpenChange={() => setEditEntry(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Halaman {editEntry?.page_number}</DialogTitle>
          </DialogHeader>
          {editEntry && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editEntry.status}
                  onValueChange={(v) => setEditEntry({ ...editEntry, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tasmi_done">Sudah Hafal</SelectItem>
                    <SelectItem value="belum_dihafalkan">Belum Hafal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Kualitas Hafalan: {editEntry.kualitas_hafalan}%</Label>
                <Slider
                  value={[editEntry.kualitas_hafalan]}
                  onValueChange={([v]) => setEditEntry({ ...editEntry, kualitas_hafalan: v })}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <Label>Kuantitas Muroja'ah</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editEntry.kuantitas_murojaah}
                    onChange={(e) =>
                      setEditEntry({
                        ...editEntry,
                        kuantitas_murojaah: parseInt(e.target.value) || 0,
                      })
                    }
                    min={0}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditEntry({
                        ...editEntry,
                        kuantitas_murojaah: editEntry.kuantitas_murojaah + 1,
                      })
                    }
                  >
                    +1
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>MUTQIN ✓</Label>
                  {!isGuru && (
                    <p className="text-[10px] text-muted-foreground">
                      Hanya Ustadz yang dapat mengubah status Mutqin
                    </p>
                  )}
                </div>
                <Switch
                  checked={editEntry.is_mutqin}
                  onCheckedChange={(v) => isGuru && setEditEntry({ ...editEntry, is_mutqin: v })}
                  disabled={!isGuru}
                  style={{ cursor: isGuru ? "pointer" : "default" }}
                />
              </div>

              <div className="space-y-2">
                <Label>Catatan</Label>
                <Textarea
                  value={editEntry.catatan}
                  onChange={(e) => setEditEntry({ ...editEntry, catatan: e.target.value })}
                  placeholder="Catatan tambahan..."
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => editEntry && saveMutation.mutate(editEntry)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
