import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";

type JenisUjian = "harian" | "pekanan" | "bulanan";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const PENILAIAN_OPTIONS = ["Kelancaran", "Tajwid", "Makhraj"];

function calcAvg(scores: number[]) {
  if (!scores.length) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function ScoreGrid({
  label,
  scores,
  onChange,
}: {
  label: string;
  scores: number[];
  onChange: (s: number[]) => void;
}) {
  const average = calcAvg(scores);
  return (
    <div className="space-y-2">
      <Label>
        {label}{" "}
        <span className="text-xs text-muted-foreground font-normal">(rata-rata: {average})</span>
      </Label>
      <div className="grid grid-cols-5 gap-2">
        {scores.map((score, i) => (
          <div key={i} className="space-y-1">
            <p className="text-xs text-center text-muted-foreground">S{i + 1}</p>
            <Input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) => {
                const next = [...scores];
                next[i] = Number(e.target.value);
                onChange(next);
              }}
              className="text-center px-1"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UjianPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const isGuru = role === "guru";

  const [formType, setFormType] = useState<JenisUjian>("harian");
  const [selectedPekan, setSelectedPekan] = useState<string>("semua");
  const [filterBulan, setFilterBulan] = useState<string>("semua");
  const [filterTahun, setFilterTahun] = useState<string>(String(new Date().getFullYear()));

  // Common
  const [selectedStudent, setSelectedStudent] = useState("");
  const [catatanGuru, setCatatanGuru] = useState("");
  const todayStr = new Date().toISOString().split("T")[0];

  // Harian
  const [tanggal, setTanggal] = useState(todayStr);
  const [juzHarian, setJuzHarian] = useState<string[]>([]);
  const [hafalanScoresHarian, setHafalanScoresHarian] = useState<number[]>(Array(5).fill(0));
  const [tajwidScoresHarian, setTajwidScoresHarian] = useState<number[]>(Array(5).fill(0));
  const [jenisPenilaian, setJenisPenilaian] = useState<string[]>([]);

  // Pekanan (10 soal)
  const [pekanKe, setPekanKe] = useState("");
  const [bulan, setBulan] = useState(String(new Date().getMonth() + 1));
  const [tahun, setTahun] = useState(String(new Date().getFullYear()));
  const [juzPekanan, setJuzPekanan] = useState<string[]>([]);
  const [halamanDari, setHalamanDari] = useState("");
  const [halamanHingga, setHalamanHingga] = useState("");
  const [hafalanScores, setHafalanScores] = useState<number[]>(Array(10).fill(0));
  const [tajwidScores, setTajwidScores] = useState<number[]>(Array(10).fill(0));
  const [statusLulus, setStatusLulus] = useState<"true" | "false">("true");

  // Bulanan (20 soal)
  const [juzBulanan, setJuzBulanan] = useState<string[]>([]);
  const [totalJuz, setTotalJuz] = useState("");
  const [hafalanScoresBulanan, setHafalanScoresBulanan] = useState<number[]>(Array(20).fill(0));
  const [tajwidScoresBulanan, setTajwidScoresBulanan] = useState<number[]>(Array(20).fill(0));
  const [nilaiAdab, setNilaiAdab] = useState(80);
  const [peringkat, setPeringkat] = useState("");
  const [statusNaikJuz, setStatusNaikJuz] = useState<"true" | "false">("true");
  const [rekomendasi, setRekomendasi] = useState("");

  const avgHafalanHarian = useMemo(() => calcAvg(hafalanScoresHarian), [hafalanScoresHarian]);
  const avgTajwidHarian = useMemo(() => calcAvg(tajwidScoresHarian), [tajwidScoresHarian]);
  const nilaiTotalHarian = useMemo(
    () => Math.round((avgHafalanHarian + avgTajwidHarian) / 2),
    [avgHafalanHarian, avgTajwidHarian]
  );

  const avgHafalanPekan = useMemo(() => calcAvg(hafalanScores), [hafalanScores]);
  const avgTajwidPekan = useMemo(() => calcAvg(tajwidScores), [tajwidScores]);
  const nilaiTotalPekan = useMemo(
    () => Math.round((avgHafalanPekan + avgTajwidPekan) / 2),
    [avgHafalanPekan, avgTajwidPekan]
  );

  const avgHafalanBulanan = useMemo(() => calcAvg(hafalanScoresBulanan), [hafalanScoresBulanan]);
  const avgTajwidBulanan = useMemo(() => calcAvg(tajwidScoresBulanan), [tajwidScoresBulanan]);
  const nilaiAkhirBulan = useMemo(
    () => Math.round(avgHafalanBulanan * 0.5 + avgTajwidBulanan * 0.3 + nilaiAdab * 0.2),
    [avgHafalanBulanan, avgTajwidBulanan, nilaiAdab]
  );

  const { data: students } = useQuery({
    queryKey: ["students-for-ujian"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("role", "siswa").order("full_name");
      return data || [];
    },
    enabled: isGuru,
  });

  const { data: ujianResults } = useQuery({
    queryKey: ["ujian-results", user?.id, role],
    queryFn: async () => {
      let query = supabase.from("ujian").select("*");
      if (role === "siswa") query = query.eq("student_id", user!.id);
      const { data } = await query.order("created_at", { ascending: false });
      if (!data) return [];
      if (isGuru) {
        const studentIds = [...new Set(data.map((r) => r.student_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", studentIds);
        const nameMap: Record<string, string> = {};
        profiles?.forEach((p) => { nameMap[p.user_id] = p.full_name; });
        return data.map((r) => ({ ...r, student_name: nameMap[r.student_id] || "Unknown" }));
      }
      return data;
    },
    enabled: !!user,
  });

  const resetForm = () => {
    setSelectedStudent("");
    setCatatanGuru("");
    setJuzHarian([]); setJenisPenilaian([]);
    setHafalanScoresHarian(Array(5).fill(0)); setTajwidScoresHarian(Array(5).fill(0));
    setPekanKe(""); setJuzPekanan([]); setHalamanDari(""); setHalamanHingga("");
    setHafalanScores(Array(10).fill(0)); setTajwidScores(Array(10).fill(0)); setStatusLulus("true");
    setJuzBulanan([]); setTotalJuz("");
    setHafalanScoresBulanan(Array(20).fill(0)); setTajwidScoresBulanan(Array(20).fill(0));
    setNilaiAdab(80); setPeringkat(""); setStatusNaikJuz("true"); setRekomendasi("");
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const base: any = {
        student_id: selectedStudent,
        created_by: user!.id,
        jenis_ujian: formType,
        catatan_guru: catatanGuru || null,
        bulan: parseInt(bulan),
        tahun: parseInt(tahun),
        juz_tested: "",
        nilai: 0,
      };
      let payload: any = base;
      if (formType === "harian") {
        const d = new Date(tanggal);
        payload = {
          ...base,
          bulan: d.getMonth() + 1,
          tahun: d.getFullYear(),
          tanggal,
          juz_diuji: juzHarian,
          jenis_penilaian: jenisPenilaian.length ? jenisPenilaian : null,
          hafalan_scores: hafalanScoresHarian,
          tajwid_scores: tajwidScoresHarian,
          nilai_kelancaran: avgHafalanHarian,
          nilai_tajwid: avgTajwidHarian,
          nilai_total: nilaiTotalHarian,
          nilai: nilaiTotalHarian,
          juz_tested: juzHarian.join(", "),
        };
      } else if (formType === "pekanan") {
        payload = {
          ...base,
          pekan_ke: pekanKe ? parseInt(pekanKe) : null,
          juz_diuji: juzPekanan,
          ayat_start: halamanDari ? parseInt(halamanDari) : null,
          ayat_end: halamanHingga ? parseInt(halamanHingga) : null,
          nilai_kelancaran: avgHafalanPekan,
          nilai_tajwid: avgTajwidPekan,
          nilai_total: nilaiTotalPekan,
          nilai: nilaiTotalPekan,
          status_lulus: statusLulus === "true",
          juz_tested: juzPekanan.join(", "),
          hafalan_scores: hafalanScores,
          tajwid_scores: tajwidScores,
        };
      } else {
        payload = {
          ...base,
          juz_diuji: juzBulanan,
          hafalan_scores: hafalanScoresBulanan,
          tajwid_scores: tajwidScoresBulanan,
          nilai_kelancaran: avgHafalanBulanan,
          nilai_tajwid: avgTajwidBulanan,
          nilai_adab: nilaiAdab,
          nilai_akhir: nilaiAkhirBulan,
          nilai: nilaiAkhirBulan,
          peringkat: peringkat ? parseInt(peringkat) : null,
          status_naik_juz: statusNaikJuz === "true",
          rekomendasi: rekomendasi || null,
          juz_tested: juzBulanan.join(", "),
          jumlah_ayat: totalJuz ? parseInt(totalJuz) : null,
        };
      }
      const { error } = await supabase.from("ujian").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nilai ujian berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["ujian-results"] });
      resetForm();
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const scoreColor = (n: number) =>
    n >= 80 ? "text-success" : n >= 60 ? "text-warning" : "text-destructive";

  const pekanList = useMemo(() => {
    const nums = (ujianResults || [])
      .filter((r: any) => r.jenis_ujian === "pekanan" && r.pekan_ke != null)
      .map((r: any) => r.pekan_ke as number);
    return [...new Set(nums)].sort((a, b) => a - b);
  }, [ujianResults]);

  const yearList = useMemo(() => {
    const years = (ujianResults || [])
      .filter((r: any) => r.jenis_ujian === "pekanan" && r.tahun != null)
      .map((r: any) => r.tahun as number);
    return [...new Set(years)].sort((a, b) => b - a);
  }, [ujianResults]);

  const filteredResults = useMemo(
    () =>
      (ujianResults || []).filter((r: any) => {
        if (r.jenis_ujian !== "pekanan") return false;
        if (filterBulan !== "semua" && String(r.bulan) !== filterBulan) return false;
        if (filterTahun !== "semua" && String(r.tahun) !== filterTahun) return false;
        if (selectedPekan !== "semua" && String(r.pekan_ke) !== selectedPekan) return false;
        return true;
      }),
    [ujianResults, filterBulan, filterTahun, selectedPekan]
  );

  const toggleArr = (arr: string[], v: string, set: (x: string[]) => void) => {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const canSubmit = () => {
    if (!selectedStudent) return false;
    if (formType === "harian") return juzHarian.length > 0;
    if (formType === "pekanan") return !!pekanKe;
    if (formType === "bulanan") return juzBulanan.length > 0;
    return false;
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" /> Ujian
        </h1>
        <p className="text-sm text-muted-foreground">
          {isGuru ? "Input dan kelola nilai ujian siswa" : "Lihat hasil ujian Anda"}
        </p>
      </div>

      {isGuru && (
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Input Nilai Ujian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={formType} onValueChange={(v) => setFormType(v as JenisUjian)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="harian">Harian</TabsTrigger>
                <TabsTrigger value="pekanan">Pekanan</TabsTrigger>
                <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
              </TabsList>

              <div className="space-y-2 mt-4">
                <Label>Siswa</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger><SelectValue placeholder="Pilih siswa..." /></SelectTrigger>
                  <SelectContent>
                    {students?.map((s) => (
                      <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ── HARIAN: 5 soal ── */}
              <TabsContent value="harian" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Juz yang diuji</Label>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 rounded-md border border-border">
                    {Array.from({ length: 30 }, (_, i) => String(i + 1)).map((j) => (
                      <Badge
                        key={j}
                        variant={juzHarian.includes(j) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleArr(juzHarian, j, setJuzHarian)}
                      >
                        Juz {j}
                      </Badge>
                    ))}
                  </div>
                </div>
                <ScoreGrid label="Hafalan" scores={hafalanScoresHarian} onChange={setHafalanScoresHarian} />
                <ScoreGrid label="Tajwid" scores={tajwidScoresHarian} onChange={setTajwidScoresHarian} />
                <p className="text-sm">
                  Nilai Total:{" "}
                  <span className={`font-bold text-lg ${scoreColor(nilaiTotalHarian)}`}>
                    {nilaiTotalHarian}
                  </span>
                </p>
                <div className="space-y-2">
                  <Label>Jenis Penilaian</Label>
                  <div className="flex flex-wrap gap-4">
                    {PENILAIAN_OPTIONS.map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={jenisPenilaian.includes(opt)}
                          onCheckedChange={() => toggleArr(jenisPenilaian, opt, setJenisPenilaian)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* ── PEKANAN: 10 soal ── */}
              <TabsContent value="pekanan" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Pekan ke-</Label>
                    <Select value={pekanKe} onValueChange={setPekanKe}>
                      <SelectTrigger><SelectValue placeholder="Pilih pekan..." /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((p) => (
                          <SelectItem key={p} value={String(p)}>Pekan {p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Bulan</Label>
                    <Select value={bulan} onValueChange={setBulan}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {monthNames.map((m, i) => (
                          <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tahun</Label>
                    <Input type="number" value={tahun} onChange={(e) => setTahun(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Juz yang diuji</Label>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 rounded-md border border-border">
                    {Array.from({ length: 30 }, (_, i) => String(i + 1)).map((j) => (
                      <Badge
                        key={j}
                        variant={juzPekanan.includes(j) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleArr(juzPekanan, j, setJuzPekanan)}
                      >
                        Juz {j}
                      </Badge>
                    ))}
                  </div>
                </div>
                <ScoreGrid label="Hafalan" scores={hafalanScores} onChange={setHafalanScores} />
                <ScoreGrid label="Tajwid" scores={tajwidScores} onChange={setTajwidScores} />
                <p className="text-sm">
                  Nilai Total:{" "}
                  <span className={`font-bold text-lg ${scoreColor(nilaiTotalPekan)}`}>
                    {nilaiTotalPekan}
                  </span>
                </p>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <RadioGroup
                    value={statusLulus}
                    onValueChange={(v) => setStatusLulus(v as any)}
                    className="flex gap-4"
                  >
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <RadioGroupItem value="true" /> Lulus
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <RadioGroupItem value="false" /> Mengulang
                    </label>
                  </RadioGroup>
                </div>
              </TabsContent>

              {/* ── BULANAN: 20 soal ── */}
              <TabsContent value="bulanan" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Bulan</Label>
                    <Select value={bulan} onValueChange={setBulan}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {monthNames.map((m, i) => (
                          <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tahun</Label>
                    <Input type="number" value={tahun} onChange={(e) => setTahun(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Total Juz diuji</Label>
                  <Input type="number" value={totalJuz} onChange={(e) => setTotalJuz(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Juz yang diuji</Label>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 rounded-md border border-border">
                    {Array.from({ length: 30 }, (_, i) => String(i + 1)).map((j) => (
                      <Badge
                        key={j}
                        variant={juzBulanan.includes(j) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleArr(juzBulanan, j, setJuzBulanan)}
                      >
                        Juz {j}
                      </Badge>
                    ))}
                  </div>
                </div>
                <ScoreGrid label="Hafalan" scores={hafalanScoresBulanan} onChange={setHafalanScoresBulanan} />
                <ScoreGrid label="Tajwid" scores={tajwidScoresBulanan} onChange={setTajwidScoresBulanan} />
                <div className="space-y-2">
                  <Label>
                    Nilai Adab & Akhlak:{" "}
                    <span className="font-semibold text-primary">{nilaiAdab}</span>
                  </Label>
                  <Slider
                    value={[nilaiAdab]}
                    onValueChange={(v) => setNilaiAdab(v[0])}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
                <p className="text-sm">
                  Nilai Akhir:{" "}
                  <span className={`font-bold text-lg ${scoreColor(nilaiAkhirBulan)}`}>
                    {nilaiAkhirBulan}
                  </span>{" "}
                  <span className="text-xs text-muted-foreground">
                    (50% Hafalan + 30% Tajwid + 20% Adab)
                  </span>
                </p>
                <div className="space-y-2">
                  <Label>Peringkat di Kelas (opsional)</Label>
                  <Input type="number" value={peringkat} onChange={(e) => setPeringkat(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Status Naik Juz</Label>
                  <RadioGroup
                    value={statusNaikJuz}
                    onValueChange={(v) => setStatusNaikJuz(v as any)}
                    className="flex gap-4"
                  >
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <RadioGroupItem value="true" /> Ya
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <RadioGroupItem value="false" /> Belum
                    </label>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Rekomendasi (opsional)</Label>
                  <Textarea value={rekomendasi} onChange={(e) => setRekomendasi(e.target.value)} rows={2} />
                </div>
              </TabsContent>

              <div className="space-y-2 mt-4">
                <Label>Catatan Guru</Label>
                <Textarea value={catatanGuru} onChange={(e) => setCatatanGuru(e.target.value)} rows={2} />
              </div>

              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || !canSubmit()}
                className="w-full mt-4"
              >
                {submitMutation.isPending ? "Menyimpan..." : "Simpan Nilai"}
              </Button>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {!isGuru && (
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Hasil Ujian Pekanan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="space-y-1">
                <Label className="text-xs">Bulan</Label>
                <Select value={filterBulan} onValueChange={setFilterBulan}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Bulan</SelectItem>
                    {monthNames.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tahun</Label>
                <Select value={filterTahun} onValueChange={setFilterTahun}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Tahun</SelectItem>
                    {yearList.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {pekanList.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                <Button
                  variant={selectedPekan === "semua" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPekan("semua")}
                >
                  Semua
                </Button>
                {pekanList.map((p) => (
                  <Button
                    key={p}
                    variant={selectedPekan === String(p) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPekan(String(p))}
                  >
                    Pekan {p}
                  </Button>
                ))}
              </div>
            )}

            {filteredResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada data ujian</p>
            ) : (
              <div className="space-y-3">
                {filteredResults.map((r: any) => {
                  const score = r.nilai_total ?? r.nilai;
                  const hafalanLen = r.hafalan_scores?.length || 5;
                  const tajwidLen = r.tajwid_scores?.length || 5;
                  return (
                    <div key={r.id} className="p-3 rounded-xl border border-border/50 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">Pekan {r.pekan_ke}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {monthNames[(r.bulan || 1) - 1]} {r.tahun} — Juz{" "}
                            {(r.juz_diuji || []).join(", ")}
                            {" • "}
                            <span className={r.status_lulus ? "text-success" : "text-warning"}>
                              {r.status_lulus ? "Lulus" : "Mengulang"}
                            </span>
                          </p>
                          {r.catatan_guru && (
                            <p className="text-xs text-muted-foreground italic">"{r.catatan_guru}"</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground">Total</p>
                          <div className={`text-xl font-bold ${scoreColor(score || 0)}`}>{score || 0}</div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border/40 space-y-2">
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium text-muted-foreground">
                            Hafalan — rata-rata:{" "}
                            <span className={`font-bold ${scoreColor(r.nilai_kelancaran || 0)}`}>
                              {r.nilai_kelancaran ?? "-"}
                            </span>
                          </p>
                          <div className={`grid grid-cols-5 gap-1.5`}>
                            {(r.hafalan_scores && r.hafalan_scores.length
                              ? r.hafalan_scores
                              : Array(hafalanLen).fill(null)
                            ).map((s: number | null, i: number) => (
                              <div key={i} className="bg-muted/30 rounded-lg py-1.5 text-center">
                                <p className="text-[9px] text-muted-foreground">S{i + 1}</p>
                                <p className={`text-sm font-bold ${s != null ? scoreColor(s) : "text-muted-foreground"}`}>
                                  {s ?? "-"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium text-muted-foreground">
                            Tajwid — rata-rata:{" "}
                            <span className={`font-bold ${scoreColor(r.nilai_tajwid || 0)}`}>
                              {r.nilai_tajwid ?? "-"}
                            </span>
                          </p>
                          <div className={`grid grid-cols-5 gap-1.5`}>
                            {(r.tajwid_scores && r.tajwid_scores.length
                              ? r.tajwid_scores
                              : Array(tajwidLen).fill(null)
                            ).map((s: number | null, i: number) => (
                              <div key={i} className="bg-muted/30 rounded-lg py-1.5 text-center">
                                <p className="text-[9px] text-muted-foreground">S{i + 1}</p>
                                <p className={`text-sm font-bold ${s != null ? scoreColor(s) : "text-muted-foreground"}`}>
                                  {s ?? "-"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
