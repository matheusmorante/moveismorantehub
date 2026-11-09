import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const model = "gpt-realtime-2.1-mini";
const liveConfig = {
  input: {
    format: { type: "audio/pcm", rate: 24000 },
    transcription: { model: "gpt-4o-mini-transcribe", language: "pt" },
    turn_detection: { type: "server_vad", threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 600 },
    noise_reduction: { type: "near_field" },
  },
  output: { format: { type: "audio/pcm", rate: 24000 }, voice: "marin" },
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
    console.error("OPENAI_REALTIME_QUOTA_FAILED", error.message);
    return reply({ error: "Não foi possível consultar a cota de voz." }, 503);
  }
  if (action === "status" || action === "pulse" || action === "pause") return reply({ quota });
  if (quota.remainingMs <= 0) return reply({ error: "Você usou os 30 minutos de conversa por voz disponíveis hoje.", quota }, 429);

  const apiKey = Deno.env.get("OPENAI_API_KEY") || "";
  if (!apiKey) {
    await userClient.rpc("gemini_live_quota", { p_action: "pause", p_session_id: sessionId });
    return reply({ error: "A integração de voz OpenAI ainda não foi configurada no servidor." }, 503);
  }
  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ session: { type: "realtime", model, audio: liveConfig } }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      await userClient.rpc("gemini_live_quota", { p_action: "pause", p_session_id: sessionId });
      console.error("OPENAI_REALTIME_SECRET_FAILED", response.status);
      return reply({ error: "A conversa por voz OpenAI está indisponível." }, 502);
    }
    const payload = await response.json();
    const ephemeralToken = payload?.value || payload?.client_secret?.value;
    if (typeof ephemeralToken !== "string" || !ephemeralToken) {
      await userClient.rpc("gemini_live_quota", { p_action: "pause", p_session_id: sessionId });
      console.error("OPENAI_REALTIME_SECRET_INVALID_RESPONSE");
      return reply({ error: "O servidor não recebeu a credencial temporária de voz." }, 502);
    }
    return reply({ token: ephemeralToken, model, config: { audio: liveConfig }, quota });
  } catch (error) {
    await userClient.rpc("gemini_live_quota", { p_action: "pause", p_session_id: sessionId });
    console.error("OPENAI_REALTIME_SECRET_FAILED", error instanceof Error ? error.message : "unknown error");
    return reply({ error: "A conversa por voz OpenAI está indisponível." }, 502);
  }
});
