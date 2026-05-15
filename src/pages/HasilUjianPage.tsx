import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardList, Trash2 } from "lucide-react";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const scoreColor = (n: number) =>
  n >= 80 ? "text-success" : n >= 60 ? "text-warning" : "text-destructive";

export default function HasilUjianPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const isGuru = role === "guru";

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [filterBulan, setFilterBulan] = useState<string>("semua");
  const [filterTahun, setFilterTahun] = useState<string>(String(currentYear));
  const [filterSiswa, setFilterSiswa] = useState<string>("semua");
  const [selectedPekan, setSelectedPekan] = useState<string>("semua");

  const { data: students } = useQuery({
    queryKey: ["students-for-hasil"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("role", "siswa").order("full_name");
      return data || [];
    },
    enabled: isGuru,
  });

  const { data: ujianResults } = useQuery({
    queryKey: ["hasil-ujian-results", user?.id, role],
    queryFn: async () => {
      let query = supabase.from("ujian").select("*").eq("jenis_ujian", "pekanan");
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
      .filter((r: any) => r.pekan_ke != null)
      .map((r: any) => r.pekan_ke as number);
    return [...new Set(nums)].sort((a, b) => a - b);
  }, [ujianResults]);

  const filteredResults = useMemo(() => {
    return (ujianResults || []).filter((r: any) => {
      if (filterBulan !== "semua" && String(r.bulan) !== filterBulan) return false;
      if (filterTahun !== "semua" && String(r.tahun) !== filterTahun) return false;
      if (filterSiswa !== "semua" && r.student_id !== filterSiswa) return false;
      if (selectedPekan !== "semua" && String(r.pekan_ke) !== selectedPekan) return false;
      return true;
    });
  }, [ujianResults, filterBulan, filterTahun, filterSiswa, selectedPekan]);

  const yearOptions = useMemo(() => {
    const years = (ujianResults || []).map((r: any) => r.tahun).filter(Boolean);
    const unique = [...new Set([...years, currentYear])].sort((a, b) => b - a);
    return unique;
  }, [ujianResults]);

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" /> Hasil Ujian
        </h1>
        <p className="text-sm text-muted-foreground">
          {isGuru ? "Rekap hasil ujian pekanan seluruh siswa" : "Rekap hasil ujian pekanan Anda"}
        </p>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="py-4 space-y-3">
          <div className={`grid gap-3 ${isGuru ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"}`}>
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
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isGuru && (
              <div className="space-y-1 col-span-2 sm:col-span-2">
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

          {/* Pekan filter */}
          {pekanList.length > 0 && (
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
          <p className="text-sm text-muted-foreground">
            {filteredResults.length} hasil ditemukan
          </p>
          {(filterBulan !== "semua" || filterSiswa !== "semua" || selectedPekan !== "semua") && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => { setFilterBulan("semua"); setFilterSiswa("semua"); setSelectedPekan("semua"); }}
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
            const score = r.nilai_total ?? r.nilai;
            return (
              <div key={r.id} className="p-3 rounded-xl border border-border/50 bg-card shadow-card space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">Pekan {r.pekan_ke}</Badge>
                      {isGuru && r.student_name && (
                        <p className="text-sm font-medium text-foreground">{r.student_name}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {monthNames[(r.bulan || 1) - 1]} {r.tahun} — Juz {(r.juz_diuji || []).join(", ")}
                      {" • "}
                      <span className={r.status_lulus ? "text-success" : "text-warning"}>
                        {r.status_lulus ? "Lulus" : "Mengulang"}
                      </span>
                    </p>
                    {r.catatan_guru && (
                      <p className="text-xs text-muted-foreground italic">"{r.catatan_guru}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Total</p>
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
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground">
                      Hafalan — rata-rata:{" "}
                      <span className={`font-bold ${scoreColor(r.nilai_kelancaran || 0)}`}>
                        {r.nilai_kelancaran ?? "-"}
                      </span>
                    </p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(r.hafalan_scores && r.hafalan_scores.length === 5
                        ? r.hafalan_scores
                        : [null, null, null, null, null]
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
                    <div className="grid grid-cols-5 gap-1.5">
                      {(r.tajwid_scores && r.tajwid_scores.length === 5
                        ? r.tajwid_scores
                        : [null, null, null, null, null]
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
          })
        )}
      </div>
    </div>
  );
}
