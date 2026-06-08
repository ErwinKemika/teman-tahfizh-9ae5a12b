import { ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  BookMarked,
  User,
  Trophy,
  LogOut,
  Menu,
  ClipboardList,
  ChevronDown,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  subItems?: NavItem[];
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Tracker", icon: BookOpen, path: "/tracker" },
  { label: "Mutaba'ah", icon: ClipboardCheck, path: "/mutabaah" },
  { label: "Ujian", icon: Trophy, path: "/ujian" },
  { label: "Profil", icon: User, path: "/profile" },
  { label: "Mushaf", icon: BookMarked, path: "/mushaf" },
];

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const ujianPaths = ["/ujian", "/hasil-ujian"];
  const [ujianOpen, setUjianOpen] = useState(() => ujianPaths.includes(pathname));

  const handleNav = (path: string) => {
    navigate(path);
    onNav?.();
  };

  const navItems: NavItem[] =
    profile?.role === "guru"
      ? [
          { label: "Dashboard", icon: LayoutDashboard, path: "/" },
          { label: "Tracker", icon: BookOpen, path: "/tracker" },
          { label: "Mutaba'ah", icon: ClipboardCheck, path: "/mutabaah" },
          {
            label: "Ujian",
            icon: Trophy,
            path: "/ujian",
            subItems: [{ label: "Hasil Ujian", icon: ClipboardList, path: "/hasil-ujian" }],
          },
          { label: "Profil", icon: User, path: "/profile" },
          { label: "Mushaf", icon: BookMarked, path: "/mushaf" },
        ]
      : mainNavItems;

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="bg-geo-sidebar h-full flex flex-col text-[#dbe4f0]">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#f6f1e6] grid place-items-center shadow-[0_10px_24px_-12px_rgba(0,0,0,0.7)] shrink-0 overflow-hidden">
            <img src="/logo-tq.png" alt="Teman Qur'ani" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <div className="font-display text-[19px] leading-none text-white">Teman Qur'ani</div>
            <div className="text-[11px] tracking-[0.14em] uppercase text-[#e3c98a]/80 mt-1.5">
              {profile?.role === "guru" ? "Panel Guru" : profile?.role === "admin_lembaga" ? "Panel Admin" : "Panel Siswa"}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-5 h-px bg-white/[0.08]" />

      {/* Nav */}
      <nav aria-label="Menu utama" className="flex-1 overflow-y-auto no-scrollbar px-3 py-4">
        <div className="px-3 mb-2 text-[10.5px] font-semibold tracking-[0.18em] uppercase text-[#8aa0bd]">
          Menu Utama
        </div>
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            if (item.subItems) {
              const isParentActive = ujianPaths.includes(pathname);
              return (
                <li key={item.path}>
                  <button
                    onClick={() => { handleNav(item.path); setUjianOpen(true); }}
                    className={cn(
                      "group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all",
                      isParentActive
                        ? "bg-gradient-to-r from-[rgba(201,163,90,0.22)] to-[rgba(201,163,90,0.06)] ring-1 ring-inset ring-[rgba(201,163,90,0.30)] text-white"
                        : "text-[#aebfd4] hover:text-white hover:bg-white/5"
                    )}
                  >
                    <span
                      className={cn(
                        "grid place-items-center w-8 h-8 rounded-lg transition-colors shrink-0",
                        isParentActive
                          ? "bg-[#c9a35a] text-[#0f2742]"
                          : "bg-white/5 text-[#aebfd4] group-hover:text-white"
                      )}
                    >
                      <item.icon className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 text-left">{item.label}</span>
                    {isParentActive && <span className="w-1.5 h-1.5 rounded-full bg-[#e3c98a] shrink-0" />}
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 shrink-0 transition-transform duration-200 text-[#aebfd4]",
                        ujianOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {ujianOpen && (
                    <div className="ml-3 pl-3 border-l border-white/[0.08] mt-0.5 space-y-0.5">
                      {item.subItems.map((sub) => {
                        const isSubActive = pathname === sub.path;
                        return (
                          <button
                            key={sub.path}
                            onClick={() => { handleNav(sub.path); }}
                            className={cn(
                              "group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all",
                              isSubActive
                                ? "bg-gradient-to-r from-[rgba(201,163,90,0.22)] to-[rgba(201,163,90,0.06)] ring-1 ring-inset ring-[rgba(201,163,90,0.30)] text-white"
                                : "text-[#aebfd4] hover:text-white hover:bg-white/5"
                            )}
                          >
                            <span
                              className={cn(
                                "grid place-items-center w-7 h-7 rounded-lg transition-colors shrink-0",
                                isSubActive
                                  ? "bg-[#c9a35a] text-[#0f2742]"
                                  : "bg-white/5 text-[#aebfd4] group-hover:text-white"
                              )}
                            >
                              <sub.icon className="w-4 h-4" />
                            </span>
                            <span className="flex-1 text-left">{sub.label}</span>
                            {isSubActive && <span className="w-1.5 h-1.5 rounded-full bg-[#e3c98a] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            }

            const isActive = pathname === item.path;
            return (
              <li key={item.path}>
                <button
                  onClick={() => handleNav(item.path)}
                  className={cn(
                    "group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all",
                    isActive
                      ? "bg-gradient-to-r from-[rgba(201,163,90,0.22)] to-[rgba(201,163,90,0.06)] ring-1 ring-inset ring-[rgba(201,163,90,0.30)] text-white"
                      : "text-[#aebfd4] hover:text-white hover:bg-white/5"
                  )}
                >
                  <span
                    className={cn(
                      "grid place-items-center w-8 h-8 rounded-lg transition-colors shrink-0",
                      isActive
                        ? "bg-[#c9a35a] text-[#0f2742]"
                        : "bg-white/5 text-[#aebfd4] group-hover:text-white"
                    )}
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#e3c98a] shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="mt-auto px-3 pb-5">
        <div className="mx-2 mb-3 h-px bg-white/[0.08]" />
        <div className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-white/5 transition-colors">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c9a35a] to-[#9c7b38] text-[#0f2742] grid place-items-center font-bold text-[14px] shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold text-white truncate">
              {profile?.full_name || "User"}
            </div>
            <div className="text-[11px] text-[#8aa0bd] capitalize">{profile?.role}</div>
          </div>
          <button
            onClick={toggleTheme}
            title="Ganti tema"
            aria-label="Ganti tema"
            className="grid place-items-center w-8 h-8 rounded-lg text-[#aebfd4] hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
          >
            {theme === "dark" ? (
              <Sun className="w-[17px] h-[17px]" />
            ) : (
              <Moon className="w-[17px] h-[17px]" />
            )}
          </button>
          <button
            title="Keluar"
            aria-label="Keluar"
            onClick={signOut}
            className="grid place-items-center w-8 h-8 rounded-lg text-[#aebfd4] hover:text-[#f3b4a6] hover:bg-white/[0.08] transition-colors shrink-0"
          >
            <LogOut className="w-[17px] h-[17px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (profile?.role === "admin_lembaga") {
      navigate("/admin", { replace: true });
    }
  }, [profile?.role, navigate]);

  const mobileNavItems =
    profile?.role === "guru"
      ? ([
          { label: "Dashboard", icon: LayoutDashboard, path: "/" },
          { label: "Ujian", icon: Trophy, path: "/ujian" },
          { label: "Hasil Ujian", icon: ClipboardList, path: "/hasil-ujian" },
          { label: "Mutaba'ah", icon: ClipboardCheck, path: "/mutabaah" },
          { label: "Profil", icon: User, path: "/profile" },
        ] as NavItem[])
      : mainNavItems.slice(0, 5);

  return (
    <div className="min-h-screen flex w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[270px] shrink-0 sticky top-0 h-screen overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar (mobile only) */}
        <header
          className="lg:hidden flex items-center justify-between px-4 border-b border-border bg-card"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            height: "calc(3.5rem + env(safe-area-inset-top))",
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#f6f1e6] flex items-center justify-center overflow-hidden">
              <img src="/logo-tq.png" alt="Teman Qur'ani" className="w-6 h-6 object-contain" />
            </div>
            <span className="font-bold text-foreground text-sm">Teman Qur'ani</span>
          </div>
          <div className="flex items-center gap-1">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 w-[270px] border-none bg-[#0f2742] [&>button]:text-white [&>button]:hover:bg-white/10"
              >
                <SidebarContent onNav={() => setSheetOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto main-content-pb">{children}</main>

        {/* Bottom Nav (mobile) */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center justify-around z-50"
          style={{
            height: "calc(4rem + env(safe-area-inset-bottom))",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {mobileNavItems.map((item) => {
            const active = pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", active && "text-primary")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
