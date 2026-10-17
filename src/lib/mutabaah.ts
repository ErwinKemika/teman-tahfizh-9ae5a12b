export function formatHalaman(n: number | null | undefined): string {
  if (n == null) return "";
  const int = Math.floor(n);
  const frac = n - int;
  if (Math.abs(frac - 0.5) < 0.001) return int === 0 ? "½" : `${int}½`;
  return String(n);
}

export type HifdzJadidEntry = {
  murojaah_hifdzul_jadid_dari?: number | null;
  murojaah_hifdzul_jadid_hingga?: number | null;
  murojaah_hifdzul_jadid_juz?: number[] | null;
};

export function formatHifdzJadid(e: HifdzJadidEntry): string {
  const juz = e.murojaah_hifdzul_jadid_juz?.length
    ? `Juz ${[...e.murojaah_hifdzul_jadid_juz].sort((a, b) => a - b).join(", ")}`
    : "";
  const hal =
    e.murojaah_hifdzul_jadid_dari || e.murojaah_hifdzul_jadid_hingga
      ? `hal. ${formatHalaman(e.murojaah_hifdzul_jadid_dari)}–${formatHalaman(e.murojaah_hifdzul_jadid_hingga)}`
      : "";
  return [juz, hal].filter(Boolean).join(" · ");
}
