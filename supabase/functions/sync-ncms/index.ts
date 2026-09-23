import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const SOURCE_URL = "https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json";
const MIN_VALID_CODES = 9000;
const BATCH_SIZE = 500;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ncm-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface NcmOfficialItem {
  Codigo: string;
  Descricao: string;
  Data_Inicio: string;
  Data_Fim: string;
  Tipo_Ato_Ini: string;
  Numero_Ato_Ini: string;
  Ano_Ato_Ini: string;
}

interface NcmOfficialResponse {
  Data_Ultima_Atualizacao_NCM: string;
  Ato: string;
  Nomenclaturas: NcmOfficialItem[];
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseBrDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) throw new Error(`Data oficial inválida: ${value}`);
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCDate() !== Number(day) || date.getUTCMonth() + 1 !== Number(month)) {
    throw new Error(`Data oficial impossível: ${value}`);
  }
  return `${year}-${month}-${day}`;
}

function mapSourceItem(item: NcmOfficialItem) {
  if (!item || typeof item.Codigo !== "string" || typeof item.Descricao !== "string") {
    throw new Error("A fonte contém uma nomenclatura sem código ou descrição textual.");
  }
  const code = item.Codigo.replace(/\D/g, "");
  if (code.length !== 8) return null;
  if (!item.Data_Inicio || !item.Data_Fim) {
    throw new Error(`A fonte omitiu dados de vigência para o NCM ${item.Codigo}.`);
  }
  return {
    code,
    official_description: item.Descricao.trim(),
    start_date: parseBrDate(item.Data_Inicio),
    end_date: parseBrDate(item.Data_Fim),
    legal_act: [item.Tipo_Ato_Ini, item.Numero_Ato_Ini, item.Ano_Ato_Ini]
      .filter((part) => typeof part === "string" && part.trim())
      .join(" "),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Método não permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse({ success: false, error: "Configuração Supabase incompleta na Edge Function." }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  let requestBody: Record<string, unknown>;
  try {
    requestBody = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Corpo JSON inválido." }, 400);
  }

  const mode = typeof requestBody.mode === "string" ? requestBody.mode : "preview";
  if (!["preview", "apply", "sync"].includes(mode)) {
    return jsonResponse({ success: false, error: "Modo de sincronização inválido." }, 400);
  }

  let isScheduled = false;
  const cronSecret = req.headers.get("x-ncm-cron-secret") ?? "";
  if (mode === "sync" && cronSecret.length >= 64) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cronSecret));
    const secretHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const { data: secretValid, error: secretError } = await adminClient.rpc("verify_ncm_cron_secret", {
      p_secret_hash: secretHash,
    });
    isScheduled = !secretError && secretValid === true;
  }
  let actorId: string | null = null;

  if (!isScheduled) {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return jsonResponse({ success: false, error: "Autenticação obrigatória." }, 401);
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return jsonResponse({ success: false, error: "Sessão inválida ou expirada." }, 401);
    actorId = userData.user.id;
    const { data: profile, error: profileError } = await adminClient
      .from("profiles").select("role").eq("id", actorId).maybeSingle();
    if (profileError || profile?.role !== "administrator") {
      return jsonResponse({ success: false, error: "Somente administradores podem sincronizar a tabela NCM." }, 403);
    }
  }

  let syncRunId: string | null = null;
  try {
    if (mode === "apply") {
      const runId = String(requestBody.sync_run_id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(runId)) return jsonResponse({ success: false, error: "Identificador da prévia inválido." }, 400);
      syncRunId = runId;
      const { data, error } = await adminClient.rpc("apply_ncm_catalog_sync", { p_sync_run_id: runId });
      if (error) throw error;
      return jsonResponse(data);
    }

    const { data: run, error: runError } = await adminClient.from("ncm_sync_runs").insert({
      status: "fetching",
      source_url: SOURCE_URL,
      requested_by: actorId,
    }).select("id").single();
    if (runError || !run) throw runError ?? new Error("Não foi possível registrar a tentativa de sincronização.");
    syncRunId = run.id;
    await adminClient.from("ncm_sync_runs").update({ status: "expired" })
      .eq("status", "preview").lt("expires_at", new Date().toISOString());

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45_000);
    let sourceResponse: Response;
    try {
      sourceResponse = await fetch(SOURCE_URL, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!sourceResponse.ok) throw new Error(`Fonte oficial respondeu HTTP ${sourceResponse.status}.`);
    const source = await sourceResponse.json() as NcmOfficialResponse;
    if (!source || !Array.isArray(source.Nomenclaturas) || !source.Data_Ultima_Atualizacao_NCM) {
      throw new Error("Estrutura da fonte oficial incompleta; a base local não foi alterada.");
    }
    if (source.Nomenclaturas.length < MIN_VALID_CODES) {
      throw new Error(`Fonte incompleta: ${source.Nomenclaturas.length} linhas recebidas.`);
    }

    const byCode = new Map<string, NonNullable<ReturnType<typeof mapSourceItem>>>();
    for (const item of source.Nomenclaturas) {
      const mapped = mapSourceItem(item);
      if (!mapped) continue;
      if (!mapped.official_description) throw new Error(`Descrição oficial vazia para o NCM ${mapped.code}.`);
      if (byCode.has(mapped.code)) throw new Error(`Código NCM duplicado na fonte: ${mapped.code}.`);
      byCode.set(mapped.code, mapped);
    }

    const records = [...byCode.values()];
    if (records.length < MIN_VALID_CODES) {
      throw new Error(`A fonte contém apenas ${records.length} NCMs válidos de oito dígitos.`);
    }
    const { count: currentCount, error: countError } = await adminClient
      .from("ncms").select("code", { count: "exact", head: true }).eq("active", true);
    if (countError) throw countError;
    if (currentCount && records.length < currentCount * 0.8) {
      throw new Error(`A fonte trouxe ${records.length} códigos, abaixo de 80% da base atual (${currentCount}); nenhuma inativação será feita.`);
    }

    const { error: updateRunError } = await adminClient.from("ncm_sync_runs").update({
      status: "preview",
      source_updated_at: source.Data_Ultima_Atualizacao_NCM,
      source_total_count: source.Nomenclaturas.length,
      source_valid_count: records.length,
    }).eq("id", syncRunId);
    if (updateRunError) throw updateRunError;

    for (let offset = 0; offset < records.length; offset += BATCH_SIZE) {
      const batch = records.slice(offset, offset + BATCH_SIZE).map((row) => ({ ...row, sync_run_id: syncRunId }));
      const { error } = await adminClient.from("ncm_sync_staging").upsert(batch, { onConflict: "sync_run_id,code" });
      if (error) throw error;
    }

    const { data: preview, error: previewError } = await adminClient.rpc("preview_ncm_catalog_sync", {
      p_sync_run_id: syncRunId,
    });
    if (previewError) throw previewError;

    if (mode === "sync") {
      const { data, error } = await adminClient.rpc("apply_ncm_catalog_sync", { p_sync_run_id: syncRunId });
      if (error) throw error;
      return jsonResponse(data);
    }
    return jsonResponse({ success: true, preview });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[sync-ncms]", message);
    if (syncRunId) {
      await adminClient.from("ncm_sync_runs").update({ status: "failed", error_message: message }).eq("id", syncRunId);
      await adminClient.from("ncm_sync_staging").delete().eq("sync_run_id", syncRunId);
    }
    return jsonResponse({ success: false, error: message }, 500);
  }
});
