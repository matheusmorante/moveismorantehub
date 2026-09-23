import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const model = "models/gemini-3.8-live";
const liveConfig = {
  responseModalities: ["AUDIO"],
  sessionResumption: {},
  inputAudioTranscription: {},
  outputAudioTranscription: {},
};

serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Método não permitido." }, 405);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!url || !anonKey || !token) return reply({ error: "Configuração ou autenticação indisponível." }, 503);

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser(token);
  if (authError || !user) return reply({ error: "Não autenticado." }, 401);

  const body = await req.json().catch(() => ({}));
  const action = body?.action;
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : null;
  if (!( ["status", "start", "pulse", "pause"] as unknown[]).includes(action)) return reply({ error: "Ação inválida." }, 400);
  if (action !== "status" && !sessionId) return reply({ error: "Sessão inválida." }, 400);

  const { data: quota, error } = await userClient.rpc("gemini_live_quota", { p_action: action, p_session_id: sessionId });
  if (error) {
    console.error("GEMINI_LIVE_QUOTA_STATUS_FAILED", error.message);
    console.error("GEMINI_LIVE_QUOTA_FAILED", error.message);
    return reply({ error: "Não foi possível consultar a cota de voz." }, 503);
  }
  if (action === "status" || action === "pulse" || action === "pause") return reply({ quota });
  if (quota.remainingMs <= 0) return reply({ error: "Você usou os 30 minutos de Gemini Live disponíveis hoje.", quota }, 429);
  if (quota.remainingMs <= 0) return reply({ error: "Você usou os 30 minutos de Gemini Live disponíveis hoje.", quota }, 429);

  const apiKey = Deno.env.get("GEMINI_API_KEY") || "";
  if (!apiKey) {
    await userClient.rpc("gemini_live_quota", { p_action: "pause", p_session_id: sessionId });
    return reply({ error: "Gemini Live ainda não foi configurado no servidor." }, 503);
  }
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1alpha/auth_tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        uses: 1,
        newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        liveConnectConstraints: { model, config: liveConfig },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      await userClient.rpc("gemini_live_quota", { p_action: "pause", p_session_id: sessionId });
      console.error("GEMINI_LIVE_TOKEN_FAILED", response.status);
      return reply({ error: "Gemini Live indisponível." }, 502);
    }
    const payload = await response.json();
    return reply({ token: payload.token, model, config: liveConfig, quota });
  } catch (error) {
    await userClient.rpc("gemini_live_quota", { p_action: "pause", p_session_id: sessionId });
    console.error("GEMINI_LIVE_TOKEN_FAILED", error);
    return reply({ error: "Gemini Live indisponível." }, 502);
  }
});
