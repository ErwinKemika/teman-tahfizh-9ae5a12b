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
import { WeeklyRankCard } from "@/components/ui/weekly-rank-card";

// ── Donut SVG ────────────────────────────────────────────────────
function ProgressDonut({ value = 0, size = 110, stroke = 11 }: { value?: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(value, 1.5);
  const dash = (pct / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
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
          <div className="font-display text-[24px] sm:text-[28px] leading-none text-[#0f2742] dark:text-[#e8edf5]">{value}%</div>
          <div className="text-[9px] sm:text-[10px] tracking-[0.16em] uppercase text-[#7a8699] dark:text-[#8a9ab0] mt-1">Hafal</div>
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
  iconClass: string;
}
function StatCard({ Icon, label, value, sub, iconClass }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-[#10243c] rounded-[14px] sm:rounded-[18px] border border-line shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_-28px_rgba(15,39,66,0.30)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_4px_20px_-4px_rgba(0,0,0,0.5)] p-3 sm:p-5 flex items-center gap-2.5 sm:gap-4 min-w-0">
      <div className={`grid place-items-center w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl shrink-0 ${iconClass}`}>
        <Icon className="w-[18px] h-[18px] sm:w-6 sm:h-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] sm:text-[12.5px] text-[#7a8699] dark:text-[#8a9ab0] truncate">{label}</div>
        <div className="font-display text-[16px] sm:text-[24px] leading-tight text-[#0f2742] dark:text-[#e8edf5] truncate">{value}</div>
        {sub && <div className="text-[10px] sm:text-[11.5px] text-[#9aa6b8] dark:text-[#5a6a80] mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  );
}

// ── Status pill ──────────────────────────────────────────────────
const statusMap: Record<string, { cls: string; label: string }> = {
  lulus:     { cls: "bg-[#e6f4ea] dark:bg-[#1a3d28] text-[#2f8a4d] dark:text-[#4dbc72]", label: "Lulus" },
  mengulang: { cls: "bg-[#fdece7] dark:bg-[#3d1f18] text-[#cf5a37] dark:text-[#e07755]", label: "Mengulang" },
  libur:     { cls: "bg-[#fff4e0] dark:bg-[#3d3010] text-[#b8801f] dark:text-[#d4a943]", label: "Libur" },
  sakit:     { cls: "bg-[#fdece7] dark:bg-[#3d1f18] text-[#cf5a37] dark:text-[#e07755]", label: "Sakit" },
};

function StatusPill({ status }: { status: string }) {
  const s = statusMap[status] ?? statusMap.lulus;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${s.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
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
      className={`w-full bg-white dark:bg-[#10243c] rounded-[18px] border p-5 text-left flex items-start gap-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-20px_rgba(15,39,66,0.45)] dark:hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] ${
        primary ? "border-[#1b426f]/30 dark:border-[#5b9fd4]/20" : "border-line"
      } shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_-28px_rgba(15,39,66,0.30)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_4px_20px_-4px_rgba(0,0,0,0.5)]`}
    >
      <div
        className={`grid place-items-center w-11 h-11 rounded-xl shrink-0 ${
          primary
            ? "bg-[#143258] dark:bg-[#1a3f65] text-white"
            : "bg-[#eef2f7] dark:bg-[#1a2f4a] text-[#1b426f] dark:text-[#5b9fd4]"
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-semibold text-[#0f2742] dark:text-[#e8edf5]">{label}</div>
        <div className="text-[12px] text-[#7a8699] dark:text-[#8a9ab0] mt-0.5">{desc}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-[#c4cdd9] dark:text-[#3a4a5a] self-center shrink-0 ml-auto" />
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
      style={{ background: "var(--topbar-bg)" }}
    >
      {onMenu && (
        <button
          onClick={onMenu}
          className="lg:hidden grid place-items-center w-10 h-10 rounded-xl border border-line bg-white dark:bg-[#10243c] text-[#27384f] dark:text-[#b0c4db]"
          aria-label="Buka menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      <div className="flex items-center gap-2.5 flex-1 max-w-sm rounded-xl border border-line bg-white dark:bg-[#10243c] px-3.5 h-10 text-[#7a8699] dark:text-[#8a9ab0]">
        <Search className="w-[18px] h-[18px] shrink-0" />
        <input
          placeholder="Cari surah, juz, atau catatan…"
          className="flex-1 bg-transparent outline-none text-[13.5px] text-[#0b1d33] dark:text-[#e0e8f0] placeholder:text-[#9aa6b8] dark:placeholder:text-[#5a6a80]"
          aria-label="Cari"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-white dark:bg-[#10243c] px-3 h-10 text-[13px] text-[#27384f] dark:text-[#b0c4db]">
          <Calendar className="w-[17px] h-[17px] text-[#7a8699] dark:text-[#8a9ab0]" />
          <span className="font-medium">{todayStr}</span>
        </div>
        <button
          className="relative grid place-items-center w-10 h-10 rounded-xl border border-line bg-white dark:bg-[#10243c] text-[#27384f] dark:text-[#b0c4db]"
          aria-label="Notifikasi"
        >
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#d97757] ring-2 ring-white dark:ring-[#10243c]" />
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
    <div className="bg-white dark:bg-[#10243c] rounded-[18px] border border-line shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_-28px_rgba(15,39,66,0.30)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_4px_20px_-4px_rgba(0,0,0,0.5)] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-line">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-[#eef2f7] dark:bg-[#1a2f4a] text-[#1b426f] dark:text-[#5b9fd4] shrink-0">
            <ClipboardCheck className="w-[18px] h-[18px]" />
          </span>
          <h3 className="font-display text-[15px] sm:text-[19px] text-[#0f2742] dark:text-[#e8edf5] truncate">Riwayat Mutaba'ah</h3>
        </div>
        <button
          onClick={() => navigate("/mutabaah")}
          className="text-[12px] sm:text-[12.5px] font-semibold text-[#1b426f] dark:text-[#5b9fd4] hover:underline underline-offset-2 flex items-center gap-1 shrink-0"
        >
          Lihat semua <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="sm:hidden divide-y divide-line">
        {rows.map((entry) => (
          <li key={entry.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[12.5px] font-semibold text-[#0f2742] dark:text-[#e8edf5]">
                {new Date(entry.date + "T00:00:00").toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <StatusPill status={entry.status} />
            </div>
            <div className="grid grid-cols-1 gap-0.5 text-[12px] text-[#27384f] dark:text-[#b0c4db]">
              {entry.ziyadah_surat && (
                <div className="truncate">
                  <span className="text-[#7a8699] dark:text-[#8a9ab0]">Ziyadah: </span>
                  {entry.ziyadah_surat} {entry.ziyadah_ayat_start ?? ""}–{entry.ziyadah_ayat_end ?? ""}
                </div>
              )}
              {entry.murojaah_hifdzul_jadid_dari != null && entry.murojaah_hifdzul_jadid_hingga != null && (
                <div className="truncate">
                  <span className="text-[#7a8699] dark:text-[#8a9ab0]">Hifdzul Jadid: </span>
                  Hal. {entry.murojaah_hifdzul_jadid_dari}–{entry.murojaah_hifdzul_jadid_hingga}
                </div>
              )}
              {entry.murojaah_hifdzul_qodim && (
                <div className="truncate">
                  <span className="text-[#7a8699] dark:text-[#8a9ab0]">Qadhim Fardhi: </span>
                  {entry.murojaah_hifdzul_qodim}
                </div>
              )}
              {entry.murojaah_tsnai && (
                <div className="truncate">
                  <span className="text-[#7a8699] dark:text-[#8a9ab0]">Qadhim Tsuna'i: </span>
                  {entry.murojaah_tsnai}
                </div>
              )}
              {entry.keterangan && (
                <div className="text-[#7a8699] dark:text-[#8a9ab0] line-clamp-2">{entry.keterangan}</div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop / tablet: table */}
      <div className="hidden sm:block overflow-x-auto no-scrollbar">
        <table className="w-full min-w-[720px] text-left">
          <caption className="sr-only">Riwayat mutaba'ah terbaru</caption>
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.08em] text-[#9aa6b8] dark:text-[#5a6a80]">
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
              <tr key={entry.id} className="border-t border-line hover:bg-[#f7f9fc] dark:hover:bg-[#162236] transition-colors">
                <td className="px-6 py-3.5 font-semibold text-[#0f2742] dark:text-[#e8edf5] whitespace-nowrap">
                  {new Date(entry.date + "T00:00:00").toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })}
                </td>
                <td className="px-6 py-3.5 text-[#27384f] dark:text-[#b0c4db]">
                  {entry.ziyadah_surat
                    ? `${entry.ziyadah_surat} ${entry.ziyadah_ayat_start ?? ""}–${entry.ziyadah_ayat_end ?? ""}`
                    : "—"}
                </td>
                <td className="px-6 py-3.5 text-[#5b6b80] dark:text-[#8a9ab0]">
                  {entry.murojaah_hifdzul_jadid_dari != null && entry.murojaah_hifdzul_jadid_hingga != null
                    ? `Hal. ${entry.murojaah_hifdzul_jadid_dari}–${entry.murojaah_hifdzul_jadid_hingga}`
                    : "—"}
                </td>
                <td className="px-6 py-3.5">
                  {entry.murojaah_hifdzul_qodim ? (
                    <span className="inline-flex rounded-md bg-[#eef2f7] dark:bg-[#1a2f4a] px-2 py-0.5 text-[12.5px] text-[#27384f] dark:text-[#b0c4db]">
                      {entry.murojaah_hifdzul_qodim}
                    </span>
                  ) : (
                    <span className="text-[#9aa6b8] dark:text-[#5a6a80]">—</span>
                  )}
                </td>
                <td className="px-6 py-3.5">
                  {entry.murojaah_tsnai ? (
                    <span className="inline-flex rounded-md bg-[#eef2f7] dark:bg-[#1a2f4a] px-2 py-0.5 text-[12.5px] text-[#27384f] dark:text-[#b0c4db]">
                      {entry.murojaah_tsnai}
                    </span>
                  ) : (
                    <span className="text-[#9aa6b8] dark:text-[#5a6a80]">—</span>
                  )}
                </td>
                <td className="px-6 py-3.5 text-[#7a8699] dark:text-[#8a9ab0]">{entry.keterangan || "—"}</td>
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
  const firstName = profile?.nickname || profile?.full_name?.split(" ")[0] || "Santri";

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
      const today = new Date().toLocaleDateString("en-CA");
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
        const expectedStr = expected.toLocaleDateString("en-CA");
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
        .gte("date", weekAgo.toLocaleDateString("en-CA"));
      return data?.length || 0;
    },
    enabled: !!user,
  });

  const hafalCount = tahfizhStats?.hafal || 0;
  const juzAktif = hafalCount >= 20 ? `Juz ${Math.min(Math.floor(hafalCount / 20) + 1, 30)}` : "Juz 1";
  const surahAktif = hafalCount >= 20 ? "Al-Baqarah" : "Al-Fatihah";

  return (
    <div className="font-jakarta bg-[#eef2f7] dark:bg-[#0a1726] min-h-screen w-full overflow-x-hidden">
      <Topbar />

      <div className="px-4 sm:px-5 lg:px-9 py-5 sm:py-7 max-w-[1200px] mx-auto">

        {/* Greeting */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[20px] sm:text-[32px] lg:text-[36px] leading-[1.15] text-[#0f2742] dark:text-[#e8edf5] break-words">
              Assalamu'alaikum, {firstName}
            </h1>
            <p className="text-[13px] sm:text-[14px] text-[#5b6b80] dark:text-[#8a9ab0] mt-1.5 sm:mt-2">
              Semoga hari ini penuh berkah — lanjutkan setoranmu.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white dark:bg-[#10243c] border border-line px-3 sm:px-4 py-1.5 sm:py-2 text-[11.5px] sm:text-[13px] text-[#27384f] dark:text-[#b0c4db] shadow-sm mt-1 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#2f8a4d]" />
            Target:{" "}
            <span className="font-semibold text-[#0f2742] dark:text-[#e8edf5] ml-1">1 hal/hari</span>
          </div>
        </div>

        {/* Hadith banner */}
        <div className="relative overflow-hidden rounded-[18px] sm:rounded-[22px] mt-5 sm:mt-6 bg-hadith text-[#f6f1e6] px-4 sm:px-9 py-5 sm:py-7">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6 min-w-0">
            <div className="min-w-0 order-2 sm:order-1">
              <div className="text-[10px] sm:text-[10.5px] tracking-[0.2em] uppercase text-[#e3c98a] mb-1.5 sm:mb-2">
                Hadits Pilihan
              </div>
              <p className="font-display italic text-[14px] sm:text-[18px] lg:text-[20px] leading-snug text-white/95">
                "Sebaik-baik kalian adalah yang mempelajari Al-Qur'an dan mengajarkannya."
              </p>
              <div className="text-[11px] sm:text-[11.5px] text-[#ccd9ea] mt-1.5 sm:mt-2">HR. Bukhari</div>
            </div>
            <div
              className="font-arabic text-[22px] sm:text-[36px] lg:text-[40px] leading-[1.6] text-white/95 animate-floaty text-right order-1 sm:order-2 sm:shrink-0 break-words"
              dir="rtl"
            >
              خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ
            </div>
          </div>
        </div>

        {/* Progress + Stat cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mt-5 sm:mt-6">
          {/* Progress card */}
          <div className="bg-white dark:bg-[#10243c] rounded-[14px] sm:rounded-[18px] border border-line shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_-28px_rgba(15,39,66,0.30)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_4px_20px_-4px_rgba(0,0,0,0.5)] p-4 sm:p-6 lg:col-span-1 flex flex-row sm:flex-row items-center gap-4 sm:gap-6">
            <ProgressDonut value={tahfizhStats?.percent || 0} />
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[10.5px] sm:text-[12px] tracking-[0.14em] uppercase text-[#9aa6b8] dark:text-[#5a6a80]">
                Progress Hafalan
              </div>
              <div className="font-display text-[16px] sm:text-[22px] text-[#0f2742] dark:text-[#e8edf5] leading-tight mt-1">
                {hafalCount} / 604 hal
              </div>
              <div className="flex flex-col gap-1 sm:gap-1.5 mt-2 sm:mt-3 text-[11.5px] sm:text-[13px] items-start">
                <span className="flex items-center gap-2 text-[#27384f] dark:text-[#b0c4db]">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#2f8a4d]" />
                  Hafal · {hafalCount} hal
                </span>
                <span className="flex items-center gap-2 text-[#27384f] dark:text-[#b0c4db]">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#c9a35a]" />
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
              iconClass="bg-[#fff1e0] dark:bg-[#3d3010] text-[#c98a2f] dark:text-[#d4a943]"
            />
            <StatCard
              Icon={Flame}
              label="Streak Setoran"
              value={`${streakCount || 0} hari`}
              sub={streakCount ? "Pertahankan terus!" : "Mulai hari ini lagi"}
              iconClass="bg-[#fde9e6] dark:bg-[#3d1f18] text-[#d97757] dark:text-[#e8896a]"
            />
            <StatCard
              Icon={Target}
              label="Juz Aktif"
              value={juzAktif}
              sub={surahAktif}
              iconClass="bg-[#e7f0fb] dark:bg-[#1a2f4a] text-[#1b426f] dark:text-[#5b9fd4]"
            />
            <StatCard
              Icon={RotateCcw}
              label="Muraja'ah Pekan Ini"
              value={`${weekMurajaah ?? 0}×`}
              sub="Target 7×"
              iconClass="bg-[#e6f4ea] dark:bg-[#1a3d28] text-[#2f8a4d] dark:text-[#4dbc72]"
            />
          </div>
        </div>

        {/* Aksi Cepat */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px w-7 bg-[#c9a35a]" />
            <h2 className="text-[12px] font-semibold tracking-[0.16em] uppercase text-[#7a8699] dark:text-[#8a9ab0]">
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

        {/* Weekly Ranking */}
        <div className="mt-8">
          <WeeklyRankCard currentUserId={user?.id} />
        </div>

        {/* History table */}
        {recentMutabaah && recentMutabaah.length > 0 && (
          <div className="mt-8">
            <HistoryTable rows={recentMutabaah} />
          </div>
        )}

        {/* Empty state jika belum ada mutabaah */}
        {recentMutabaah && recentMutabaah.length === 0 && (
          <div className="mt-8 bg-white dark:bg-[#10243c] rounded-[18px] border border-line shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_-28px_rgba(15,39,66,0.30)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_4px_20px_-4px_rgba(0,0,0,0.5)] p-12 grid place-items-center text-center">
            <div className="grid place-items-center w-16 h-16 rounded-2xl bg-[#eef2f7] dark:bg-[#1a2f4a] text-[#1b426f] dark:text-[#5b9fd4] mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="font-display text-[22px] text-[#0f2742] dark:text-[#e8edf5]">Belum ada riwayat</h3>
            <p className="text-[14px] text-[#7a8699] dark:text-[#8a9ab0] mt-1 max-w-sm">
              Tambahkan mutaba'ah pertamamu hari ini untuk mulai melacak progress hafalan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
