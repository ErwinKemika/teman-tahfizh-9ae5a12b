import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Urutan abjad untuk nama: tidak membedakan huruf besar/kecil dan mengabaikan spasi/tanda baca di awal (mis. 'Aisyah).
const kunciNama = (n: string) => (n ?? "").trim().replace(/^[^\p{L}\p{N}]+/u, "");
export const compareNama = (a: string, b: string) =>
  kunciNama(a).localeCompare(kunciNama(b), "id", { sensitivity: "base" });
