import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Users, BookOpen, Settings, School } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      {/* Top bar */}
      <header className="bg-[#0f2742] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#f6f1e6] grid place-items-center overflow-hidden">
            <img src="/logo-tq.png" alt="Teman Qur'ani" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-none">Teman Qur'ani</div>
            <div className="text-[10px] tracking-widest uppercase text-[#e3c98a]/80 mt-0.5">Panel Admin</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 sm:px-6 py-8 max-w-4xl mx-auto w-full">
        {/* Welcome */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c9a35a] to-[#9c7b38] text-[#0f2742] grid place-items-center font-bold text-xl shadow-lg">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0f2742]">
                Assalamu'alaikum, {profile?.full_name || "Admin"}
              </h1>
              <p className="text-[#5b6b80] text-sm mt-0.5">Dashboard Admin Lembaga</p>
            </div>
          </div>
        </div>

        {/* Info lembaga */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#eef1f6] grid place-items-center">
              <School className="w-5 h-5 text-[#0f2742]" />
            </div>
            <div>
              <div className="font-semibold text-[#0f2742]">Kawkab Islamic Boarding School</div>
              <div className="text-xs text-[#7a8699]">Kode: <span className="font-mono font-semibold text-[#0f2742]">KIBS</span></div>
            </div>
          </div>
          <p className="text-xs text-[#7a8699]">
            Bagikan kode <span className="font-mono font-semibold text-[#0f2742]">KIBS</span> kepada santri dan guru agar mereka bisa mendaftar ke lembaga ini.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-50 grid place-items-center mb-3">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="font-semibold text-[#0f2742] mb-1">Kelola Santri & Guru</div>
            <div className="text-sm text-[#7a8699]">Fitur manajemen pengguna akan segera hadir.</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 grid place-items-center mb-3">
              <BookOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="font-semibold text-[#0f2742] mb-1">Laporan Hafalan</div>
            <div className="text-sm text-[#7a8699]">Ringkasan progress hafalan seluruh santri.</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm sm:col-span-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 grid place-items-center mb-3">
              <Settings className="w-5 h-5 text-amber-600" />
            </div>
            <div className="font-semibold text-[#0f2742] mb-1">Pengaturan Lembaga</div>
            <div className="text-sm text-[#7a8699]">Ubah nama, kode, dan konfigurasi lembaga.</div>
          </div>
        </div>
      </main>
    </div>
  );
}
