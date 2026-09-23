import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const apiKey = Deno.env.get("GEMINI_API_KEY") || "";
  const bearer = req.headers.get("Authorization") || "";
  const token = bearer.replace(/^Bearer\s+/i, "");
  if (!apiKey || !token) return json({ error: "Configuração ou autenticação indisponível." }, 503);
  const admin = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return json({ error: "Não autenticado." }, 401);
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.contents) || body.contents.length > 40 || !Array.isArray(body.tools) || body.tools.length > 8) return json({ error: "Payload Gemini inválido." }, 400);
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent", {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: body.contents, tools: body.tools, systemInstruction: body.systemInstruction, toolConfig: body.toolConfig,
        generationConfig: { temperature: typeof body.temperature === "number" ? body.temperature : 0.1, maxOutputTokens: 2048 } }),
      signal: AbortSignal.timeout(20000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return json({ error: "Gemini indisponível." }, response.status === 429 ? 429 : 502);
    return json(payload);
  } catch (err) {
    console.error("MOBILE_GEMINI_PROXY_FAILED", err);
    return json({ error: "Gemini indisponível." }, 502);
  }
});
