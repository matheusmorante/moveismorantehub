import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const normalize = (value: unknown) => String(value || "").trim().replace(/\s+/g, " ");
const hash = (value: string) => { let result = 5381; for (let i = 0; i < value.length; i++) result = (result * 33) ^ value.charCodeAt(i); return (result >>> 0).toString(16); };
const cacheKeyFor = (text: string) => `aud_${hash(`${text}|gemini|gemini-2.0-flash|Kore|pt-BR|1`)}_kore`;
const pcmToWav = (base64: string) => {
  const pcm = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const wav = new Uint8Array(44 + pcm.length); const view = new DataView(wav.buffer);
  view.setUint32(0, 0x52494646, false); view.setUint32(4, 36 + pcm.length, true); view.setUint32(8, 0x57415645, false); view.setUint32(12, 0x666d7420, false); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 24000, true); view.setUint32(28, 48000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); view.setUint32(36, 0x64617461, false); view.setUint32(40, pcm.length, true); wav.set(pcm, 44); return wav;
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  let summary: any;
  let text = "";
  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Não autenticado." }, 401);
    const body = await req.json(); text = String(body.text || ""); const normalized = normalize(text);
    if (!normalized) return json({ status: "MISSING", isOwner: false });
    const { data } = await admin.from("delivery_summaries").select("*").eq("scope", body.scope).eq("text", text).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    summary = data; if (!summary) return json({ status: "MISSING", isOwner: false });
    const cacheKey = cacheKeyFor(normalized);
    const { data: cached } = await admin.from("delivery_summary_audio_cache").select("audio_storage_path, normalized_text").eq("cache_key", cacheKey).maybeSingle();
    if (cached?.audio_storage_path && cached.normalized_text === normalized) {
      await admin.from("delivery_summaries").update({ audio_status: "READY", audio_cache_key: cacheKey, audio_storage_path: cached.audio_storage_path, error_message: null }).eq("id", summary.id).eq("text", text);
      console.log("AUDIO_CACHE_HIT", { cacheKey }); return json({ status: "READY", isOwner: false });
    }
    // Uma execução interrompida não pode deixar todos os aparelhos aguardando
    // para sempre. Após dois minutos ela volta a ser uma tentativa recuperável.
    const staleBefore = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const generationIsStale = summary.audio_status === "GENERATING" && (!summary.generation_started_at || summary.generation_started_at < staleBefore);
    if (summary.audio_status === "GENERATING" && !generationIsStale) return json({ status: "GENERATING", isOwner: false });
    if (generationIsStale) {
      const { data: released } = await admin.from("delivery_summaries")
        .update({ audio_status: "FAILED", error_message: "A geração anterior expirou; tentando novamente." })
        .eq("id", summary.id).eq("text", text).eq("audio_status", "GENERATING")
        .lt("generation_started_at", staleBefore).select("id").maybeSingle();
      if (!released) return json({ status: "GENERATING", isOwner: false });
      summary.audio_status = "FAILED";
      console.log("AUDIO_GENERATION_STALE", { cacheKey });
    }
    const { data: claimed } = await admin.from("delivery_summaries").update({ audio_status: "GENERATING", error_message: null, generation_started_at: new Date().toISOString() }).eq("id", summary.id).eq("text", text).in("audio_status", ["MISSING", "FAILED"]).select("id").maybeSingle();
    if (!claimed) return json({ status: "GENERATING", isOwner: false });
    console.log("AUDIO_GENERATION_STARTED", { cacheKey });
    const apiKey = Deno.env.get("GEMINI_API_KEY"); if (!apiKey) throw new Error("TTS não configurado.");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(25_000), body: JSON.stringify({ contents: [{ parts: [{ text: `Fale em português do Brasil com tom natural e claro: ${normalized}` }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } } } }) });
    if (!response.ok) throw new Error("Gemini TTS indisponível.");
    const payload = await response.json(); const pcm = payload?.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData)?.inlineData?.data; if (!pcm) throw new Error("Gemini não retornou áudio.");
    const path = `${cacheKey}.wav`; const { error: uploadError } = await admin.storage.from("delivery-summary-audio").upload(path, pcmToWav(pcm), { contentType: "audio/wav", upsert: false }); if (uploadError && !/already exists/i.test(uploadError.message)) throw uploadError;
    await admin.from("delivery_summary_audio_cache").upsert({ cache_key: cacheKey, normalized_text: normalized, provider: "gemini", model: "gemini-2.5-flash-preview-tts", voice_id: "Kore", language: "pt-BR", speed: 1, audio_url: path, audio_storage_path: path, last_used_at: new Date().toISOString() }, { onConflict: "cache_key" });
    // A condição protege contra uma geração antiga concluir depois de novo texto.
    await admin.from("delivery_summaries").update({ audio_status: "READY", audio_cache_key: cacheKey, audio_storage_path: path, error_message: null }).eq("id", summary.id).eq("text", text);
    console.log("AUDIO_GENERATION_COMPLETED", { cacheKey }); return json({ status: "READY", isOwner: true });
  } catch (error) {
    console.error("AUDIO_GENERATION_FAILED", error);
    if (summary) await admin.from("delivery_summaries").update({ audio_status: "FAILED", error_message: error instanceof Error ? error.message : "Falha no áudio." }).eq("id", summary.id).eq("text", text);
    return json({ status: "FAILED" }, 500);
  }
});
