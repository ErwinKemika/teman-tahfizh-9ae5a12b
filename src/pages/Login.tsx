import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Inline SVG icons (hairline strokes, elegant) ────────────
const IconBook = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4H10a2 2 0 0 1 2 2v13a1.5 1.5 0 0 0-1.5-1.5H3z"/>
    <path d="M21 5.5A1.5 1.5 0 0 0 19.5 4H14a2 2 0 0 0-2 2v13a1.5 1.5 0 0 1 1.5-1.5H21z"/>
  </svg>
);
const IconMail = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>
  </svg>
);
const IconLock = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 1 1 8 0v3.5"/>
  </svg>
);
const IconUser = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8.5" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>
  </svg>
);
const IconEye = ({ open }: { open: boolean }) => open ? (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3l18 18"/><path d="M10.6 6.1A10.9 10.9 0 0 1 12 6c6.5 0 10 7 10 7a17.4 17.4 0 0 1-3.2 4.1"/><path d="M6.1 6.6C3 8.7 2 12 2 12s3.5 7 10 7c1.6 0 3-.3 4.3-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>
  </svg>
);
const IconCheck = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5 10 17 19 7.5"/>
  </svg>
);
const IconChevron = ({ open }: { open: boolean }) => (
  <svg
    className={`w-4 h-4 text-[#7a8699] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

// ─── Islamic geometric star pattern (inline SVG tile) ────────
function GeoStarPattern({ patternId }: { patternId: string }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern id={patternId} x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
          {/* 10-pointed star (decagram), R=88 r=38, centred at 100,100 */}
          <polygon
            points="100,12 111.7,63.8 151.7,28.8 130.7,77.7 183.7,72.8 138,100 183.7,127.2 130.7,122.3 151.7,171.2 111.7,136.1 100,188 88.3,136.1 48.3,171.2 69.3,122.3 16.3,127.2 62,100 16.3,72.8 69.3,77.7 48.3,28.8 88.3,63.8"
            fill="none" stroke="rgba(201,163,90,0.18)" strokeWidth="1"
          />
          <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(201,163,90,0.07)" strokeWidth="0.8"/>
          <circle cx="100" cy="100" r="54" fill="none" stroke="rgba(201,163,90,0.07)" strokeWidth="0.8"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`}/>
    </svg>
  );
}

// ─── Stat strip (banner bottom) ──────────────────────────────
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-[26px] leading-none text-[#f6f1e6]">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-[#e3c98a]/80 mt-1.5">{label}</div>
    </div>
  );
}

// ─── Sliding tab switcher ─────────────────────────────────────
function AuthTabs({ value, onChange }: { value: "masuk" | "daftar"; onChange: (v: "masuk" | "daftar") => void }) {
  return (
    <div className="relative grid grid-cols-2 p-1 rounded-xl bg-[#eef1f6] border border-[#e5e9ef]">
      <div
        className="absolute top-1 bottom-1 left-1 rounded-lg bg-white"
        style={{
          width: "calc(50% - 4px)",
          transform: value === "daftar" ? "translateX(100%)" : "translateX(0)",
          boxShadow: "0 1px 2px rgba(15,39,66,0.08), 0 4px 12px -6px rgba(15,39,66,0.18)",
          transition: "transform 0.35s cubic-bezier(0.65,0.05,0.36,1)",
        }}
      />
      {(["masuk", "daftar"] as const).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={`relative z-10 py-2.5 text-[13px] font-semibold tracking-wide capitalize transition-colors ${
            value === k ? "text-[#0f2742]" : "text-[#5b6b80] hover:text-[#0f2742]"
          }`}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

// ─── Field label + hint row ───────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[12px] font-semibold text-[#27384f] tracking-wide">{label}</span>
        {hint && <span className="text-[11px] text-[#7a8699]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── Input with leading icon + optional trailing ──────────────
function InputWrap({ icon, trailing, children }: {
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a8699] pointer-events-none">{icon}</span>
      )}
      {children}
      {trailing && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2">{trailing}</span>
      )}
    </div>
  );
}

const inputCls = (hasIcon: boolean, hasTrail: boolean) =>
  `input-base w-full bg-[#f4f6fa] border border-[#e5e9ef] rounded-xl text-[14px] text-[#0b1d33] placeholder:text-[#9aa6b8] ${hasIcon ? "pl-10" : "pl-4"} ${hasTrail ? "pr-10" : "pr-4"} py-3`;

// ─── Custom checkbox (styled box, hidden native) ──────────────
function Checkbox({ checked, onChange, children }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-2.5 select-none cursor-pointer">
      <span
        className={`mt-0.5 grid place-items-center w-[18px] h-[18px] shrink-0 rounded-[5px] border transition-colors duration-150 ${
          checked ? "bg-[#0f2742] border-[#0f2742] text-white" : "bg-white border-[#cfd6e1]"
        }`}
      >
        {checked && <IconCheck />}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}


// ─── Error banner ─────────────────────────────────────────────
function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="text-[12px] text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 leading-snug">
      {message}
    </p>
  );
}

const IconBuilding = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
  </svg>
);

// ─── Role select (custom dropdown) ─────────────────
// Only "siswa" can self-register. Guru accounts must be promoted by an admin
// out-of-band; we never accept a guru role from client-side input.
const ROLES = [
  { id: "siswa", label: "Siswa / Santri", desc: "Saya menghafal Al-Qur'an" },
] as const;

type RoleId = typeof ROLES[number]["id"];

function RoleSelect({ value, onChange }: { value: RoleId; onChange: (v: RoleId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = ROLES.find((r) => r.id === value) ?? ROLES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input-base w-full flex items-center justify-between gap-3 bg-[#f4f6fa] border border-[#e5e9ef] rounded-xl px-3.5 py-3 text-left"
        style={open ? { borderColor: "#1b426f", backgroundColor: "#fff", boxShadow: "0 0 0 4px rgba(27,66,111,0.10)" } : undefined}
        aria-expanded={open}
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="grid place-items-center w-7 h-7 rounded-lg bg-[#0f2742] text-[#f6f1e6] shrink-0">
            <IconUser className="w-3.5 h-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold text-[#0b1d33] truncate">{current.label}</span>
            <span className="block text-[11px] text-[#7a8699] truncate">{current.desc}</span>
          </span>
        </span>
        <IconChevron open={open} />
      </button>

      {open && (
        <div
          className="absolute z-20 left-0 right-0 mt-2 bg-white border border-[#e5e9ef] rounded-xl overflow-hidden"
          style={{ boxShadow: "0 12px 40px -12px rgba(15,39,66,0.25)" }}
        >
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { onChange(r.id); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[#f4f6fa] ${
                r.id === value ? "bg-[#f4f6fa]" : ""
              }`}
            >
              <span className="grid place-items-center w-7 h-7 rounded-lg bg-[#eef1f6] text-[#0f2742] shrink-0">
                <IconUser className="w-3.5 h-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-[#0b1d33]">{r.label}</span>
                <span className="block text-[11px] text-[#7a8699]">{r.desc}</span>
              </span>
              {r.id === value && (
                <span className="text-[#0f2742] shrink-0">
                  <IconCheck className="w-3.5 h-3.5" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Masuk (login) form ───────────────────────────────────────
function MasukForm() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pwd, setPwd]     = useState("");
  const [show, setShow]   = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await signIn(email, pwd);
    if (error) {
      setError(error.message);
      setBusy(false);
    } else {
      toast.success("Berhasil masuk!");
      navigate("/");
    }
  };


  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <Field label="Email">
        <InputWrap icon={<IconMail />}>
          <input
            type="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="email@contoh.com"
            className={inputCls(true, false)}
          />
        </InputWrap>
      </Field>

      <Field
        label="Password"
        hint={
          <button
            type="button"
            className="text-[#1b426f] hover:text-[#0f2742] font-medium transition-colors"
            onClick={() => toast.info("Fitur lupa password akan segera hadir")}
          >
            Lupa password?
          </button>
        }
      >
        <InputWrap
          icon={<IconLock />}
          trailing={
            <button
              type="button"
              aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
              onClick={() => setShow((s) => !s)}
              className="p-1.5 rounded-md text-[#7a8699] hover:text-[#0f2742] hover:bg-[#eef1f6] transition-colors"
            >
              <IconEye open={show} />
            </button>
          }
        >
          <input
            type={show ? "text" : "password"} required
            value={pwd} onChange={(e) => setPwd(e.target.value)}
            placeholder="••••••••"
            className={inputCls(true, true)}
          />
        </InputWrap>
      </Field>

      <Checkbox checked={remember} onChange={setRemember}>
        <span className="text-[12.5px] text-[#27384f]">Ingat saya di perangkat ini</span>
      </Checkbox>

      {error && <ErrorBanner message={error} />}

      <button
        type="submit" disabled={busy}
        className="btn-primary rounded-xl py-3.5 font-semibold text-[14px] tracking-wide mt-1 disabled:opacity-70"
      >
        {busy ? "Memverifikasi…" : "Masuk ke Dashboard"}
      </button>

    </form>
  );
}

// ─── Daftar (register) form ───────────────────────────────────
function DaftarForm() {
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const [nama, setNama]           = useState("");
  const [email, setEmail]         = useState("");
  const [pwd, setPwd]             = useState("");
  const [show, setShow]           = useState(false);
  const [role, setRole]           = useState<RoleId>("siswa");
  const [kodeLembaga, setKode]    = useState("");
  const [agree, setAgree]         = useState(false);
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const strength = useMemo(() => {
    let s = 0;
    if (pwd.length >= 6) s++;
    if (pwd.length >= 10) s++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++;
    if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) s++;
    return s;
  }, [pwd]);

  const strengthMeta = [
    { label: "Mulai mengetik…", color: "#cfd6e1" },
    { label: "Lemah",           color: "#d97757" },
    { label: "Cukup",           color: "#e3a44a" },
    { label: "Bagus",           color: "#5fa872" },
    { label: "Kuat",            color: "#2f8a4d" },
  ][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) return;
    setError(null);
    setBusy(true);

    const { data: lembagaData, error: lembagaError } = await supabase
      .from("lembaga")
      .select("id")
      .eq("kode", kodeLembaga.toUpperCase().trim())
      .single();

    if (lembagaError || !lembagaData) {
      setError("Kode lembaga tidak valid. Hubungi admin lembagamu.");
      setBusy(false);
      return;
    }

    const { error } = await signUp(email, pwd, nama, lembagaData.id);
    if (error) {
      setError(error.message);
      setBusy(false);
    } else {
      await signIn(email, pwd);
      toast.success("Akun berhasil dibuat!");
      navigate("/");
    }
  };

  return (
    <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
      <Field label="Nama Lengkap">
        <InputWrap icon={<IconUser />}>
          <input
            required value={nama} onChange={(e) => setNama(e.target.value)}
            placeholder="Ahmad Abdullah"
            className={inputCls(true, false)}
          />
        </InputWrap>
      </Field>

      <Field label="Email">
        <InputWrap icon={<IconMail />}>
          <input
            type="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="email@contoh.com"
            className={inputCls(true, false)}
          />
        </InputWrap>
      </Field>

      <Field
        label="Password"
        hint={
          pwd ? (
            <span style={{ color: strengthMeta.color }} className="text-[11px] font-medium">
              {strengthMeta.label}
            </span>
          ) : undefined
        }
      >
        <InputWrap
          icon={<IconLock />}
          trailing={
            <button
              type="button"
              aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
              onClick={() => setShow((s) => !s)}
              className="p-1.5 rounded-md text-[#7a8699] hover:text-[#0f2742] hover:bg-[#eef1f6] transition-colors"
            >
              <IconEye open={show} />
            </button>
          }
        >
          <input
            type={show ? "text" : "password"} required minLength={6}
            value={pwd} onChange={(e) => setPwd(e.target.value)}
            placeholder="Minimal 6 karakter"
            className={inputCls(true, true)}
          />
        </InputWrap>
        {/* Strength meter — 4 segments */}
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-colors duration-300"
              style={{ background: i < strength ? strengthMeta.color : "#e5e9ef" }}
            />
          ))}
        </div>
      </Field>

      {/* Role is always 'siswa' for self-signup. Guru accounts are provisioned by an admin. */}

      <Field label="Kode Lembaga" hint={<span>Minta ke admin lembagamu</span>}>
        <InputWrap icon={<IconBuilding />}>
          <input
            required
            value={kodeLembaga}
            onChange={(e) => setKode(e.target.value.toUpperCase())}
            placeholder="Contoh: KIBS"
            className={inputCls(true, false)}
          />
        </InputWrap>
      </Field>

      <Checkbox checked={agree} onChange={setAgree}>
        <span className="text-[12px] text-[#27384f] leading-snug">
          Saya menyetujui{" "}
          <span className="text-[#1b426f] underline underline-offset-2 cursor-pointer">Syarat Layanan</span>
          {" "}dan{" "}
          <span className="text-[#1b426f] underline underline-offset-2 cursor-pointer">Kebijakan Privasi</span>
          {" "}Teman Qur'ani.
        </span>
      </Checkbox>

      {error && <ErrorBanner message={error} />}

      <button
        type="submit"
        disabled={busy || !agree}
        className="btn-primary rounded-xl py-3.5 font-semibold text-[14px] tracking-wide mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {busy ? "Membuat akun…" : "Buat Akun Saya"}
      </button>
    </form>
  );
}

// ─── Desktop banner (left panel) ─────────────────────────────
function BannerPanel() {
  return (
    <div className="relative h-full overflow-hidden bg-navy-900 text-cream">
      <GeoStarPattern patternId="geo-stars-banner" />

      {/* Layered radial vignettes */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, rgba(201,163,90,0.18), transparent 55%), " +
            "radial-gradient(80% 60% at 50% 110%, rgba(15,39,66,0.85), transparent 60%)",
        }}
      />

      {/* Mihrab arch silhouette */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[58%] mihrab" />

      {/* Logo mark */}
      <div className="absolute top-10 left-10 flex items-center gap-3 z-10">
        <div
          className="w-10 h-10 rounded-xl bg-cream/95 grid place-items-center overflow-hidden"
          style={{ boxShadow: "0 8px 24px -12px rgba(0,0,0,0.6)" }}
        >
          <img src="/logo-tq.png" alt="Teman Qur'ani" className="w-7 h-7 object-contain" />
        </div>
        <div>
          <div className="font-display text-[20px] leading-none tracking-tight text-cream">
            Teman Qur'ani
          </div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-gold-soft/80 mt-1">
            Hifz · Murajaah · Tasmi
          </div>
        </div>
      </div>

      {/* Center calligraphy stack */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-12 text-center">
        <div className="font-arabic text-[44px] leading-[1.4] mb-4 animate-floaty text-cream" dir="rtl">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </div>
        <div className="w-24 h-px gold-underline mb-8" />
        <div className="font-arabic text-[28px] leading-[1.9] text-cream/95 max-w-md" dir="rtl">
          وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ
        </div>
        <div className="font-display italic text-[18px] mt-5 text-gold-soft max-w-sm">
          "Dan sungguh telah Kami mudahkan Al-Qur'an untuk pelajaran."
        </div>
        <div className="text-[11px] tracking-[0.22em] uppercase text-cream/55 mt-2">
          QS. Al-Qamar : 17
        </div>
      </div>

      {/* Bottom stat strip */}
      <div
        className="absolute bottom-0 inset-x-0 z-10 px-10 pb-8 pt-12"
        style={{ background: "linear-gradient(180deg, transparent, rgba(15,39,66,0.7))" }}
      >
        <div className="grid grid-cols-3 gap-6 max-w-md mx-auto">
          <Stat value="30"    label="Juz" />
          <Stat value="114"   label="Surah" />
          <Stat value="6.236" label="Ayat" />
        </div>
      </div>

      {/* Hairline frame */}
      <div className="pointer-events-none absolute inset-5 border border-gold/15 rounded-[18px]" />
    </div>
  );
}

// ─── Mobile hero (replaces banner on < lg) ───────────────────
function MobileHero() {
  return (
    <div className="lg:hidden relative overflow-hidden bg-navy-900 text-cream pt-10 pb-16 px-6 rounded-b-[32px]">
      <GeoStarPattern patternId="geo-stars-mobile" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 70% at 50% 0%, rgba(201,163,90,0.22), transparent 60%), " +
            "radial-gradient(80% 80% at 50% 110%, rgba(15,39,66,0.85), transparent 60%)",
        }}
      />

      {/* Brand row */}
      <div className="relative z-10 flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl bg-cream/95 grid place-items-center overflow-hidden"
          style={{ boxShadow: "0 8px 24px -12px rgba(0,0,0,0.6)" }}
        >
          <img src="/logo-tq.png" alt="Teman Qur'ani" className="w-8 h-8 object-contain" />
        </div>
        <div>
          <div className="font-display text-[20px] leading-none text-cream">Teman Qur'ani</div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-gold-soft/85 mt-1">
            Hifz · Murajaah · Tasmi
          </div>
        </div>
      </div>

      {/* Calligraphy */}
      <div className="relative z-10 mt-7 text-center">
        <div className="font-arabic text-[34px] leading-[1.4] text-cream" dir="rtl">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </div>
        <div className="mx-auto mt-3 w-16 h-px gold-underline" />
        <div className="font-display italic text-[14px] mt-4 text-gold-soft">
          "Dan sungguh telah Kami mudahkan Al-Qur'an untuk pelajaran."
        </div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-cream/60 mt-1.5">
          QS. Al-Qamar : 17
        </div>
      </div>

      {/* Hairline frame */}
      <div className="pointer-events-none absolute inset-3 border border-gold/15 rounded-[28px]" />
    </div>
  );
}

// ─── Form panel (right side on desktop, full on mobile) ───────
function FormPanel() {
  const initialTab: "masuk" | "daftar" =
    typeof window !== "undefined" && window.location.hash.replace("#", "") === "daftar"
      ? "daftar"
      : "masuk";
  const [tab, setTab] = useState<"masuk" | "daftar">(initialTab);

  return (
    <div className="relative min-h-full bg-paper-cross flex flex-col">
      <MobileHero />

      {/* -mt-10 overlaps hero on mobile; lg removes it */}
      <div className="flex-1 flex items-start lg:items-center justify-center px-5 sm:px-6 pt-6 pb-10 lg:py-12 -mt-10 lg:mt-0 relative z-10">
        <div className="w-full max-w-[420px]">

          {/* Desktop eyebrow */}
          <div className="hidden lg:flex items-center gap-2 mb-5">
            <span className="h-px w-8 bg-gold" />
            <span className="text-[11px] tracking-[0.22em] uppercase text-[#7a8699]">
              Assalamu'alaikum
            </span>
          </div>

          {/* Desktop heading */}
          <h1 className="hidden lg:block font-display text-[34px] leading-[1.1] text-navy-900 mb-1.5">
            {tab === "masuk" ? "Selamat datang kembali" : "Mulai perjalanan hafalanmu"}
          </h1>
          <p className="hidden lg:block text-[14px] text-[#5b6b80] mb-7 leading-relaxed">
            {tab === "masuk"
              ? "Masuk untuk melanjutkan setoran, murajaah, dan target juz harianmu."
              : "Buat akun untuk mencatat setiap ayat, halaman, dan capaianmu."}
          </p>

          {/* Form card */}
          <div
            className="bg-white border border-auth-line rounded-2xl p-5 sm:p-6"
            style={{
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.7) inset, 0 24px 60px -32px rgba(15,39,66,0.25)",
            }}
          >
            <AuthTabs value={tab} onChange={setTab} />
            <div className="mt-5">
              {tab === "masuk" ? <MasukForm key="masuk" /> : <DaftarForm key="daftar" />}
            </div>
          </div>

          {/* Tab switch footer */}
          <div className="mt-6 flex items-center justify-between text-[12px] text-[#7a8699]">
            <span>
              {tab === "masuk" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
              <button
                type="button"
                onClick={() => setTab(tab === "masuk" ? "daftar" : "masuk")}
                className="font-semibold text-navy-900 hover:underline underline-offset-2 transition-colors"
              >
                {tab === "masuk" ? "Daftar gratis" : "Masuk di sini"}
              </button>
            </span>
            <span className="hidden sm:inline">v1.0 · ID</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page root ────────────────────────────────────────────────
export default function Login() {
  return (
    <div
      className="min-h-screen w-full"
      style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] min-h-screen">
        {/* Banner — desktop only */}
        <div className="hidden lg:block order-1 min-h-screen">
          <BannerPanel />
        </div>
        {/* Form panel */}
        <div className="min-h-screen order-2">
          <FormPanel />
        </div>
      </div>
    </div>
  );
}
