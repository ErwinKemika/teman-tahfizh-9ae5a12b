import { supabase } from "@/integrations/supabase/client";

export const QURAN_API_BASE =
  import.meta.env.VITE_QURAN_API_BASE ?? "https://api.quran.com/api/v4";

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cache: TokenCache | null = null;

/**
 * Fetches a Quran Foundation access token via the `quran-token` edge function.
 * The OAuth client_id/client_secret are kept server-side; this client never
 * sees them. Returns null if the backend is not configured or the call fails,
 * in which case callers fall back to unauthenticated requests.
 */
export async function getQuranAccessToken(): Promise<string | null> {
  if (cache && Date.now() < cache.expiresAt - 30_000) {
    return cache.token;
  }

  try {
    const { data, error } = await supabase.functions.invoke<{
      token: string | null;
      expiresIn: number;
    }>("quran-token");

    if (error || !data?.token) return null;

    cache = {
      token: data.token,
      expiresAt: Date.now() + (data.expiresIn || 3600) * 1000,
    };
    return cache.token;
  } catch (err) {
    console.warn("Quran auth failed, proceeding without token:", err);
    return null;
  }
}

export async function quranFetch(url: string): Promise<Response> {
  const token = await getQuranAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { headers });
}
