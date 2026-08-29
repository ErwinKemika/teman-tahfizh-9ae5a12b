import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RankedStudent {
  student_id: string;
  name: string;
  skor_ujian: number;
  skor_hafalan: number;
  skor_murojaah: number;
  skor_akhir: number;
  rank: number;
}

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  saturday.setHours(23, 59, 59, 999);

  return {
    fromDate: monday.toLocaleDateString("en-CA"),   // YYYY-MM-DD untuk field date
    toDate: saturday.toLocaleDateString("en-CA"),
    fromISO: monday.toISOString(),                  // untuk field timestamp
    toISO: saturday.toISOString(),
  };
}

const avg = (arr: number[]) =>
  arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

export function useWeeklyRanking() {
  const { profile } = useAuth();
  const lembagaId = profile?.lembaga_id;

  return useQuery<RankedStudent[]>({
    queryKey: ["weekly-ranking", lembagaId],
    queryFn: async () => {
      const { fromDate, toDate, fromISO, toISO } = getWeekBounds();

      const [{ data: students }, { data: ujianData }, { data: hafalanData }] =
        await Promise.all([
          supabase.from("profiles").select("user_id, full_name").eq("role", "siswa").eq("lembaga_id", lembagaId!),
          supabase
            .from("ujian")
            .select("student_id, nilai_total")
            .gte("tanggal", fromDate)
            .lte("tanggal", toDate)
            .not("nilai_total", "is", null),
          supabase
            .from("tahfizh_entries")
            .select("student_id, kualitas_hafalan, kuantitas_murojaah")
            .gte("updated_at", fromISO)
            .lte("updated_at", toISO),
        ]);

      if (!students?.length) return [];

      type Bucket = { ujian: number[]; hafalan: number[]; murojaah: number };
      const map: Record<string, Bucket> = {};
      for (const s of students) {
        map[s.user_id] = { ujian: [], hafalan: [], murojaah: 0 };
      }

      for (const u of ujianData || []) {
        if (map[u.student_id] && u.nilai_total != null) {
          map[u.student_id].ujian.push(u.nilai_total);
        }
      }

      for (const h of hafalanData || []) {
        if (map[h.student_id]) {
          if (h.kualitas_hafalan > 0) map[h.student_id].hafalan.push(h.kualitas_hafalan);
          map[h.student_id].murojaah += h.kuantitas_murojaah || 0;
        }
      }

      const maxMurojaah = Math.max(...students.map((s) => map[s.user_id].murojaah), 1);

      const scored = students.map((s) => {
        const d = map[s.user_id];
        const skor_ujian = avg(d.ujian);
        const skor_hafalan = avg(d.hafalan);
        const skor_murojaah = Math.round((d.murojaah / maxMurojaah) * 100);
        const skor_akhir = Math.round(
          skor_ujian * 0.4 + skor_hafalan * 0.35 + skor_murojaah * 0.25
        );
        return { student_id: s.user_id, name: s.full_name, skor_ujian, skor_hafalan, skor_murojaah, skor_akhir };
      });

      scored.sort((a, b) => b.skor_akhir - a.skor_akhir || a.name.localeCompare(b.name));
      return scored.map((s, i) => ({ ...s, rank: i + 1 }));
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!lembagaId,
  });
}

export function getWeekLabel() {
  const { fromDate, toDate } = getWeekBounds();
  const fmt = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  return `${fmt(fromDate)} – ${fmt(toDate)}`;
}
