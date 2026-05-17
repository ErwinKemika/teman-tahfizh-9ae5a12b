const OAUTH_URL =
  import.meta.env.VITE_QURAN_OAUTH_URL ?? "https://oauth2.quran.foundation";
const CLIENT_ID = import.meta.env.VITE_QURAN_CLIENT_ID ?? "";
const CLIENT_SECRET = import.meta.env.VITE_QURAN_CLIENT_SECRET ?? "";

export const QURAN_API_BASE =
  import.meta.env.VITE_QURAN_API_BASE ?? "https://api.quran.com/api/v4";

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cache: TokenCache | null = null;

export async function getQuranAccessToken(): Promise<string | null> {
  if (cache && Date.now() < cache.expiresAt - 30_000) {
    return cache.token;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) return null;

  try {
    const res = await fetch(`${OAUTH_URL}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "content",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });

    if (!res.ok) throw new Error(`${res.status}`);

    const json = await res.json();
    cache = {
      token: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
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
