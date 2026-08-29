import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardList, Trash2 } from "lucide-react";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const scoreColor = (n: number) =>
  n >= 80 ? "text-success" : n >= 60 ? "text-warning" : "text-destructive";

const jenisConfig = {
  harian:  { label: "Harian",  className: "bg-primary/10 text-primary border-primary/20" },
  pekanan: { label: "Pekanan", className: "bg-secondary/10 text-secondary border-secondary/20" },
  bulanan: { label: "Bulanan", className: "bg-highlight/10 text-highlight border-highlight/20" },
} as const;

function ScoreRow({ scores, label }: { scores: number[] | null; label: string }) {
  const list = scores && scores.length ? scores : Array(5).fill(null);
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      <div className="grid grid-cols-5 gap-1.5">
        {list.map((s: number | null, i: number) => (
          <div key={i} className="bg-muted/30 rounded-lg py-1.5 text-center">
            <p className="text-[9px] text-muted-foreground">S{i + 1}</p>
            <p className={`text-sm font-bold ${s != null ? scoreColor(s) : "text-muted-foreground"}`}>
              {s ?? "-"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HasilUjianPage() {
  const { user, role, profile } = useAuth();
  const queryClient = useQueryClient();
  const isGuru = role === "guru";

  const currentYear = new Date().getFullYear();

  const [filterJenis, setFilterJenis] = useState<string>("semua");
  const [filterBulan, setFilterBulan] = useState<string>("semua");
  const [filterTahun, setFilterTahun] = useState<string>(String(currentYear));
  const [filterSiswa, setFilterSiswa] = useState<string>("semua");
  const [selectedPekan, setSelectedPekan] = useState<string>("semua");

  const { data: students } = useQuery({
    queryKey: ["students-for-hasil", profile?.lembaga_id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("role", "siswa").eq("lembaga_id", profile!.lembaga_id).order("full_name");
      return data || [];
    },
    enabled: isGuru && !!profile?.lembaga_id,
  });

  const { data: ujianResults } = useQuery({
    queryKey: ["hasil-ujian-results", user?.id, role],
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ujian").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Data ujian dihapus");
      queryClient.invalidateQueries({ queryKey: ["hasil-ujian-results"] });
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const pekanList = useMemo(() => {
    const nums = (ujianResults || [])
      .filter((r: any) => r.jenis_ujian === "pekanan" && r.pekan_ke != null)
      .map((r: any) => r.pekan_ke as number);
    return [...new Set(nums)].sort((a, b) => a - b);
  }, [ujianResults]);

  const filteredResults = useMemo(() => {
    return (ujianResults || []).filter((r: any) => {
      if (filterJenis !== "semua" && r.jenis_ujian !== filterJenis) return false;
      if (filterBulan !== "semua" && String(r.bulan) !== filterBulan) return false;
      if (filterTahun !== "semua" && String(r.tahun) !== filterTahun) return false;
      if (filterSiswa !== "semua" && r.student_id !== filterSiswa) return false;
      if (selectedPekan !== "semua" && r.jenis_ujian === "pekanan" && String(r.pekan_ke) !== selectedPekan) return false;
      return true;
    });
  }, [ujianResults, filterJenis, filterBulan, filterTahun, filterSiswa, selectedPekan]);

  const yearOptions = useMemo(() => {
    const years = (ujianResults || []).map((r: any) => r.tahun).filter(Boolean);
    return [...new Set([...years, currentYear])].sort((a: number, b: number) => b - a);
  }, [ujianResults]);

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" /> Hasil Ujian
        </h1>
        <p className="text-sm text-muted-foreground">
          {isGuru ? "Rekap hasil ujian seluruh siswa" : "Rekap hasil ujian Anda"}
        </p>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="py-4 space-y-3">
          {/* Jenis tabs */}
          <Tabs value={filterJenis} onValueChange={setFilterJenis}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="semua" className="text-xs">Semua</TabsTrigger>
              <TabsTrigger value="harian" className="text-xs">Harian</TabsTrigger>
              <TabsTrigger value="pekanan" className="text-xs">Pekanan</TabsTrigger>
              <TabsTrigger value="bulanan" className="text-xs">Bulanan</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className={`grid gap-3 ${isGuru ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
            <div className="space-y-1">
              <Label className="text-xs">Bulan</Label>
              <Select value={filterBulan} onValueChange={setFilterBulan}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
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
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Tahun</SelectItem>
                  {yearOptions.map((y: number) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isGuru && (
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Nama Siswa</Label>
                <Select value={filterSiswa} onValueChange={setFilterSiswa}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Siswa</SelectItem>
                    {students?.map((s) => (
                      <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Pekan filter — hanya muncul kalau filter pekanan aktif */}
          {(filterJenis === "pekanan" || filterJenis === "semua") && pekanList.length > 0 && (
            <div className="flex gap-2 flex-wrap pt-1">
              <Button
                variant={selectedPekan === "semua" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelectedPekan("semua")}
              >Semua Pekan</Button>
              {pekanList.map((p) => (
                <Button
                  key={p}
                  variant={selectedPekan === String(p) ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSelectedPekan(String(p))}
                >Pekan {p}</Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{filteredResults.length} hasil ditemukan</p>
          {(filterJenis !== "semua" || filterBulan !== "semua" || filterSiswa !== "semua" || selectedPekan !== "semua") && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => { setFilterJenis("semua"); setFilterBulan("semua"); setFilterSiswa("semua"); setSelectedPekan("semua"); }}
            >Reset filter</Button>
          )}
        </div>

        {filteredResults.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Belum ada data ujian sesuai filter</p>
            </CardContent>
          </Card>
        ) : (
          filteredResults.map((r: any) => {
            const jenis = r.jenis_ujian as keyof typeof jenisConfig;
            const jenisCfg = jenisConfig[jenis] ?? jenisConfig.harian;
            const score = jenis === "bulanan" ? (r.nilai_akhir ?? r.nilai) : (r.nilai_total ?? r.nilai);

            // Metadata line
            let meta = "";
            if (jenis === "harian") {
              meta = r.tanggal ? new Date(r.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";
            } else {
              meta = `${monthNames[(r.bulan || 1) - 1]} ${r.tahun}`;
              if (jenis === "pekanan" && r.pekan_ke) meta = `Pekan ${r.pekan_ke} · ${meta}`;
            }

            const juzLabel = (r.juz_diuji || []).length
              ? `Juz ${(r.juz_diuji || []).join(", ")}`
              : r.juz_tested || "";

            return (
              <div key={r.id} className="p-3 rounded-xl border border-border/50 bg-card shadow-card space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] ${jenisCfg.className}`}>
                        {jenisCfg.label}
                      </Badge>
                      {isGuru && r.student_name && (
                        <p className="text-sm font-medium text-foreground">{r.student_name}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {meta}{juzLabel ? ` — ${juzLabel}` : ""}
                      {jenis === "pekanan" && (
                        <span className={r.status_lulus ? " • text-success" : " • text-warning"}>
                          {" "}{r.status_lulus ? "Lulus" : "Mengulang"}
                        </span>
                      )}
                      {jenis === "bulanan" && r.status_naik_juz != null && (
                        <span className={r.status_naik_juz ? " • text-success" : " • text-warning"}>
                          {" "}{r.status_naik_juz ? "Naik Juz" : "Belum Naik"}
                        </span>
                      )}
                    </p>
                    {r.catatan_guru && (
                      <p className="text-xs text-muted-foreground italic">"{r.catatan_guru}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">
                        {jenis === "bulanan" ? "Akhir" : "Total"}
                      </p>
                      <div className={`text-xl font-bold ${scoreColor(score || 0)}`}>{score || 0}</div>
                    </div>
                    {isGuru && (
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(r.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 space-y-2">
                  <ScoreRow
                    scores={r.hafalan_scores}
                    label={`Hafalan — rata-rata: ${r.nilai_kelancaran ?? "-"}`}
                  />
                  <ScoreRow
                    scores={r.tajwid_scores}
                    label={`Tajwid — rata-rata: ${r.nilai_tajwid ?? "-"}`}
                  />
                  {jenis === "bulanan" && r.nilai_adab != null && (
                    <p className="text-xs text-muted-foreground">
                      Adab & Akhlak: <span className={`font-bold ${scoreColor(r.nilai_adab)}`}>{r.nilai_adab}</span>
                      {r.peringkat ? ` · Peringkat ke-${r.peringkat}` : ""}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
