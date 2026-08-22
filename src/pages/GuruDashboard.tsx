import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Activity,
  BookOpen,
  TrendingUp,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  Search,
  Calendar,
  Bell,
  Eye,
  BookMarked,
  GraduationCap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

// ── Participation Ring ───────────────────────────────────────────
function ParticipationRing({
  value = 0,
  total = 0,
  size = 110,
  stroke = 11,
}: {
  value?: number;
  total?: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  const safeDisplay = Math.max(pct, pct > 0 ? 1.5 : 0);
  const dash = (safeDisplay / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        <defs>
          <linearGradient id="guruRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c9a35a" />
            <stop offset="100%" stopColor="#1b426f" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#guruRingGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-[24px] sm:text-[28px] leading-none text-[#0f2742] dark:text-[#e8edf5]">
            {pct}%
          </div>
          <div className="text-[9px] sm:text-[10px] tracking-[0.16em] uppercase text-[#7a8699] dark:text-[#8a9ab0] mt-1">
            Aktif
          </div>
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
        <div className="font-display text-[16px] sm:text-[24px] leading-tight text-[#0f2742] dark:text-[#e8edf5] truncate">
          {value}
        </div>
        {sub && (
          <div className="text-[10px] sm:text-[11.5px] text-[#9aa6b8] dark:text-[#5a6a80] mt-0.5 truncate">{sub}</div>
        )}
      </div>
    </div>
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
        primary
          ? "border-[#1b426f]/30 dark:border-[#5b9fd4]/20"
          : "border-line"
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

// ── Status Pill ──────────────────────────────────────────────────
const statusConfig: Record<string, { cls: string; label: string }> = {
  lulus:     { cls: "bg-[#e6f4ea] dark:bg-[#1a3d28] text-[#2f8a4d] dark:text-[#4dbc72]", label: "Lulus" },
  mengulang: { cls: "bg-[#fdece7] dark:bg-[#3d1f18] text-[#cf5a37] dark:text-[#e07755]", label: "Mengulang" },
  libur:     { cls: "bg-[#fff4e0] dark:bg-[#3d3010] text-[#b8801f] dark:text-[#d4a943]", label: "Libur" },
  sakit:     { cls: "bg-[#fdece7] dark:bg-[#3d1f18] text-[#cf5a37] dark:text-[#e07755]", label: "Sakit" },
};

function StatusPill({ status }: { status: string }) {
  const s = statusConfig[status] ?? statusConfig.libur;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${s.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

// ── Topbar ───────────────────────────────────────────────────────
function Topbar() {
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
      <div className="flex items-center gap-2.5 flex-1 max-w-sm rounded-xl border border-line bg-white dark:bg-[#10243c] px-3.5 h-10 text-[#7a8699] dark:text-[#8a9ab0]">
        <Search className="w-[18px] h-[18px] shrink-0" />
        <input
          placeholder="Cari siswa, juz, atau catatan…"
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

// ── Main Dashboard ───────────────────────────────────────────────
export default function GuruDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showStudents, setShowStudents] = useState(false);

  const firstName =
    profile?.nickname || profile?.full_name?.split(" ")[0] || "Ustadz/ah";

  const { data: students } = useQuery({
    queryKey: ["all-students", profile?.lembaga_id],
    queryFn: async () => {
      if (!profile?.lembaga_id) return [];
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "siswa")
        .eq("lembaga_id", profile.lembaga_id)
        .order("full_name");
      return data || [];
    },
    enabled: !!profile?.lembaga_id,
  });

  const { data: todayActivity } = useQuery({
    queryKey: ["today-activity"],
    queryFn: async () => {
      const today = new Date().toLocaleDateString("en-CA");
      const { data } = await supabase
        .from("mutabaah_entries")
        .select("student_id")
        .eq("date", today);
      return data?.length || 0;
    },
  });

  const { data: todayMutabaahEntries } = useQuery({
    queryKey: ["today-mutabaah-entries"],
    queryFn: async () => {
      const today = new Date().toLocaleDateString("en-CA");
      const { data } = await supabase
        .from("mutabaah_entries")
        .select("*")
        .eq("date", today)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: studentProgress } = useQuery({
    queryKey: ["student-progress"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tahfizh_entries")
        .select("student_id, is_mutqin");
      if (!data) return {};
      const map: Record<string, number> = {};
      data.forEach((e) => {
        if (e.is_mutqin) map[e.student_id] = (map[e.student_id] || 0) + 1;
      });
      return map;
    },
  });

  const totalSiswa = students?.length || 0;
  const aktifHariIni = todayActivity || 0;
  const partisipasi = totalSiswa ? Math.round((aktifHariIni / totalSiswa) * 100) : 0;
  const avgProgress = totalSiswa
    ? Math.round(
        (Object.values(studentProgress || {}).reduce((a, b) => a + b, 0) /
          Math.max(totalSiswa, 1) /
          604) *
          100
      )
    : 0;

  const filteredStudents = students?.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  );

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
              Dashboard Guru — pantau perkembangan hafalan santrimu hari ini.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white dark:bg-[#10243c] border border-line px-3 sm:px-4 py-1.5 sm:py-2 text-[11.5px] sm:text-[13px] text-[#27384f] dark:text-[#b0c4db] shadow-sm mt-1 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#1b426f]" />
            Panel Guru
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

        {/* Class overview + Stat cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mt-5 sm:mt-6">
          {/* Participation overview card */}
          <div className="bg-white dark:bg-[#10243c] rounded-[14px] sm:rounded-[18px] border border-line shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_-28px_rgba(15,39,66,0.30)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_4px_20px_-4px_rgba(0,0,0,0.5)] p-4 sm:p-6 lg:col-span-1 flex flex-row items-center gap-4 sm:gap-6">
            <ParticipationRing value={aktifHariIni} total={totalSiswa} />
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[10.5px] sm:text-[12px] tracking-[0.14em] uppercase text-[#9aa6b8] dark:text-[#5a6a80]">
                Kelas Hari Ini
              </div>
              <div className="font-display text-[16px] sm:text-[22px] text-[#0f2742] dark:text-[#e8edf5] leading-tight mt-1">
                {aktifHariIni} / {totalSiswa} siswa
              </div>
              <div className="flex flex-col gap-1 sm:gap-1.5 mt-2 sm:mt-3 text-[11.5px] sm:text-[13px] items-start">
                <span className="flex items-center gap-2 text-[#27384f] dark:text-[#b0c4db]">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#2f8a4d]" />
                  Aktif mutaba'ah · {aktifHariIni} siswa
                </span>
                <span className="flex items-center gap-2 text-[#27384f] dark:text-[#b0c4db]">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#c9a35a]" />
                  Rata-rata hafalan · {avgProgress}%
                </span>
              </div>
            </div>
          </div>

          {/* 4 stat cards */}
          <div className="grid grid-cols-2 lg:col-span-2 gap-3 sm:gap-5">
            <StatCard
              Icon={Users}
              label="Total Siswa"
              value={String(totalSiswa)}
              sub="Terdaftar di lembaga"
              iconClass="bg-[#e7f0fb] dark:bg-[#1a2f4a] text-[#1b426f] dark:text-[#5b9fd4]"
            />
            <StatCard
              Icon={Activity}
              label="Aktif Hari Ini"
              value={String(aktifHariIni)}
              sub={aktifHariIni > 0 ? "Sudah mengisi mutaba'ah" : "Belum ada setoran"}
              iconClass="bg-[#e6f4ea] dark:bg-[#1a3d28] text-[#2f8a4d] dark:text-[#4dbc72]"
            />
            <StatCard
              Icon={BookOpen}
              label="Rata-rata Hafalan"
              value={`${avgProgress}%`}
              sub="Dari 604 halaman"
              iconClass="bg-[#fff4e0] dark:bg-[#3d3010] text-[#c98a2f] dark:text-[#d4a943]"
            />
            <StatCard
              Icon={TrendingUp}
              label="Partisipasi"
              value={`${partisipasi}%`}
              sub={partisipasi >= 80 ? "Luar biasa!" : partisipasi >= 50 ? "Cukup baik" : "Perlu ditingkatkan"}
              iconClass="bg-[#fde9e6] dark:bg-[#3d1f18] text-[#d97757] dark:text-[#e8896a]"
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
              Icon={GraduationCap}
              label="Tracker Hafalan"
              desc="Pantau progress per siswa"
              primary
              onClick={() => navigate("/tracker")}
            />
            <QuickAction
              Icon={Eye}
              label="Rekap Mutaba'ah"
              desc="Lihat setoran hari ini"
              onClick={() => navigate("/mutabaah")}
            />
            <QuickAction
              Icon={BookMarked}
              label="Ujian"
              desc="Kelola ujian hafalan"
              onClick={() => navigate("/ujian")}
            />
          </div>
        </div>

        {/* Daftar Siswa */}
        <div className="mt-8 bg-white dark:bg-[#10243c] rounded-[18px] border border-line shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_-28px_rgba(15,39,66,0.30)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_4px_20px_-4px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-line">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="grid place-items-center w-8 h-8 rounded-lg bg-[#eef2f7] dark:bg-[#1a2f4a] text-[#1b426f] dark:text-[#5b9fd4] shrink-0">
                <Users className="w-[18px] h-[18px]" />
              </span>
              <h3 className="font-display text-[15px] sm:text-[19px] text-[#0f2742] dark:text-[#e8edf5] truncate">
                Daftar Siswa
              </h3>
            </div>
            <button
              onClick={() => setShowStudents((v) => !v)}
              className="flex items-center gap-1.5 text-[12px] sm:text-[12.5px] font-semibold text-[#1b426f] dark:text-[#5b9fd4] hover:underline underline-offset-2 shrink-0"
            >
              {showStudents ? "Sembunyikan" : `Tampilkan (${totalSiswa})`}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${showStudents ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {showStudents && (
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="flex items-center gap-2.5 rounded-xl border border-line bg-[#f7f9fc] dark:bg-[#162236] px-3.5 h-10 mt-4 mb-3">
                <Search className="w-4 h-4 text-[#9aa6b8] dark:text-[#5a6a80] shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama siswa…"
                  className="flex-1 bg-transparent outline-none text-[13.5px] text-[#0b1d33] dark:text-[#e0e8f0] placeholder:text-[#9aa6b8] dark:placeholder:text-[#5a6a80]"
                />
              </div>

              {filteredStudents?.length === 0 ? (
                <p className="text-[13px] text-[#7a8699] dark:text-[#8a9ab0] text-center py-8">Belum ada siswa terdaftar</p>
              ) : (
                <div className="space-y-2">
                  {filteredStudents?.map((student) => {
                    const mutqin = studentProgress?.[student.user_id] || 0;
                    const pct = Math.round((mutqin / 604) * 100);
                    return (
                      <div
                        key={student.id}
                        className="flex items-center gap-3 p-3 sm:p-4 rounded-[14px] border border-line hover:bg-[#f7f9fc] dark:hover:bg-[#162236] transition-colors"
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#eef2f7] dark:bg-[#1a2f4a] flex items-center justify-center text-[#1b426f] dark:text-[#5b9fd4] font-semibold text-sm flex-shrink-0">
                          {student.full_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <p className="text-[13.5px] font-semibold text-[#0f2742] dark:text-[#e8edf5] truncate">
                              {student.full_name}
                            </p>
                            <p className="text-[12px] font-semibold text-[#1b426f] dark:text-[#5b9fd4] flex-shrink-0">
                              {pct}%
                            </p>
                          </div>
                          {student.class && (
                            <p className="text-[11.5px] text-[#9aa6b8] dark:text-[#5a6a80]">{student.class}</p>
                          )}
                          <Progress value={pct} className="h-1.5 mt-1.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mutaba'ah Hari Ini */}
        <div className="mt-6 bg-white dark:bg-[#10243c] rounded-[18px] border border-line shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_-28px_rgba(15,39,66,0.30)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_4px_20px_-4px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-line">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="grid place-items-center w-8 h-8 rounded-lg bg-[#eef2f7] dark:bg-[#1a2f4a] text-[#1b426f] dark:text-[#5b9fd4] shrink-0">
                <ClipboardCheck className="w-[18px] h-[18px]" />
              </span>
              <h3 className="font-display text-[15px] sm:text-[19px] text-[#0f2742] dark:text-[#e8edf5] truncate">
                Mutaba'ah Hari Ini
              </h3>
            </div>
            <span className="text-[12px] font-semibold text-[#7a8699] dark:text-[#8a9ab0] shrink-0">
              {todayMutabaahEntries?.length || 0} siswa
            </span>
          </div>

          {!todayMutabaahEntries || todayMutabaahEntries.length === 0 ? (
            <div className="grid place-items-center py-12 px-4 text-center">
              <div className="grid place-items-center w-14 h-14 rounded-2xl bg-[#eef2f7] dark:bg-[#1a2f4a] text-[#1b426f] dark:text-[#5b9fd4] mb-4">
                <ClipboardCheck className="w-7 h-7" />
              </div>
              <p className="text-[14px] text-[#7a8699] dark:text-[#8a9ab0]">Belum ada siswa yang mengisi mutaba'ah hari ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.08em] text-[#9aa6b8] dark:text-[#5a6a80]">
                    <th className="font-semibold px-4 sm:px-6 py-3">Siswa</th>
                    <th className="font-semibold px-4 sm:px-6 py-3">Ziyadah</th>
                    <th className="hidden sm:table-cell font-semibold px-4 sm:px-6 py-3">Hifdzul Jadid</th>
                    <th className="hidden sm:table-cell font-semibold px-4 sm:px-6 py-3">Qadhim</th>
                    <th className="hidden sm:table-cell font-semibold px-4 sm:px-6 py-3">Keterangan</th>
                    <th className="font-semibold px-4 sm:px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[13.5px]">
                  {todayMutabaahEntries.map((entry) => {
                    const student = students?.find((s) => s.user_id === entry.student_id);
                    return (
                      <tr
                        key={entry.id}
                        className="border-t border-line hover:bg-[#f7f9fc] dark:hover:bg-[#162236] transition-colors"
                      >
                        <td className="px-4 sm:px-6 py-3.5 font-semibold text-[#0f2742] dark:text-[#e8edf5] whitespace-nowrap">
                          {student?.full_name || "—"}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-[#27384f] dark:text-[#b0c4db] max-w-[120px] truncate">
                          {entry.ziyadah_surat
                            ? `${entry.ziyadah_surat} ${entry.ziyadah_ayat_start ?? ""}–${entry.ziyadah_ayat_end ?? ""}`
                            : "—"}
                        </td>
                        <td className="hidden sm:table-cell px-4 sm:px-6 py-3.5 text-[#5b6b80] dark:text-[#8a9ab0] whitespace-nowrap">
                          {entry.murojaah_hifdzul_jadid_dari != null &&
                          entry.murojaah_hifdzul_jadid_hingga != null
                            ? `Hal. ${entry.murojaah_hifdzul_jadid_dari}–${entry.murojaah_hifdzul_jadid_hingga}`
                            : "—"}
                        </td>
                        <td className="hidden sm:table-cell px-4 sm:px-6 py-3.5 text-[#5b6b80] dark:text-[#8a9ab0]">
                          {entry.murojaah_hifdzul_qodim || entry.murojaah_tsnai || "—"}
                        </td>
                        <td className="hidden sm:table-cell px-4 sm:px-6 py-3.5 text-[#7a8699] dark:text-[#8a9ab0] max-w-[100px] truncate">
                          {entry.keterangan || "—"}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right">
                          <StatusPill status={entry.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
