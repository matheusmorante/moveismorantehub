import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { extractPemFromPfx } from "./utils/crypto.ts";
import { decompressGzipBase64 } from "./utils/compression.ts";
import { buildSoapEnvelope } from "./utils/soap.ts";
import { extractXmlTag, extractAllXmlTags, parseNfeXml } from "./utils/xmlParser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`[sefaz-inbound-sync] Iniciando ciclo de sincronização DF-e...`);

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
      const nextAllowed = nsuRecord?.next_allowed_sync_at ? new Date(nsuRecord.next_allowed_sync_at).getTime() : 0;
      const lastSyncMs = nsuRecord?.last_sync_at ? new Date(nsuRecord.last_sync_at).getTime() : 0;
      const isSyncing = nsuRecord?.status === "syncing" && (now - lastSyncMs < 180000);
      const isRateLimited = nsuRecord?.status === "rate_limited" && (now < nextAllowed);
      const canSyncNow = !isSyncing && (now >= nextAllowed);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            status: isSyncing ? "syncing" : isRateLimited ? "rate_limited" : (nsuRecord?.status || "idle"),
            lastSyncAt: nsuRecord?.last_sync_at || null,
            nextAllowedSyncAt: nsuRecord?.next_allowed_sync_at || null,
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

    const { cnpj: requestedCnpj, environment = "production" } = body;
    const accessKey = String(body.accessKey || "").replace(/\D/g, "");
    const isAccessKeyQuery = Boolean(accessKey);
    if (isAccessKeyQuery && accessKey.length !== 44) {
      return new Response(JSON.stringify({ success: false, code: "ACCESS_KEY_INVALID", message: "A chave de acesso deve conter exatamente 44 dígitos." }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // 1. Obter dados da empresa e certificado de forma segura (Prioridade: Secrets > Settings)
    let certBase64 = Deno.env.get("SEFAZ_CERTIFICATE_BASE64") || "";
    let certPassword = Deno.env.get("SEFAZ_CERTIFICATE_PASSWORD") || "";
    let cnpj = requestedCnpj || Deno.env.get("SEFAZ_CNPJ") || "";

    if (!certBase64 || !certPassword || !cnpj) {
      const { data: settingsData, error: settingsError } = await supabaseClient
        .from("settings")
        .select("data")
        .eq("id", "app")
        .single();

      if (!settingsError && settingsData?.data) {
        const d = settingsData.data;
        if (!certBase64 && d.certificateBase64) certBase64 = d.certificateBase64;
        if (!certPassword && d.certificatePassword) certPassword = d.certificatePassword;
        if (!cnpj && d.companyCnpj) cnpj = d.companyCnpj;
      }
    }

    // Limpar prefixo Data URI se o Base64 foi gravado com cabeçalho de upload de arquivo
    if (certBase64 && certBase64.includes(",")) {
      certBase64 = certBase64.split(",")[1];
    }
    certBase64 = certBase64.trim().replace(/[\r\n\s]/g, "");

    const cleanCnpj = cnpj.replace(/\D/g, "");

    if (!cleanCnpj) {
      throw new Error("CNPJ da empresa emitente não configurado.");
    }
    if (!certBase64 || !certPassword) {
      throw new Error("Certificado digital A1 (.pfx) ou senha não configurados.");
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

    // Verificação de Cooldown (Prevenção cStat 137 / 656) para distNSU
    if (!isAccessKeyQuery && nsuRecord?.next_allowed_sync_at) {
      const nextAllowedMs = new Date(nsuRecord.next_allowed_sync_at).getTime();
      if (Date.now() < nextAllowedMs) {
        const diffMinutes = Math.max(1, Math.ceil((nextAllowedMs - Date.now()) / 60000));
        return new Response(JSON.stringify({
          success: false,
          code: "SEFAZ_COOLDOWN",
          nextAllowedSyncAt: nsuRecord.next_allowed_sync_at,
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

    // Marcar status como syncing
    await supabaseClient
      .from("sefaz_nsu_control")
      .upsert({
        id: "default",
        cnpj: cleanCnpj,
        status: "syncing",
        last_sync_at: new Date().toISOString(),
      });

    // 3. Extrair PEM em memória
    console.log(`[sefaz-inbound-sync] Extraindo certificados PEM em memória...`);
    const { certPem, keyPem } = extractPemFromPfx(certBase64, certPassword);

    // 4. Parâmetros da consulta e URL da ponte Node.js mTLS
    const tpAmb = environment === "production" ? "1" : "2";
    const nodeBridgeUrl = Deno.env.get("SEFAZ_NODE_BRIDGE_URL") || "https://morantehub.vercel.app/api/dist-dfe";
    const bridgeToken = Deno.env.get("SEFAZ_BRIDGE_TOKEN") || Deno.env.get("MORANTEHUB_MCP_ACCESS_TOKEN");
    if (!bridgeToken) {
      throw new Error("Ponte fiscal não configurada no servidor.");
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
          certPem,
          privateKeyPem: keyPem,
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

      // Processar os pacotes docZip
      const docZipBlocks = extractAllXmlTags(responseXml, "docZip");
      for (const docB64 of docZipBlocks) {
        try {
          const unzippedXml = await decompressGzipBase64(docB64);
          const parsed = parseNfeXml(unzippedXml, ultNsuRetornado);

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
            // Upsert seguro: nunca duplicar NF-e; chave_acesso é UNIQUE
            const { error: upsertErr } = await supabaseClient
              .from("inbound_invoices")
              .upsert(parsed, { onConflict: "chave_acesso" });

            if (!upsertErr) {
              totalPersisted++;
            } else {
              totalPersistenceErrors++;
              firstPersistenceError ??= upsertErr.message.slice(0, 200);
            }
          }
        } catch (docErr: unknown) {
          totalDocumentProcessingErrors++;
          firstDocumentProcessingError ??= (docErr instanceof Error ? docErr.message : String(docErr)).slice(0, 200);
        }
      }

      // Atualizar NSU após persistência com sucesso
      if (ultNsuRetornado) {
        currentUltNsu = ultNsuRetornado;
      }
      if (maxNsuRetornado) {
        currentMaxNsu = maxNsuRetornado;
      }

      // Se cStat for 137 (nenhum documento novo), o Ambiente Nacional exige cooldown de 1 hora
      const cooldownUntil = cStat === "137"
        ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
        : null;

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

      // Se ultNSU chegou no maxNSU ou cStat 137, não há mais lotes imediatos
      const numUlt = BigInt(currentUltNsu || "0");
      const numMax = BigInt(currentMaxNsu || "0");
      if (cStat === "137" || numUlt >= numMax || docZipBlocks.length === 0) {
        keepConsuming = false;
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
        cStat: finalCStat,
        xMotivo: finalXMotivo,
        ultNSU: currentUltNsu,
        maxNSU: currentMaxNsu,
        newDocsCount: totalPersisted,
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
      await supabaseClient
        .from("sefaz_nsu_control")
        .update({
          status: "error",
          last_error: err.message || "Erro desconhecido",
        })
        .eq("id", "default");
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
