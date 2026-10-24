import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { decompressGzipBase64 } from "./utils/compression.ts";
import { buildSoapEnvelope } from "./utils/soap.ts";
import { extractXmlTag, extractAllXmlTags, extractDocZipEntries, parseNfeXml } from "./utils/xmlParser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NSU_POINT_QUERY_INTERVAL_MS = 5 * 60 * 1000;
const DIST_NSU_INTERVAL_MS = 60 * 60 * 1000;

type MissingNsuRange = { startNsu: string; endNsu: string };
type RecoveryClaim = {
  range_start_nsu: string;
  range_end_nsu: string;
  requested_nsu: string;
  environment: string;
  claim_token: string;
};

function normalizeNsu(value: string): string | null {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits || digits.length > 15) return null;
  return digits.replace(/^0+(?=\d)/, "");
}

function findMissingNsuRanges(
  requestedNsu: string,
  entries: Array<{ nsu: string }>,
  returnedUltNsu: string,
): MissingNsuRange[] {
  if (!entries.length) return [];

  const knownNsus = entries
    .map((entry) => normalizeNsu(entry.nsu))
    .filter((nsu): nsu is string => nsu !== null)
    .map((nsu) => BigInt(nsu))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (!knownNsus.length) return [];

  const ranges: MissingNsuRange[] = [];
  let previousNsu = BigInt(normalizeNsu(requestedNsu) || "0");
  let hasKnownPreviousNsu = previousNsu > 0n;
  for (const receivedNsu of knownNsus) {
    if (hasKnownPreviousNsu && receivedNsu > previousNsu + 1n) {
      ranges.push({
        startNsu: (previousNsu + 1n).toString(),
        endNsu: (receivedNsu - 1n).toString(),
      });
    }
    if (receivedNsu > previousNsu) previousNsu = receivedNsu;
    hasKnownPreviousNsu = true;
  }

  const returnedNsu = normalizeNsu(returnedUltNsu);
  if (returnedNsu) {
    const returnedNsuBigInt = BigInt(returnedNsu);
    if (returnedNsuBigInt > previousNsu) {
      ranges.push({
        startNsu: (previousNsu + 1n).toString(),
        endNsu: returnedNsuBigInt.toString(),
      });
    }
  }

  return ranges;
}

async function persistParsedInvoice(supabaseClient: any, parsed: any): Promise<boolean> {
  if (!parsed.itens?.length) {
    const { data: existing, error: existingError } = await supabaseClient
      .from("inbound_invoices")
      .select("itens, xml_conteudo")
      .eq("chave_acesso", parsed.chave_acesso)
      .maybeSingle();
    if (existingError) throw new Error(`Falha ao conferir XML já salvo: ${existingError.message}`);

    const existingXml = String(existing?.xml_conteudo || "");
    const existingHasFullXml = /<(?:[a-zA-Z0-9_]+:)?(?:nfeProc|infNFe)\b/i.test(existingXml);
    if ((Array.isArray(existing?.itens) && existing.itens.length > 0) || existingHasFullXml) {
      return false;
    }
  }

  const { error } = await supabaseClient
    .from("inbound_invoices")
    .upsert(parsed, { onConflict: "chave_acesso" });
  if (error) throw new Error(`Falha ao salvar NF-e recebida da SEFAZ: ${error.message}`);
  return true;
}

async function settleNsuRecoveryClaim(
  supabaseClient: any,
  cleanCnpj: string,
  claim: RecoveryClaim,
  options: { retryAt?: string; error?: string; resultStatus?: "found" | "not_found" | "non_nfe_document" },
): Promise<void> {
  const requestedNsu = BigInt(normalizeNsu(claim.requested_nsu) || "0");
  const endNsu = BigInt(normalizeNsu(claim.range_end_nsu) || "0");
  const isRangeComplete = options.resultStatus !== undefined && requestedNsu >= endNsu;
  const nextNsu = isRangeComplete || options.error
    ? requestedNsu
    : requestedNsu + 1n;
  const status = options.error ? "pending" : isRangeComplete ? "resolved" : "pending";

  const { error } = await supabaseClient
    .from("sefaz_nsu_recovery_queue")
    .update({
      status,
      next_nsu: nextNsu.toString(),
      result_status: isRangeComplete ? options.resultStatus || null : null,
      next_attempt_at: options.retryAt || new Date(Date.now() + NSU_POINT_QUERY_INTERVAL_MS).toISOString(),
      lease_until: null,
      claim_token: null,
      last_error: options.error?.slice(0, 500) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("cnpj", cleanCnpj)
    .eq("range_start_nsu", normalizeNsu(claim.range_start_nsu))
    .eq("claim_token", claim.claim_token)
    .eq("status", "processing");

  if (error) throw new Error(`Falha ao liberar NSU da fila de recuperação: ${error.message}`);
}

async function processNextNsuRecovery(
  supabaseClient: any,
  cleanCnpj: string,
  nodeBridgeUrl: string,
  bridgeToken: string,
): Promise<{ attempted: boolean; success: boolean; newDocsCount: number; message?: string }> {
  const { data: rateLimitRecord, error: rateLimitError } = await supabaseClient
    .from("sefaz_nsu_control")
    .select("status, last_cstat, next_allowed_sync_at")
    .eq("id", "default")
    .maybeSingle();
  if (rateLimitError) throw new Error(`Falha ao verificar bloqueio SEFAZ: ${rateLimitError.message}`);

  const rateLimitUntil = rateLimitRecord?.next_allowed_sync_at
    ? new Date(rateLimitRecord.next_allowed_sync_at).getTime()
    : 0;
  if ((rateLimitRecord?.status === "rate_limited" || rateLimitRecord?.last_cstat === "656") && rateLimitUntil > Date.now()) {
    return { attempted: false, success: false, newDocsCount: 0, message: "Aguardar o bloqueio de uma hora da SEFAZ." };
  }

  const { data: claimRows, error: claimError } = await supabaseClient.rpc(
    "claim_sefaz_nsu_recovery",
    { p_cnpj: cleanCnpj },
  );
  if (claimError) throw new Error(`Falha ao reservar NSU faltante: ${claimError.message}`);
  const claim = (Array.isArray(claimRows) ? claimRows[0] : claimRows) as RecoveryClaim | null;
  if (!claim?.claim_token) return { attempted: false, success: true, newDocsCount: 0 };

  let reservedNextAllowedAt: string | null = null;
  try {
    const { data: reservationRows, error: reservationError } = await supabaseClient.rpc(
      "reserve_sefaz_direct_consult",
      { p_cnpj: cleanCnpj },
    );
    if (reservationError) throw new Error("Não foi possível validar o intervalo de cinco minutos da consulta consNSU.");
    const reservation = Array.isArray(reservationRows) ? reservationRows[0] : reservationRows;
    reservedNextAllowedAt = typeof reservation?.next_allowed_at === "string" ? reservation.next_allowed_at : null;
    if (!reservation?.allowed) {
      await settleNsuRecoveryClaim(supabaseClient, cleanCnpj, claim, {
        retryAt: reservedNextAllowedAt || new Date(Date.now() + NSU_POINT_QUERY_INTERVAL_MS).toISOString(),
      });
      return { attempted: false, success: true, newDocsCount: 0, message: "Aguardando o intervalo de cinco minutos da consulta consNSU." };
    }

    const environment = claim.environment === "homologation" ? "homologation" : "production";
    const tpAmb = environment === "production" ? "1" : "2";
    const soapEnvelope = buildSoapEnvelope(cleanCnpj, claim.requested_nsu, tpAmb, undefined, "consNSU");
    const bridgeResponse = await fetch(nodeBridgeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${bridgeToken}`,
      },
      body: JSON.stringify({
        cleanCnpj,
        ultNsu: claim.requested_nsu,
        tpAmb,
        soapEnvelope,
        environment,
      }),
    });

    if (!bridgeResponse.ok) {
      const errJson = await bridgeResponse.json().catch(() => ({}));
      throw new Error(`Ponte fiscal retornou HTTP ${bridgeResponse.status}: ${errJson.message || errJson.error || "Erro de comunicação"}`);
    }
    const bridgeData = await bridgeResponse.json();
    if (!bridgeData.success || !bridgeData.responseXml) {
      throw new Error(`Ponte fiscal não retornou XML: ${bridgeData.message || bridgeData.error || "Resposta vazia"}`);
    }

    const responseXml = String(bridgeData.responseXml);
    const cStat = extractXmlTag(responseXml, "cStat");
    const xMotivo = extractXmlTag(responseXml, "xMotivo");
    if (cStat === "656") {
      const blockedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await settleNsuRecoveryClaim(supabaseClient, cleanCnpj, claim, {
        retryAt: blockedUntil,
        error: xMotivo || "cStat 656: consumo indevido; aguardar uma hora.",
      });
      await supabaseClient.from("sefaz_nsu_control").upsert({
        id: "default",
        cnpj: cleanCnpj,
        status: "rate_limited",
        last_error: xMotivo || "Consumo indevido (cStat 656).",
        next_allowed_sync_at: blockedUntil,
        last_cstat: "656",
        last_xmotivo: xMotivo,
        last_sync_at: new Date().toISOString(),
        environment,
      });
      return { attempted: true, success: false, newDocsCount: 0, message: "A SEFAZ bloqueou consultas por uma hora (cStat 656)." };
    }

    const nextAllowedAt = reservedNextAllowedAt || new Date(Date.now() + NSU_POINT_QUERY_INTERVAL_MS).toISOString();
    if (cStat === "137") {
      await settleNsuRecoveryClaim(supabaseClient, cleanCnpj, claim, {
        retryAt: nextAllowedAt,
        resultStatus: "not_found",
      });
      return { attempted: true, success: true, newDocsCount: 0, message: "NSU não gerado pela SEFAZ (cStat 137); descartado." };
    }
    if (cStat !== "138") {
      throw new Error(`SEFAZ retornou cStat ${cStat || "desconhecido"}: ${xMotivo || "resposta não reconhecida"}`);
    }

    const expectedNsu = normalizeNsu(claim.requested_nsu);
    const entry = extractDocZipEntries(responseXml).find((item) => normalizeNsu(item.nsu) === expectedNsu);
    if (!entry) throw new Error("A SEFAZ informou cStat 138, mas não retornou docZip para o NSU solicitado.");

    const unzippedXml = await decompressGzipBase64(entry.compressedBase64);
    const parsed = parseNfeXml(unzippedXml, entry.nsu, environment === "production" ? 1 : 2, cleanCnpj);
    if (!parsed && /<(?:[a-zA-Z0-9_]+:)?(?:infNFe|resNFe)\b/i.test(unzippedXml)) {
      throw new Error("A SEFAZ devolveu um XML de NF-e que não pôde ser interpretado; o NSU será tentado novamente.");
    }
    let newDocsCount = 0;
    let resultStatus: "found" | "non_nfe_document" = "non_nfe_document";
    if (parsed?.chave_acesso) {
      const persisted = await persistParsedInvoice(supabaseClient, parsed);
      if (persisted) newDocsCount = 1;
      resultStatus = "found";
    }

    await settleNsuRecoveryClaim(supabaseClient, cleanCnpj, claim, {
      retryAt: nextAllowedAt,
      resultStatus,
    });
    return { attempted: true, success: true, newDocsCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await settleNsuRecoveryClaim(supabaseClient, cleanCnpj, claim, {
      retryAt: reservedNextAllowedAt || new Date(Date.now() + NSU_POINT_QUERY_INTERVAL_MS).toISOString(),
      error: message,
    });
    return { attempted: true, success: false, newDocsCount: 0, message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`[sefaz-inbound-sync] Iniciando ciclo de sincronização DF-e...`);
  let isAccessKeyQuery = false;
  let isRecoveryQuery = false;
  let distNsuNextAllowedSyncAt: string | null = null;

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json().catch(() => ({}));

    // Suporte a verificação de status sem chamar o Web Service da SEFAZ (R$ 0,00 e sem risco de 656)
    if (body.action === "status") {
      const { data: nsuRecord } = await supabaseClient
        .from("sefaz_nsu_control")
        .select("*")
        .eq("id", "default")
        .maybeSingle();

      const now = Date.now();
      const lastSyncMs = nsuRecord?.last_sync_at ? new Date(nsuRecord.last_sync_at).getTime() : 0;
      const storedNextAllowed = nsuRecord?.next_allowed_sync_at ? new Date(nsuRecord.next_allowed_sync_at).getTime() : 0;
      const nextAllowed = Math.max(
        storedNextAllowed,
        lastSyncMs ? lastSyncMs + DIST_NSU_INTERVAL_MS : 0,
      );
      const isSyncing = nsuRecord?.status === "syncing" && (now - lastSyncMs < 180000);
      const isRateLimited = nsuRecord?.status === "rate_limited" && (now < nextAllowed);
      const canSyncNow = !isSyncing && (now >= nextAllowed);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            status: isSyncing ? "syncing" : isRateLimited ? "rate_limited" : (nsuRecord?.status || "idle"),
            lastSyncAt: nsuRecord?.last_sync_at || null,
            nextAllowedSyncAt: nextAllowed ? new Date(nextAllowed).toISOString() : null,
            lastNsu: nsuRecord?.last_nsu || "0",
            maxNsu: nsuRecord?.max_nsu || "0",
            lastCstat: nsuRecord?.last_cstat || null,
            lastXmotivo: nsuRecord?.last_xmotivo || null,
            lastDocsCount: nsuRecord?.last_docs_count || 0,
            environment: nsuRecord?.environment || "production",
            canSyncNow,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { cnpj: requestedCnpj } = body;
    const environment = body.environment === "homologation" ? "homologation" : "production";
    const accessKey = String(body.accessKey || "").replace(/\D/g, "");
    isAccessKeyQuery = Boolean(accessKey);
    isRecoveryQuery = body.action === "recover-missing-nsu";
    if (isAccessKeyQuery && accessKey.length !== 44) {
      return new Response(JSON.stringify({ success: false, code: "ACCESS_KEY_INVALID", message: "A chave de acesso deve conter exatamente 44 dígitos." }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // A ponte Node.js faz mTLS com o A1 guardado no próprio servidor.
    let cnpj = requestedCnpj || Deno.env.get("SEFAZ_CNPJ") || "";

    if (!cnpj) {
      const { data: settingsData, error: settingsError } = await supabaseClient
        .from("settings")
        .select("data")
        .eq("id", "app")
        .single();

      if (!settingsError && settingsData?.data) {
        const d = settingsData.data;
        if (!cnpj && d.companyCnpj) cnpj = d.companyCnpj;
      }
    }

    const cleanCnpj = cnpj.replace(/\D/g, "");

    if (!cleanCnpj) {
      throw new Error("CNPJ da empresa emitente não configurado.");
    }

    // 2. Trava de concorrência: impedir duas sincronizações simultâneas para o mesmo CNPJ
    const { data: nsuRecord, error: nsuError } = await supabaseClient
      .from("sefaz_nsu_control")
      .select("*")
      .eq("id", "default")
      .single();

    if (nsuError && nsuError.code !== "PGRST116") {
      throw new Error("Falha ao ler controle de NSU: " + nsuError.message);
    }

    if (nsuRecord?.status === "syncing") {
      const lastSync = nsuRecord.last_sync_at ? new Date(nsuRecord.last_sync_at).getTime() : 0;
      // Se estiver sincronizando há menos de 3 minutos, evita corrida
      if (Date.now() - lastSync < 180000) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Uma sincronização já está em andamento para este CNPJ.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    // Uma consulta distNSU por hora, inclusive quando há documentos, para manter a descoberta previsível.
    if (!isAccessKeyQuery && !isRecoveryQuery) {
      const now = Date.now();
      const lastSyncMs = nsuRecord?.last_sync_at ? new Date(nsuRecord.last_sync_at).getTime() : 0;
      const storedNextAllowed = nsuRecord?.next_allowed_sync_at
        ? new Date(nsuRecord.next_allowed_sync_at).getTime()
        : 0;
      const nextAllowedMs = Math.max(
        storedNextAllowed,
        lastSyncMs ? lastSyncMs + DIST_NSU_INTERVAL_MS : 0,
      );
      if (now < nextAllowedMs) {
        const diffMinutes = Math.max(1, Math.ceil((nextAllowedMs - now) / 60000));
        return new Response(JSON.stringify({
          success: false,
          code: "SEFAZ_COOLDOWN",
          nextAllowedSyncAt: new Date(nextAllowedMs).toISOString(),
          message: `SEFAZ consultada recentemente. Nova consulta automática permitida em aproximadamente ${diffMinutes} min.`,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
      }
    }

    if (nsuRecord?.status === "rate_limited") {
      const retryAt = new Date(new Date(nsuRecord.last_sync_at || Date.now()).getTime() + 60 * 60 * 1000);
      if (retryAt.getTime() > Date.now()) {
        return new Response(JSON.stringify({
          success: false, code: "SEFAZ_RATE_LIMIT", retryAfter: retryAt.toISOString(),
          message: "A SEFAZ exige aguardar uma hora antes de uma nova consulta.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
      }
    }

    let currentUltNsu = nsuRecord?.last_nsu || "0";
    let currentMaxNsu = nsuRecord?.max_nsu || "0";

    // Reservar atomicamente o intervalo antes do I/O externo; a transação do update termina antes do SOAP.
    if (!isAccessKeyQuery && !isRecoveryQuery) {
      const startedAt = new Date();
      const startedAtIso = startedAt.toISOString();
      const staleSyncCutoff = new Date(startedAt.getTime() - 180000).toISOString();
      distNsuNextAllowedSyncAt = new Date(startedAt.getTime() + DIST_NSU_INTERVAL_MS).toISOString();
      const { data: reservationRows, error: reservationError } = await supabaseClient
        .from("sefaz_nsu_control")
        .update({
          cnpj: cleanCnpj,
          status: "syncing",
          last_sync_at: startedAtIso,
          next_allowed_sync_at: distNsuNextAllowedSyncAt,
          environment,
        })
        .eq("id", "default")
        .or(`status.neq.syncing,last_sync_at.is.null,last_sync_at.lt.${staleSyncCutoff}`)
        .or(`next_allowed_sync_at.is.null,next_allowed_sync_at.lte.${startedAtIso}`)
        .select("id")
        .maybeSingle();
      if (reservationError) throw new Error(`Falha ao reservar o intervalo distNSU: ${reservationError.message}`);
      if (!reservationRows) {
        return new Response(JSON.stringify({
          success: false,
          code: "SEFAZ_COOLDOWN",
          nextAllowedSyncAt: nsuRecord?.next_allowed_sync_at || distNsuNextAllowedSyncAt,
          message: "Outra sincronização reservou o intervalo da SEFAZ; nenhuma nova consulta foi enviada.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
      }
    }

    // 3. Parâmetros da consulta e URL da ponte Node.js mTLS
    const tpAmb = environment === "production" ? "1" : "2";
    const nodeBridgeUrl = Deno.env.get("SEFAZ_NODE_BRIDGE_URL") || "https://morantehub.vercel.app/api/dist-dfe";
    const bridgeToken = Deno.env.get("SEFAZ_BRIDGE_TOKEN") || Deno.env.get("MORANTEHUB_MCP_ACCESS_TOKEN");
    if (!bridgeToken) {
      throw new Error("Ponte fiscal não configurada no servidor.");
    }

    if (isRecoveryQuery) {
      const recovery = await processNextNsuRecovery(
        supabaseClient,
        cleanCnpj,
        nodeBridgeUrl,
        bridgeToken,
      );
      return new Response(JSON.stringify({
        success: recovery.success,
        queryType: "consNSU",
        environment,
        recoveryAttempted: recovery.attempted,
        newDocsCount: recovery.newDocsCount,
        message: recovery.message || (recovery.attempted
          ? "Recuperação pontual de NSU concluída."
          : "Nenhum NSU pendente para recuperação."),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    if (isAccessKeyQuery) {
      const { data: reservationRows, error: reservationError } = await supabaseClient.rpc(
        "reserve_sefaz_direct_consult",
        { p_cnpj: cleanCnpj },
      );
      if (reservationError) {
        throw new Error("Não foi possível validar o intervalo mínimo da consulta direta à SEFAZ.");
      }
      const reservation = Array.isArray(reservationRows) ? reservationRows[0] : reservationRows;
      if (!reservation?.allowed) {
        const nextAllowed = typeof reservation?.next_allowed_at === "string"
          ? reservation.next_allowed_at
          : null;
        const remainingMs = nextAllowed ? new Date(nextAllowed).getTime() - Date.now() : 5 * 60 * 1000;
        const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
        return new Response(JSON.stringify({
          success: false,
          code: "SEFAZ_DIRECT_COOLDOWN",
          retryAfter: nextAllowed,
          nextAllowedSyncAt: nextAllowed,
          message: `O MoranteHub permite uma consulta direta por CNPJ a cada 5 minutos. Tente novamente em aproximadamente ${remainingMinutes} min.`,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
      }
    }

    let totalPersisted = 0;
    let totalPersistenceErrors = 0;
    let totalDocumentProcessingErrors = 0;
    let firstPersistenceError: string | null = null;
    let firstDocumentProcessingError: string | null = null;
    let keepConsuming = true;
    let iteration = 0;
    const MAX_ITERATIONS = 20; // limite de segurança por rodada

    let finalCStat = "";
    let finalXMotivo = "";
    let consultedDocument: { kind: "full" | "summary"; xml: string } | null = null;
    let rateLimitUntil: string | null = null;

    console.log(`[sefaz-inbound-sync] Iniciando consulta DF-e via ponte Node.js (${nodeBridgeUrl}). NSU inicial: ${currentUltNsu}`);

    while (keepConsuming && iteration < (isAccessKeyQuery ? 1 : MAX_ITERATIONS)) {
      iteration++;
      const soapEnvelope = buildSoapEnvelope(cleanCnpj, currentUltNsu, tpAmb, accessKey || undefined);

      const bridgeResponse = await fetch(nodeBridgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${bridgeToken}`,
        },
        body: JSON.stringify({
          cleanCnpj,
          ultNsu: currentUltNsu,
          tpAmb,
          soapEnvelope,
          environment,
        }),
      });

      if (!bridgeResponse.ok) {
        const errJson = await bridgeResponse.json().catch(() => ({}));
        throw new Error(`Ponte Node.js retornou HTTP ${bridgeResponse.status}: ${errJson.message || errJson.error || "Erro de comunicação"}`);
      }

      const bridgeData = await bridgeResponse.json();
      if (!bridgeData.success || !bridgeData.responseXml) {
        throw new Error(`Serviço Node.js mTLS reportou erro: ${bridgeData.message || bridgeData.error || "Resposta XML vazia"}`);
      }

      const responseXml = bridgeData.responseXml;

      // Extrair retorno
      const cStat = extractXmlTag(responseXml, "cStat");
      const xMotivo = extractXmlTag(responseXml, "xMotivo");
      const ultNsuRetornado = extractXmlTag(responseXml, "ultNSU");
      const maxNsuRetornado = extractXmlTag(responseXml, "maxNSU");

      finalCStat = cStat;
      finalXMotivo = xMotivo;

      // cStat 138: Documento localizado para o NSU
      // cStat 137: Nenhum documento localizado para o NSU solicitado
      // cStat 656: Consumo indevido (deve aguardar 1 hora)
      if (cStat === "656") {
        rateLimitUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        console.warn(`[sefaz-inbound-sync] Consumo indevido detectado pela SEFAZ (cStat 656). Nova tentativa após ${rateLimitUntil}.`);
        keepConsuming = false;
        break;
      }

      if (cStat !== "138" && cStat !== "137") {
        console.warn(`[sefaz-inbound-sync] SEFAZ retornou cStat não usual: ${cStat} - ${xMotivo}`);
        keepConsuming = false;
        break;
      }

      // O NSU de cada pacote está no atributo NSU do docZip. O ultNSU da resposta
      // é o cursor da distribuição e não deve ser atribuído a todos os documentos.
      const rawDocZipBlocks = extractAllXmlTags(responseXml, "docZip");
      const docZipEntries = extractDocZipEntries(responseXml);
      if (rawDocZipBlocks.length !== docZipEntries.length) {
        throw new Error("A SEFAZ retornou docZip sem atributo NSU válido; o cursor não será avançado.");
      }
      if (cStat === "138" && docZipEntries.length === 0) {
        throw new Error("A SEFAZ informou cStat 138 sem retornar nenhum docZip; o cursor não será avançado.");
      }
      const processingErrorsBeforeResponse = totalDocumentProcessingErrors + totalPersistenceErrors;

      if (!isAccessKeyQuery && cStat === "138") {
        const missingRanges = findMissingNsuRanges(currentUltNsu, docZipEntries, ultNsuRetornado);
        if (missingRanges.length) {
          const { error: enqueueError } = await supabaseClient
            .from("sefaz_nsu_recovery_queue")
            .upsert(
              missingRanges.map((range) => ({
                cnpj: cleanCnpj,
                range_start_nsu: range.startNsu,
                range_end_nsu: range.endNsu,
                next_nsu: range.startNsu,
                environment,
                status: "pending",
                next_attempt_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })),
              { onConflict: "cnpj,range_start_nsu", ignoreDuplicates: true },
            );
          if (enqueueError) {
            throw new Error(`Falha ao guardar NSUs faltantes antes de avançar o cursor: ${enqueueError.message}`);
          }
          console.log(`[sefaz-inbound-sync] ${missingRanges.length} intervalo(s) de NSU faltante(s) colocado(s) na fila consNSU.`);
        }
      }

      // Processar os pacotes docZip, conservando o NSU original de cada bloco.
      for (const docEntry of docZipEntries) {
        try {
          const unzippedXml = await decompressGzipBase64(docEntry.compressedBase64);
          const parsed = parseNfeXml(
            unzippedXml,
            docEntry.nsu,
            environment === "production" ? 1 : 2,
            cleanCnpj,
          );

          if (!parsed && /<(?:[a-zA-Z0-9_]+:)?(?:infNFe|resNFe)\b/i.test(unzippedXml)) {
            throw new Error("XML de NF-e recebido da SEFAZ não pôde ser interpretado.");
          }

          if (parsed && parsed.chave_acesso) {
            // A resposta ao formulário não pode depender da persistência de uma
            // cópia auxiliar. Se a SEFAZ entregou o XML correto, o usuário deve
            // poder conferi-lo mesmo que o upsert local falhe.
            if (isAccessKeyQuery && parsed.chave_acesso === accessKey) {
              consultedDocument = {
                kind: unzippedXml.includes("<infNFe") || unzippedXml.includes("<nfeProc") ? "full" : "summary",
                xml: unzippedXml,
              };
            }
            const persisted = await persistParsedInvoice(supabaseClient, parsed);
            if (persisted) totalPersisted++;
          }
        } catch (docErr: unknown) {
          const message = (docErr instanceof Error ? docErr.message : String(docErr)).slice(0, 200);
          if (message.startsWith("Falha ao salvar NF-e recebida")) {
            totalPersistenceErrors++;
            firstPersistenceError ??= message;
          } else {
            totalDocumentProcessingErrors++;
            firstDocumentProcessingError ??= message;
          }
        }
      }

      // Não avance o cursor se algum pacote não foi persistido/descompactado; a
      // próxima execução repetirá o lote e a fila é idempotente por início do intervalo.
      const responseHadProcessingErrors =
        totalDocumentProcessingErrors + totalPersistenceErrors > processingErrorsBeforeResponse;
      if (ultNsuRetornado && !responseHadProcessingErrors) {
        currentUltNsu = ultNsuRetornado;
      }
      if (maxNsuRetornado) {
        currentMaxNsu = maxNsuRetornado;
      }

      // Se cStat for 137 (nenhum documento novo), o Ambiente Nacional exige cooldown de 1 hora
      const cooldownUntil = !isAccessKeyQuery && !isRecoveryQuery
        ? new Date(Math.max(
          Date.now() + (cStat === "137" ? DIST_NSU_INTERVAL_MS : 0),
          distNsuNextAllowedSyncAt ? new Date(distNsuNextAllowedSyncAt).getTime() : 0,
        )).toISOString()
        : null;

      if (!isAccessKeyQuery && !isRecoveryQuery) {
        await supabaseClient
          .from("sefaz_nsu_control")
          .upsert({
            id: "default",
            cnpj: cleanCnpj,
            last_nsu: currentUltNsu,
            max_nsu: currentMaxNsu,
            status: "idle",
            last_sync_at: new Date().toISOString(),
            next_allowed_sync_at: cooldownUntil,
            last_cstat: cStat,
            last_xmotivo: xMotivo,
            last_docs_count: totalPersisted,
            environment,
            last_error: null,
          });
      }

      // Se ultNSU chegou no maxNSU ou cStat 137, não há mais lotes imediatos
      const numUlt = BigInt(currentUltNsu || "0");
      const numMax = BigInt(currentMaxNsu || "0");
      if (responseHadProcessingErrors || cStat === "137" || numUlt >= numMax || docZipEntries.length === 0) {
        keepConsuming = false;
      }
    }

    let automaticRecovery: { attempted: boolean; success: boolean; newDocsCount: number; message?: string } | null = null;
    if (!isAccessKeyQuery && !rateLimitUntil && (finalCStat === "138" || finalCStat === "137")) {
      try {
        automaticRecovery = await processNextNsuRecovery(
          supabaseClient,
          cleanCnpj,
          nodeBridgeUrl,
          bridgeToken,
        );
        totalPersisted += automaticRecovery.newDocsCount;
      } catch (recoveryError) {
        const message = recoveryError instanceof Error ? recoveryError.message : String(recoveryError);
        console.error(`[sefaz-inbound-sync] Não foi possível iniciar recuperação consNSU: ${message}`);
      }
    }

    const durationMs = Date.now() - startTime;
    if (rateLimitUntil) {
      await supabaseClient.from("sefaz_nsu_control").upsert({
        id: "default",
        cnpj: cleanCnpj,
        status: "rate_limited",
        last_error: finalXMotivo,
        next_allowed_sync_at: rateLimitUntil,
        last_cstat: finalCStat || "656",
        last_xmotivo: finalXMotivo,
        last_sync_at: new Date().toISOString(),
        environment,
      });
      return new Response(JSON.stringify({
        success: false, code: "SEFAZ_RATE_LIMIT", cStat: finalCStat, retryAfter: rateLimitUntil,
        message: "A SEFAZ bloqueou novas consultas por consumo indevido. Tente novamente após uma hora.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }
    console.log(`[sefaz-inbound-sync] Ciclo finalizado em ${durationMs}ms. iterações=${iteration}, cStat=${finalCStat}, ultNSU=${currentUltNsu}, maxNSU=${currentMaxNsu}, notas_persistidas=${totalPersisted}, erros_persistencia=${totalPersistenceErrors}, erro_persistencia_amostra=${firstPersistenceError ?? "nenhum"}, erros_processamento=${totalDocumentProcessingErrors}, erro_processamento_amostra=${firstDocumentProcessingError ?? "nenhum"}`);

    return new Response(
      JSON.stringify({
        success: true,
        queryType: isAccessKeyQuery ? "consChNFe" : "distNSU",
        environment,
        cStat: finalCStat,
        xMotivo: finalXMotivo,
        ultNSU: currentUltNsu,
        maxNSU: currentMaxNsu,
        newDocsCount: totalPersisted,
        recoveryAttempted: automaticRecovery?.attempted || false,
        document: consultedDocument,
        durationMs,
        message: `Sincronização real com NFeDistribuicaoDFe concluída. cStat: ${finalCStat} (${finalXMotivo}).`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("[sefaz-inbound-sync] Falha fatal no ciclo de sincronização:", err);

    // Gravar erro no controle
    try {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      if (!isAccessKeyQuery && !isRecoveryQuery) {
        await supabaseClient
          .from("sefaz_nsu_control")
          .update({
            status: "error",
            last_error: err.message || "Erro desconhecido",
            ...(distNsuNextAllowedSyncAt ? { next_allowed_sync_at: distNsuNextAllowedSyncAt } : {}),
          })
          .eq("id", "default");
      }
    } catch {}

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Erro na conexão com SEFAZ.",
        message: err.message || "Erro na conexão com SEFAZ.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
