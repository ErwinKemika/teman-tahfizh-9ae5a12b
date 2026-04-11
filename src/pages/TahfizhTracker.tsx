import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { BookOpen, Star } from "lucide-react";

const statusColors: Record<string, string> = {
  belum_dihafalkan: "bg-destructive/10 text-destructive",
  murajaah: "bg-warning/10 text-warning",
  tasmi_done: "bg-success/10 text-success",
  mutqin: "bg-highlight/10 text-highlight",
};

const statusLabels: Record<string, string> = {
  belum_dihafalkan: "Belum",
  murajaah: "Muraja'ah",
  tasmi_done: "Tasmi'",
  mutqin: "Mutqin",
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedJuz, setSelectedJuz] = useState("1");
  const [editEntry, setEditEntry] = useState<EditEntry | null>(null);

  const { data: entries } = useQuery({
    queryKey: ["tahfizh-entries", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tahfizh_entries")
        .select("*")
        .eq("student_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const entriesByPage = entries?.reduce((acc, e) => {
    acc[e.page_number] = e;
    return acc;
  }, {} as Record<number, typeof entries[0]>) || {};

  // Each juz is roughly 20 pages
  const juzStart = (parseInt(selectedJuz) - 1) * 20 + 1;
  const juzEnd = Math.min(parseInt(selectedJuz) * 20, 604);
  const pages = Array.from({ length: juzEnd - juzStart + 1 }, (_, i) => juzStart + i);

  // Juz summary
  const juzEntries = pages.map((p) => entriesByPage[p]);
  const juzMutqin = juzEntries.filter((e) => e?.is_mutqin).length;
  const juzTasmi = juzEntries.filter((e) => e?.status === "tasmi_done").length;
  const juzMurajaah = juzEntries.filter((e) => e?.status === "murajaah").length;

  const saveMutation = useMutation({
    mutationFn: async (entry: EditEntry) => {
      const payload = {
        student_id: user!.id,
        page_number: entry.page_number,
        status: entry.is_mutqin ? "mutqin" as const : entry.status as "belum_dihafalkan" | "murajaah" | "tasmi_done" | "mutqin",
        kualitas_hafalan: entry.kualitas_hafalan,
        kuantitas_murojaah: entry.kuantitas_murojaah,
        is_mutqin: entry.is_mutqin,
        catatan: entry.catatan,
        tanggal_hafalan: new Date().toISOString().split("T")[0],
      };

      if (entry.existing_id) {
        const { error } = await supabase
          .from("tahfizh_entries")
          .update(payload)
          .eq("id", entry.existing_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tahfizh_entries")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Tersimpan!");
      queryClient.invalidateQueries({ queryKey: ["tahfizh-entries"] });
      queryClient.invalidateQueries({ queryKey: ["tahfizh-stats"] });
      setEditEntry(null);
    },
    onError: (e) => toast.error("Gagal menyimpan: " + e.message),
  });

  const openEdit = (pageNum: number) => {
    const existing = entriesByPage[pageNum];
    setEditEntry({
      page_number: pageNum,
      status: existing?.status || "belum_dihafalkan",
      kualitas_hafalan: existing?.kualitas_hafalan || 0,
      kuantitas_murojaah: existing?.kuantitas_murojaah || 0,
      is_mutqin: existing?.is_mutqin || false,
      catatan: existing?.catatan || "",
      existing_id: existing?.id,
    });
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Tahfizh Tracker
        </h1>
        <p className="text-sm text-muted-foreground">Lacak hafalan per halaman Al-Qur'an</p>
      </div>

      {/* Juz Tabs */}
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

      {/* Juz Summary */}
      <Card className="shadow-card">
        <CardContent className="py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Juz {selectedJuz} Progress</span>
            <span>{juzMutqin}/{pages.length} Mutqin</span>
          </div>
          <Progress value={(juzMutqin / pages.length) * 100} className="h-2" />
          <div className="flex gap-4 mt-2 text-xs">
            <span className="text-success">Tasmi': {juzTasmi}</span>
            <span className="text-warning">Muraja'ah: {juzMurajaah}</span>
            <span className="text-destructive">Belum: {pages.length - juzMutqin - juzTasmi - juzMurajaah}</span>
          </div>
        </CardContent>
      </Card>

      {/* Page Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {pages.map((pageNum) => {
          const entry = entriesByPage[pageNum];
          const status = entry?.is_mutqin ? "mutqin" : (entry?.status || "belum_dihafalkan");
          return (
            <button
              key={pageNum}
              onClick={() => openEdit(pageNum)}
              className="text-left p-3 rounded-xl border border-border/50 bg-card hover:shadow-card-hover transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Hal. {pageNum}</span>
                {entry?.is_mutqin && <Star className="w-3.5 h-3.5 text-highlight fill-highlight" />}
              </div>
              <Badge className={`text-[10px] ${statusColors[status]}`}>
                {statusLabels[status]}
              </Badge>
              {entry && (
                <div className="text-[10px] text-muted-foreground">
                  Kualitas: {entry.kualitas_hafalan}% • Muroja'ah: {entry.kuantitas_murojaah}x
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Edit Modal */}
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="belum_dihafalkan">Belum Dihafalkan</SelectItem>
                    <SelectItem value="murajaah">Muraja'ah</SelectItem>
                    <SelectItem value="tasmi_done">Tasmi' Done</SelectItem>
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
                    onChange={(e) => setEditEntry({ ...editEntry, kuantitas_murojaah: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditEntry({ ...editEntry, kuantitas_murojaah: editEntry.kuantitas_murojaah + 1 })}
                  >
                    +1
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>MUTQIN ✓</Label>
                <Switch
                  checked={editEntry.is_mutqin}
                  onCheckedChange={(v) => setEditEntry({ ...editEntry, is_mutqin: v })}
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
            <Button onClick={() => editEntry && saveMutation.mutate(editEntry)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
