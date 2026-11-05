import { decompressGzipBase64 } from "./compression.ts";
import { buildSoapEnvelope } from "./soap.ts";
import { extractDocZipEntries, extractXmlTag, parseNfeXml } from "./xmlParser.ts";
import { normalizeNsu } from "./nsuRecoveryRanges.ts";

const NSU_POINT_QUERY_INTERVAL_MS = 5 * 60 * 1000;
type RecoveryClaim = {
  range_start_nsu: string;
  range_end_nsu: string;
  requested_nsu: string;
  environment: string;
  claim_token: string;
};

export async function persistParsedInvoice(supabaseClient: any, parsed: any): Promise<boolean> {
  const sourceXml = String(parsed.xml_conteudo || "");
  const receivedFullXml = /<(?:[a-zA-Z0-9_]+:)?(?:nfeProc|infNFe)\b/i.test(sourceXml);
  const metadataOnly = receivedFullXml
    ? { ...parsed, itens: [], xml_conteudo: null }
    : parsed;
  const { data: existing, error: existingError } = await supabaseClient
    .from("inbound_invoices")
    .select("itens, xml_conteudo")
    .eq("chave_acesso", parsed.chave_acesso)
    .maybeSingle();
  if (existingError) throw new Error("Falha ao conferir XML já salvo: " + existingError.message);

  const existingXml = String(existing?.xml_conteudo || "");
  const existingHasFullXml = /<(?:[a-zA-Z0-9_]+:)?(?:nfeProc|infNFe)\b/i.test(existingXml);
  if ((Array.isArray(existing?.itens) && existing.itens.length > 0) || existingHasFullXml) {
    return false;
  }

  // A distribuição automática guarda somente os metadados, mesmo se a SEFAZ
  // enviar um XML completo. Preserve um resumo já salvo para manter a chave e
  // a elegibilidade da Ciência até o operador importar o XML do Portal.
  if (receivedFullXml && /<(?:[a-zA-Z0-9_]+:)?resNFe\b/i.test(existingXml)) {
    metadataOnly.xml_conteudo = existingXml;
  }

  const { error } = await supabaseClient
    .from("inbound_invoices")
    .upsert(metadataOnly, { onConflict: "chave_acesso" });
  if (error) throw new Error("Falha ao salvar NF-e recebida da SEFAZ: " + error.message);
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

export async function processNextNsuRecovery(
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
