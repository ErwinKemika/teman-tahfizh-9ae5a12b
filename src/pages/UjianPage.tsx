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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";

type JenisUjian = "harian" | "pekanan" | "bulanan";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

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
              placeholder="0"
              value={score || ""}
              onChange={(e) => {
                const next = [...scores];
                next[i] = e.target.value === "" ? 0 : Number(e.target.value);
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
  const [filterJenis, setFilterJenis] = useState<string>("semua");
  const [filterBulan, setFilterBulan] = useState<string>("semua");
  const [filterTahun, setFilterTahun] = useState<string>(String(new Date().getFullYear()));

  // Common
  const [selectedStudent, setSelectedStudent] = useState("");
  const [catatanGuru, setCatatanGuru] = useState("");
  const todayStr = new Date().toLocaleDateString("en-CA");

  // Shared (Harian & Pekanan)
  const [murojaahQadhimTsnai, setMurojaahQadhimTsnai] = useState("");
  const [murojaahQadhimFardhi, setMurojaahQadhimFardhi] = useState("");

  // Harian
  const [tanggal, setTanggal] = useState(todayStr);
  const [juzHarian, setJuzHarian] = useState<string[]>([]);
  const [hafalanScoresHarian, setHafalanScoresHarian] = useState<number[]>(Array(5).fill(0));
  const [tajwidScoresHarian, setTajwidScoresHarian] = useState<number[]>(Array(5).fill(0));

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
    setJuzHarian([]);
    setHafalanScoresHarian(Array(5).fill(0)); setTajwidScoresHarian(Array(5).fill(0));
    setPekanKe(""); setJuzPekanan([]); setHalamanDari(""); setHalamanHingga("");
    setHafalanScores(Array(10).fill(0)); setTajwidScores(Array(10).fill(0)); setStatusLulus("true");
    setMurojaahQadhimTsnai(""); setMurojaahQadhimFardhi("");
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
          hafalan_scores: hafalanScoresHarian,
          tajwid_scores: tajwidScoresHarian,
          nilai_kelancaran: avgHafalanHarian,
          nilai_tajwid: avgTajwidHarian,
          nilai_total: nilaiTotalHarian,
          nilai: nilaiTotalHarian,
          juz_tested: juzHarian.join(", "),
          murojaah_qadhim_tsnai: murojaahQadhimTsnai || null,
          murojaah_qadhim_fardhi: murojaahQadhimFardhi || null,
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
          murojaah_qadhim_tsnai: murojaahQadhimTsnai || null,
          murojaah_qadhim_fardhi: murojaahQadhimFardhi || null,
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
      .filter((r: any) => r.tahun != null)
      .map((r: any) => r.tahun as number);
    return [...new Set(years)].sort((a, b) => b - a);
  }, [ujianResults]);

  const filteredResults = useMemo(
    () =>
      (ujianResults || []).filter((r: any) => {
        if (filterJenis !== "semua" && r.jenis_ujian !== filterJenis) return false;
        if (filterBulan !== "semua" && String(r.bulan) !== filterBulan) return false;
        if (filterTahun !== "semua" && String(r.tahun) !== filterTahun) return false;
        if (selectedPekan !== "semua" && r.jenis_ujian === "pekanan" && String(r.pekan_ke) !== selectedPekan) return false;
        return true;
      }),
    [ujianResults, filterJenis, filterBulan, filterTahun, selectedPekan]
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
                  <Label className="font-semibold">Muraja'ah Hifdzul Qadhim</Label>
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                      <span className="text-sm text-muted-foreground sm:w-20 shrink-0">Tsuna'i</span>
                      <Input placeholder="Contoh: Juz 30 / Juz 20" value={murojaahQadhimTsnai} onChange={(e) => setMurojaahQadhimTsnai(e.target.value)} className="sm:flex-1" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                      <span className="text-sm text-muted-foreground sm:w-20 shrink-0">Fardhi</span>
                      <Input placeholder="Contoh: Juz 29 / Juz 1" value={murojaahQadhimFardhi} onChange={(e) => setMurojaahQadhimFardhi(e.target.value)} className="sm:flex-1" />
                    </div>
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
                <div className="space-y-2">
                  <Label className="font-semibold">Muraja'ah Hifdzul Qadhim</Label>
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                      <span className="text-sm text-muted-foreground sm:w-20 shrink-0">Tsuna'i</span>
                      <Input placeholder="Contoh: Juz 30 / Juz 20" value={murojaahQadhimTsnai} onChange={(e) => setMurojaahQadhimTsnai(e.target.value)} className="sm:flex-1" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                      <span className="text-sm text-muted-foreground sm:w-20 shrink-0">Fardhi</span>
                      <Input placeholder="Contoh: Juz 29 / Juz 1" value={murojaahQadhimFardhi} onChange={(e) => setMurojaahQadhimFardhi(e.target.value)} className="sm:flex-1" />
                    </div>
                  </div>
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
            <CardTitle className="text-base">Hasil Ujian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Tabs value={filterJenis} onValueChange={setFilterJenis}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="semua" className="text-xs">Semua</TabsTrigger>
                <TabsTrigger value="harian" className="text-xs">Harian</TabsTrigger>
                <TabsTrigger value="pekanan" className="text-xs">Pekanan</TabsTrigger>
                <TabsTrigger value="bulanan" className="text-xs">Bulanan</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-2 gap-2">
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

            {(filterJenis === "pekanan" || filterJenis === "semua") && pekanList.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <Button variant={selectedPekan === "semua" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setSelectedPekan("semua")}>Semua Pekan</Button>
                {pekanList.map((p) => (
                  <Button key={p} variant={selectedPekan === String(p) ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setSelectedPekan(String(p))}>Pekan {p}</Button>
                ))}
              </div>
            )}

            {filteredResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada data ujian</p>
            ) : (
              <div className="space-y-3">
                {filteredResults.map((r: any) => {
                  const jenis = r.jenis_ujian as string;
                  const score = jenis === "bulanan" ? (r.nilai_akhir ?? r.nilai) : (r.nilai_total ?? r.nilai);
                  const jenisLabel = jenis === "harian" ? "Harian" : jenis === "pekanan" ? "Pekanan" : "Bulanan";
                  const jenisClass = jenis === "harian" ? "bg-primary/10 text-primary border-primary/20" : jenis === "pekanan" ? "bg-secondary/10 text-secondary border-secondary/20" : "bg-highlight/10 text-highlight border-highlight/20";

                  let meta = "";
                  if (jenis === "harian") {
                    meta = r.tanggal ? new Date(r.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";
                  } else {
                    meta = `${monthNames[(r.bulan || 1) - 1]} ${r.tahun}`;
                    if (jenis === "pekanan" && r.pekan_ke) meta = `Pekan ${r.pekan_ke} · ${meta}`;
                  }
                  const juzLabel = (r.juz_diuji || []).length ? `Juz ${(r.juz_diuji || []).join(", ")}` : r.juz_tested || "";
                  const scores_h = r.hafalan_scores?.length ? r.hafalan_scores : Array(r.hafalan_scores?.length || 5).fill(null);
                  const scores_t = r.tajwid_scores?.length ? r.tajwid_scores : Array(r.tajwid_scores?.length || 5).fill(null);

                  return (
                    <div key={r.id} className="p-3 rounded-xl border border-border/50 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <Badge variant="outline" className={`text-[10px] ${jenisClass}`}>{jenisLabel}</Badge>
                          <p className="text-xs text-muted-foreground">
                            {meta}{juzLabel ? ` — ${juzLabel}` : ""}
                            {jenis === "pekanan" && (
                              <span className={r.status_lulus ? " text-success" : " text-warning"}>
                                {" • "}{r.status_lulus ? "Lulus" : "Mengulang"}
                              </span>
                            )}
                            {jenis === "bulanan" && r.status_naik_juz != null && (
                              <span className={r.status_naik_juz ? " text-success" : " text-warning"}>
                                {" • "}{r.status_naik_juz ? "Naik Juz" : "Belum Naik"}
                              </span>
                            )}
                          </p>
                          {(r.murojaah_qadhim_tsnai || r.murojaah_qadhim_fardhi) && (
                            <p className="text-xs text-muted-foreground">
                              Qadhim — Tsuna'i: <span className="text-foreground">{r.murojaah_qadhim_tsnai || "-"}</span>
                              {" | "}Fardhi: <span className="text-foreground">{r.murojaah_qadhim_fardhi || "-"}</span>
                            </p>
                          )}
                          {r.catatan_guru && (
                            <p className="text-xs text-muted-foreground italic">"{r.catatan_guru}"</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground">{jenis === "bulanan" ? "Akhir" : "Total"}</p>
                          <div className={`text-xl font-bold ${scoreColor(score || 0)}`}>{score || 0}</div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border/40 space-y-2">
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium text-muted-foreground">Hafalan — rata-rata: {r.nilai_kelancaran ?? "-"}</p>
                          <div className="grid grid-cols-5 gap-1.5">
                            {scores_h.map((s: number | null, i: number) => (
                              <div key={i} className="bg-muted/30 rounded-lg py-1.5 text-center">
                                <p className="text-[9px] text-muted-foreground">S{i + 1}</p>
                                <p className={`text-sm font-bold ${s != null ? scoreColor(s) : "text-muted-foreground"}`}>{s ?? "-"}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium text-muted-foreground">Tajwid — rata-rata: {r.nilai_tajwid ?? "-"}</p>
                          <div className="grid grid-cols-5 gap-1.5">
                            {scores_t.map((s: number | null, i: number) => (
                              <div key={i} className="bg-muted/30 rounded-lg py-1.5 text-center">
                                <p className="text-[9px] text-muted-foreground">S{i + 1}</p>
                                <p className={`text-sm font-bold ${s != null ? scoreColor(s) : "text-muted-foreground"}`}>{s ?? "-"}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        {jenis === "bulanan" && r.nilai_adab != null && (
                          <p className="text-xs text-muted-foreground">
                            Adab & Akhlak: <span className={`font-bold ${scoreColor(r.nilai_adab)}`}>{r.nilai_adab}</span>
                            {r.peringkat ? ` · Peringkat ke-${r.peringkat}` : ""}
                          </p>
                        )}
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
