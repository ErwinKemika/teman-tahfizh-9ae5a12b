import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen,
  ClipboardCheck,
  BookMarked,
  Flame,
  Plus,
  Eye,
  Bell,
  Search,
  Calendar,
  ChevronRight,
  Target,
  RotateCcw,
  Menu,
} from "lucide-react";

// ── Donut SVG ────────────────────────────────────────────────────
function ProgressDonut({ value = 0, size = 110, stroke = 11 }: { value?: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(value, 1.5);
  const dash = (pct / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e9edf3" strokeWidth={stroke} />
        <defs>
          <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c9a35a" />
            <stop offset="100%" stopColor="#1b426f" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#donutGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-[24px] sm:text-[28px] leading-none text-[#0f2742]">{value}%</div>
          <div className="text-[9px] sm:text-[10px] tracking-[0.16em] uppercase text-[#7a8699] mt-1">Hafal</div>
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────
interface StatCardProps {
  Icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  tintBg: string;
  tintFg: string;
}
function StatCard({ Icon, label, value, sub, tintBg, tintFg }: StatCardProps) {
  return (
    <div className="bg-white rounded-[14px] sm:rounded-[18px] border border-line shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_-28px_rgba(15,39,66,0.30)] p-3 sm:p-5 flex items-center gap-2.5 sm:gap-4 min-w-0">
      <div
        className="grid place-items-center w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl shrink-0"
        style={{ background: tintBg, color: tintFg }}
      >
        <Icon className="w-[18px] h-[18px] sm:w-6 sm:h-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] sm:text-[12.5px] text-[#7a8699] truncate">{label}</div>
        <div className="font-display text-[16px] sm:text-[24px] leading-tight text-[#0f2742] truncate">{value}</div>
        {sub && <div className="text-[10px] sm:text-[11.5px] text-[#9aa6b8] mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  );
}

// ── Status pill ──────────────────────────────────────────────────
type MutabaahStatus = "lulus" | "mengulang" | "libur" | "sakit";
function StatusPill({ status }: { status: string }) {
  const map: Record<MutabaahStatus, { bg: string; fg: string; label: string }> = {
    lulus:    { bg: "#e6f4ea", fg: "#2f8a4d", label: "Lulus" },
    mengulang:{ bg: "#fdece7", fg: "#cf5a37", label: "Mengulang" },
    libur:    { bg: "#fff4e0", fg: "#b8801f", label: "Libur" },
    sakit:    { bg: "#fdece7", fg: "#cf5a37", label: "Sakit" },
  };
  const s = map[status as MutabaahStatus] ?? map.lulus;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.fg }} />
      {s.label}
    </span>
  );
}

// ── Quick Action Card ────────────────────────────────────────────
interface QuickActionProps {
  Icon: React.ElementType;
  label: string;
  desc: string;
  primary?: boolean;
  onClick?: () => void;
}
function QuickAction({ Icon, label, desc, primary, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full bg-white rounded-[18px] border p-5 text-left flex items-start gap-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-20px_rgba(15,39,66,0.45)] ${
        primary ? "border-[#1b426f]/30 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_-28px_rgba(15,39,66,0.30)]" : "border-line shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_-28px_rgba(15,39,66,0.30)]"
      }`}
    >
      <div
        className={`grid place-items-center w-11 h-11 rounded-xl shrink-0 ${
          primary ? "bg-[#143258] text-white" : "bg-[#eef2f7] text-[#1b426f]"
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-semibold text-[#0f2742]">{label}</div>
        <div className="text-[12px] text-[#7a8699] mt-0.5">{desc}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-[#c4cdd9] self-center shrink-0 ml-auto" />
    </button>
  );
}

// ── Topbar (desktop only) ────────────────────────────────────────
function Topbar({ onMenu }: { onMenu?: () => void }) {
  const todayStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header
      className="hidden lg:flex sticky top-0 z-20 backdrop-blur-md border-b border-line items-center gap-3 px-9 h-[68px]"
      style={{ background: "rgba(238,242,247,0.82)" }}
    >
      {/* hamburger mobile — not shown on lg, kept for structure */}
      {onMenu && (
        <button
          onClick={onMenu}
          className="lg:hidden grid place-items-center w-10 h-10 rounded-xl border border-line bg-white text-[#27384f]"
          aria-label="Buka menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Search */}
      <div className="flex items-center gap-2.5 flex-1 max-w-sm rounded-xl border border-line bg-white px-3.5 h-10 text-[#7a8699]">
        <Search className="w-[18px] h-[18px] shrink-0" />
        <input
          placeholder="Cari surah, juz, atau catatan…"
          className="flex-1 bg-transparent outline-none text-[13.5px] text-[#0b1d33] placeholder:text-[#9aa6b8]"
          aria-label="Cari"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Date chip */}
        <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 h-10 text-[13px] text-[#27384f]">
          <Calendar className="w-[17px] h-[17px] text-[#7a8699]" />
          <span className="font-medium">{todayStr}</span>
        </div>
        {/* Bell */}
        <button
          className="relative grid place-items-center w-10 h-10 rounded-xl border border-line bg-white text-[#27384f]"
          aria-label="Notifikasi"
        >
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#d97757] ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
}

// ── History Table ────────────────────────────────────────────────
interface MutabaahEntry {
  id: string;
  date: string;
  ziyadah_surat?: string | null;
  ziyadah_ayat_start?: number | null;
  ziyadah_ayat_end?: number | null;
  murojaah_hifdzul_jadid_dari?: number | null;
  murojaah_hifdzul_jadid_hingga?: number | null;
  murojaah_hifdzul_qodim?: string | null;
  murojaah_tsnai?: string | null;
  keterangan?: string | null;
  status: string;
}

function HistoryTable({ rows }: { rows: MutabaahEntry[] }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-[18px] border border-line shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_-28px_rgba(15,39,66,0.30)] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-line">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-[#eef2f7] text-[#1b426f]">
            <ClipboardCheck className="w-[18px] h-[18px]" />
          </span>
          <h3 className="font-display text-[19px] text-[#0f2742]">Riwayat Mutaba'ah Terbaru</h3>
        </div>
        <button
          onClick={() => navigate("/mutabaah")}
          className="text-[12.5px] font-semibold text-[#1b426f] hover:underline underline-offset-2 flex items-center gap-1"
        >
          Lihat semua <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full min-w-[720px] text-left">
          <caption className="sr-only">Riwayat mutaba'ah terbaru</caption>
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.08em] text-[#9aa6b8]">
              <th className="font-semibold px-6 py-3">Tanggal</th>
              <th className="font-semibold px-6 py-3">Ziyadah</th>
              <th className="font-semibold px-6 py-3">Hifdzul Jadid</th>
              <th className="font-semibold px-6 py-3">Qadhim Tsuna'i</th>
              <th className="font-semibold px-6 py-3">Qadhim Fardhi</th>
              <th className="font-semibold px-6 py-3">Keterangan</th>
              <th className="font-semibold px-6 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="text-[13.5px]">
            {rows.map((entry) => (
              <tr key={entry.id} className="border-t border-line hover:bg-[#f7f9fc] transition-colors">
                <td className="px-6 py-3.5 font-semibold text-[#0f2742] whitespace-nowrap">
                  {new Date(entry.date + "T00:00:00").toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })}
                </td>
                <td className="px-6 py-3.5 text-[#27384f]">
                  {entry.ziyadah_surat
                    ? `${entry.ziyadah_surat} ${entry.ziyadah_ayat_start ?? ""}–${entry.ziyadah_ayat_end ?? ""}`
                    : "—"}
                </td>
                <td className="px-6 py-3.5 text-[#5b6b80]">
                  {entry.murojaah_hifdzul_jadid_dari != null && entry.murojaah_hifdzul_jadid_hingga != null
                    ? `Hal. ${entry.murojaah_hifdzul_jadid_dari}–${entry.murojaah_hifdzul_jadid_hingga}`
                    : "—"}
                </td>
                <td className="px-6 py-3.5">
                  {entry.murojaah_hifdzul_qodim ? (
                    <span className="inline-flex rounded-md bg-[#eef2f7] px-2 py-0.5 text-[12.5px] text-[#27384f]">
                      {entry.murojaah_hifdzul_qodim}
                    </span>
                  ) : (
                    <span className="text-[#9aa6b8]">—</span>
                  )}
                </td>
                <td className="px-6 py-3.5">
                  {entry.murojaah_tsnai ? (
                    <span className="inline-flex rounded-md bg-[#eef2f7] px-2 py-0.5 text-[12.5px] text-[#27384f]">
                      {entry.murojaah_tsnai}
                    </span>
                  ) : (
                    <span className="text-[#9aa6b8]">—</span>
                  )}
                </td>
                <td className="px-6 py-3.5 text-[#7a8699]">{entry.keterangan || "—"}</td>
                <td className="px-6 py-3.5 text-right">
                  <StatusPill status={entry.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────
export default function SiswaDashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const firstName = profile?.full_name?.split(" ")[0] || "Santri";

  const { data: tahfizhStats } = useQuery({
    queryKey: ["tahfizh-stats", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tahfizh_entries")
        .select("status, is_mutqin, kuantitas_murojaah")
        .eq("student_id", user!.id);
      const hafal = data?.filter((e) => e.is_mutqin || e.status === "tasmi_done").length || 0;
      const murajaah = data?.reduce((sum, e) => sum + (e.kuantitas_murojaah || 0), 0) || 0;
      return { hafal, murajaah, percent: Math.round((hafal / 604) * 100) };
    },
    enabled: !!user,
  });

  const { data: todayMutabaah } = useQuery({
    queryKey: ["today-mutabaah", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("mutabaah_entries")
        .select("id")
        .eq("student_id", user!.id)
        .eq("date", today);
      return data && data.length > 0;
    },
    enabled: !!user,
  });

  const { data: recentMutabaah } = useQuery({
    queryKey: ["recent-mutabaah", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mutabaah_entries")
        .select("*")
        .eq("student_id", user!.id)
        .order("date", { ascending: false })
        .limit(7);
      return (data || []) as MutabaahEntry[];
    },
    enabled: !!user,
  });

  const { data: streakCount } = useQuery({
    queryKey: ["streak", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mutabaah_entries")
        .select("date")
        .eq("student_id", user!.id)
        .order("date", { ascending: false })
        .limit(30);
      if (!data || data.length === 0) return 0;
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < data.length; i++) {
        const expected = new Date(today);
        expected.setDate(today.getDate() - i);
        const expectedStr = expected.toISOString().split("T")[0];
        if (data[i].date === expectedStr) streak++;
        else break;
      }
      return streak;
    },
    enabled: !!user,
  });

  const { data: weekMurajaah } = useQuery({
    queryKey: ["week-murajaah", user?.id],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data } = await supabase
        .from("mutabaah_entries")
        .select("id")
        .eq("student_id", user!.id)
        .gte("date", weekAgo.toISOString().split("T")[0]);
      return data?.length || 0;
    },
    enabled: !!user,
  });

  const hafalCount = tahfizhStats?.hafal || 0;
  const juzAktif = hafalCount >= 20 ? `Juz ${Math.min(Math.floor(hafalCount / 20) + 1, 30)}` : "Juz 1";
  const surahAktif = hafalCount >= 20 ? "Al-Baqarah" : "Al-Fatihah";

  return (
    <div className="font-jakarta bg-[#eef2f7] min-h-screen w-full overflow-x-hidden">
      <Topbar />

      <div className="px-5 lg:px-9 py-7 max-w-[1200px] mx-auto">

        {/* Greeting */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[24px] sm:text-[32px] lg:text-[36px] leading-[1.15] text-[#0f2742] break-words">
              Assalamu'alaikum, {firstName}
            </h1>
            <p className="text-[14px] text-[#5b6b80] mt-2">
              Semoga hari ini penuh berkah — lanjutkan setoranmu.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white border border-line px-4 py-2 text-[13px] text-[#27384f] shadow-sm mt-1 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#2f8a4d]" />
            Target harian:{" "}
            <span className="font-semibold text-[#0f2742] ml-1">1 halaman</span>
          </div>
        </div>

        {/* Hadith banner */}
        <div className="relative overflow-hidden rounded-[22px] mt-6 bg-hadith text-[#f6f1e6] px-6 sm:px-9 py-6 sm:py-7">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="min-w-0">
              <div className="text-[10.5px] tracking-[0.2em] uppercase text-[#e3c98a] mb-2">
                Hadits Pilihan
              </div>
              <p className="font-display italic text-[16px] sm:text-[18px] lg:text-[20px] leading-snug text-white/95">
                "Sebaik-baik kalian adalah yang mempelajari Al-Qur'an dan mengajarkannya."
              </p>
              <div className="text-[11.5px] text-[#ccd9ea] mt-2">HR. Bukhari</div>
            </div>
            <div
              className="font-arabic text-[28px] sm:text-[36px] lg:text-[40px] leading-[1.7] text-white/95 animate-floaty shrink-0 text-right"
              dir="rtl"
            >
              خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ
            </div>
          </div>
        </div>

        {/* Progress + Stat cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
          {/* Progress card */}
          <div className="bg-white rounded-[18px] border border-line shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_-28px_rgba(15,39,66,0.30)] p-6 lg:col-span-1 flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
            <ProgressDonut value={tahfizhStats?.percent || 0} />
            <div className="min-w-0 w-full text-center sm:text-left">
              <div className="text-[12px] tracking-[0.14em] uppercase text-[#9aa6b8]">
                Progress Hafalan
              </div>
              <div className="font-display text-[20px] sm:text-[22px] text-[#0f2742] leading-tight mt-1">
                {hafalCount} / 604 halaman
              </div>
              <div className="flex flex-col gap-1.5 mt-3 text-[13px] items-center sm:items-start">
                <span className="flex items-center gap-2 text-[#27384f]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2f8a4d]" />
                  Hafal · {hafalCount} halaman
                </span>
                <span className="flex items-center gap-2 text-[#27384f]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#c9a35a]" />
                  Muraja'ah · {tahfizhStats?.murajaah || 0}×
                </span>
              </div>
            </div>
          </div>

          {/* 4 stat cards */}
          <div className="grid grid-cols-2 lg:col-span-2 gap-3 sm:gap-5">
            <StatCard
              Icon={ClipboardCheck}
              label="Mutaba'ah Hari Ini"
              value={todayMutabaah ? "Sudah ✓" : "Belum"}
              sub={todayMutabaah ? "Sudah tercatat hari ini" : "Setor sebelum Maghrib"}
              tintBg="#fff1e0"
              tintFg="#c98a2f"
            />
            <StatCard
              Icon={Flame}
              label="Streak Setoran"
              value={`${streakCount || 0} hari`}
              sub={streakCount ? "Pertahankan terus!" : "Mulai hari ini lagi"}
              tintBg="#fde9e6"
              tintFg="#d97757"
            />
            <StatCard
              Icon={Target}
              label="Juz Aktif"
              value={juzAktif}
              sub={surahAktif}
              tintBg="#e7f0fb"
              tintFg="#1b426f"
            />
            <StatCard
              Icon={RotateCcw}
              label="Muraja'ah Pekan Ini"
              value={`${weekMurajaah ?? 0}×`}
              sub="Target 7×"
              tintBg="#e6f4ea"
              tintFg="#2f8a4d"
            />
          </div>
        </div>

        {/* Aksi Cepat */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px w-7 bg-[#c9a35a]" />
            <h2 className="text-[12px] font-semibold tracking-[0.16em] uppercase text-[#7a8699]">
              Aksi Cepat
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <QuickAction
              Icon={Plus}
              label="Tambah Mutaba'ah"
              desc="Catat setoran hari ini"
              primary
              onClick={() => navigate("/mutabaah")}
            />
            <QuickAction
              Icon={Eye}
              label="Lihat Tracker"
              desc="Pantau progres per juz"
              onClick={() => navigate("/tracker")}
            />
            <QuickAction
              Icon={BookMarked}
              label="Buka Mushaf"
              desc="Lanjut hafalan"
              onClick={() => navigate("/mushaf")}
            />
          </div>
        </div>

        {/* History table */}
        {recentMutabaah && recentMutabaah.length > 0 && (
          <div className="mt-8">
            <HistoryTable rows={recentMutabaah} />
          </div>
        )}

        {/* Empty state jika belum ada mutabaah */}
        {recentMutabaah && recentMutabaah.length === 0 && (
          <div className="mt-8 bg-white rounded-[18px] border border-line shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_-28px_rgba(15,39,66,0.30)] p-12 grid place-items-center text-center">
            <div className="grid place-items-center w-16 h-16 rounded-2xl bg-[#eef2f7] text-[#1b426f] mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="font-display text-[22px] text-[#0f2742]">Belum ada riwayat</h3>
            <p className="text-[14px] text-[#7a8699] mt-1 max-w-sm">
              Tambahkan mutaba'ah pertamamu hari ini untuk mulai melacak progress hafalan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
