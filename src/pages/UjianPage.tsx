import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardCheck, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function UjianPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  // Guru: form state
  const [selectedStudent, setSelectedStudent] = useState("");
  const [bulan, setBulan] = useState(String(new Date().getMonth() + 1));
  const [tahun, setTahun] = useState(String(new Date().getFullYear()));
  const [juzTested, setJuzTested] = useState("");
  const [nilai, setNilai] = useState("");
  const [catatanGuru, setCatatanGuru] = useState("");

  const { data: students } = useQuery({
    queryKey: ["students-for-ujian"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("role", "siswa").order("full_name");
      return data || [];
    },
    enabled: role === "guru",
  });

  const { data: ujianResults } = useQuery({
    queryKey: ["ujian-results", user?.id, role],
    queryFn: async () => {
      let query = supabase.from("ujian").select("*");
      if (role === "siswa") {
        query = query.eq("student_id", user!.id);
      }
      const { data } = await query.order("tahun", { ascending: false }).order("bulan", { ascending: false });
      if (!data) return [];
      // Fetch student names for guru view
      if (role === "guru") {
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

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ujian").insert({
        student_id: selectedStudent,
        bulan: parseInt(bulan),
        tahun: parseInt(tahun),
        juz_tested: juzTested,
        nilai: parseInt(nilai),
        catatan_guru: catatanGuru || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nilai ujian berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["ujian-results"] });
      setSelectedStudent("");
      setJuzTested("");
      setNilai("");
      setCatatanGuru("");
    },
    onError: (e) => toast.error("Gagal: " + e.message),
  });

  const scoreColor = (n: number) => n >= 80 ? "text-success" : n >= 60 ? "text-warning" : "text-destructive";

  // Chart data for siswa
  const chartData = role === "siswa"
    ? ujianResults?.map((r: any) => ({
        period: `${r.bulan}/${r.tahun}`,
        nilai: r.nilai,
      })).reverse()
    : [];

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" /> Ujian
        </h1>
        <p className="text-sm text-muted-foreground">
          {role === "guru" ? "Input dan kelola nilai ujian siswa" : "Lihat hasil ujian Anda"}
        </p>
      </div>

      {/* Guru: Input Form */}
      {role === "guru" && (
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Input Nilai Ujian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
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
                <Input value={tahun} onChange={(e) => setTahun(e.target.value)} type="number" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Juz yang Diuji</Label>
                <Input placeholder="Contoh: Juz 1-3" value={juzTested} onChange={(e) => setJuzTested(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nilai (0-100)</Label>
                <Input type="number" min={0} max={100} value={nilai} onChange={(e) => setNilai(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catatan Guru</Label>
              <Textarea placeholder="Catatan untuk siswa..." value={catatanGuru} onChange={(e) => setCatatanGuru(e.target.value)} rows={2} />
            </div>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || !selectedStudent || !juzTested || !nilai}
              className="w-full"
            >
              {submitMutation.isPending ? "Menyimpan..." : "Simpan Nilai"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Siswa: Score trend chart */}
      {role === "siswa" && chartData && chartData.length > 1 && (
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Tren Nilai
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Line type="monotone" dataKey="nilai" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Hasil Ujian</CardTitle>
        </CardHeader>
        <CardContent>
          {ujianResults?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada data ujian</p>
          ) : (
            <div className="space-y-2">
              {ujianResults?.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50">
                  <div className="flex-1 min-w-0">
                    {role === "guru" && (
                      <p className="text-sm font-medium text-foreground">{r.profiles?.full_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {monthNames[(r.bulan || 1) - 1]} {r.tahun} — {r.juz_tested}
                    </p>
                    {r.catatan_guru && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{r.catatan_guru}"</p>
                    )}
                  </div>
                  <div className={`text-xl font-bold ${scoreColor(r.nilai)}`}>{r.nilai}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
