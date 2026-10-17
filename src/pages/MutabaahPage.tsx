import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { compareNama } from "@/lib/utils";
import { formatHalaman, formatHifdzJadid } from "@/lib/mutabaah";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StudentPicker from "@/components/StudentPicker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardCheck, ChevronLeft, ChevronRight, FileDown, Pencil, Trash2, Check, ChevronDown } from "lucide-react";

type MutabaahStatus = "lulus" | "mengulang" | "libur" | "sakit";

function parseHalaman(val: string): number | null {
  if (!val || val.trim() === "") return null;
  const t = val.trim();
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1]) / parseInt(frac[2]);
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

const QURAN_SURAHS = [
  "Al-Fatihah", "Al-Baqarah", "Ali 'Imran", "An-Nisa'", "Al-Ma'idah",
  "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Taubah", "Yunus",
  "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr",
  "An-Nahl", "Al-Isra'", "Al-Kahf", "Maryam", "Ta Ha",
  "Al-Anbiya'", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan",
  "Asy-Syu'ara'", "An-Naml", "Al-Qashash", "Al-'Ankabut", "Ar-Rum",
  "Luqman", "As-Sajdah", "Al-Ahzab", "Saba'", "Fatir",
  "Ya Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
  "Fussilat", "Asy-Syura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jasiyah",
  "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf",
  "Az-Zariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman",
  "Al-Waqi'ah", "Al-Hadid", "Al-Mujadilah", "Al-Hasyr", "Al-Mumtahanah",
  "As-Saf", "Al-Jumu'ah", "Al-Munafiqun", "At-Tagabun", "At-Talaq",
  "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij",
  "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddassir", "Al-Qiyamah",
  "Al-Insan", "Al-Mursalat", "An-Naba'", "An-Nazi'at", "'Abasa",
  "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Insyiqaq", "Al-Buruj",
  "At-Tariq", "Al-A'la", "Al-Ghasyiyah", "Al-Fajr", "Al-Balad",
  "Asy-Syams", "Al-Lail", "Ad-Duha", "Al-Insyirah", "At-Tin",
  "Al-'Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat",
  "Al-Qari'ah", "At-Takasur", "Al-'Asr", "Al-Humazah", "Al-Fil",
  "Quraisy", "Al-Ma'un", "Al-Kausar", "Al-Kafirun", "An-Nasr",
  "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas",
];

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default function MutabaahPage() {
  const { user, profile, role } = useAuth();
  const isGuru = role === "guru";
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"form" | "history" | "report" | "approval">(
    isGuru ? (searchParams.get("tab") === "approval" ? "approval" : "report") : "form"
  );
  const [pendingStatus, setPendingStatus] = useState<Record<string, MutabaahStatus>>({});
  const [isEditing, setIsEditing] = useState(false);

  const today = new Date().toLocaleDateString("en-CA");
  const [selectedDate, setSelectedDate] = useState(today);

  const [ziyadahSurats, setZiyadahSurats] = useState<string[]>([]);
  const [ziyadahSuratOpen, setZiyadahSuratOpen] = useState(false);
  const [ziyadahSuratSearch, setZiyadahSuratSearch] = useState("");
  const [ziyadahAyatStart, setZiyadahAyatStart] = useState("");
  const [ziyadahAyatEnd, setZiyadahAyatEnd] = useState("");
  const [ziyadahHalaman, setZiyadahHalaman] = useState("");
  const [hifdzJadidDari, setHifdzJadidDari] = useState("");
  const [hifdzJadidHingga, setHifdzJadidHingga] = useState("");
  const [hifdzJadidJuz, setHifdzJadidJuz] = useState<number[]>([]);
  const [statusManual, setStatusManual] = useState<MutabaahStatus>("lulus");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [keterangan, setKeterangan] = useState("");

  const [selectedFormStudent, setSelectedFormStudent] = useState<string>("");
  const [historyMonth, setHistoryMonth] = useState(new Date());
  const [reportMonth, setReportMonth] = useState(String(new Date().getMonth() + 1));
  const [reportYear, setReportYear] = useState(String(new Date().getFullYear()));
  const [selectedReportStudent, setSelectedReportStudent] = useState<string>("");

  const { data: students } = useQuery({
    queryKey: ["students-list", profile?.lembaga_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("role", "siswa")
        .eq("lembaga_id", profile!.lembaga_id);
      return (data || []).sort((a, b) => compareNama(a.full_name, b.full_name));
    },
    enabled: isGuru && !!profile?.lembaga_id,
  });

  const isSingleSurat = ziyadahSurats.length === 1;

  const toggleJuz = (juz: number) => {
    setHifdzJadidJuz((prev) => (prev.includes(juz) ? prev.filter((j) => j !== juz) : [...prev, juz]));
  };

  const toggleSurat = (surat: string) => {
    setZiyadahSurats((prev) =>
      prev.includes(surat) ? prev.filter((s) => s !== surat) : [...prev, surat]
    );
  };

  const formStudentId = isGuru ? selectedFormStudent : user?.id;

  const { data: todayEntry } = useQuery({
    queryKey: ["mutabaah-today", formStudentId, selectedDate],
    queryFn: async () => {
      if (!formStudentId) return null;
      const { data } = await supabase
        .from("mutabaah_entries")
        .select("*")
        .eq("student_id", formStudentId)
        .eq("date", selectedDate)
        .maybeSingle();
      return data;
    },
    enabled: !!formStudentId,
  });

  const { data: monthEntries } = useQuery({
    queryKey: ["mutabaah-month", user?.id, historyMonth.getMonth(), historyMonth.getFullYear()],
    queryFn: async () => {
      const year = historyMonth.getFullYear();
      const month = historyMonth.getMonth();
      const start = new Date(year, month, 1).toLocaleDateString("en-CA");
      const end = new Date(year, month + 1, 0).toLocaleDateString("en-CA");
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

  const reportStudentId = isGuru ? selectedReportStudent : user?.id;

  const { data: reportEntries } = useQuery({
    queryKey: ["mutabaah-report", reportStudentId, reportMonth, reportYear],
    queryFn: async () => {
      const m = parseInt(reportMonth);
      const y = parseInt(reportYear);
      const start = new Date(y, m - 1, 1).toLocaleDateString("en-CA");
      const end = new Date(y, m, 0).toLocaleDateString("en-CA");
      const { data } = await supabase
        .from("mutabaah_entries")
        .select("*")
        .eq("student_id", reportStudentId!)
        .gte("date", start)
        .lte("date", end)
        .order("date");
      return data || [];
    },
    enabled: !!reportStudentId && activeTab === "report",
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("mutabaah_entries").insert({
        student_id: formStudentId!,
        date: selectedDate,
        status: isGuru ? statusManual : "mengulang",
        ziyadah_surat: ziyadahSurats.length > 0 ? ziyadahSurats.join(", ") : null,
        ziyadah_ayat_start: isSingleSurat && ziyadahAyatStart ? parseInt(ziyadahAyatStart) : null,
        ziyadah_ayat_end: isSingleSurat && ziyadahAyatEnd ? parseInt(ziyadahAyatEnd) : null,
        ziyadah_jumlah: parseHalaman(ziyadahHalaman),
        murojaah_hifdzul_jadid_dari: parseHalaman(hifdzJadidDari),
        murojaah_hifdzul_jadid_hingga: parseHalaman(hifdzJadidHingga),
        murojaah_hifdzul_jadid_juz: hifdzJadidJuz.length > 0 ? hifdzJadidJuz : null,
        keterangan: keterangan || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isGuru ? "Mutaba'ah siswa berhasil disimpan!" : "Mutaba'ah hari ini berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["mutabaah-today"] });
      queryClient.invalidateQueries({ queryKey: ["mutabaah-month"] });
      queryClient.invalidateQueries({ queryKey: ["today-mutabaah"] });
      queryClient.invalidateQueries({ queryKey: ["today-activity"] });
      queryClient.invalidateQueries({ queryKey: ["streak"] });
      queryClient.invalidateQueries({ queryKey: ["mutabaah-pending"] });
      queryClient.invalidateQueries({ queryKey: ["today-mutabaah-entries"] });
      if (isGuru) resetFields();
    },
    onError: (e) => toast.error("Gagal: " + e.message),
  });

  const resetFields = () => {
    setZiyadahSurats([]); setZiyadahAyatStart(""); setZiyadahAyatEnd("");
    setZiyadahHalaman(""); setHifdzJadidDari(""); setHifdzJadidHingga(""); setHifdzJadidJuz([]);
    setStatusManual("lulus"); setKeterangan("");
  };

  type EntryRow = NonNullable<typeof todayEntry>;
  const startEdit = (entry: EntryRow | null | undefined = todayEntry) => {
    if (!entry) return;
    setEditingId(entry.id);
    setZiyadahSurats(
      entry.ziyadah_surat
        ? entry.ziyadah_surat.split(", ").map((s: string) => s.trim()).filter(Boolean)
        : []
    );
    setZiyadahAyatStart(entry.ziyadah_ayat_start != null ? String(entry.ziyadah_ayat_start) : "");
    setZiyadahAyatEnd(entry.ziyadah_ayat_end != null ? String(entry.ziyadah_ayat_end) : "");
    setZiyadahHalaman(formatHalaman(entry.ziyadah_jumlah as number | null));
    setHifdzJadidDari(formatHalaman(entry.murojaah_hifdzul_jadid_dari as number | null));
    setHifdzJadidHingga(formatHalaman(entry.murojaah_hifdzul_jadid_hingga as number | null));
    setHifdzJadidJuz(entry.murojaah_hifdzul_jadid_juz ?? []);
    setStatusManual(entry.status as MutabaahStatus);
    setKeterangan(entry.keterangan || "");
    setIsEditing(true);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("mutabaah_entries")
        .update({
          ...(isGuru ? { status: statusManual } : {}),
          ziyadah_surat: ziyadahSurats.length > 0 ? ziyadahSurats.join(", ") : null,
          ziyadah_ayat_start: isSingleSurat && ziyadahAyatStart ? parseInt(ziyadahAyatStart) : null,
          ziyadah_ayat_end: isSingleSurat && ziyadahAyatEnd ? parseInt(ziyadahAyatEnd) : null,
          ziyadah_jumlah: parseHalaman(ziyadahHalaman),
          murojaah_hifdzul_jadid_dari: parseHalaman(hifdzJadidDari),
          murojaah_hifdzul_jadid_hingga: parseHalaman(hifdzJadidHingga),
          murojaah_hifdzul_jadid_juz: hifdzJadidJuz.length > 0 ? hifdzJadidJuz : null,
          keterangan: keterangan || null,
        })
        .eq("id", editingId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mutaba'ah berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["mutabaah-today"] });
      queryClient.invalidateQueries({ queryKey: ["mutabaah-month"] });
      queryClient.invalidateQueries({ queryKey: ["today-mutabaah"] });
      queryClient.invalidateQueries({ queryKey: ["today-activity"] });
      queryClient.invalidateQueries({ queryKey: ["streak"] });
      queryClient.invalidateQueries({ queryKey: ["mutabaah-pending"] });
      queryClient.invalidateQueries({ queryKey: ["today-mutabaah-entries"] });
      setIsEditing(false);
    },
    onError: (e) => toast.error("Gagal: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("mutabaah_entries").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("tidak punya izin menghapus entri ini");
    },
    onSuccess: () => {
      toast.success("Mutaba'ah dihapus");
      setIsEditing(false);
      setEditingId(null);
      resetFields();
      ["mutabaah-today", "mutabaah-month", "mutabaah-report", "today-mutabaah", "today-activity", "streak", "mutabaah-pending", "today-mutabaah-entries"].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] })
      );
    },
    onError: (e) => toast.error("Gagal: " + e.message),
  });

  const confirmDelete = (id: string) => {
    if (window.confirm("Hapus mutaba'ah ini? Data tidak bisa dikembalikan.")) deleteMutation.mutate(id);
  };

  const { data: pendingEntries } = useQuery({
    queryKey: ["mutabaah-pending", profile?.lembaga_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mutabaah_entries")
        .select("*")
        .eq("is_approved", false)
        .order("date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: isGuru,
  });

  const studentName = (id: string) => students?.find((s) => s.user_id === id)?.full_name ?? "Siswa";

  const approveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MutabaahStatus }) => {
      const { error } = await supabase
        .from("mutabaah_entries")
        .update({ status, is_approved: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mutaba'ah disetujui");
      queryClient.invalidateQueries({ queryKey: ["mutabaah-pending"] });
      queryClient.invalidateQueries({ queryKey: ["mutabaah-today"] });
      queryClient.invalidateQueries({ queryKey: ["mutabaah-report"] });
      queryClient.invalidateQueries({ queryKey: ["today-mutabaah-entries"] });
    },
    onError: (e) => toast.error("Gagal: " + e.message),
  });

  const openInForm = (entry: { id: string; student_id: string; date: string }, edit = false) => {
    if (isGuru) setSelectedFormStudent(entry.student_id);
    setSelectedDate(entry.date);
    setIsEditing(false);
    resetFields();
    if (edit) startEdit(entry as EntryRow);
    setActiveTab("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Entri siswa yang belum disetujui ustadzah ditampilkan sebagai "menunggu", apa pun status tersimpannya.
  const displayStatus = (e: { status: string; is_approved?: boolean | null }) =>
    e.is_approved === false ? "menunggu" : e.status;

  const statusColor: Record<string, string> = {
    menunggu: "bg-primary/10 text-primary",
    lulus: "bg-success/10 text-success",
    mengulang: "bg-warning/10 text-warning",
    libur: "bg-muted text-muted-foreground",
    sakit: "bg-destructive/10 text-destructive",
  };

  const statusLabel = (s: string) => {
    if (s === "mengulang") return "Mengulang";
    if (s === "lulus") return "Lulus";
    if (s === "menunggu") return "Menunggu";
    if (s === "libur") return "Libur";
    if (s === "sakit") return "Sakit";
    return s;
  };

  const countStatus = (st: string) => reportEntries?.filter((e) => displayStatus(e) === st).length ?? 0;
  const totalLulus = countStatus("lulus");
  const totalMengulang = countStatus("mengulang");
  const totalLibur = countStatus("libur");
  const totalSakit = countStatus("sakit");
  const totalMenunggu = countStatus("menunggu");

  const handleExportPDF = () => { window.print(); };

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

      <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto overflow-x-hidden print:p-0 print:max-w-full">
        {/* Page header */}
        <div className="space-y-1 print:hidden">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" /> Mutaba'ah Harian
          </h1>
          <p className="text-sm text-muted-foreground">Catatan aktivitas hafalan harian</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant={activeTab === "form" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("form")}>
            {isGuru ? "Input Mutaba'ah Siswa" : "Input Hari Ini"}
          </Button>
          {!isGuru && (
            <Button variant={activeTab === "history" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("history")}>
              Riwayat Bulanan
            </Button>
          )}
          <Button variant={activeTab === "report" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("report")}>
            Laporan
          </Button>
          {isGuru && (
            <Button variant={activeTab === "approval" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("approval")} className="gap-1.5">
              Persetujuan
              {!!pendingEntries?.length && (
                <span className="rounded-full bg-warning text-white text-[10px] font-bold px-1.5 min-w-[1.25rem] text-center">
                  {pendingEntries.length}
                </span>
              )}
            </Button>
          )}
        </div>

        {/* === TAB: FORM === */}
        {activeTab === "form" && (
          <Card className="shadow-card print:hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground font-normal shrink-0">Tanggal</label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => { setSelectedDate(e.target.value || today); setIsEditing(false); resetFields(); }}
                    max={today}
                    className="w-36 h-7 text-sm font-semibold px-2 py-0 cursor-pointer"
                  />
                </div>
                {formStudentId && todayEntry && (
                  todayEntry.is_approved === false ? (
                    <Badge className="bg-primary/10 text-primary shrink-0">Menunggu persetujuan</Badge>
                  ) : (
                    <Badge className="bg-success/10 text-success shrink-0">Sudah diisi ✓</Badge>
                  )
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isGuru && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Pilih Siswa</Label>
                  <StudentPicker
                    students={students}
                    value={selectedFormStudent}
                    onChange={(v) => { setSelectedFormStudent(v); setIsEditing(false); resetFields(); }}
                    placeholder="Pilih nama siswa..."
                  />
                </div>
              )}
              {isGuru && !selectedFormStudent ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Pilih nama siswa di atas untuk mengisi mutaba'ah
                </p>
              ) : todayEntry && !isEditing ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border/50 p-3 space-y-1.5 text-sm">
                    {todayEntry.ziyadah_surat && (
                      <p className="text-muted-foreground">
                        Ziyadah: <span className="text-foreground">
                          {todayEntry.ziyadah_surat}
                          {todayEntry.ziyadah_ayat_start != null ? ` ayat ${todayEntry.ziyadah_ayat_start}–${todayEntry.ziyadah_ayat_end}` : ""}
                          {todayEntry.ziyadah_jumlah ? ` (${formatHalaman(todayEntry.ziyadah_jumlah as number)} hal.)` : ""}
                        </span>
                      </p>
                    )}
                    {formatHifdzJadid(todayEntry) && (
                      <p className="text-muted-foreground">
                        Hifdzul Jadid: <span className="text-foreground">{formatHifdzJadid(todayEntry)}</span>
                      </p>
                    )}
                    {todayEntry.keterangan && (
                      <p className="text-muted-foreground italic">"{todayEntry.keterangan}"</p>
                    )}
                    <p className="text-muted-foreground">
                      Status:{" "}
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${statusColor[displayStatus(todayEntry)]}`}>
                        {todayEntry.is_approved === false ? "Menunggu persetujuan ustadzah" : statusLabel(todayEntry.status)}
                      </span>
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => startEdit()}>
                    <Pencil className="w-3.5 h-3.5" /> Edit Mutaba'ah
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="font-semibold">Ziyadah (Hafalan Baru)</Label>
                    {ziyadahSuratOpen && (
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => { setZiyadahSuratOpen(false); setZiyadahSuratSearch(""); }}
                      />
                    )}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setZiyadahSuratOpen(!ziyadahSuratOpen)}
                        className="flex items-center justify-between w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-left"
                      >
                        <span className={ziyadahSurats.length === 0 ? "text-muted-foreground" : "text-foreground"}>
                          {ziyadahSurats.length === 0
                            ? "Pilih surat (bisa lebih dari satu)..."
                            : ziyadahSurats.length <= 2
                              ? ziyadahSurats.join(", ")
                              : `${ziyadahSurats[0]}, ${ziyadahSurats[1]}, +${ziyadahSurats.length - 2} lainnya`}
                        </span>
                        <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                      </button>
                      {ziyadahSuratOpen && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
                          <div className="p-2">
                            <Input
                              placeholder="Cari surat..."
                              value={ziyadahSuratSearch}
                              onChange={(e) => setZiyadahSuratSearch(e.target.value)}
                              className="h-8 text-sm"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-52 overflow-y-auto">
                            {QURAN_SURAHS
                              .map((name, idx) => ({ name, num: idx + 1 }))
                              .filter(({ name, num }) =>
                                `${num}. ${name}`.toLowerCase().includes(ziyadahSuratSearch.toLowerCase())
                              )
                              .map(({ name, num }) => {
                                const isSelected = ziyadahSurats.includes(name);
                                return (
                                  <div
                                    key={num}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-accent ${isSelected ? "bg-accent/50" : ""}`}
                                    onClick={() => toggleSurat(name)}
                                  >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? "bg-primary border-primary" : "border-input"}`}>
                                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                                    </div>
                                    {num}. {name}
                                  </div>
                                );
                              })}
                          </div>
                          <div className="border-t border-border p-2 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{ziyadahSurats.length} surat dipilih</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => { setZiyadahSuratOpen(false); setZiyadahSuratSearch(""); }}
                            >
                              Selesai
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    {isSingleSurat && (
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Ayat awal" type="number" value={ziyadahAyatStart} onChange={(e) => setZiyadahAyatStart(e.target.value)} />
                        <Input placeholder="Ayat akhir" type="number" value={ziyadahAyatEnd} onChange={(e) => setZiyadahAyatEnd(e.target.value)} />
                      </div>
                    )}
                    <Input placeholder="Jumlah halaman (contoh: 1 atau 1/2)" value={ziyadahHalaman} onChange={(e) => setZiyadahHalaman(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold">Muroja'ah Hifdzul Jadid</Label>
                    <p className="text-xs text-muted-foreground">Juz (opsional, boleh lebih dari satu)</p>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-md border border-border">
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                        <Badge
                          key={j}
                          variant={hifdzJadidJuz.includes(j) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleJuz(j)}
                        >
                          Juz {j}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">Halaman</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Dari hal. (cth: 5 atau 5½)" value={hifdzJadidDari} onChange={(e) => setHifdzJadidDari(e.target.value)} />
                      <Input placeholder="Hingga hal. (cth: 6 atau 5½)" value={hifdzJadidHingga} onChange={(e) => setHifdzJadidHingga(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Keterangan <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                    <Textarea placeholder="Catatan tambahan..." value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={2} />
                  </div>

                  {isGuru ? (
                    <div className="space-y-1.5">
                      <Label className="font-semibold">Status</Label>
                      <Select value={statusManual} onValueChange={(v) => setStatusManual(v as MutabaahStatus)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["lulus", "mengulang", ...(statusManual === "libur" || statusManual === "sakit" ? [statusManual] : [])] as MutabaahStatus[]).map((o) => (
                            <SelectItem key={o} value={o}>{statusLabel(o)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground rounded-lg border border-border px-3 py-2 bg-muted/20">
                      Status (Lulus / Mengulang) ditentukan oleh ustadzah.
                    </p>
                  )}

                  {isEditing ? (
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                        Batal
                      </Button>
                      <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => editingId && confirmDelete(editingId)} disabled={deleteMutation.isPending || !editingId}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !formStudentId || !editingId} className="flex-1">
                        {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || !formStudentId} className="w-full">
                      {submitMutation.isPending ? "Menyimpan..." : "Simpan Mutaba'ah"}
                    </Button>
                  )}
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
                  monthEntries?.forEach((e) => { entryMap[e.date] = displayStatus(e); });
                  const cells = [];
                  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} />);
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                    const st = entryMap[dateStr];
                    cells.push(
                      <div key={d} className={`text-center text-xs py-1.5 rounded-lg ${st ? statusColor[st] : "text-muted-foreground"}`}>
                        {d}
                      </div>
                    );
                  }
                  return cells;
                })()}
              </div>
              <div className="flex flex-wrap gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Menunggu</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Lulus</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> Mengulang</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Sakit</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground" /> Libur</span>
              </div>
              {monthEntries && monthEntries.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-border pt-3">
                  <p className="text-xs font-semibold text-foreground mb-2">Detail Entri</p>
                  {[...monthEntries].reverse().map((entry: any) => (
                    <div key={entry.id} className="text-xs bg-muted/30 rounded-lg p-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{entry.date}</span>
                        <div className="flex items-center gap-1.5">
                          <Badge className={`text-[10px] px-1.5 py-0 ${statusColor[displayStatus(entry)]}`}>{statusLabel(displayStatus(entry))}</Badge>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1" onClick={() => openInForm(entry, true)}>
                            <Pencil className="w-3 h-3" /> Ubah
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 text-[11px] px-1.5 text-destructive hover:text-destructive" onClick={() => confirmDelete(entry.id)} disabled={deleteMutation.isPending}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {entry.ziyadah_surat && (
                        <p className="text-muted-foreground">
                          Ziyadah: <span className="text-foreground">
                            {entry.ziyadah_surat}
                            {entry.ziyadah_ayat_start != null ? ` ayat ${entry.ziyadah_ayat_start}–${entry.ziyadah_ayat_end}` : ""}
                          </span>
                          {entry.ziyadah_jumlah ? <span className="text-foreground"> ({formatHalaman(entry.ziyadah_jumlah)} hal.)</span> : null}
                        </p>
                      )}
                      {formatHifdzJadid(entry) && (
                        <p className="text-muted-foreground">
                          Hifdzul Jadid: <span className="text-foreground">{formatHifdzJadid(entry)}</span>
                        </p>
                      )}
                      {entry.keterangan && <p className="text-muted-foreground italic">"{entry.keterangan}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* === TAB: PERSETUJUAN (guru) === */}
        {activeTab === "approval" && isGuru && (
          <Card className="shadow-card print:hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Menunggu Persetujuan</CardTitle>
              <p className="text-xs text-muted-foreground">
                Mutaba'ah yang diisi santri sendiri. Tentukan status lalu setujui.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {!pendingEntries || pendingEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Tidak ada mutaba'ah yang menunggu persetujuan
                </p>
              ) : (
                [...pendingEntries]
                  .sort((a, b) => b.date.localeCompare(a.date) || compareNama(studentName(a.student_id), studentName(b.student_id)))
                  .map((entry) => {
                  const chosen = pendingStatus[entry.id] ?? "lulus";
                  return (
                    <div key={entry.id} className="rounded-xl border border-border/50 p-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground truncate">{studentName(entry.student_id)}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{entry.date}</span>
                      </div>
                      {entry.ziyadah_surat && (
                        <p className="text-muted-foreground">
                          Ziyadah: <span className="text-foreground">
                            {entry.ziyadah_surat}
                            {entry.ziyadah_ayat_start != null ? ` ayat ${entry.ziyadah_ayat_start}–${entry.ziyadah_ayat_end}` : ""}
                            {entry.ziyadah_jumlah ? ` (${formatHalaman(entry.ziyadah_jumlah)} hal.)` : ""}
                          </span>
                        </p>
                      )}
                      {formatHifdzJadid(entry) && (
                        <p className="text-muted-foreground">
                          Hifdzul Jadid: <span className="text-foreground">{formatHifdzJadid(entry)}</span>
                        </p>
                      )}
                      {entry.keterangan && <p className="text-muted-foreground italic">"{entry.keterangan}"</p>}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Select
                          value={chosen}
                          onValueChange={(v) => setPendingStatus((prev) => ({ ...prev, [entry.id]: v as MutabaahStatus }))}
                        >
                          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lulus">Lulus</SelectItem>
                            <SelectItem value="mengulang">Mengulang</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="h-8 gap-1"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate({ id: entry.id, status: chosen })}
                        >
                          <Check className="w-3.5 h-3.5" /> Setujui
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 gap-1 ml-auto" onClick={() => openInForm(entry)}>
                          <Pencil className="w-3.5 h-3.5" /> Ubah isian
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}

        {/* === TAB: LAPORAN === */}
        {activeTab === "report" && (
          <div className="space-y-4">
            {/* Filter bar */}
            <Card className="shadow-card overflow-hidden print:hidden">
              <CardContent className="py-4">
                {isMobile ? (
                  /* Mobile: stack vertically */
                  <div className="space-y-3">
                    {isGuru && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Siswa</Label>
                        <StudentPicker
                          students={students}
                          value={selectedReportStudent}
                          onChange={setSelectedReportStudent}
                        />
                      </div>
                    )}
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs">Bulan</Label>
                        <Select value={reportMonth} onValueChange={setReportMonth}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {monthNames.map((name, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24 space-y-1.5">
                        <Label className="text-xs">Tahun</Label>
                        <Input type="number" value={reportYear} onChange={(e) => setReportYear(e.target.value)} min={2020} max={2099} />
                      </div>
                    </div>
                    <Button variant="outline" onClick={handleExportPDF} className="w-full flex items-center gap-2">
                      <FileDown className="w-4 h-4" /> Export PDF
                    </Button>
                  </div>
                ) : (
                  /* Desktop: row layout */
                  <div className="flex flex-wrap items-end gap-3">
                    {isGuru && (
                      <div className="space-y-1.5 w-full sm:w-auto">
                        <Label className="text-xs">Siswa</Label>
                        <StudentPicker
                          students={students}
                          value={selectedReportStudent}
                          onChange={setSelectedReportStudent}
                          className="sm:w-52"
                        />
                      </div>
                    )}
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
                      <Input type="number" value={reportYear} onChange={(e) => setReportYear(e.target.value)} className="w-24" min={2020} max={2099} />
                    </div>
                    <Button variant="outline" onClick={handleExportPDF} className="flex items-center gap-2 ml-auto">
                      <FileDown className="w-4 h-4" /> Export PDF
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Guru: prompt to select student */}
            {isGuru && !selectedReportStudent && (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">Pilih siswa di atas untuk melihat laporan mutaba'ahnya</p>
                </CardContent>
              </Card>
            )}

            {/* Summary cards + report content */}
            {(!isGuru || selectedReportStudent) && (
              <>
                {/* Stat cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
                  {[
                    { label: "Total Hari", value: reportEntries?.length ?? 0, cls: "text-foreground" },
                    { label: "Lulus", value: totalLulus, cls: "text-success" },
                    { label: "Mengulang", value: totalMengulang, cls: "text-warning" },
                    { label: "Libur / Sakit", value: totalLibur + totalSakit, cls: "text-muted-foreground" },
                  ].map((s) => (
                    <Card key={s.label} className="shadow-card overflow-hidden print:shadow-none print:border">
                      <CardContent className="py-3 text-center">
                        <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Report content */}
                <Card className="shadow-card overflow-hidden print:shadow-none print:border">
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
                    ) : isMobile ? (
                      /* Mobile: card list per entry */
                      <div className="p-3 space-y-3">
                        {reportEntries.map((entry: any, idx: number) => (
                          <div key={entry.id} className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}.</span>
                                <span className="text-sm font-semibold">{entry.date}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor[displayStatus(entry)]}`}>
                                  {statusLabel(displayStatus(entry))}
                                </span>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1 print:hidden" onClick={() => openInForm(entry, true)}>
                                  <Pencil className="w-3 h-3" /> Ubah
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 text-[11px] px-1.5 print:hidden text-destructive hover:text-destructive" onClick={() => confirmDelete(entry.id)} disabled={deleteMutation.isPending}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pl-7">
                              <div>
                                <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Ziyadah</p>
                                <p className="text-foreground leading-tight">
                                  {entry.ziyadah_surat
                                    ? `${entry.ziyadah_surat}${entry.ziyadah_ayat_start != null ? ` ayat ${entry.ziyadah_ayat_start}–${entry.ziyadah_ayat_end}` : ""}${entry.ziyadah_jumlah ? ` (${formatHalaman(entry.ziyadah_jumlah)} hal.)` : ""}`
                                    : "—"}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Hifdzul Jadid</p>
                                <p className="text-foreground leading-tight">
                                  {formatHifdzJadid(entry) || "—"}
                                </p>
                              </div>
                              {entry.keterangan && (
                                <div className="col-span-2">
                                  <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Keterangan</p>
                                  <p className="text-foreground italic leading-tight">"{entry.keterangan}"</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {/* Mobile summary footer */}
                        <div className="text-center text-xs text-muted-foreground pt-1 pb-2 border-t border-border">
                          Total: {reportEntries.length} hari &nbsp;·&nbsp; Lulus: {totalLulus} &nbsp;·&nbsp; Mengulang: {totalMengulang} &nbsp;·&nbsp; Libur/Sakit: {totalLibur + totalSakit}{totalMenunggu > 0 && <> &nbsp;·&nbsp; Menunggu: {totalMenunggu}</>}
                        </div>
                      </div>
                    ) : (
                      /* Desktop: table */
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border bg-muted/40 print:bg-gray-100">
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">No</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Tanggal</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Ziyadah</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Hifdzul Jadid</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Keterangan</th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Status</th>
                              <th className="px-3 py-2 print:hidden" />
                            </tr>
                          </thead>
                          <tbody>
                            {reportEntries.map((entry: any, idx: number) => (
                              <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/20 print:hover:bg-transparent">
                                <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                                <td className="px-3 py-2 font-medium whitespace-nowrap">{entry.date}</td>
                                <td className="px-3 py-2">
                                  {entry.ziyadah_surat ? (
                                    <span>
                                      {entry.ziyadah_surat}
                                      {entry.ziyadah_ayat_start != null && ` ayat ${entry.ziyadah_ayat_start}–${entry.ziyadah_ayat_end}`}
                                      {entry.ziyadah_jumlah != null && ` (${formatHalaman(entry.ziyadah_jumlah)} hal.)`}
                                    </span>
                                  ) : <span className="text-muted-foreground">—</span>}
                                </td>
                                <td className="px-3 py-2">
                                  {formatHifdzJadid(entry) || <span className="text-muted-foreground">—</span>}
                                </td>
                                <td className="px-3 py-2 max-w-[120px] truncate">{entry.keterangan || <span className="text-muted-foreground">—</span>}</td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium print:border ${
                                    displayStatus(entry) === "menunggu" ? "bg-primary/10 text-primary print:border-blue-400"
                                    : entry.status === "lulus" ? "bg-success/10 text-success print:border-green-400"
                                    : entry.status === "mengulang" ? "bg-warning/10 text-warning print:border-yellow-400"
                                    : entry.status === "sakit" ? "bg-destructive/10 text-destructive print:border-red-400"
                                    : "bg-muted text-muted-foreground"
                                  }`}>
                                    {statusLabel(displayStatus(entry))}
                                  </span>
                                </td>
                                <td className="px-2 py-1 text-right print:hidden">
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => openInForm(entry, true)}>
                                    <Pencil className="w-3 h-3" /> Ubah
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 text-xs px-1.5 text-destructive hover:text-destructive" onClick={() => confirmDelete(entry.id)} disabled={deleteMutation.isPending}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-muted/40 print:bg-gray-100 font-semibold">
                              <td colSpan={5} className="px-3 py-2 text-right text-muted-foreground">
                                Total: {reportEntries.length} hari &nbsp;|&nbsp; Lulus: {totalLulus} &nbsp;|&nbsp; Mengulang: {totalMengulang} &nbsp;|&nbsp; Libur/Sakit: {totalLibur + totalSakit}{totalMenunggu > 0 && <> &nbsp;|&nbsp; Menunggu: {totalMenunggu}</>}
                              </td>
                              <td className="px-3 py-2" />
                              <td className="print:hidden" />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
