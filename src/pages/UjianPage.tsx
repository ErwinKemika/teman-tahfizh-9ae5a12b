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
import { ClipboardCheck, Trash2 } from "lucide-react";

type JenisUjian = "harian" | "pekanan" | "bulanan";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const PENILAIAN_OPTIONS = ["Kelancaran", "Tajwid", "Makhraj"];

export default function UjianPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const isGuru = role === "guru";

  const [formType, setFormType] = useState<JenisUjian>(isGuru ? "pekanan" : "harian");
  const [historyTab, setHistoryTab] = useState<"semua" | JenisUjian>("semua");

  // Common
  const [selectedStudent, setSelectedStudent] = useState("");
  const [catatanGuru, setCatatanGuru] = useState("");
  const todayStr = new Date().toISOString().split("T")[0];

  // Harian
  const [tanggal, setTanggal] = useState(todayStr);
  const [materiSurat, setMateriSurat] = useState("");
  const [ayatStart, setAyatStart] = useState("");
  const [ayatEnd, setAyatEnd] = useState("");
  const [nilaiHarian, setNilaiHarian] = useState(80);
  const [jenisPenilaian, setJenisPenilaian] = useState<string[]>([]);

  // Pekanan
  const [pekanKe, setPekanKe] = useState("");
  const [bulan, setBulan] = useState(String(new Date().getMonth() + 1));
  const [tahun, setTahun] = useState(String(new Date().getFullYear()));
  const [juzPekanan, setJuzPekanan] = useState<string[]>([]);
  const [halamanDari, setHalamanDari] = useState("");
  const [halamanHingga, setHalamanHingga] = useState("");
  const [hafalanScores, setHafalanScores] = useState<number[]>([0, 0, 0, 0, 0]);
  const [tajwidScores, setTajwidScores] = useState<number[]>([0, 0, 0, 0, 0]);
  const [statusLulus, setStatusLulus] = useState<"true" | "false">("true");

  // Bulanan
  const [juzBulanan, setJuzBulanan] = useState<string[]>([]);
  const [totalJuz, setTotalJuz] = useState("");
  const [nilaiHafalan, setNilaiHafalan] = useState(80);
  const [nilaiTajwidBulan, setNilaiTajwidBulan] = useState(80);
  const [nilaiAdab, setNilaiAdab] = useState(80);
  const [peringkat, setPeringkat] = useState("");
  const [statusNaikJuz, setStatusNaikJuz] = useState<"true" | "false">("true");
  const [rekomendasi, setRekomendasi] = useState("");

  const jumlahAyat = useMemo(() => {
    const s = parseInt(ayatStart);
    const e = parseInt(ayatEnd);
    if (!isNaN(s) && !isNaN(e) && e >= s) return e - s + 1;
    return 0;
  }, [ayatStart, ayatEnd]);

  const avgHafalanPekan = useMemo(
    () => Math.round(hafalanScores.reduce((a, b) => a + b, 0) / 5),
    [hafalanScores]
  );
  const avgTajwidPekan = useMemo(
    () => Math.round(tajwidScores.reduce((a, b) => a + b, 0) / 5),
    [tajwidScores]
  );
  const nilaiTotalPekan = useMemo(
    () => Math.round((avgHafalanPekan + avgTajwidPekan) / 2),
    [avgHafalanPekan, avgTajwidPekan]
  );
  const nilaiAkhirBulan = useMemo(
    () => Math.round(nilaiHafalan * 0.5 + nilaiTajwidBulan * 0.3 + nilaiAdab * 0.2),
    [nilaiHafalan, nilaiTajwidBulan, nilaiAdab]
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
    setMateriSurat(""); setAyatStart(""); setAyatEnd(""); setJenisPenilaian([]); setNilaiHarian(80);
    setPekanKe(""); setJuzPekanan([]); setHalamanDari(""); setHalamanHingga("");
    setHafalanScores([0, 0, 0, 0, 0]); setTajwidScores([0, 0, 0, 0, 0]); setStatusLulus("true");
    setJuzBulanan([]); setTotalJuz(""); setNilaiHafalan(80); setNilaiTajwidBulan(80);
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
          materi_surat: materiSurat,
          ayat_start: ayatStart ? parseInt(ayatStart) : null,
          ayat_end: ayatEnd ? parseInt(ayatEnd) : null,
          jumlah_ayat: jumlahAyat || null,
          jenis_penilaian: jenisPenilaian.length ? jenisPenilaian : null,
          nilai: nilaiHarian,
          juz_tested: materiSurat,
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
        };
      } else {
        payload = {
          ...base,
          juz_diuji: juzBulanan,
          nilai_kelancaran: null,
          nilai_tajwid: nilaiTajwidBulan,
          nilai_adab: nilaiAdab,
          nilai_akhir: nilaiAkhirBulan,
          nilai: nilaiAkhirBulan,
          peringkat: peringkat ? parseInt(peringkat) : null,
          status_naik_juz: statusNaikJuz === "true",
          rekomendasi: rekomendasi || null,
          juz_tested: juzBulanan.join(", "),
          jumlah_ayat: totalJuz ? parseInt(totalJuz) : null,
        };
        // store nilai_hafalan in nilai_kelancaran column for storage reuse
        payload.nilai_kelancaran = nilaiHafalan;
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ujian").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Data ujian dihapus");
      queryClient.invalidateQueries({ queryKey: ["ujian-results"] });
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const scoreColor = (n: number) => n >= 80 ? "text-success" : n >= 60 ? "text-warning" : "text-destructive";

  const filteredResults = (ujianResults || []).filter((r: any) =>
    historyTab === "semua" ? true : r.jenis_ujian === historyTab
  );

  const toggleArr = (arr: string[], v: string, set: (x: string[]) => void) => {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const canSubmit = () => {
    if (!selectedStudent) return false;
    if (formType === "harian") return !!materiSurat;
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
              {!isGuru && (
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="harian">Harian</TabsTrigger>
                  <TabsTrigger value="pekanan">Pekanan</TabsTrigger>
                  <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
                </TabsList>
              )}

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

              <TabsContent value="harian" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2 col-span-3 sm:col-span-1">
                    <Label>Surat</Label>
                    <Input placeholder="Al-Baqarah" value={materiSurat} onChange={(e) => setMateriSurat(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ayat dari</Label>
                    <Input type="number" value={ayatStart} onChange={(e) => setAyatStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ayat hingga</Label>
                    <Input type="number" value={ayatEnd} onChange={(e) => setAyatEnd(e.target.value)} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Jumlah ayat: <span className="font-semibold text-foreground">{jumlahAyat}</span></p>
                <div className="space-y-2">
                  <Label>Nilai: <span className="font-semibold text-primary">{nilaiHarian}</span></Label>
                  <div className="flex gap-3 items-center">
                    <Slider value={[nilaiHarian]} onValueChange={(v) => setNilaiHarian(v[0])} min={0} max={100} step={1} className="flex-1" />
                    <Input type="number" min={0} max={100} value={nilaiHarian} onChange={(e) => setNilaiHarian(Number(e.target.value))} className="w-20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Jenis Penilaian</Label>
                  <div className="flex flex-wrap gap-4">
                    {PENILAIAN_OPTIONS.map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={jenisPenilaian.includes(opt)} onCheckedChange={() => toggleArr(jenisPenilaian, opt, setJenisPenilaian)} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              </TabsContent>

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
                        {monthNames.map((m, i) => (<SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>))}
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
                      >Juz {j}</Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Hafalan <span className="text-xs text-muted-foreground font-normal">(rata-rata: {avgHafalanPekan})</span></Label>
                  <div className="grid grid-cols-5 gap-2">
                    {hafalanScores.map((score, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-xs text-center text-muted-foreground">Soal {i + 1}</p>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={score}
                          onChange={(e) => {
                            const next = [...hafalanScores];
                            next[i] = Number(e.target.value);
                            setHafalanScores(next);
                          }}
                          className="text-center px-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tajwid <span className="text-xs text-muted-foreground font-normal">(rata-rata: {avgTajwidPekan})</span></Label>
                  <div className="grid grid-cols-5 gap-2">
                    {tajwidScores.map((score, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-xs text-center text-muted-foreground">Soal {i + 1}</p>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={score}
                          onChange={(e) => {
                            const next = [...tajwidScores];
                            next[i] = Number(e.target.value);
                            setTajwidScores(next);
                          }}
                          className="text-center px-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-sm">Nilai Total: <span className={`font-bold text-lg ${scoreColor(nilaiTotalPekan)}`}>{nilaiTotalPekan}</span></p>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <RadioGroup value={statusLulus} onValueChange={(v) => setStatusLulus(v as any)} className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="true" /> Lulus</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="false" /> Mengulang</label>
                  </RadioGroup>
                </div>
              </TabsContent>

              <TabsContent value="bulanan" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Bulan</Label>
                    <Select value={bulan} onValueChange={setBulan}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {monthNames.map((m, i) => (<SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>))}
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
                      >Juz {j}</Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nilai Hafalan: <span className="font-semibold text-primary">{nilaiHafalan}</span></Label>
                  <Slider value={[nilaiHafalan]} onValueChange={(v) => setNilaiHafalan(v[0])} min={0} max={100} step={1} />
                </div>
                <div className="space-y-2">
                  <Label>Nilai Tajwid: <span className="font-semibold text-primary">{nilaiTajwidBulan}</span></Label>
                  <Slider value={[nilaiTajwidBulan]} onValueChange={(v) => setNilaiTajwidBulan(v[0])} min={0} max={100} step={1} />
                </div>
                <div className="space-y-2">
                  <Label>Nilai Adab & Akhlak: <span className="font-semibold text-primary">{nilaiAdab}</span></Label>
                  <Slider value={[nilaiAdab]} onValueChange={(v) => setNilaiAdab(v[0])} min={0} max={100} step={1} />
                </div>
                <p className="text-sm">Nilai Akhir: <span className={`font-bold text-lg ${scoreColor(nilaiAkhirBulan)}`}>{nilaiAkhirBulan}</span> <span className="text-xs text-muted-foreground">(50% Hafalan + 30% Tajwid + 20% Adab)</span></p>
                <div className="space-y-2">
                  <Label>Peringkat di Kelas (opsional)</Label>
                  <Input type="number" value={peringkat} onChange={(e) => setPeringkat(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Status Naik Juz</Label>
                  <RadioGroup value={statusNaikJuz} onValueChange={(v) => setStatusNaikJuz(v as any)} className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="true" /> Ya</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="false" /> Belum</label>
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

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Hasil Ujian</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={historyTab} onValueChange={(v) => setHistoryTab(v as any)}>
            <TabsList className="grid grid-cols-4 w-full mb-4">
              <TabsTrigger value="semua">Semua</TabsTrigger>
              <TabsTrigger value="harian">Harian</TabsTrigger>
              <TabsTrigger value="pekanan">Pekanan</TabsTrigger>
              <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredResults.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada data ujian</p>
          ) : (
            <div className="space-y-2">
              {filteredResults.map((r: any) => {
                const jenis: JenisUjian = r.jenis_ujian || "bulanan";
                const score = jenis === "bulanan" ? (r.nilai_akhir ?? r.nilai) : jenis === "pekanan" ? (r.nilai_total ?? r.nilai) : r.nilai;
                return (
                  <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/50">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] capitalize">{jenis}</Badge>
                        {isGuru && r.student_name && (
                          <p className="text-sm font-medium text-foreground">{r.student_name}</p>
                        )}
                      </div>
                      {jenis === "harian" && (
                        <p className="text-xs text-muted-foreground">
                          {r.tanggal || `${monthNames[(r.bulan || 1) - 1]} ${r.tahun}`} — {r.materi_surat}
                          {r.ayat_start && `: ${r.ayat_start}-${r.ayat_end}`}
                        </p>
                      )}
                      {jenis === "pekanan" && (
                        <p className="text-xs text-muted-foreground">
                          Pekan ke-{r.pekan_ke} {monthNames[(r.bulan || 1) - 1]} {r.tahun} — Juz {(r.juz_diuji || []).join(", ")}
                          {" • "}
                          <span className={r.status_lulus ? "text-success" : "text-warning"}>
                            {r.status_lulus ? "Lulus" : "Mengulang"}
                          </span>
                        </p>
                      )}
                      {jenis === "bulanan" && (
                        <p className="text-xs text-muted-foreground">
                          {monthNames[(r.bulan || 1) - 1]} {r.tahun} — Naik Juz: {r.status_naik_juz ? "✓" : "✗"}
                          {r.peringkat && ` • Peringkat ${r.peringkat}`}
                        </p>
                      )}
                      {r.catatan_guru && (
                        <p className="text-xs text-muted-foreground italic">"{r.catatan_guru}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-xl font-bold ${scoreColor(score || 0)}`}>{score || 0}</div>
                      {isGuru && (
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(r.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
