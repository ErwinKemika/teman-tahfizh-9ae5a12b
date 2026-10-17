import { useMemo, useState } from "react";
import { Award } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getWeekLabel, useWeeklyTopHistory } from "@/hooks/useWeeklyRanking";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MEDALS = ["🥇", "🥈", "🥉"];

export default function RekapTopPage() {
  const { user } = useAuth();
  const { data: history, isLoading, isError } = useWeeklyTopHistory();

  const [filterBulan, setFilterBulan] = useState("semua");
  const [filterTahun, setFilterTahun] = useState(String(new Date().getFullYear()));

  const yearOptions = useMemo(() => {
    const years = (history || []).map((r) => Number(r.week_start.slice(0, 4)));
    return [...new Set([...years, new Date().getFullYear()])].sort((a, b) => b - a);
  }, [history]);

  const filtered = useMemo(
    () =>
      (history || []).filter((r) => {
        if (filterTahun !== "semua" && r.week_start.slice(0, 4) !== filterTahun) return false;
        if (filterBulan !== "semua" && Number(r.week_start.slice(5, 7)) !== Number(filterBulan)) return false;
        return true;
      }),
    [history, filterBulan, filterTahun]
  );

  const leaderboard = useMemo(() => {
    const map = new Map<string, { student_id: string; name: string; count: number; first: number; best: number }>();
    for (const r of filtered) {
      const cur = map.get(r.student_id) ?? { student_id: r.student_id, name: r.name, count: 0, first: 0, best: 99 };
      cur.count += 1;
      if (r.rank === 1) cur.first += 1;
      cur.best = Math.min(cur.best, r.rank);
      map.set(r.student_id, cur);
    }
    return [...map.values()].sort(
      (a, b) => b.count - a.count || b.first - a.first || a.best - b.best || a.name.localeCompare(b.name, "id")
    );
  }, [filtered]);

  const weeks = useMemo(() => {
    const byWeek = new Map<string, typeof filtered>();
    for (const r of filtered) {
      byWeek.set(r.week_start, [...(byWeek.get(r.week_start) ?? []), r]);
    }
    return [...byWeek.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" /> Rekap Top 10 Pekanan
        </h1>
        <p className="text-sm text-muted-foreground">
          Santri yang paling sering masuk Top 10. Disimpan otomatis tiap Sabtu pukul 12.00.
        </p>
      </div>

      <Card className="shadow-card">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 gap-3">
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
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Memuat data…</p>
      ) : isError ? (
        <Card className="shadow-card">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Rekap belum bisa dimuat. Coba lagi nanti.
          </CardContent>
        </Card>
      ) : weeks.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada histori Top 10 untuk periode ini.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Paling Sering Masuk Top 10</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-4 pb-4">
              <div className="grid grid-cols-[2rem_1fr_3.5rem_3rem_3.5rem] gap-2 px-2 pb-1.5 text-[10.5px] font-medium text-muted-foreground">
                <span>#</span>
                <span>Nama</span>
                <span className="text-center">Top 10</span>
                <span className="text-center">🥇</span>
                <span className="text-center">Terbaik</span>
              </div>
              <div className="space-y-1">
                {leaderboard.map((s, i) => (
                  <div
                    key={s.student_id}
                    className={`grid grid-cols-[2rem_1fr_3.5rem_3rem_3.5rem] gap-2 items-center rounded-lg px-2 py-2 text-sm ${
                      s.student_id === user?.id ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted/40"
                    }`}
                  >
                    <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
                    <span className="truncate font-medium text-foreground">{s.name}</span>
                    <span className="text-center font-bold text-foreground">{s.count}×</span>
                    <span className="text-center text-muted-foreground">{s.first || "-"}</span>
                    <span className="text-center text-muted-foreground">
                      {MEDALS[s.best - 1] ?? `#${s.best}`}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Riwayat Per Pekan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-4">
              {weeks.map(([weekStart, rows]) => (
                <details key={weekStart} className="group rounded-xl border border-border/50 px-3 py-2">
                  <summary className="flex items-center justify-between gap-2 cursor-pointer list-none text-sm">
                    <span className="font-semibold text-foreground">{getWeekLabel(weekStart)}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      🥇 {rows[0]?.name}
                    </span>
                  </summary>
                  <ol className="mt-2 space-y-1 border-t border-border/40 pt-2">
                    {rows.map((r) => (
                      <li
                        key={r.student_id}
                        className={`flex items-center gap-2 text-sm rounded-md px-1.5 py-1 ${
                          r.student_id === user?.id ? "bg-primary/10" : ""
                        }`}
                      >
                        <span className="w-6 text-center text-xs font-bold text-muted-foreground">
                          {MEDALS[r.rank - 1] ?? r.rank}
                        </span>
                        <span className="flex-1 truncate">{r.name}</span>
                        <span className="font-bold text-foreground">{r.skor_akhir}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
