import { randomUUID } from 'node:crypto';
import { getSupabaseSecretKey } from '../supabaseSecretKey';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import { extractCertificateAndKey, signNfeEventXml } from './nfeSigner';
import { sendNationalEventOnce } from './nationalEnvironmentEventClient';
import {
  buildInboundScienceEventBatchXml,
  buildInboundScienceEventElement,
  buildInboundScienceEventXml,
  parseInboundManifestationBatchResponse,
  parseInboundManifestationResponse,
} from './inboundManifestationProtocol';
import {
  ACCESS_KEY_PATTERN,
  CNPJ_PATTERN,
  normalizeFiscalIdentifier,
} from '../../shared-utils/fiscalIdentifiers.js';
import { selectPendingInboundXmlConsults } from './inboundXmlConsultQueue';

const DIRECT_CONSULT_INTERVAL_MS = 5 * 60 * 1000;

async function getNextDirectConsultAt(db: SupabaseClient<any>, configuredCnpj: string) {
  const { data } = await db
    .from('sefaz_direct_consult_control')
    .select('next_allowed_at')
    .eq('cnpj', configuredCnpj)
    .maybeSingle();
  return typeof data?.next_allowed_at === 'string'
    ? data.next_allowed_at
    : new Date(Date.now() + DIRECT_CONSULT_INTERVAL_MS).toISOString();
}

async function consultNextRegisteredSummary(
  db: SupabaseClient<any>,
  configuredCnpj: string,
  invoice: any,
  remainingCount: number,
) {
  const accessKey = normalizeFiscalIdentifier(invoice.chave_acesso);
  const environment = Number(invoice.ambiente) as 1 | 2;
  const environmentName = environment === 1 ? 'production' : 'homologation';
  const { data, error } = await db.functions.invoke('sefaz-inbound-sync', {
    body: { accessKey, environment: environmentName },
  });

  if (error || !data) {
    const retryAfter = await getNextDirectConsultAt(db, configuredCnpj);
    return {
      status: 202,
      body: {
        success: false,
        pending: true,
        retryable: true,
        hasMore: true,
        retryAfter,
        xmlLookupPending: true,
        error: 'Não foi possível confirmar a consulta automática do XML. A fila tentará novamente após o intervalo da SEFAZ.',
      },
    };
  }

  if (data.code === 'SEFAZ_DIRECT_COOLDOWN') {
    return {
      status: 200,
      body: {
        success: true,
        skipped: true,
        hasMore: true,
        retryAfter: data.retryAfter || await getNextDirectConsultAt(db, configuredCnpj),
        xmlLookupPending: true,
        message: 'A consulta automática do XML aguarda o intervalo de cinco minutos por CNPJ.',
      },
    };
  }

  if (data.success !== true) {
    const retryAfter = typeof data.retryAfter === 'string'
      ? data.retryAfter
      : await getNextDirectConsultAt(db, configuredCnpj);
    return {
      status: 202,
      body: {
        success: false,
        pending: true,
        retryable: true,
        hasMore: true,
        retryAfter,
        sefazBlocked: data.code === 'SEFAZ_RATE_LIMIT' || data.cStat === '656',
        xmlLookupPending: true,
        cStat: typeof data.cStat === 'string' ? data.cStat : null,
        error: typeof data.message === 'string'
          ? data.message
          : 'A SEFAZ ainda não confirmou a consulta automática do XML.',
      },
    };
  }

  const documentKind = data.document?.kind;
  const { error: attemptError } = await db
    .from('sefaz_inbound_xml_consult_attempts')
    .upsert({
      access_key: accessKey,
      environment,
      result: documentKind === 'full'
        ? 'full_received'
        : documentKind === 'summary'
          ? 'summary'
          : 'no_document',
      consulted_at: new Date().toISOString(),
    }, { onConflict: 'access_key,environment' });
  if (attemptError) {
    return {
      status: 503,
      body: {
        success: false,
        retryable: true,
        hasMore: true,
        retryAfter: await getNextDirectConsultAt(db, configuredCnpj),
        xmlLookupPending: true,
        error: 'A consulta terminou, mas não foi possível registrar seu resultado para evitar repetição da mesma chave.',
      },
    };
  }

  let persistedFullXml = false;
  let persistedItemsCount = 0;
  if (documentKind === 'full') {
    const { data: savedInvoice, error: savedInvoiceError } = await db
      .from('inbound_invoices')
      .select('xml_conteudo,itens')
      .eq('id', invoice.id)
      .maybeSingle();
    persistedFullXml = !savedInvoiceError &&
      /<(?:[\w.-]+:)?(?:nfeProc|infNFe)\b/i.test(String(savedInvoice?.xml_conteudo || ''));
    persistedItemsCount = Array.isArray(savedInvoice?.itens) ? savedInvoice.itens.length : 0;
  }

  const retryAfter = remainingCount > 0
    ? await getNextDirectConsultAt(db, configuredCnpj)
    : null;
  return {
    status: 200,
    body: {
      success: true,
      xmlRetrieved: documentKind === 'full' && persistedFullXml,
      xmlItemsCount: persistedItemsCount,
      xmlLookupPending: documentKind !== 'full' || !persistedFullXml,
      cStat: typeof data.cStat === 'string' ? data.cStat : null,
      hasMore: remainingCount > 0,
      retryAfter,
      message: documentKind === 'full' && persistedFullXml && persistedItemsCount > 0
        ? `XML completo salvo na NF de entrada; ${persistedItemsCount} item(ns) foram atualizados.`
        : documentKind === 'full' && persistedFullXml
          ? 'XML completo salvo na NF de entrada, mas nenhum item foi extraído para a lista.'
          : documentKind === 'full'
            ? 'A SEFAZ devolveu o XML completo, mas não foi possível confirmar a gravação na NF de entrada.'
        : documentKind === 'summary'
          ? 'A consulta automática ainda retornou somente o resumo. O sistema aguardará a próxima distribuição da SEFAZ.'
          : 'A consulta automática não localizou o XML completo. O sistema aguardará a próxima distribuição da SEFAZ.',
    },
  };
}

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://hkoxhourxwlddgsfdgws.supabase.co';
const serviceKey = getSupabaseSecretKey() || '';
const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

async function processAutomaticScienceBatch(
  db: SupabaseClient<any>,
  candidates: any[],
  hasMore: boolean,
  configuredCnpj: string,
  userId: string,
  pfxBase64: string,
) {
  const environment = Number(candidates[0]?.ambiente) as 1 | 2;
  let certificate: ReturnType<typeof extractCertificateAndKey>;
  let prepared: Array<{
    accessKey: string;
    environment: 1 | 2;
    recipientCnpj: string;
    signedXml: string;
    signedEvent: string;
  }>;
  try {
    certificate = extractCertificateAndKey(pfxBase64, process.env.NFE_CERTIFICATE_PASSWORD || '');
    prepared = candidates.map((invoice) => {
      const accessKey = normalizeFiscalIdentifier(invoice.chave_acesso);
      const recipientCnpj = normalizeFiscalIdentifier(invoice.destinatario_cnpj);
      const event = buildInboundScienceEventElement({ accessKey, environment, recipientCnpj });
      const signedEvent = signNfeEventXml(event, certificate.privateKeyPem, certificate.certDerBase64);
      return {
        accessKey,
        environment,
        recipientCnpj,
        signedEvent,
        signedXml: buildInboundScienceEventBatchXml([signedEvent]),
      };
    });
  } catch (error) {
    return {
      status: 409,
      body: {
        success: false,
        error: error instanceof Error ? error.message : 'Não foi possível preparar a Ciência da Emissão.',
      },
    };
  }

  const { data: batchRows, error: batchError } = await db.rpc(
    'reserve_sefaz_manifestation_batch',
    { p_cnpj: configuredCnpj }
  );
  if (batchError)
    return {
      status: 503,
      body: {
        success: false,
        skipped: true,
        retryable: true,
        hasMore,
        error: 'Não foi possível reservar a fila de Ciência por CNPJ.',
      },
    };
  const batchLease = Array.isArray(batchRows) ? batchRows[0] : batchRows;
  if (!batchLease?.allowed)
    return {
      status: 429,
      body: {
        success: false,
        skipped: true,
        hasMore,
        retryAfter: batchLease?.next_allowed_at || null,
        error: 'Outro lote de Ciência está em processamento ou aguardando o intervalo mínimo por CNPJ.',
      },
    };
  if (!batchLease.claim_token)
    return {
      status: 503,
      body: {
        success: false,
        skipped: true,
        retryable: true,
        hasMore,
        error: 'A fila de Ciência foi reservada sem identificador de execução.',
      },
    };

  const finishBatch = async (cooldownSeconds: 0 | 5 | 3600) => {
    const { data, error } = await db.rpc('finish_sefaz_manifestation_batch', {
      p_cnpj: configuredCnpj,
      p_claim_token: batchLease.claim_token,
      p_cooldown_seconds: cooldownSeconds,
    });
    const finished = Array.isArray(data) ? data[0] : data;
    return error ? null : (finished?.next_allowed_at as string | null) || null;
  };

  let reservations: Array<{
    event: (typeof prepared)[number];
    reservation: any;
    error: any;
  }>;
  try {
    reservations = await Promise.all(prepared.map(async (event) => {
      const requestId = randomUUID();
      const { data, error } = await db.rpc('reserve_inbound_manifestation_event', {
        p_access_key: event.accessKey,
        p_environment: event.environment,
        p_recipient_cnpj: event.recipientCnpj,
        p_signed_xml: event.signedXml,
        p_user_id: userId,
        p_request_id: requestId,
      });
      const reservation = Array.isArray(data) ? data[0] : data;
      return { event, reservation, error };
    }));
  } catch {
    const nextAllowedAt = await finishBatch(0);
    return {
      status: 503,
      body: {
        success: false,
        skipped: true,
        hasMore,
        retryable: true,
        retryAfter: nextAllowedAt,
        error: 'Não foi possível reservar os eventos individuais de Ciência.',
      },
    };
  }
  const reserved = reservations
    .filter((item) => !item.error && item.reservation?.created === true && item.reservation.event_id)
    .map((item) => ({ ...item.event, eventId: item.reservation.event_id }));
  const reservationPendingCount = reservations.filter((item) => item.error && ![
    'INBOUND_MANIFESTATION_PREVIOUS_EVENT_PENDING',
    'INBOUND_INVOICE_NOT_FOUND',
    'INBOUND_MANIFESTATION_REQUIRES_SUMMARY',
    'INBOUND_MANIFESTATION_ENVIRONMENT_MISMATCH',
    'INBOUND_MANIFESTATION_RECIPIENT_MISMATCH',
  ].some((code) => String(item.error.message || '').includes(code))).length;

  if (!reserved.length) {
    const nextAllowedAt = await finishBatch(0);
    return {
      status: reservationPendingCount ? 202 : 200,
      body: {
        success: !reservationPendingCount,
        skipped: !reservationPendingCount,
        hasMore,
        nextAllowedAt,
        pending: Boolean(reservationPendingCount),
        pendingCount: reservationPendingCount,
        retryable: Boolean(reservationPendingCount),
        message: reservationPendingCount
          ? 'Algumas Ciências não puderam ser reservadas e precisam de reconciliação.'
          : 'Nenhuma Ciência nova precisou ser transmitida.',
      },
    };
  }

  let responseXml: string;
  try {
    responseXml = await sendNationalEventOnce({
      environment,
      xmlPayload: buildInboundScienceEventBatchXml(reserved.map((event) => event.signedEvent)),
      certPem: certificate.certPem,
      privateKeyPem: certificate.privateKeyPem,
    });
  } catch {
    await db
      .from('inbound_manifestation_events')
      .update({ status: 'unknown', xmotivo: 'Transmissão do lote iniciada sem confirmação da resposta do Ambiente Nacional.' })
      .in('id', reserved.map((event) => event.eventId))
      .eq('status', 'transmitting');
    const nextAllowedAt = await finishBatch(5);
    return {
      status: 202,
      body: {
        success: false,
        hasMore,
        retryAfter: nextAllowedAt || new Date(Date.now() + 5_000).toISOString(),
        pending: true,
        pendingCount: reserved.length + reservationPendingCount,
        error: 'Resultado incerto após o envio do lote. Não reenvie as Ciências até reconciliar o histórico fiscal.',
      },
    };
  }

  const eventResults = parseInboundManifestationBatchResponse(responseXml);
  const sefazBlocked = eventResults.some((item) => item.cStat === '656') ||
    /<(?:[\w.-]+:)?cStat\b[^>]*>\s*656\s*<\//i.test(responseXml);
  const updateResults = await Promise.all(reserved.map(async (event) => {
    const result = eventResults.find((item) => item.accessKey === event.accessKey) || {
      status: 'unknown' as const,
      cStat: null,
      xMotivo: 'A resposta não trouxe retorno individual para esta NF-e.',
      protocolNumber: null,
      protocolDate: null,
      responseXml,
    };
    const { data, error } = await db
      .from('inbound_manifestation_events')
      .update({
        status: result.status,
        response_xml: result.responseXml || responseXml,
        cstat: result.cStat,
        xmotivo: result.xMotivo,
        protocol_number: result.protocolNumber,
        protocol_date: result.protocolDate,
        confirmed_at: result.status === 'registered' ? new Date().toISOString() : null,
      })
      .eq('id', event.eventId)
      .eq('status', 'transmitting')
      .select('id')
      .maybeSingle();
    return { status: result.status, error: Boolean(error || !data) };
  }));

  const registeredCount = updateResults.filter((item) => !item.error && item.status === 'registered').length;
  const rejectedCount = updateResults.filter((item) => !item.error && item.status === 'rejected').length;
  const pendingCount = updateResults.filter((item) => item.error || item.status === 'unknown').length + reservationPendingCount;
  const cooldownSeconds = sefazBlocked ? 3600 : 5;
  const nextAllowedAt = await finishBatch(cooldownSeconds);
  return {
    status: pendingCount ? 202 : registeredCount ? 200 : 422,
    body: {
      success: !pendingCount && registeredCount > 0,
      hasMore,
      nextAllowedAt: nextAllowedAt || new Date(Date.now() + cooldownSeconds * 1000).toISOString(),
      retryAfter: sefazBlocked
        ? nextAllowedAt || new Date(Date.now() + 3600_000).toISOString()
        : undefined,
      sefazBlocked,
      processed: registeredCount > 0,
      processedCount: registeredCount,
      rejectedCount,
      pending: Boolean(pendingCount),
      pendingCount,
      retryable: Boolean(reservationPendingCount),
      error: pendingCount
        ? 'O lote foi enviado, mas há Ciências sem confirmação individual; não reenvie até reconciliar o histórico.'
        : registeredCount
          ? undefined
          : 'A SEFAZ rejeitou todas as Ciências deste lote.',
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  if (!serviceKey)
    return res.status(503).json({ success: false, error: 'Serviço fiscal indisponível.' });

  const db = createClient(supabaseUrl, serviceKey);
  const authorization = await authorizeFiscalOperator(db, req.headers.authorization);
  if (!authorization.ok)
    return res.status(authorization.status).json({ success: false, error: authorization.message });

  const automatic = req.body?.action === 'process-auto';
  const requestId = automatic ? randomUUID() : String(req.body?.requestId || '');
  let accessKey = normalizeFiscalIdentifier(req.body?.accessKey);
  if (!automatic && !ACCESS_KEY_PATTERN.test(accessKey))
    return res.status(400).json({ success: false, error: 'Chave de acesso inválida.' });
  if (!isUuid(requestId))
    return res.status(400).json({ success: false, error: 'Identificador da solicitação inválido.' });

  const { data: settingsRow, error: settingsError } = await db
    .from('settings')
    .select('data')
    .eq('id', 'app')
    .maybeSingle();
  const configuredCnpj = normalizeFiscalIdentifier(settingsRow?.data?.companyCnpj);
  if (settingsError || !CNPJ_PATTERN.test(configuredCnpj))
    return res.status(409).json({ success: false, error: 'O CNPJ da empresa não está configurado corretamente.' });

  if (automatic) {
    if (settingsRow?.data?.autoInboundScienceEnabled !== true)
      return res.status(200).json({ success: true, skipped: true, message: 'A Ciência automática está desativada.' });

    const candidates: any[] = [];
    const xmlCandidates: any[] = [];
    let foundEligible = false;
    let batchEnvironment: number | null = null;
    let xmlConsultTrackingAvailable = true;
    for (let offset = 0; candidates.length < 20 && xmlCandidates.length < 20; offset += 100) {
      const { data: summaries, error: summariesError } = await db
        .from('inbound_invoices')
        .select('id,chave_acesso,modelo,ambiente,destinatario_cnpj,status_sefaz,xml_conteudo,data_emissao')
        .eq('status_sefaz', 'autorizada')
        .ilike('xml_conteudo', '%resNFe%')
        .order('data_emissao', { ascending: false })
        .order('id', { ascending: true })
        .range(offset, offset + 99);
      if (summariesError)
        return res.status(503).json({ success: false, error: 'Não foi possível procurar notas resumo pendentes.' });
      if (!summaries?.length) break;

      const eligible = summaries.filter((invoice: any) => {
        const key = normalizeFiscalIdentifier(invoice.chave_acesso);
        const environment = Number(invoice.ambiente);
        return ACCESS_KEY_PATTERN.test(key) &&
          key.slice(20, 22) === '55' &&
          (environment === 1 || environment === 2) &&
          normalizeFiscalIdentifier(invoice.destinatario_cnpj) === configuredCnpj &&
          String(invoice.modelo || key.slice(20, 22)) === '55' &&
          /<(?:[\w.-]+:)?resNFe\b/i.test(String(invoice.xml_conteudo || ''));
      }).map((invoice: any) => ({
        ...invoice,
        chave_acesso: normalizeFiscalIdentifier(invoice.chave_acesso),
        ambiente: Number(invoice.ambiente),
      }));

      if (eligible.length) {
        foundEligible = true;
        const candidateKeys = eligible.map((invoice: any) => normalizeFiscalIdentifier(invoice.chave_acesso));
        const { data: previousEvents, error: previousEventsError } = await db
          .from('inbound_manifestation_events')
          .select('access_key,environment,status')
          .eq('event_type', '210210')
          .in('access_key', candidateKeys);
        if (previousEventsError)
          return res.status(503).json({ success: false, error: 'Não foi possível confirmar se já existe uma Ciência registrada.' });

        const attemptedKeys = new Set((previousEvents || []).map((event: any) => `${event.access_key}:${event.environment}`));
        let previousConsults: any[] = [];
        if (xmlConsultTrackingAvailable) {
          const consultResult = await db
            .from('sefaz_inbound_xml_consult_attempts')
            .select('access_key,environment')
            .in('access_key', candidateKeys);
          if (consultResult.error) {
            const consultError = consultResult.error;
            const consultTableMissing = ['42P01', 'PGRST205'].includes(consultError.code || '') ||
              (/sefaz_inbound_xml_consult_attempts/i.test(consultError.message || '') &&
                /(does not exist|could not find|not found)/i.test(consultError.message || ''));
            if (!consultTableMissing)
              return res.status(503).json({ success: false, error: 'Não foi possível conferir as consultas automáticas de XML já realizadas.' });
            xmlConsultTrackingAvailable = false;
          } else {
            previousConsults = consultResult.data || [];
          }
        }

        const pending = eligible.filter((invoice: any) =>
          !attemptedKeys.has(`${normalizeFiscalIdentifier(invoice.chave_acesso)}:${Number(invoice.ambiente)}`)
        );
        const pendingXml = xmlConsultTrackingAvailable
          ? selectPendingInboundXmlConsults(eligible, previousEvents || [], previousConsults)
          : [];
        xmlCandidates.push(...pendingXml.slice(0, 20 - xmlCandidates.length));
        if (batchEnvironment === null && pending.length)
          batchEnvironment = Number(pending[0].ambiente);
        candidates.push(...pending
          .filter((invoice: any) => Number(invoice.ambiente) === batchEnvironment)
          .slice(0, 20 - candidates.length));
      }

      if (candidates.length >= 20 || summaries.length < 100) break;
    }
    if (!candidates.length && xmlCandidates.length) {
      const consultation = await consultNextRegisteredSummary(
        db,
        configuredCnpj,
        xmlCandidates[0],
        xmlCandidates.length - 1,
      );
      return res.status(consultation.status).json(consultation.body);
    }

    if (!candidates.length && foundEligible && !xmlConsultTrackingAvailable)
      return res.status(409).json({
        success: false,
        retryable: false,
        xmlLookupPending: true,
        error: 'Consulta automática do XML pausada: falta aplicar a migration sefaz_inbound_xml_consult_tracking no Supabase operacional. A Ciência automática continua disponível; a busca do XML será retomada após a criação da tabela de controle.',
      });

    if (!candidates.length)
      return res.status(200).json({
        success: true,
        skipped: true,
        message: foundEligible
          ? 'As notas resumo elegíveis já possuem tentativa de Ciência ou consulta automática de XML registrada.'
          : 'Nenhuma nota resumo elegível para Ciência automática.',
      });

    const pfxBase64 = process.env.NFE_CERTIFICATE_BASE64;
    if (!pfxBase64)
      return res.status(503).json({ success: false, error: 'Certificado digital não configurado no servidor.' });

    const batchResult = await processAutomaticScienceBatch(
      db,
      candidates,
      candidates.length > 0,
      configuredCnpj,
      authorization.userId,
      pfxBase64,
    );
    return res.status(batchResult.status).json(batchResult.body);
  }

  const { data: invoice, error: invoiceError } = await db
    .from('inbound_invoices')
    .select('id,chave_acesso,modelo,ambiente,destinatario_cnpj,status_sefaz,xml_conteudo')
    .eq('chave_acesso', accessKey)
    .maybeSingle();
  if (invoiceError)
    return res.status(503).json({ success: false, error: 'Não foi possível validar a NF-e de entrada.' });
  if (!invoice)
    return res.status(404).json({ success: false, error: 'Importe ou consulte a nota antes de enviar Ciência.' });
  if (Number(invoice.ambiente) !== 1 && Number(invoice.ambiente) !== 2)
    return res.status(409).json({ success: false, error: 'O ambiente fiscal desta nota não está identificado. Consulte a nota novamente pela SEFAZ.' });
  const environment = Number(invoice.ambiente) as 1 | 2;
  if (environment === 1 && !automatic && req.body?.productionConfirmed !== true)
    return res.status(400).json({ success: false, error: 'Confirme explicitamente o envio da Ciência em Produção.' });
  const recipientCnpj = normalizeFiscalIdentifier(invoice.destinatario_cnpj);
  if (recipientCnpj !== configuredCnpj)
    return res.status(409).json({ success: false, error: 'O destinatário da nota não corresponde ao CNPJ configurado para esta empresa.' });

  if (String(invoice.modelo || accessKey.slice(20, 22)) !== '55')
    return res.status(409).json({ success: false, error: 'Ciência do destinatário só pode ser enviada para NF-e modelo 55.' });
  if (!/<(?:[\w.-]+:)?resNFe\b/i.test(String(invoice.xml_conteudo || '')))
    return res.status(409).json({ success: false, error: 'A Ciência está disponível apenas enquanto a SEFAZ fornece o resumo da NF-e.' });

  const pfxBase64 = process.env.NFE_CERTIFICATE_BASE64;
  if (!pfxBase64)
    return res.status(503).json({ success: false, error: 'Certificado digital não configurado no servidor.' });

  let signedXml: string;
  let certificate: ReturnType<typeof extractCertificateAndKey>;
  try {
    certificate = extractCertificateAndKey(pfxBase64, process.env.NFE_CERTIFICATE_PASSWORD || '');
    const eventXml = buildInboundScienceEventXml({
      accessKey,
      environment,
      recipientCnpj,
    });
    signedXml = signNfeEventXml(eventXml, certificate.privateKeyPem, certificate.certDerBase64);
  } catch (error) {
    return res.status(409).json({
      success: false,
      error: error instanceof Error ? error.message : 'Não foi possível preparar a Ciência da Emissão.',
    });
  }

  const { data: batchRows, error: batchError } = await db.rpc(
    'reserve_sefaz_manifestation_batch',
    { p_cnpj: configuredCnpj }
  );
  if (batchError)
    return res.status(503).json({ success: false, retryable: true, error: 'Não foi possível reservar a fila de Ciência por CNPJ.' });
  const batchLease = Array.isArray(batchRows) ? batchRows[0] : batchRows;
  if (!batchLease?.allowed)
    return res.status(429).json({
      success: false,
      skipped: true,
      retryAfter: batchLease?.next_allowed_at || null,
      error: 'Outro lote de Ciência está em processamento ou aguardando o intervalo mínimo por CNPJ.',
    });
  if (!batchLease.claim_token)
    return res.status(503).json({ success: false, retryable: true, error: 'A fila de Ciência foi reservada sem identificador de execução.' });

  const finishBatch = async (cooldownSeconds: 0 | 5 | 3600) => {
    const { data, error } = await db.rpc('finish_sefaz_manifestation_batch', {
      p_cnpj: configuredCnpj,
      p_claim_token: batchLease.claim_token,
      p_cooldown_seconds: cooldownSeconds,
    });
    const finished = Array.isArray(data) ? data[0] : data;
    return error ? null : (finished?.next_allowed_at as string | null) || null;
  };

  const { data: reservation, error: reservationError } = await db.rpc(
    'reserve_inbound_manifestation_event',
    {
      p_access_key: accessKey,
      p_environment: environment,
      p_recipient_cnpj: recipientCnpj,
      p_signed_xml: signedXml,
      p_user_id: authorization.userId,
      p_request_id: requestId,
    }
  );
  if (reservationError) {
    const message = String(reservationError.message || '');
    await finishBatch(0);
    if (message.includes('INBOUND_MANIFESTATION_PREVIOUS_EVENT_PENDING'))
      return res.status(409).json({ success: false, pending: true, error: 'Existe uma tentativa de Ciência com resultado incerto. Não reenvie o evento; reconcilie o histórico fiscal antes de tentar novamente.' });
    if (message.includes('INBOUND_INVOICE_NOT_FOUND'))
      return res.status(404).json({ success: false, error: 'NF-e de entrada não encontrada.' });
    if (message.includes('INBOUND_MANIFESTATION_REQUIRES_SUMMARY'))
      return res.status(409).json({ success: false, error: 'A nota não está mais apenas como resumo.' });
    if (message.includes('INBOUND_MANIFESTATION_ENVIRONMENT_MISMATCH'))
      return res.status(409).json({ success: false, error: 'O ambiente fiscal da nota mudou. Atualize a lista antes de continuar.' });
    if (message.includes('INBOUND_MANIFESTATION_RECIPIENT_MISMATCH'))
      return res.status(409).json({ success: false, error: 'O destinatário da NF-e não corresponde ao CNPJ do evento.' });
    return res.status(409).json({ success: false, error: 'Não foi possível reservar a transmissão da Ciência.' });
  }

  const reservationRow = Array.isArray(reservation) ? reservation[0] : reservation;
  if (!reservationRow?.event_id) {
    await finishBatch(0);
    return res.status(503).json({ success: false, pending: true, error: 'A tentativa foi reservada sem confirmação do histórico. Não reenvie.' });
  }

  if (reservationRow.created !== true) {
    const { data: previousEvent, error: previousError } = await db
      .from('inbound_manifestation_events')
      .select('status,cstat,xmotivo,protocol_number')
      .eq('id', reservationRow.event_id)
      .maybeSingle();
    await finishBatch(0);
    if (previousError || !previousEvent)
      return res.status(503).json({ success: false, pending: true, error: 'A Ciência já possui uma tentativa registrada, mas seu estado não pôde ser consultado.' });
    if (previousEvent.status === 'registered')
      return res.status(200).json({ success: true, alreadyProcessed: true, processed: automatic, cStat: previousEvent.cstat, xMotivo: previousEvent.xmotivo, protocolNumber: previousEvent.protocol_number });
    if (previousEvent.status === 'rejected')
      return res.status(422).json({ success: false, cStat: previousEvent.cstat, xMotivo: previousEvent.xmotivo, error: previousEvent.xmotivo || 'A SEFAZ rejeitou a Ciência.' });
    return res.status(202).json({ success: false, pending: true, error: 'A tentativa anterior ainda está em processamento ou precisa de reconciliação. Nenhum evento novo foi enviado.' });
  }

  let responseXml: string;
  try {
    responseXml = await sendNationalEventOnce({
      environment,
      xmlPayload: signedXml,
      certPem: certificate.certPem,
      privateKeyPem: certificate.privateKeyPem,
    });
  } catch {
    await db
      .from('inbound_manifestation_events')
      .update({ status: 'unknown', xmotivo: 'Transmissão iniciada sem confirmação da resposta do Ambiente Nacional.' })
      .eq('id', reservationRow.event_id)
      .eq('status', 'transmitting');
    const nextAllowedAt = await finishBatch(5);
    return res.status(202).json({ success: false, pending: true, retryAfter: nextAllowedAt, error: 'Resultado incerto após o envio. Não reenvie a Ciência até reconciliar a situação fiscal.' });
  }

  const result = parseInboundManifestationResponse(responseXml);
  const { error: updateError } = await db
    .from('inbound_manifestation_events')
    .update({
      status: result.status,
      response_xml: responseXml,
      cstat: result.cStat,
      xmotivo: result.xMotivo,
      protocol_number: result.protocolNumber,
      protocol_date: result.protocolDate,
      confirmed_at: result.status === 'registered' ? new Date().toISOString() : null,
    })
    .eq('id', reservationRow.event_id)
    .eq('status', 'transmitting');
  const sefazBlocked = result.cStat === '656' || /<(?:[\w.-]+:)?cStat\b[^>]*>\s*656\s*<\//i.test(responseXml);
  const nextAllowedAt = await finishBatch(sefazBlocked ? 3600 : 5);
  if (updateError)
    return res.status(503).json({ success: result.status === 'registered', pending: true, retryAfter: sefazBlocked ? nextAllowedAt : undefined, cStat: result.cStat, error: 'A resposta da SEFAZ foi recebida, mas o histórico local precisa de reconciliação. Não reenvie o evento.' });

  if (result.status === 'unknown')
    return res.status(202).json({ success: false, pending: true, retryAfter: nextAllowedAt, cStat: result.cStat, xMotivo: result.xMotivo, error: result.xMotivo || 'O Ambiente Nacional não confirmou o resultado do evento. Não reenvie.' });
  if (result.status === 'rejected')
    return res.status(422).json({ success: false, retryAfter: sefazBlocked ? nextAllowedAt : undefined, sefazBlocked, cStat: result.cStat, xMotivo: result.xMotivo, error: result.xMotivo || 'A SEFAZ rejeitou a Ciência da Emissão.' });

  return res.status(200).json({
    success: true,
    nextAllowedAt,
    processed: automatic,
    cStat: result.cStat,
    xMotivo: result.xMotivo,
    protocolNumber: result.protocolNumber,
    protocolDate: result.protocolDate,
  });
}
