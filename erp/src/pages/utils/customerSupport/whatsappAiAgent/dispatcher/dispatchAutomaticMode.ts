import type { WhatsAppAiAgentResult } from '../whatsappAiAgentTypes.js';
import { markMessageProcessed } from '../whatsappAiAgentSecurity.js';
import type { DispatchAiResponseParams } from './types.js';
import { buildAiMessagePayload } from './aiPayloadBuilder.js';
import {
  recordDispatchOutcomeSafe,
  persistOutboundMessageAndSyncConversation,
} from './dispatchOutcomeRecorder.js';
import { sendMetaNativeCatalogMessage, sendMetaTextMessage, type MetaMessageResult } from './metaGraphSender.js';
import { prepareDispatchIdempotency } from './prepareDispatchIdempotency.js';
import { markLatestCustomerMessageAsRead } from '../../whatsappReadReceipt.js';

export async function dispatchAutomaticMode(
  params: DispatchAiResponseParams
): Promise<WhatsAppAiAgentResult> {
  const {
    supabase,
    inbound,
    config,
    settings,
    aiResponseText,
    toolsUsed,
    nativeCatalogProducts: requestedCatalogProducts,
    situationKey,
    matchedKeywords,
    enforcedPhrases,
    relevantArticleIds,
    workflowKey,
    executionTimeMs,
    accessToken,
    fetchMeta,
    now,
    turnId,
    modelEffective,
    fallbackReason,
    durableJob,
  } = params;

  const nativeCatalogProducts = (requestedCatalogProducts || [])
    .filter((product) => product?.retailerId && product?.name)
    .slice(0, 30);
  const catalogId = String(settings?.whatsappConfig?.catalogId || '').trim();
  const sendCatalogCards = /^\d{1,32}$/.test(catalogId) && nativeCatalogProducts.length > 0;
  const responseText = sendCatalogCards && aiResponseText.length > 1024
    ? 'Separei estas opções do nosso catálogo para você:'
    : aiResponseText;
  const storedText = sendCatalogCards
    ? [
        responseText,
        nativeCatalogProducts.length === 1
          ? `Produto do catálogo: ${nativeCatalogProducts[0].name}`
          : `Lista nativa com ${nativeCatalogProducts.length} produtos: ${nativeCatalogProducts.slice(0, 4).map((product) => product.name).join(', ')}`,
      ].join('\n\n')
    : responseText;
  const messageType = sendCatalogCards ? 'interactive' as const : 'text' as const;

  if (durableJob) {
    const { data, error } = await supabase.rpc('customer_support_stage_ai_job', {
      p_job_id: durableJob.id, p_lock_token: durableJob.token,
      p_payload: { aiResponseText: responseText, storedText, messageType,
        ...(sendCatalogCards ? { nativeCatalogProducts } : {}),
        toolsUsed, situationKey, matchedKeywords, enforcedPhrases,
        relevantArticleIds, workflowKey, executionTimeMs, modelEffective, fallbackReason },
    });
    if (error || data !== true) throw new Error('Não foi possível salvar a resposta antes do envio.');
  }

  // 1. Idempotência estrita de despacho no PostgreSQL
  const idempotency = await prepareDispatchIdempotency(supabase, {
    conversationId: inbound.conversationId,
    wamid: inbound.wamid,
    turnId,
    aiResponseText: responseText,
    toolsUsed,
    situationKey,
  });

  if (!idempotency.allowed && idempotency.earlyResult) {
    return idempotency.earlyResult;
  }

  const dispatchId = idempotency.dispatchId;

  // 2. Envio direto ao cliente via Meta Cloud API com proteção contra timeout e resultados incertos
  const phoneNumberId =
    inbound.businessPhoneNumberId ||
    settings?.whatsappConfig?.phoneNumberId ||
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ||
    '';

  if (!phoneNumberId || !accessToken) {
    let outcomeRecorded = false;
    if (dispatchId) {
      outcomeRecorded = await recordDispatchOutcomeSafe(
        supabase, dispatchId, 'failed', null, 'channel_credentials_missing'
      );
    }
    markMessageProcessed(inbound.wamid);
    return {
      executed: false,
      reason: outcomeRecorded ? 'channel_credentials_missing' : 'channel_credentials_missing_state_unrecorded',
      toolsUsed,
      situationDetected: situationKey,
    };
  }

  const quotaResult = await Promise.resolve(supabase.rpc('customer_support_outside_window_quota', {
    p_business_phone_number_id: phoneNumberId,
    p_conversation_id: inbound.conversationId,
    p_source: 'ai_auto',
    p_reserve: true,
  })).catch((error: unknown) => ({ data: null, error }));
  const quota = quotaResult.data as {
    allowed?: unknown;
    exempt?: unknown;
    reservation_id?: unknown;
  } | null;
  if (quotaResult.error || !quota || typeof quota.allowed !== 'boolean') {
    const outcomeRecorded = await recordDispatchOutcomeSafe(
      supabase, dispatchId, 'failed', null, 'whatsapp_send_quota_unavailable'
    );
    markMessageProcessed(inbound.wamid);
    return {
      executed: false,
      reason: outcomeRecorded ? 'whatsapp_send_quota_unavailable' : 'meta_api_result_state_unrecorded',
      toolsUsed,
      situationDetected: situationKey,
    };
  }
  if (!quota.allowed) {
    const outcomeRecorded = await recordDispatchOutcomeSafe(
      supabase, dispatchId, 'failed', null, 'whatsapp_send_quota_exhausted'
    );
    markMessageProcessed(inbound.wamid);
    return {
      executed: false,
      reason: outcomeRecorded ? 'whatsapp_send_quota_exhausted' : 'meta_api_result_state_unrecorded',
      toolsUsed,
      situationDetected: situationKey,
    };
  }

  const quotaReservationId = typeof quota.reservation_id === 'string' ? quota.reservation_id : '';
  if (!quotaReservationId && quota.exempt !== true) {
    const outcomeRecorded = await recordDispatchOutcomeSafe(
      supabase, dispatchId, 'failed', null, 'whatsapp_send_quota_reservation_missing'
    );
    markMessageProcessed(inbound.wamid);
    return {
      executed: false,
      reason: outcomeRecorded ? 'whatsapp_send_quota_unavailable' : 'meta_api_result_state_unrecorded',
      toolsUsed,
      situationDetected: situationKey,
    };
  }

  const finishSendQuota = async (status: 'sent' | 'failed' | 'uncertain' | 'released') => {
    if (!quotaReservationId) return;
    const { error } = await Promise.resolve(supabase.rpc('customer_support_finish_whatsapp_send_quota', {
      p_reservation_id: quotaReservationId,
      p_status: status,
    })).catch((error: unknown) => ({ data: null, error }));
    if (error) console.error('[AI Dispatcher] Não foi possível finalizar a reserva da cota de envio.');
  };

  if (durableJob) {
    const { data, error } = await supabase.rpc('customer_support_mark_ai_job_sending', {
      p_job_id: durableJob.id, p_lock_token: durableJob.token, p_dispatch_id: dispatchId,
    });
    if (error || data !== true) {
      await finishSendQuota('released');
      await recordDispatchOutcomeSafe(supabase, dispatchId, 'failed', null, 'ai_job_send_claim_failed');
      throw new Error('Não foi possível confirmar o início do envio.');
    }
  }

  let sendResult: MetaMessageResult;
  try {
    sendResult = sendCatalogCards
      ? await sendMetaNativeCatalogMessage({
        fetchMeta,
        phoneNumberId,
        accessToken,
        recipientPhone: inbound.from,
        catalogId,
        bodyText: responseText,
        products: nativeCatalogProducts,
        replyToWamid: inbound.wamid,
      })
      : await sendMetaTextMessage({
        fetchMeta,
        phoneNumberId,
        accessToken,
        recipientPhone: inbound.from,
        textContent: responseText,
        replyToWamid: inbound.wamid,
      });
  } catch (error) {
    await finishSendQuota('uncertain');
    await recordDispatchOutcomeSafe(
      supabase, dispatchId, 'uncertain', null, error instanceof Error ? error.message : 'Meta send result uncertain'
    );
    markMessageProcessed(inbound.wamid);
    return {
      executed: false,
      reason: 'meta_api_network_error_outcome_uncertain',
      toolsUsed,
      situationDetected: situationKey,
    };
  }

  if (!sendResult.ok) {
    await finishSendQuota(sendResult.status === 'uncertain' ? 'uncertain' : 'failed');
    const outcomeRecorded = await recordDispatchOutcomeSafe(
      supabase,
      dispatchId,
      sendResult.status,
      null,
      sendResult.error || 'Meta API delivery failed'
    );
    markMessageProcessed(inbound.wamid);
    return {
      executed: false,
      reason: !outcomeRecorded
        ? 'meta_api_result_state_unrecorded'
        : sendResult.status === 'uncertain' ? 'meta_api_network_error_outcome_uncertain' : 'meta_api_rejected',
      error: sendResult.error,
      toolsUsed,
      situationDetected: situationKey,
    };
  }

  await finishSendQuota('sent');

  const apiMessageId = sendResult.apiMessageId || `ai_out_${Date.now()}`;
  const readReceiptPromise = markLatestCustomerMessageAsRead(supabase, {
    conversationId: inbound.conversationId,
    messageId: inbound.wamid,
    businessPhoneNumberId: phoneNumberId,
    accessToken,
    fetchMeta,
  });

  // 3. Persiste mensagem enviada e atualiza última mensagem da conversa
  const rawPayload = buildAiMessagePayload({
    authorName: 'Lizandro (IA)',
    toolsUsed,
    situationKey,
    matchedKeywords,
    enforcedPhrases,
    relevantArticleIds,
    workflowKey,
    executionTimeMs,
    supportMode: 'automatico',
    modelEffective: modelEffective || config.model,
    fallbackReason,
  });
  if (sendCatalogCards) {
    rawPayload.provider_message_type = nativeCatalogProducts.length === 1 ? 'product' : 'product_list';
    rawPayload.catalog_product_count = nativeCatalogProducts.length;
    rawPayload.catalog_products = nativeCatalogProducts.map((product) => ({
      retailer_id: product.retailerId,
      name: product.name,
    }));
  }

  const sendAt = now.toISOString();

  const outcomeRecorded = await recordDispatchOutcomeSafe(supabase, dispatchId, 'sent', apiMessageId, null);
  let messagePersisted = false;
  try {
    await persistOutboundMessageAndSyncConversation(supabase, {
      conversationId: inbound.conversationId,
      apiMessageId,
      replyToWamid: inbound.wamid,
      textContent: storedText,
      messageType,
      status: 'sent',
      rawPayload,
      sendAt,
      syncConversationLastMessage: true,
      idempotent: !!durableJob,
    });
    messagePersisted = true;
  } catch (persistError) {
    console.error('[AI Dispatcher] A mensagem foi enviada, mas não foi persistida:', persistError);
  }

  if (await readReceiptPromise === 'failed') {
    console.warn('[AI Dispatcher] A resposta foi enviada, mas a confirmação de leitura não foi aceita pela Meta.');
  }

  markMessageProcessed(inbound.wamid);

  if (!outcomeRecorded || !messagePersisted) {
    return {
      executed: true,
      reason: 'automatic_sent_persistence_incomplete',
      error: 'A resposta foi enviada ao cliente, mas o registro do envio ficou incompleto. Não reenvie manualmente sem conferir a conversa.',
      apiMessageId,
      toolsUsed,
      situationDetected: situationKey,
      supportMode: 'automatico',
    };
  }

  return {
    executed: true,
    reason: 'automatic_sent',
    replyText: responseText,
    apiMessageId,
    toolsUsed,
    situationDetected: situationKey,
    mandatoryPhrasesEnforced: enforcedPhrases,
    knowledgeArticlesUsed: relevantArticleIds,
    workflowApplied: workflowKey,
    executionTimeMs,
    supportMode: 'automatico',
  };
}
