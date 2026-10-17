import { useEffect, useState } from "react";
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

export interface TopSnapshotRow extends RankedStudent {
  week_start: string;
}

const ymd = (d: Date) => d.toLocaleDateString("en-CA");

// Senin pekan yang ditampilkan. Hari Minggu masih merujuk pekan yang baru selesai.
function getWeekMonday(now = new Date()) {
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

const toRow = (r: {
  week_start: string;
  student_id: string;
  student_name: string;
  peringkat: number;
  skor_akhir: number;
  skor_ujian: number;
  skor_hafalan: number;
  skor_murojaah: number;
}): TopSnapshotRow => ({
  week_start: r.week_start,
  student_id: r.student_id,
  name: r.student_name,
  rank: r.peringkat,
  skor_akhir: r.skor_akhir,
  skor_ujian: r.skor_ujian,
  skor_hafalan: r.skor_hafalan,
  skor_murojaah: r.skor_murojaah,
});

// Top 10 pekan ini, dibaca dari snapshot yang disimpan server tiap Sabtu 12:00 WIB.
export function useWeeklyRanking() {
  const { profile } = useAuth();
  const lembagaId = profile?.lembaga_id;
  const weekStart = ymd(getWeekMonday());

  return useQuery<RankedStudent[]>({
    queryKey: ["weekly-ranking", lembagaId, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_top_snapshots")
        .select("*")
        .eq("lembaga_id", lembagaId!)
        .eq("week_start", weekStart)
        .order("peringkat");
      if (error) throw error;
      return (data || []).map(toRow);
    },
    staleTime: 60 * 1000,
    enabled: !!lembagaId,
  });
}

// Seluruh histori Top 10 lembaga (dipakai halaman Rekap Top).
export function useWeeklyTopHistory() {
  const { profile } = useAuth();
  const lembagaId = profile?.lembaga_id;

  return useQuery<TopSnapshotRow[]>({
    queryKey: ["weekly-top-history", lembagaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_top_snapshots")
        .select("*")
        .eq("lembaga_id", lembagaId!)
        .order("week_start", { ascending: false })
        .order("peringkat")
        .limit(5000);
      if (error) throw error;
      return (data || []).map(toRow);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!lembagaId,
  });
}

export function getWeekLabel(weekStart?: string) {
  const monday = weekStart ? new Date(weekStart + "T12:00:00") : getWeekMonday();
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  const fmt = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  return `${fmt(monday)} – ${fmt(saturday)}`;
}

// Ranking pekanan hanya tampil Sabtu 12:00 s/d Minggu 23:59 (waktu perangkat).
export function isRankingWindow(now: Date = new Date()) {
  const day = now.getDay();
  return day === 0 || (day === 6 && now.getHours() >= 12);
}

export function useRankingWindow() {
  const [open, setOpen] = useState(() => isRankingWindow());
  useEffect(() => {
    const id = setInterval(() => setOpen(isRankingWindow()), 30_000);
    return () => clearInterval(id);
  }, []);
  return open;
}
