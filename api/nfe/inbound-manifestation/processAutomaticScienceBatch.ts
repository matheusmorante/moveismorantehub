import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractCertificateAndKey, signNfeEventXml } from '../nfeSigner';
import { sendNationalEventOnce } from '../nationalEnvironmentEventClient';
import {
  buildInboundScienceEventBatchXml,
  buildInboundScienceEventElement,
  parseInboundManifestationBatchResponse,
} from '../inboundManifestationProtocol';
import { normalizeFiscalIdentifier } from '../../../shared-utils/fiscalIdentifiers.js';

export async function processAutomaticScienceBatch(
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
