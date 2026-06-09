import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const OAUTH_URL = Deno.env.get("QURAN_OAUTH_URL") ?? "https://oauth2.quran.foundation";
const CLIENT_ID = Deno.env.get("QURAN_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("QURAN_CLIENT_SECRET") ?? "";

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cached: CachedToken | null = null;

async function fetchToken(): Promise<CachedToken | null> {
  if (!CLIENT_ID || !CLIENT_SECRET) return null;
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
  if (!res.ok) return null;
  const json = await res.json();
  return {
    token: json.access_token as string,
    expiresAt: Date.now() + ((json.expires_in ?? 3600) as number) * 1000,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!cached || Date.now() >= cached.expiresAt - 30_000) {
      cached = await fetchToken();
    }
    if (!cached) {
      // Credentials not configured — let the client proceed without a token.
      return new Response(JSON.stringify({ token: null, expiresIn: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const expiresIn = Math.max(0, Math.floor((cached.expiresAt - Date.now()) / 1000));
    return new Response(
      JSON.stringify({ token: cached.token, expiresIn }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (_err) {
    return new Response(JSON.stringify({ token: null, expiresIn: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
