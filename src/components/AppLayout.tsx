import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  BookMarked,
  User,
  Trophy,
  LogOut,
  Menu,
  MessageSquare,
  Calendar,
  Megaphone,
  Mic,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  comingSoon?: boolean;
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Tracker", icon: BookOpen, path: "/tracker" },
  { label: "Mutaba'ah", icon: ClipboardCheck, path: "/mutabaah" },
  { label: "Mushaf", icon: BookMarked, path: "/mushaf" },
  { label: "Profil", icon: User, path: "/profile" },
];

const guruNavItems: NavItem[] = [
  { label: "Ujian", icon: ClipboardCheck, path: "/ujian" },
  { label: "Siswa", icon: Users, path: "/students" },
];

const comingSoonItems: NavItem[] = [
  { label: "Leaderboard", icon: Trophy, path: "#", comingSoon: true },
  { label: "Jadwal", icon: Calendar, path: "#", comingSoon: true },
  { label: "Pesan", icon: MessageSquare, path: "#", comingSoon: true },
  { label: "Notifikasi", icon: Megaphone, path: "#", comingSoon: true },
  { label: "Rekaman Suara", icon: Mic, path: "#", comingSoon: true },
];

function NavItemButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={item.comingSoon}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : item.comingSoon
          ? "text-sidebar-foreground/40 cursor-not-allowed"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      )}
    >
      <item.icon className="w-5 h-5 shrink-0" />
      <span className="truncate">{item.label}</span>
      {item.comingSoon && (
        <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 border-sidebar-foreground/20 text-sidebar-foreground/40">
          Segera
        </Badge>
      )}
    </button>
  );
}

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleNav = (path: string) => {
    navigate(path);
    onNav?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-sidebar-foreground text-sm">Tahfizh Tracker</h2>
            <p className="text-[11px] text-sidebar-foreground/50">
              {profile?.role === "guru" ? "Panel Guru" : "Panel Siswa"}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          Menu Utama
        </p>
        {mainNavItems.map((item) => (
          <NavItemButton
            key={item.path}
            item={item}
            active={pathname === item.path}
            onClick={() => handleNav(item.path)}
          />
        ))}

        {profile?.role === "guru" && (
          <>
            <p className="px-3 py-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Guru
            </p>
            {guruNavItems.map((item) => (
              <NavItemButton
                key={item.path}
                item={item}
                active={pathname === item.path}
                onClick={() => handleNav(item.path)}
              />
            ))}
          </>
        )}

        <p className="px-3 py-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          Segera Hadir
        </p>
        {comingSoonItems.map((item) => (
          <NavItemButton
            key={item.label}
            item={item}
            active={false}
            onClick={() => {}}
          />
        ))}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center text-sidebar-accent-foreground text-sm font-semibold">
            {profile?.full_name?.charAt(0) || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || "User"}
            </p>
            <p className="text-[11px] text-sidebar-foreground/50 capitalize">{profile?.role}</p>
          </div>
          <ThemeToggle className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent" />
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const mobileNavItems = mainNavItems.slice(0, 5);

  return (
    <div className="min-h-screen flex w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-sidebar flex-col border-r border-sidebar-border shrink-0">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-sm">Tahfizh Tracker</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border">
                <SidebarContent onNav={() => setSheetOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-6">
          {children}
        </main>

        {/* Bottom Nav (mobile) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center justify-around h-16 z-50">
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
