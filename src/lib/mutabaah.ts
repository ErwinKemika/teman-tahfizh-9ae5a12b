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

// Jumlah ziyadah: angka halaman ("1½ hal.") atau teks bebas kalau yang diisi bukan angka.
export function formatZiyadahJumlah(e: { ziyadah_jumlah?: number | null; ziyadah_detail?: string | null }): string {
  if (e.ziyadah_detail) return e.ziyadah_detail;
  return e.ziyadah_jumlah ? `${formatHalaman(e.ziyadah_jumlah)} hal.` : "";
}

// "2026-11-20" -> "Jum, 20 Nov" (tanggal lokal, tanpa geser zona waktu).
export function formatTanggalPendek(date: string, withYear = false): string {
  const d = new Date(`${date}T00:00:00`);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
}

// "An-Naba' ayat 1–20 (1 hal.)" — surat, rentang ayat (kalau ada), lalu jumlah/detail.
export function formatZiyadah(e: {
  ziyadah_surat?: string | null;
  ziyadah_ayat_start?: number | null;
  ziyadah_ayat_end?: number | null;
  ziyadah_jumlah?: number | null;
  ziyadah_detail?: string | null;
}): string {
  const jumlah = formatZiyadahJumlah(e);
  if (!e.ziyadah_surat) return jumlah;
  const ayat = e.ziyadah_ayat_start != null ? ` ayat ${e.ziyadah_ayat_start}–${e.ziyadah_ayat_end ?? ""}` : "";
  return `${e.ziyadah_surat}${ayat}${jumlah ? ` (${jumlah})` : ""}`;
}
