import { useState, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { BookOpen, Star, PlusCircle } from "lucide-react";
import { DonutChart, type DonutChartSegment } from "@/components/ui/donut-chart";
import { AreaChartProgress, type AreaProgressDataPoint } from "@/components/ui/area-chart-progress";
import { AnimatedCard, CardVisual, CardBody as AnimatedCardBody, CardTitle as AnimatedCardTitle, CardDescription as AnimatedCardDescription, Visual3 } from "@/components/ui/animated-card-chart";
import { motion, AnimatePresence } from "framer-motion";

const statusLabels: Record<string, string> = {
  belum_dihafalkan: "Belum",
  murajaah: "Muraja'ah",
  tasmi_done: "Hafal",
  mutqin: "Mutqin",
};

const statusColors: Record<string, string> = {
  mutqin: "bg-highlight/10 border-highlight/30",
  tasmi_done: "bg-success/10 border-success/30",
  murajaah: "bg-warning/10 border-warning/30",
  belum_dihafalkan: "bg-muted/30 border-border/30",
};

const badgeColors: Record<string, string> = {
  mutqin: "bg-highlight/10 text-highlight border-highlight/20",
  tasmi_done: "bg-success/10 text-success border-success/20",
  murajaah: "bg-warning/10 text-warning border-warning/20",
  belum_dihafalkan: "bg-muted text-muted-foreground border-border",
};


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
  const { user, role, profile } = useAuth();
  const isGuru = role === "guru";
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [selectedJuz, setSelectedJuz] = useState("1");
  const [editEntry, setEditEntry] = useState<EditEntry | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>("all");

  const { data: students } = useQuery({
    queryKey: ["students-list", profile?.lembaga_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("role", "siswa")
        .eq("lembaga_id", profile!.lembaga_id);
      return data || [];
    },
    enabled: isGuru && !!profile?.lembaga_id,
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

  const donutData = useMemo((): DonutChartSegment[] => {
    if (!chartEntries) return [];
    const done = chartEntries.filter((e) => e.is_mutqin || e.status === "tasmi_done").length;
    const belum = Math.max(0, 604 - done);
    return [
      { label: "Hafal + Mutqin", value: done, color: "hsl(var(--success))" },
      { label: "Belum Hafal", value: belum, color: "hsl(var(--destructive))" },
    ];
  }, [chartEntries]);

  const [hoveredDonut, setHoveredDonut] = useState<DonutChartSegment | null>(null);

  const barData = useMemo(() => {
    if (!chartEntries) return [];
    const juzMap: Record<number, { total: number; count: number }> = {};
    chartEntries.forEach((e) => {
      const juz = Math.min(30, Math.max(1, Math.ceil((e.page_number - 1) / 20)));
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

  const areaData = useMemo((): AreaProgressDataPoint[] => {
    const now = new Date();
    const months: AreaProgressDataPoint[] = Array.from({ length: 6 }, (_, i) => ({
      key: new Date(now.getFullYear(), now.getMonth() - (5 - i), 1),
      data: 0,
    }));
    chartEntries?.forEach((e) => {
      if (e.status === "tasmi_done" || e.is_mutqin) {
        const d = new Date(e.tanggal_hafalan || e.created_at);
        const item = months.find(
          (m) => m.key.getFullYear() === d.getFullYear() && m.key.getMonth() === d.getMonth()
        );
        if (item) item.data += 1;
      }
    });
    return months;
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
        tanggal_hafalan: new Date().toLocaleDateString("en-CA"),
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

  const bulkMurojaahMutation = useMutation({
    mutationFn: async () => {
      const studentId = chartStudentId || user!.id;
      const today = new Date().toLocaleDateString("en-CA");

      const withEntry = pages.filter((p) => entriesByPage[p]);
      const withoutEntry = pages.filter((p) => !entriesByPage[p]);

      const ops: Promise<void>[] = [
        ...withEntry.map((pageNum) => {
          const entry = entriesByPage[pageNum];
          return supabase
            .from("tahfizh_entries")
            .update({ kuantitas_murojaah: (entry.kuantitas_murojaah || 0) + 1 })
            .eq("id", entry.id)
            .then(({ error }) => { if (error) throw error; });
        }),
      ];

      if (withoutEntry.length > 0) {
        ops.push(
          supabase
            .from("tahfizh_entries")
            .insert(
              withoutEntry.map((pageNum) => ({
                student_id: studentId,
                page_number: pageNum,
                status: "murajaah" as const,
                kualitas_hafalan: 0,
                kuantitas_murojaah: 1,
                is_mutqin: false,
                tanggal_hafalan: today,
              }))
            )
            .then(({ error }) => { if (error) throw error; })
        );
      }

      await Promise.all(ops);
    },
    onSuccess: () => {
      toast.success(`Muroja'ah +1 untuk semua ${pages.length} halaman Juz ${selectedJuz}!`);
      queryClient.invalidateQueries({ queryKey: ["chart-entries"] });
      queryClient.invalidateQueries({ queryKey: ["tahfizh-stats"] });
    },
    onError: (e) => toast.error("Gagal: " + (e as Error).message),
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
          tanggal_hafalan: new Date().toLocaleDateString("en-CA"),
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

  const juzNum = parseInt(selectedJuz);
  const juzStart = juzNum === 1 ? 1 : (juzNum - 1) * 20 + 2;
  const juzEnd = juzNum === 30 ? 604 : juzNum * 20 + 1;
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
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto overflow-x-hidden">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Teman Qur'ani
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

          <Card className="shadow-card overflow-hidden">
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
              <div className="w-full md:w-[40%] min-w-0 overflow-hidden rounded-xl border border-border/40 bg-card/50 p-3 shadow-sm flex flex-col items-center">
                <p className="text-xs font-medium text-muted-foreground mb-3 text-center">
                  Status Hafalan Keseluruhan
                </p>
                <DonutChart
                  data={donutData}
                  size={180}
                  strokeWidth={22}
                  animationDuration={1.2}
                  onSegmentHover={setHoveredDonut}
                  centerContent={
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={hoveredDonut?.label ?? "default"}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        className="flex flex-col items-center justify-center text-center"
                      >
                        <span className="text-[10px] text-muted-foreground leading-tight max-w-[90px] truncate">
                          {hoveredDonut?.label ?? "Selesai"}
                        </span>
                        <span className="text-2xl font-bold text-foreground leading-tight">
                          {hoveredDonut?.value ?? totalDone}
                        </span>
                        <span className="text-[10px] text-muted-foreground">/ 604 hal.</span>
                      </motion.div>
                    </AnimatePresence>
                  }
                />
                <div className="flex flex-col gap-1.5 mt-3 w-full">
                  {donutData.map((seg) => (
                    <div key={seg.label} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className="text-muted-foreground">{seg.label}</span>
                      </div>
                      <span className="font-semibold text-foreground">{seg.value}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-warning" />
                      <span className="text-muted-foreground">Total Muraja'ah</span>
                    </div>
                    <span className="font-semibold text-foreground">{totalMurojaah}x</span>
                  </div>
                </div>
              </div>

              {/* Bar chart */}
              <div className="w-full md:w-[60%] min-w-0">
                <AnimatedCard className="w-full">
                  <CardVisual className="w-full">
                    {barData.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-xs text-neutral-400">
                        Belum ada data
                      </div>
                    ) : (
                      <Visual3
                        mainColor="#c9a35a"
                        secondaryColor="#e3c98a"
                        gridColor="#80808015"
                        data={barData}
                      />
                    )}
                  </CardVisual>
                  <AnimatedCardBody>
                    <AnimatedCardTitle className="text-sm">Kualitas Hafalan per Juz</AnimatedCardTitle>
                    <AnimatedCardDescription>
                      Rata-rata kualitas hafalan berdasarkan juz yang tercatat
                    </AnimatedCardDescription>
                  </AnimatedCardBody>
                </AnimatedCard>
              </div>
            </div>

            {/* Area chart */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-border/40 bg-card/50 p-3 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground mb-2 text-center">
                Progress Hafal per Bulan (6 Bulan Terakhir)
              </p>
              <AreaChartProgress data={areaData} height={160} color="#F4C430" />
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
          {/* Juz Selector — dropdown on mobile, tabs on desktop */}
          {isMobile ? (
            <Select value={selectedJuz} onValueChange={setSelectedJuz}>
              <SelectTrigger className="w-full h-10 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
                  <SelectItem key={juz} value={String(juz)}>
                    Juz {juz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
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
          )}

          {/* Juz Summary */}
          <Card className="shadow-card overflow-hidden">
            <CardContent className="py-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Juz {selectedJuz} Progress</span>
                <span>{juzMutqin}/{pages.length} Mutqin</span>
              </div>
              <Progress value={(juzHafal / pages.length) * 100} className="h-2" />
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-4 text-xs">
                  <span className="text-success">Hafal: {juzHafal}</span>
                  <span className="text-warning">Muraja'ah: {juzMurajaah}x</span>
                  <span className="text-destructive">Belum: {pages.length - juzHafal}</span>
                </div>
                {isGuru && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5"
                    disabled={bulkMurojaahMutation.isPending}
                    onClick={() => bulkMurojaahMutation.mutate()}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    {bulkMurojaahMutation.isPending ? "Menyimpan..." : "+1 Muroja'ah Semua"}
                  </Button>
                )}
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
                  className={`relative group text-left p-3 rounded-xl border transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${statusColors[status]}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-bold text-foreground">Hal. {pageNum}</span>
                    {isGuru ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          mutqinToggleMutation.mutate({ entryId: entry?.id, value: !entry?.is_mutqin, pageNum });
                        }}
                        role="button"
                        tabIndex={0}
                        className={`transition-opacity cursor-pointer ${entry?.is_mutqin ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                        title={entry?.is_mutqin ? "Hapus Mutqin" : "Set Mutqin"}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${entry?.is_mutqin ? "text-highlight fill-highlight" : "text-muted-foreground/40 fill-transparent"}`}
                        />
                      </div>
                    ) : (
                      entry?.is_mutqin && (
                        <Star className="w-3.5 h-3.5 text-highlight fill-highlight" />
                      )
                    )}
                  </div>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badgeColors[status]}`}>
                    {statusLabels[status]}
                  </Badge>
                  {entry && (
                    <p className="text-[10px] text-muted-foreground mt-1.5 leading-tight">
                      Kualitas: {entry.kualitas_hafalan}% • Muroja'ah: {entry.kuantitas_murojaah}x
                    </p>
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
