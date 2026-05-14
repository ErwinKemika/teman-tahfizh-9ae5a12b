import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardCheck, ChevronLeft, ChevronRight, FileDown } from "lucide-react";

type MutabaahStatus = "lulus" | "mengulang" | "libur" | "sakit";

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default function MutabaahPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"form" | "history" | "report">("form");

  const today = new Date().toISOString().split("T")[0];

  // Form state
  const [ziyadahSurat, setZiyadahSurat] = useState("");
  const [ziyadahAyatStart, setZiyadahAyatStart] = useState("");
  const [ziyadahAyatEnd, setZiyadahAyatEnd] = useState("");
  const [ziyadahHalaman, setZiyadahHalaman] = useState("");
  const [hifdzJadidDari, setHifdzJadidDari] = useState("");
  const [hifdzJadidHingga, setHifdzJadidHingga] = useState("");
  const [murojaahQadhimTsnai, setMurojaahQadhimTsnai] = useState("");
  const [murojaahQadhimFardhi, setMurojaahQadhimFardhi] = useState("");
  const [keterangan, setKeterangan] = useState("");

  // History month navigation
  const [historyMonth, setHistoryMonth] = useState(new Date());

  // Report filter state
  const [reportMonth, setReportMonth] = useState(String(new Date().getMonth() + 1));
  const [reportYear, setReportYear] = useState(String(new Date().getFullYear()));

  // Auto-status: lulus jika semua field wajib terisi
  const requiredFields = [
    ziyadahSurat, ziyadahAyatStart, ziyadahAyatEnd, ziyadahHalaman,
    hifdzJadidDari, hifdzJadidHingga,
    murojaahQadhimTsnai, murojaahQadhimFardhi,
  ];
  const autoStatus: MutabaahStatus = requiredFields.every((f) => f.trim() !== "") ? "lulus" : "mengulang";

  const { data: todayEntry } = useQuery({
    queryKey: ["mutabaah-today", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mutabaah_entries")
        .select("*")
        .eq("student_id", user!.id)
        .eq("date", today)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: monthEntries } = useQuery({
    queryKey: ["mutabaah-month", user?.id, historyMonth.getMonth(), historyMonth.getFullYear()],
    queryFn: async () => {
      const year = historyMonth.getFullYear();
      const month = historyMonth.getMonth();
      const start = new Date(year, month, 1).toISOString().split("T")[0];
      const end = new Date(year, month + 1, 0).toISOString().split("T")[0];
      const { data } = await supabase
        .from("mutabaah_entries")
        .select("*")
        .eq("student_id", user!.id)
        .gte("date", start)
        .lte("date", end)
        .order("date");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: reportEntries } = useQuery({
    queryKey: ["mutabaah-report", user?.id, reportMonth, reportYear],
    queryFn: async () => {
      const m = parseInt(reportMonth);
      const y = parseInt(reportYear);
      const start = new Date(y, m - 1, 1).toISOString().split("T")[0];
      const end = new Date(y, m, 0).toISOString().split("T")[0];
      const { data } = await supabase
        .from("mutabaah_entries")
        .select("*")
        .eq("student_id", user!.id)
        .gte("date", start)
        .lte("date", end)
        .order("date");
      return data || [];
    },
    enabled: !!user && activeTab === "report",
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("mutabaah_entries").insert({
        student_id: user!.id,
        date: today,
        status: autoStatus,
        ziyadah_surat: ziyadahSurat || null,
        ziyadah_ayat_start: ziyadahAyatStart ? parseInt(ziyadahAyatStart) : null,
        ziyadah_ayat_end: ziyadahAyatEnd ? parseInt(ziyadahAyatEnd) : null,
        ziyadah_jumlah: ziyadahHalaman ? parseInt(ziyadahHalaman) : null,
        murojaah_hifdzul_jadid_dari: hifdzJadidDari ? parseInt(hifdzJadidDari) : null,
        murojaah_hifdzul_jadid_hingga: hifdzJadidHingga ? parseInt(hifdzJadidHingga) : null,
        murojaah_hifdzul_qodim: murojaahQadhimTsnai || null,
        murojaah_tsnai: murojaahQadhimFardhi || null,
        keterangan: keterangan || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mutaba'ah hari ini berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["mutabaah"] });
      queryClient.invalidateQueries({ queryKey: ["today-mutabaah"] });
      queryClient.invalidateQueries({ queryKey: ["streak"] });
    },
    onError: (e) => toast.error("Gagal: " + e.message),
  });

  const statusColor: Record<string, string> = {
    lulus: "bg-success/10 text-success",
    mengulang: "bg-warning/10 text-warning",
    libur: "bg-muted text-muted-foreground",
    sakit: "bg-destructive/10 text-destructive",
  };

  const statusLabel = (s: string) => {
    if (s === "mengulang") return "Belum Lulus";
    if (s === "lulus") return "Lulus";
    if (s === "libur") return "Libur";
    if (s === "sakit") return "Sakit";
    return s;
  };

  // Report summary
  const totalLulus = reportEntries?.filter((e) => e.status === "lulus").length ?? 0;
  const totalMengulang = reportEntries?.filter((e) => e.status === "mengulang").length ?? 0;
  const totalLibur = reportEntries?.filter((e) => e.status === "libur").length ?? 0;
  const totalSakit = reportEntries?.filter((e) => e.status === "sakit").length ?? 0;

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <>
      {/* Print-only header */}
      <div className="hidden print:block p-6 pb-2">
        <h1 className="text-xl font-bold">Laporan Mutaba'ah Harian</h1>
        <p className="text-sm text-gray-500">
          Nama: {profile?.full_name} &nbsp;|&nbsp;
          Periode: {monthNames[parseInt(reportMonth) - 1]} {reportYear}
        </p>
        <hr className="mt-2" />
      </div>

      <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto print:p-0 print:max-w-full">
        {/* Page header — hidden on print */}
        <div className="space-y-1 print:hidden">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" /> Mutaba'ah Harian
          </h1>
          <p className="text-sm text-muted-foreground">Catatan aktivitas hafalan harian</p>
        </div>

        {/* Tabs — hidden on print */}
        <div className="flex gap-2 print:hidden">
          <Button
            variant={activeTab === "form" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("form")}
          >
            Input Hari Ini
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("history")}
          >
            Riwayat Bulanan
          </Button>
          <Button
            variant={activeTab === "report" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("report")}
          >
            Laporan
          </Button>
        </div>

        {/* === TAB: FORM === */}
        {activeTab === "form" && (
          <Card className="shadow-card print:hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{today}</span>
                {todayEntry && <Badge className="bg-success/10 text-success">Sudah diisi ✓</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayEntry ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Mutaba'ah hari ini sudah diisi. Lihat riwayat untuk detailnya.
                </p>
              ) : (
                <>
                  {/* 1. Ziyadah */}
                  <div className="space-y-2">
                    <Label className="font-semibold">Ziyadah (Hafalan Baru)</Label>
                    <Input
                      placeholder="Nama surat"
                      value={ziyadahSurat}
                      onChange={(e) => setZiyadahSurat(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Ayat awal"
                        type="number"
                        value={ziyadahAyatStart}
                        onChange={(e) => setZiyadahAyatStart(e.target.value)}
                      />
                      <Input
                        placeholder="Ayat akhir"
                        type="number"
                        value={ziyadahAyatEnd}
                        onChange={(e) => setZiyadahAyatEnd(e.target.value)}
                      />
                    </div>
                    <Input
                      placeholder="Jumlah halaman"
                      type="number"
                      value={ziyadahHalaman}
                      onChange={(e) => setZiyadahHalaman(e.target.value)}
                    />
                  </div>

                  {/* 2. Muroja'ah Hifdzul Jadid */}
                  <div className="space-y-2">
                    <Label className="font-semibold">Muroja'ah Hifdzul Jadid (Halaman)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Dari hal."
                        type="number"
                        value={hifdzJadidDari}
                        onChange={(e) => setHifdzJadidDari(e.target.value)}
                      />
                      <Input
                        placeholder="Hingga hal."
                        type="number"
                        value={hifdzJadidHingga}
                        onChange={(e) => setHifdzJadidHingga(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* 3. Muraja'ah Hifdzul Qadhim */}
                  <div className="space-y-2">
                    <Label className="font-semibold">Muraja'ah Hifdzul Qadhim</Label>
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                        <span className="text-sm text-foreground/80 sm:w-20 shrink-0">Tsuna'i</span>
                        <Input
                          placeholder="Contoh: Juz 30 / Juz 20"
                          value={murojaahQadhimTsnai}
                          onChange={(e) => setMurojaahQadhimTsnai(e.target.value)}
                          className="sm:flex-1"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                        <span className="text-sm text-foreground/80 sm:w-20 shrink-0">Fardhi</span>
                        <Input
                          placeholder="Contoh: Juz 29 / Juz 1"
                          value={murojaahQadhimFardhi}
                          onChange={(e) => setMurojaahQadhimFardhi(e.target.value)}
                          className="sm:flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Keterangan */}
                  <div className="space-y-2">
                    <Label>Keterangan <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                    <Textarea
                      placeholder="Catatan tambahan..."
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* Auto-status */}
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 bg-muted/20">
                    <span className="text-sm text-muted-foreground">Status otomatis</span>
                    <Badge className={autoStatus === "lulus" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>
                      {autoStatus === "lulus" ? "Lulus ✓" : "Belum Lulus"}
                    </Badge>
                  </div>

                  <Button
                    onClick={() => submitMutation.mutate()}
                    disabled={submitMutation.isPending}
                    className="w-full"
                  >
                    {submitMutation.isPending ? "Menyimpan..." : "Simpan Mutaba'ah"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* === TAB: RIWAYAT === */}
        {activeTab === "history" && (
          <Card className="shadow-card print:hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setHistoryMonth(new Date(historyMonth.getFullYear(), historyMonth.getMonth() - 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <CardTitle className="text-base">
                  {monthNames[historyMonth.getMonth()]} {historyMonth.getFullYear()}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setHistoryMonth(new Date(historyMonth.getFullYear(), historyMonth.getMonth() + 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {["Ah", "Sn", "Sl", "Rb", "Km", "Jm", "Sb"].map((d) => (
                  <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
                ))}
                {(() => {
                  const year = historyMonth.getFullYear();
                  const month = historyMonth.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const entryMap: Record<string, string> = {};
                  monthEntries?.forEach((e) => { entryMap[e.date] = e.status; });

                  const cells = [];
                  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} />);
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                    const st = entryMap[dateStr];
                    cells.push(
                      <div
                        key={d}
                        className={`text-center text-xs py-1.5 rounded-lg ${st ? statusColor[st] : "text-muted-foreground"}`}
                      >
                        {d}
                      </div>
                    );
                  }
                  return cells;
                })()}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Lulus</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> Belum Lulus</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Sakit</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground" /> Libur</span>
              </div>

              {/* Entry detail list */}
              {monthEntries && monthEntries.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-border pt-3">
                  <p className="text-xs font-semibold text-foreground mb-2">Detail Entri</p>
                  {[...monthEntries].reverse().map((entry: any) => (
                    <div key={entry.id} className="text-xs bg-muted/30 rounded-lg p-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{entry.date}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${statusColor[entry.status]}`}>
                          {statusLabel(entry.status)}
                        </Badge>
                      </div>
                      {entry.ziyadah_surat && (
                        <p className="text-muted-foreground">
                          Ziyadah: <span className="text-foreground">{entry.ziyadah_surat} ayat {entry.ziyadah_ayat_start}–{entry.ziyadah_ayat_end}</span>
                          {entry.ziyadah_jumlah ? <span className="text-foreground"> ({entry.ziyadah_jumlah} hal.)</span> : null}
                        </p>
                      )}
                      {(entry.murojaah_hifdzul_jadid_dari || entry.murojaah_hifdzul_jadid_hingga) && (
                        <p className="text-muted-foreground">
                          Hifdzul Jadid: hal. <span className="text-foreground">{entry.murojaah_hifdzul_jadid_dari}–{entry.murojaah_hifdzul_jadid_hingga}</span>
                        </p>
                      )}
                      {(entry.murojaah_hifdzul_qodim || entry.murojaah_tsnai) && (
                        <p className="text-muted-foreground">
                          Hifdzul Qadhim — Tsuna'i: <span className="text-foreground">{entry.murojaah_hifdzul_qodim || "-"}</span>
                          {" | "}Fardhi: <span className="text-foreground">{entry.murojaah_tsnai || "-"}</span>
                        </p>
                      )}
                      {entry.keterangan && (
                        <p className="text-muted-foreground italic">"{entry.keterangan}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* === TAB: LAPORAN === */}
        {activeTab === "report" && (
          <div className="space-y-4">
            {/* Filter bar — hidden on print */}
            <Card className="shadow-card print:hidden">
              <CardContent className="py-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bulan</Label>
                    <Select value={reportMonth} onValueChange={setReportMonth}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthNames.map((name, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tahun</Label>
                    <Input
                      type="number"
                      value={reportYear}
                      onChange={(e) => setReportYear(e.target.value)}
                      className="w-24"
                      min={2020}
                      max={2099}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 ml-auto"
                  >
                    <FileDown className="w-4 h-4" />
                    Export PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
              {[
                { label: "Total Hari", value: reportEntries?.length ?? 0, cls: "text-foreground" },
                { label: "Lulus", value: totalLulus, cls: "text-success" },
                { label: "Belum Lulus", value: totalMengulang, cls: "text-warning" },
                { label: "Libur / Sakit", value: totalLibur + totalSakit, cls: "text-muted-foreground" },
              ].map((s) => (
                <Card key={s.label} className="shadow-card print:shadow-none print:border">
                  <CardContent className="py-3 text-center">
                    <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Table */}
            <Card className="shadow-card print:shadow-none print:border">
              <CardHeader className="pb-2 print:pb-1">
                <CardTitle className="text-sm">
                  Tabel Mutaba'ah — {monthNames[parseInt(reportMonth) - 1]} {reportYear}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!reportEntries || reportEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 print:hidden">
                    Tidak ada data untuk periode ini
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 print:bg-gray-100">
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">No</th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Tanggal</th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Ziyadah</th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Hifdzul Jadid</th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Qadhim Tsuna'i</th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Qadhim Fardhi</th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Keterangan</th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportEntries.map((entry: any, idx: number) => (
                          <tr
                            key={entry.id}
                            className="border-b border-border/50 hover:bg-muted/20 print:hover:bg-transparent"
                          >
                            <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium whitespace-nowrap">{entry.date}</td>
                            <td className="px-3 py-2">
                              {entry.ziyadah_surat ? (
                                <span>
                                  {entry.ziyadah_surat}
                                  {entry.ziyadah_ayat_start && ` ${entry.ziyadah_ayat_start}–${entry.ziyadah_ayat_end}`}
                                  {entry.ziyadah_jumlah && ` (${entry.ziyadah_jumlah} hal.)`}
                                </span>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-2">
                              {entry.murojaah_hifdzul_jadid_dari
                                ? `Hal. ${entry.murojaah_hifdzul_jadid_dari}–${entry.murojaah_hifdzul_jadid_hingga}`
                                : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-2">
                              {entry.murojaah_hifdzul_qodim || <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-2">
                              {entry.murojaah_tsnai || <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-2 max-w-[120px] truncate">
                              {entry.keterangan || <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium print:border ${
                                  entry.status === "lulus"
                                    ? "bg-success/10 text-success print:border-green-400"
                                    : entry.status === "mengulang"
                                    ? "bg-warning/10 text-warning print:border-yellow-400"
                                    : entry.status === "sakit"
                                    ? "bg-destructive/10 text-destructive print:border-red-400"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {statusLabel(entry.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Summary row */}
                      <tfoot>
                        <tr className="bg-muted/40 print:bg-gray-100 font-semibold">
                          <td colSpan={7} className="px-3 py-2 text-right text-muted-foreground">
                            Total: {reportEntries.length} hari &nbsp;|&nbsp; Lulus: {totalLulus} &nbsp;|&nbsp; Belum Lulus: {totalMengulang} &nbsp;|&nbsp; Libur/Sakit: {totalLibur + totalSakit}
                          </td>
                          <td className="px-3 py-2" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
