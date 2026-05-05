import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardCheck, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

type MutabaahStatus = "lulus" | "mengulang" | "libur" | "sakit";
type QadhimValue = "none" | "lulus" | "mengulang";

function toQadhimDb(val: QadhimValue): string | null {
  return val === "none" ? null : val;
}

export default function MutabaahPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");

  const today = new Date().toISOString().split("T")[0];
  const [status, setStatus] = useState<MutabaahStatus>("lulus");
  const [hifdzJadidDari, setHifdzJadidDari] = useState("");
  const [hifdzJadidHingga, setHifdzJadidHingga] = useState("");
  const [murojaahTsnai, setMurojaahTsnai] = useState("");
  const [murojaahQadhimTsnai, setMurojaahQadhimTsnai] = useState<QadhimValue>("none");
  const [murojaahQadhimFardhi, setMurojaahQadhimFardhi] = useState<QadhimValue>("none");
  const [ziyadahSurat, setZiyadahSurat] = useState("");
  const [ziyadahAyatStart, setZiyadahAyatStart] = useState("");
  const [ziyadahAyatEnd, setZiyadahAyatEnd] = useState("");
  const [keterangan, setKeterangan] = useState("");

  // History month navigation
  const [historyMonth, setHistoryMonth] = useState(new Date());

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
    queryKey: ["mutabaah-month", user?.id, historyMonth.getMonth()],
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

  const submitMutation = useMutation({
    mutationFn: async () => {
      const ziyadahJumlah = ziyadahAyatEnd && ziyadahAyatStart
        ? parseInt(ziyadahAyatEnd) - parseInt(ziyadahAyatStart) + 1
        : null;

      const { error } = await supabase.from("mutabaah_entries").insert({
        student_id: user!.id,
        date: today,
        status,
        murojaah_hifdzul_jadid_dari: hifdzJadidDari ? parseInt(hifdzJadidDari) : null,
        murojaah_hifdzul_jadid_hingga: hifdzJadidHingga ? parseInt(hifdzJadidHingga) : null,
        murojaah_tsnai: murojaahTsnai || null,
        murojaah_hifdzul_qodim: JSON.stringify({ tsnai: toQadhimDb(murojaahQadhimTsnai), fardhi: toQadhimDb(murojaahQadhimFardhi) }),
        ziyadah_surat: ziyadahSurat || null,
        ziyadah_ayat_start: ziyadahAyatStart ? parseInt(ziyadahAyatStart) : null,
        ziyadah_ayat_end: ziyadahAyatEnd ? parseInt(ziyadahAyatEnd) : null,
        ziyadah_jumlah: ziyadahJumlah,
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

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const qadhimOptions = (
    <>
      <SelectItem value="none">-</SelectItem>
      <SelectItem value="lulus">Lulus</SelectItem>
      <SelectItem value="mengulang">Mengulang</SelectItem>
    </>
  );

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-2xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" /> Mutaba'ah Harian
        </h1>
        <p className="text-sm text-muted-foreground">Catatan aktivitas hafalan harian</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
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
      </div>

      {activeTab === "form" && (
        <Card className="shadow-card">
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
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as MutabaahStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lulus">Normal (Lulus)</SelectItem>
                      <SelectItem value="mengulang">Mengulang</SelectItem>
                      <SelectItem value="libur">Libur</SelectItem>
                      <SelectItem value="sakit">Sakit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(status === "lulus" || status === "mengulang") && (
                  <>
                    <div className="space-y-2">
                      <Label>Muroja'ah Hifdzul Jadid (Halaman)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Dari hal." value={hifdzJadidDari} onChange={(e) => setHifdzJadidDari(e.target.value)} type="number" />
                        <Input placeholder="Hingga hal." value={hifdzJadidHingga} onChange={(e) => setHifdzJadidHingga(e.target.value)} type="number" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Muroja'ah Tsnai</Label>
                      <Input placeholder="Juz/surat yang dimuroja'ah" value={murojaahTsnai} onChange={(e) => setMurojaahTsnai(e.target.value)} />
                    </div>

                    {/* Muraja'ah Hifdzul Qadhim — split into Tsuna'i and Fardhi */}
                    <div className="space-y-2">
                      <Label className="font-semibold">Muraja'ah Hifdzul Qadhim</Label>
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                          <span className="text-sm text-foreground/80 sm:w-20 shrink-0">Tsuna'i</span>
                          <Select value={murojaahQadhimTsnai} onValueChange={(v) => setMurojaahQadhimTsnai(v as QadhimValue)}>
                            <SelectTrigger className="sm:flex-1"><SelectValue /></SelectTrigger>
                            <SelectContent>{qadhimOptions}</SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                          <span className="text-sm text-foreground/80 sm:w-20 shrink-0">Fardhi</span>
                          <Select value={murojaahQadhimFardhi} onValueChange={(v) => setMurojaahQadhimFardhi(v as QadhimValue)}>
                            <SelectTrigger className="sm:flex-1"><SelectValue /></SelectTrigger>
                            <SelectContent>{qadhimOptions}</SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Ziyadah Baru</Label>
                      <Input placeholder="Nama surat" value={ziyadahSurat} onChange={(e) => setZiyadahSurat(e.target.value)} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Ayat awal" value={ziyadahAyatStart} onChange={(e) => setZiyadahAyatStart(e.target.value)} type="number" />
                        <Input placeholder="Ayat akhir" value={ziyadahAyatEnd} onChange={(e) => setZiyadahAyatEnd(e.target.value)} type="number" />
                      </div>
                      {ziyadahAyatStart && ziyadahAyatEnd && (
                        <p className="text-xs text-muted-foreground">
                          Jumlah ayat: {Math.max(0, parseInt(ziyadahAyatEnd) - parseInt(ziyadahAyatStart) + 1)}
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Keterangan</Label>
                  <Textarea placeholder="Catatan tambahan (opsional)" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={2} />
                </div>

                <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="w-full">
                  {submitMutation.isPending ? "Menyimpan..." : "Simpan Mutaba'ah"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "history" && (
        <Card className="shadow-card">
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
                      className={`text-center text-xs py-1.5 rounded-lg ${
                        st ? statusColor[st] : "text-muted-foreground"
                      }`}
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
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> Mengulang</span>
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
                        {entry.status}
                      </Badge>
                    </div>
                    {entry.murojaah_hifdzul_qodim && (() => {
                      let q: { tsnai?: string | null; fardhi?: string | null } = {};
                      try { q = JSON.parse(entry.murojaah_hifdzul_qodim); } catch { q = {}; }
                      if (!q.tsnai && !q.fardhi) return null;
                      return (
                        <p className="text-muted-foreground">
                          Hifdzul Qadhim — Tsuna'i: <span className="text-foreground">{q.tsnai || "-"}</span>
                          {" | "}Fardhi: <span className="text-foreground">{q.fardhi || "-"}</span>
                        </p>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
