import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Eye, EyeOff, Mail, Lock, User, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("login");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regRole, setRegRole] = useState<"guru" | "siswa">("siswa");
  const [showRegPw, setShowRegPw] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    if (error) {
      toast.error("Login gagal: " + error.message);
    } else {
      toast.success("Berhasil masuk!");
      navigate("/");
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      toast.error("Harap setujui syarat & ketentuan terlebih dahulu");
      return;
    }
    setLoading(true);
    const { error } = await signUp(regEmail, regPassword, regName, regRole);
    if (error) {
      toast.error("Registrasi gagal: " + error.message);
    } else {
      toast.success("Akun berhasil dibuat! Silakan cek email untuk verifikasi.");
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error("Google sign-in gagal: " + error.message);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── Hero Panel ── */}
      <div className="relative md:w-1/2 md:min-h-screen bg-primary overflow-hidden flex flex-col">
        {/* Geometric star pattern */}
        <div className="absolute inset-0 pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-stars" x="0" y="0" width="140" height="140" patternUnits="userSpaceOnUse">
                <polygon
                  points="70,8 82,44 120,44 90,68 102,104 70,82 38,104 50,68 20,44 58,44"
                  fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2"
                />
                <polygon
                  points="70,28 78,52 104,52 84,66 92,90 70,76 48,90 56,66 36,52 62,52"
                  fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8"
                />
                <circle cx="70" cy="70" r="38" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-stars)" />
          </svg>
        </div>

        {/* Branding (desktop top-left) */}
        <div className="hidden md:flex items-center gap-2.5 relative z-10 p-6">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Tahfizh Tracker</p>
            <p className="text-white/40 text-[10px] tracking-widest mt-0.5">HIFZ · MURAJAAH · TASMI</p>
          </div>
        </div>

        {/* Arabic content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-8 py-10 md:py-0">
          <p className="font-arabic text-white/90 text-2xl md:text-4xl leading-loose mb-3 md:mb-5">
            بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيمِ
          </p>
          <p className="font-arabic text-white/65 text-lg md:text-2xl leading-loose mb-5 md:mb-7">
            وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ
          </p>
          <p className="text-white/55 text-sm italic leading-relaxed max-w-xs">
            "Dan sungguh telah Kami mudahkan Al-Qur'an untuk pelajaran."
          </p>
          <p className="text-white/35 text-[11px] tracking-widest mt-2">QS. AL-QAMAR : 17</p>
        </div>

        {/* Stats (desktop bottom) */}
        <div className="hidden md:flex justify-center gap-10 relative z-10 pb-8">
          {[["30", "JUZ"], ["114", "SURAH"], ["6.236", "AYAT"]].map(([num, lbl]) => (
            <div key={lbl} className="text-center">
              <p className="text-white font-bold text-lg">{num}</p>
              <p className="text-white/35 text-[10px] tracking-widest">{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Form Panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background px-4 py-8 md:px-10 lg:px-16">
        {/* Desktop heading */}
        <div className="hidden md:block w-full max-w-sm mb-7">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-8 h-0.5 bg-highlight" />
            <p className="text-xs text-highlight font-semibold tracking-widest">ASSALAMU'ALAIKUM</p>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Selamat datang kembali</h1>
          <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
            Masuk untuk melanjutkan setoran, murajaah, dan target juz harianmu.
          </p>
        </div>

        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-border/50 bg-card shadow-card p-5">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid grid-cols-2 w-full mb-5">
                <TabsTrigger value="login">Masuk</TabsTrigger>
                <TabsTrigger value="register">Daftar</TabsTrigger>
              </TabsList>

              {/* ── LOGIN TAB ── */}
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="email@contoh.com"
                        className="pl-9"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-sm">Password</Label>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => toast.info("Fitur lupa password akan segera hadir")}
                      >
                        Lupa password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="login-password"
                        type={showLoginPw ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-9 pr-9"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-xs text-muted-foreground">Ingat saya di perangkat ini</span>
                  </label>

                  <Button type="submit" className="w-full gradient-primary text-white rounded-xl h-11 font-semibold" disabled={loading}>
                    {loading ? "Memproses..." : "Masuk ke Dashboard"}
                  </Button>

                  <div className="relative flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-muted-foreground font-semibold tracking-widest">ATAU</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl h-11 gap-2.5 text-sm font-medium"
                    onClick={handleGoogleSignIn}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Lanjutkan dengan Google
                  </Button>
                </form>
              </TabsContent>

              {/* ── REGISTER TAB ── */}
              <TabsContent value="register" className="mt-0">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-name" className="text-sm">Nama Lengkap</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="reg-name"
                        placeholder="Ahmad Abdullah"
                        className="pl-9"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email" className="text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="email@contoh.com"
                        className="pl-9"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password" className="text-sm">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="reg-password"
                        type={showRegPw ? "text" : "password"}
                        placeholder="Minimal 6 karakter"
                        className="pl-9 pr-9"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Peran Anda</Label>
                    <Select value={regRole} onValueChange={(v) => setRegRole(v as "guru" | "siswa")}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="siswa">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 shrink-0" />
                            <div className="text-left">
                              <p className="font-medium text-sm">Siswa</p>
                              <p className="text-xs text-muted-foreground">Saya menghafal Al-Qur'an</p>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="guru">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 shrink-0" />
                            <div className="text-left">
                              <p className="font-medium text-sm">Guru</p>
                              <p className="text-xs text-muted-foreground">Saya membimbing hafalan</p>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-4 h-4 rounded accent-primary mt-0.5 shrink-0"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      Saya menyetujui{" "}
                      <span className="text-primary underline cursor-pointer">Syarat Layanan</span>{" "}
                      dan{" "}
                      <span className="text-primary underline cursor-pointer">Kebijakan Privasi</span>{" "}
                      Tahfizh Tracker.
                    </span>
                  </label>

                  <Button type="submit" className="w-full gradient-primary text-white rounded-xl h-11 font-semibold" disabled={loading}>
                    {loading ? "Memproses..." : "Buat Akun Saya"}
                  </Button>
                </form>

                <p className="text-center text-xs text-muted-foreground mt-4">
                  Sudah punya akun?{" "}
                  <button
                    type="button"
                    onClick={() => setTab("login")}
                    className="text-primary font-medium hover:underline"
                  >
                    Masuk di sini
                  </button>
                </p>
              </TabsContent>
            </Tabs>
          </div>

          {tab === "login" && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              Belum punya akun?{" "}
              <button
                type="button"
                onClick={() => setTab("register")}
                className="text-primary font-medium hover:underline"
              >
                Daftar gratis
              </button>
            </p>
          )}

          <p className="text-center text-[10px] text-muted-foreground/40 mt-3 hidden md:block">v1.0 · ID</p>
        </div>
      </div>
    </div>
  );
}
