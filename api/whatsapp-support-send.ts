import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateErpRequest, hasErpPermission } from '../erp/api/_lib/authenticatedErpRequest.js';
import { supportCustomerSendSchema } from '../shared-utils/customerSupportFormSchemas.js';
import type { CustomerSupportWhatsAppSendQuota } from '../shared-utils/customerSupportWhatsAppSendQuota.js';
import { fetchWhatsAppMetaMonthlyUsage, saoPauloMonthStart } from './whatsappSupportMetaUsage.js';
import { getSupabaseSecretKey } from './supabaseSecretKey.js';
import { RequestBodyError } from './whatsappSupportRequestError.js';
import {
  resolveWhatsAppSupportCatalogMessage,
  type ResolvedCatalogMessage,
} from './whatsappSupportCatalogMessage.js';
import {
  classifyWhatsAppSupportFile,
} from './whatsappSupportFileClassifier.js';
import {
  parseMultipart,
  UUID_PATTERN,
  type SendPayload,
} from './whatsappSupportSendRequest.js';
import { uploadWhatsAppSupportMedia } from './whatsappSupportMediaUploader.js';
import { buildWhatsAppSupportGraphPayload } from './whatsappSupportPayloadBuilder.js';
import {
  claimAiSuggestion,
  revertAiSuggestionClaim,
  persistWhatsAppSupportOutboundMessage,
} from './whatsappSupportMessagePersistence.js';
import { markLatestCustomerMessageAsRead } from '../erp/src/pages/utils/customerSupport/whatsappReadReceipt.js';

export { classifyWhatsAppSupportFile };

const GRAPH_VERSION = 'v26.0';
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const withTimeout = async <T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const normalizePhone = (value: string) => value.replace(/\D/g, '');

async function readRequestBody(req: VercelRequest, maxBytes: number): Promise<Buffer> {
  const request = req as VercelRequest & { rawBody?: Buffer };
  if (Buffer.isBuffer(request.rawBody)) {
    if (request.rawBody.byteLength > maxBytes) throw new RequestBodyError('Arquivo excede o limite de 4 MB.', 413);
    return request.rawBody;
  }

  const chunks: Buffer[] = [];
  let byteLength = 0;
  for await (const value of req as unknown as AsyncIterable<Buffer | string>) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    byteLength += chunk.byteLength;
    if (byteLength > maxBytes) throw new RequestBodyError('Arquivo excede o limite de 4 MB.', 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, byteLength);
}

function metaErrorMessage(data: Record<string, any>): string {
  const code = Number(data.error?.code);
  if (code === 131047) return 'A Meta recusou a mensagem: fora da janela de 24 horas, o WhatsApp exige um modelo aprovado.';
  if (code === 131030) return 'O WhatsApp não reconheceu este telefone como destinatário autorizado.';
  if (code === 131026) return 'O WhatsApp não conseguiu entregar a mensagem a este contato.';
  return 'O WhatsApp recusou o envio. Confira o arquivo e a conexão do canal.';
}

function responseJson(res: VercelResponse, status: number, body: Record<string, unknown>) {
  return res.status(status).json(body);
}

function quotaWaitLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} segundo${seconds === 1 ? '' : 's'}`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minuto${minutes === 1 ? '' : 's'}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hora${hours === 1 ? '' : 's'}`;
}

async function handleGetSendQuota(req: VercelRequest, res: VercelResponse, fetchMeta: typeof fetch) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const context = await authenticateErpRequest(req, res, { includeWhatsAppConfig: true }).catch(() => null);
  if (!context) return;
  if (!hasErpPermission(context, 'viewCustomerSupport')) {
    return responseJson(res, 403, { error: 'Você não tem acesso à Central de Atendimento.' });
  }
  const supportPermission = await withTimeout(context.userDb.rpc('customer_support_can_view'), 12_000).catch(() => null);
  if (!supportPermission || supportPermission.error) return responseJson(res, 503, { error: 'Não foi possível validar o acesso à Central.' });
  if (supportPermission?.data !== true) return responseJson(res, 403, { error: 'Sem permissão para usar a Central de Atendimento.' });

  const whatsappConfig = context.whatsappConfig && typeof context.whatsappConfig === 'object'
    ? context.whatsappConfig as { phoneNumberId?: unknown; wabaId?: unknown }
    : null;
  const phoneNumberId = typeof whatsappConfig?.phoneNumberId === 'string' ? whatsappConfig.phoneNumberId.trim() : '';
  if (!/^\d{1,32}$/.test(phoneNumberId)) return responseJson(res, 503, { error: 'O canal WhatsApp não está configurado.' });

  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim() || '';
  const supabaseSecret = getSupabaseSecretKey();
  if (!supabaseUrl || !supabaseSecret) return responseJson(res, 503, { error: 'Cota de envio indisponível.' });
  const adminDb = createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const quotaResult = await withTimeout(adminDb.rpc('customer_support_outside_window_quota', {
    p_business_phone_number_id: phoneNumberId,
    p_source: 'central',
    p_reserve: false,
  }), 12_000).catch(() => null);
  if (quotaResult?.error || !quotaResult?.data || typeof quotaResult.data !== 'object') {
    return responseJson(res, 503, { error: 'Cota de envio indisponível.' });
  }
  if (req.query?.include_cost !== '1') {
    return responseJson(res, 200, { quota: quotaResult.data as CustomerSupportWhatsAppSendQuota });
  }

  const now = new Date();
  const metaUsage = hasErpPermission(context, 'viewFinancials')
    ? await fetchWhatsAppMetaMonthlyUsage({
        wabaId: typeof whatsappConfig?.wabaId === 'string' ? whatsappConfig.wabaId.trim() : '',
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '', fetchMeta, now,
      })
    : {
        status: 'restricted', amount: null, currency: null, delivered: null,
        service_free: null, billable_delivered: null, free_entry_point: null,
        period_start: saoPauloMonthStart(now).toISOString(), as_of: now.toISOString(),
        message: 'Seu perfil não tem permissão para consultar o gasto da Meta.',
      };
  return responseJson(res, 200, { quota: quotaResult.data as CustomerSupportWhatsAppSendQuota, metaUsage });
}

export function createWhatsAppSupportSendHandler(dependencies: { fetchMeta?: typeof fetch } = {}) {
  const fetchMeta = dependencies.fetchMeta || ((input, init) => globalThis.fetch(input, init));

  return async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') return handleGetSendQuota(req, res, fetchMeta);
    if (req.method !== 'POST') return responseJson(res, 405, { error: 'Método não permitido.' });

    const rawContentType = String(req.headers['content-type'] || '');
    const contentType = rawContentType.toLowerCase();
    let payload: SendPayload;
    try {
      const body = await readRequestBody(req, MAX_UPLOAD_BYTES + 32_000);
      if (contentType.includes('multipart/form-data')) {
        // Multipart boundaries are case-sensitive; preserve the original header value.
        payload = parseMultipart(body, rawContentType);
      } else if (contentType.includes('application/json')) {
        if (body.byteLength > 16_000) return responseJson(res, 413, { error: 'Solicitação excede o tamanho permitido.' });
        const parsed = body.length ? JSON.parse(body.toString('utf8')) : {};
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new RequestBodyError('Solicitação inválida.', 400);
        const conversationId = typeof parsed.conversationId === 'string' ? parsed.conversationId.trim() : '';
        const message = typeof parsed.message === 'string' ? parsed.message : '';
        const aiSuggestionMessageId = typeof parsed.aiSuggestionMessageId === 'string'
          ? parsed.aiSuggestionMessageId.trim()
          : '';
        const replyToWamid = typeof parsed.replyToWamid === 'string' ? parsed.replyToWamid.trim() : '';
        const forwarded = parsed.forwarded === true;
        const contact = parsed.contact && typeof parsed.contact === 'object' && !Array.isArray(parsed.contact)
          ? parsed.contact as { name?: unknown; phone?: unknown }
          : undefined;
        const catalogSelection = parsed.catalogSelection;
        if (!UUID_PATTERN.test(conversationId)) throw new RequestBodyError('Conversa inválida.', 400);
        if (aiSuggestionMessageId && !UUID_PATTERN.test(aiSuggestionMessageId)) {
          throw new RequestBodyError('Sugestão da IA inválida.', 400);
        }
        let normalizedContact: SendPayload['contact'];
        if (contact) {
          const name = typeof contact.name === 'string' ? contact.name.trim() : '';
          const phone = typeof contact.phone === 'string' ? normalizePhone(contact.phone) : '';
          if (!name || name.length > 100 || !/^\d{10,15}$/.test(phone)) {
            throw new RequestBodyError('Contato inválido.', 400);
          }
          normalizedContact = { name, phone };
        }
        const sendInput = supportCustomerSendSchema.safeParse({
          conversationId,
          message,
          ...(replyToWamid ? { replyToWamid } : {}),
          ...(forwarded ? { forwarded: true } : {}),
          attachmentType: normalizedContact ? 'contact' : catalogSelection ? 'catalog' : 'text',
          ...(normalizedContact ? { contactName: normalizedContact.name, contactPhone: normalizedContact.phone } : {}),
          ...(catalogSelection !== undefined ? { catalogSelection } : {}),
        });
        if (!sendInput.success) throw new RequestBodyError(sendInput.error.issues[0]?.message || 'Solicitação inválida.', 400);
        payload = {
          conversationId: sendInput.data.conversationId,
          message: sendInput.data.message,
          ...(aiSuggestionMessageId ? { aiSuggestionMessageId } : {}),
          ...(sendInput.data.replyToWamid ? { replyToWamid: sendInput.data.replyToWamid } : {}),
          ...(sendInput.data.forwarded ? { forwarded: true } : {}),
          ...(normalizedContact ? { contact: normalizedContact } : {}),
          ...(sendInput.data.catalogSelection ? { catalogSelection: sendInput.data.catalogSelection } : {}),
        };
      } else {
        return responseJson(res, 415, { error: 'Formato de solicitação inválido.' });
      }
    } catch (error) {
      if (error instanceof RequestBodyError) return responseJson(res, error.statusCode, { error: error.message });
      return responseJson(res, 400, { error: 'Solicitação inválida.' });
    }

    let message = payload.message.trim();
    if ((!message && !payload.file && !payload.contact && !payload.catalogSelection) || message.length > 4096) {
      return responseJson(res, 400, { error: 'Escreva uma mensagem ou adicione um anexo. O texto pode ter até 4096 caracteres.' });
    }
    if (payload.file && payload.file.bytes.byteLength > MAX_UPLOAD_BYTES) {
      return responseJson(res, 413, { error: 'Cada arquivo deve ter no máximo 4 MB nesta central.' });
    }
    if (payload.file && message.length > 1024) {
      return responseJson(res, 400, { error: 'A legenda do anexo pode ter até 1024 caracteres.' });
    }

    const context = await authenticateErpRequest(req, res).catch(() => null);
    if (!context) return;
    if (!hasErpPermission(context, 'viewCustomerSupport')) {
      return responseJson(res, 403, { error: 'Você não tem acesso à Central de Atendimento.' });
    }

    let finishQuotaReservation: ((status: 'sent' | 'failed' | 'uncertain' | 'released') => Promise<void>) | null = null;
    try {
      const permission = await withTimeout(context.userDb.rpc('customer_support_can_view'), 12_000);
      if (permission.error) return responseJson(res, 503, { error: 'Não foi possível validar o acesso à Central.' });
      if (permission.data !== true) return responseJson(res, 403, { error: 'Sem permissão para usar a Central de Atendimento.' });

      const conversationResult = await withTimeout(context.userDb
        .from('whatsapp_conversations')
        .select('id,channel,business_phone_number_id,contact_phone,is_archived')
        .eq('id', payload.conversationId)
        .maybeSingle(), 12_000);
      if (conversationResult.error) return responseJson(res, 503, { error: 'Não foi possível validar a conversa.' });
      const conversation = conversationResult.data;
      if (!conversation) return responseJson(res, 404, { error: 'Conversa não encontrada.' });
      if (conversation.channel && conversation.channel !== 'whatsapp') {
        return responseJson(res, 409, { error: 'O envio por Instagram e Messenger ainda não está configurado.' });
      }
      if (conversation.is_archived) return responseJson(res, 409, { error: 'Reabra o atendimento antes de enviar uma mensagem.' });

      let aiSuggestionRawPayload: Record<string, any> | null = null;
      if (payload.aiSuggestionMessageId) {
        if (payload.file || payload.contact || payload.catalogSelection || payload.forwarded) {
          return responseJson(res, 400, { error: 'Uma sugestão da IA só pode ser aprovada como mensagem de texto.' });
        }
        const suggestionResult = await withTimeout<any>(context.userDb
          .from('whatsapp_messages')
          .select('id,status,direction,message_type,text_content,raw_payload,reply_to_wamid')
          .eq('id', payload.aiSuggestionMessageId)
          .eq('conversation_id', payload.conversationId)
          .maybeSingle(), 12_000);
        if (suggestionResult.error) return responseJson(res, 503, { error: 'Não foi possível validar a sugestão da IA.' });
        const suggestion = suggestionResult.data;
        if (
          !suggestion || suggestion.status !== 'suggested' || suggestion.direction !== 'outbound' ||
          suggestion.message_type !== 'text' || suggestion.raw_payload?.is_suggestion !== true ||
          String(suggestion.text_content || '').trim() !== message
        ) {
          return responseJson(res, 409, { error: 'Esta sugestão já foi aprovada ou não está mais disponível.' });
        }
        if (payload.replyToWamid && payload.replyToWamid !== suggestion.reply_to_wamid) {
          return responseJson(res, 400, { error: 'A referência da sugestão não corresponde à conversa.' });
        }
        if (suggestion.reply_to_wamid) payload.replyToWamid = String(suggestion.reply_to_wamid);
        aiSuggestionRawPayload = suggestion.raw_payload;
      }

      let replyToMessageId: string | null = null;
      if (payload.replyToWamid) {
        const replyTargetResult = await withTimeout<any>(context.userDb.from('whatsapp_messages')
          .select('id,message_type,text_content,provider_message_type:raw_payload->>provider_message_type')
          .eq('conversation_id', payload.conversationId)
          .eq('api_message_id', payload.replyToWamid)
          .maybeSingle(), 12_000);
        if (replyTargetResult.error) return responseJson(res, 503, { error: 'Não foi possível validar a mensagem citada.' });
        const isLegacyRevocation = typeof replyTargetResult.data?.text_content === 'string'
          && /a central ainda não consegue exibir este tipo de mensagem\s*\(\s*revoke\s*\)\./i.test(replyTargetResult.data.text_content);
        const providerMessageType = replyTargetResult.data?.provider_message_type;
        const isNonReplyableProviderEvent = ['reaction', 'system', 'request_welcome'].includes(providerMessageType);
        if (!replyTargetResult.data || ['internal_note', 'system_event', 'deleted'].includes(replyTargetResult.data.message_type)
          || isLegacyRevocation || isNonReplyableProviderEvent) {
          return responseJson(res, 400, { error: 'A mensagem selecionada não pode ser respondida nesta conversa.' });
        }
        replyToMessageId = String(replyTargetResult.data.id);
      }

      const testArtifactResult = await withTimeout(context.userDb
        .from('whatsapp_messages')
        .select('id')
        .eq('conversation_id', payload.conversationId)
        .contains('raw_payload', { testArtifact: { is_test: true } })
        .limit(1), 12_000);
      if (testArtifactResult.error) return responseJson(res, 503, { error: 'Não foi possível validar a origem da conversa.' });
      if ((testArtifactResult.data || []).length) return responseJson(res, 403, { error: 'Conversas de teste não podem enviar mensagens a clientes.' });

      let nativeProducts: ResolvedCatalogMessage['nativeProducts'];
      if (payload.catalogSelection) {
        const resolvedCatalog = await resolveWhatsAppSupportCatalogMessage(
          context.userDb,
          payload.catalogSelection,
          message,
          withTimeout,
        );
        message = resolvedCatalog.text;
        nativeProducts = resolvedCatalog.nativeProducts;
      }

      const settingsResult = await withTimeout(context.userDb
        .from('settings')
        .select('whatsappConfig:data->whatsappConfig')
        .eq('id', 'app')
        .maybeSingle(), 12_000);
      if (settingsResult.error) return responseJson(res, 503, { error: 'Não foi possível carregar a configuração do WhatsApp.' });
      const whatsappConfig = settingsResult.data?.whatsappConfig as { phoneNumberId?: unknown; catalogId?: unknown } | null;
      const phoneNumberId = typeof whatsappConfig?.phoneNumberId === 'string' ? whatsappConfig.phoneNumberId.trim() : '';
      const catalogId = typeof whatsappConfig?.catalogId === 'string' ? whatsappConfig.catalogId.trim() : '';
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '';
      if (!/^\d{1,32}$/.test(phoneNumberId) || phoneNumberId !== conversation.business_phone_number_id || !accessToken) {
        return responseJson(res, 503, { error: 'O canal WhatsApp desta conversa não está conectado.' });
      }

      const recipient = normalizePhone(String(conversation.contact_phone || ''));
      if (!/^\d{10,15}$/.test(recipient)) return responseJson(res, 400, { error: 'Telefone da conversa inválido.' });

      const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim() || '';
      const supabaseSecret = getSupabaseSecretKey();
      if (!supabaseUrl || !supabaseSecret) return responseJson(res, 503, { error: 'Persistência do histórico indisponível.' });
      const adminDb = createClient(supabaseUrl, supabaseSecret, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      let mediaId: string | null = null;
      let mediaMimeType: string | null = null;
      let mediaFilename: string | null = null;
      let mediaType: SendPayload['file'] extends undefined ? undefined : any;

      if (payload.file) {
        const uploadResult = await uploadWhatsAppSupportMedia({
          fetchMeta,
          phoneNumberId,
          accessToken,
          file: payload.file,
          graphVersion: GRAPH_VERSION,
        });
        if (uploadResult.errorStatus && uploadResult.errorMessage) {
          return responseJson(res, uploadResult.errorStatus, { error: uploadResult.errorMessage });
        }
        mediaId = uploadResult.mediaId;
        mediaType = uploadResult.messageType;
        mediaMimeType = uploadResult.mediaMimeType;
        mediaFilename = uploadResult.mediaFilename;
      }

      const payloadResult = buildWhatsAppSupportGraphPayload({
        recipient,
        message,
        contact: payload.contact,
        file: payload.file,
        mediaId,
        mediaType,
        mediaMimeType,
        mediaFilename,
        nativeProducts,
        catalogId,
        replyToWamid: payload.replyToWamid,
      });

      if (payloadResult.catalogError) {
        return responseJson(res, payloadResult.catalogError.status, { error: payloadResult.catalogError.message });
      }

      const { graphPayload, messageType, storedText } = payloadResult;

      const quotaResult = await withTimeout(adminDb.rpc('customer_support_outside_window_quota', {
        p_business_phone_number_id: phoneNumberId,
        p_conversation_id: payload.conversationId,
        p_source: 'central',
        p_reserve: true,
      }), 12_000).catch(() => null);
      if (quotaResult?.error || !quotaResult?.data || typeof quotaResult.data !== 'object') {
        return responseJson(res, 503, { error: 'Não foi possível validar a cota de envio. Tente novamente.' });
      }
      const quota = quotaResult.data as CustomerSupportWhatsAppSendQuota & { exempt?: boolean };
      if (typeof quota.allowed !== 'boolean') return responseJson(res, 503, { error: 'Não foi possível validar a cota de envio.' });
      if (!quota.allowed) {
        const retryLabel = quota.retry_after_seconds > 0 ? ` Tente novamente em ${quotaWaitLabel(quota.retry_after_seconds)}.` : '';
        return responseJson(res, 429, {
          error: `Cota de envio atingida: ${quota.minute_remaining}/${quota.minute_limit} por minuto e ${quota.hour_remaining}/${quota.hour_limit} por hora.${retryLabel}`,
          quota,
        });
      }
      const quotaReservationId = typeof quota.reservation_id === 'string' ? quota.reservation_id : '';
      if (!quotaReservationId && quota.exempt !== true) {
        return responseJson(res, 503, { error: 'Não foi possível reservar uma vaga de envio.' });
      }

      const finishQuota = async (status: 'sent' | 'failed' | 'uncertain' | 'released') => {
        if (!quotaReservationId) return;
        await withTimeout(adminDb.rpc('customer_support_finish_whatsapp_send_quota', {
          p_reservation_id: quotaReservationId,
          p_status: status,
        }), 8_000).catch(() => null);
      };
      finishQuotaReservation = finishQuota;

      if (payload.aiSuggestionMessageId) {
        try {
          const claimResult = await claimAiSuggestion({
            adminDb,
            conversationId: payload.conversationId,
            aiSuggestionMessageId: payload.aiSuggestionMessageId,
            withTimeout,
          });
          if (claimResult.errorStatus && claimResult.errorMessage) {
            await finishQuota('released');
            return responseJson(res, claimResult.errorStatus, { error: claimResult.errorMessage });
          }
        } catch {
          await finishQuota('released');
          return responseJson(res, 503, { error: 'Não foi possível reservar a sugestão da IA para envio.' });
        }
      }

      const sendController = new AbortController();
      const sendTimeout = setTimeout(() => sendController.abort(), 25_000);
      const outboundRequestedAt = new Date().toISOString();
      let graphResponse: Response;
      try {
        graphResponse = await fetchMeta(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(graphPayload),
          signal: sendController.signal,
        });
      } catch {
        await finishQuota('uncertain');
        return responseJson(res, sendController.signal.aborted ? 504 : 502, {
          error: 'Resultado do envio incerto. Atualize a conversa antes de tentar novamente.',
          outcomeUncertain: true,
        });
      } finally {
        clearTimeout(sendTimeout);
      }

      const graphData = await graphResponse.json().catch(() => ({})) as Record<string, any>;
      if (!graphResponse.ok) {
        await finishQuota(graphResponse.status >= 500 ? 'uncertain' : 'failed');
        if (payload.aiSuggestionMessageId && graphResponse.status < 500) {
          await revertAiSuggestionClaim(adminDb, payload.conversationId, payload.aiSuggestionMessageId, withTimeout);
        }
        const metaErrorCode = Number(graphData.error?.code);
        return responseJson(res, Number(graphData.error?.code) === 131047 ? 422 : 502, {
          error: metaErrorCode === 131047
            ? metaErrorMessage(graphData)
            : nativeProducts
            ? 'A Meta recusou o card nativo. Confira a conexão do canal, o catálogo vinculado e se os produtos estão sincronizados e publicados.'
            : metaErrorMessage(graphData),
          ...(graphResponse.status >= 500 ? { outcomeUncertain: true } : {}),
        });
      }

      const apiMessageId = typeof graphData.messages?.[0]?.id === 'string' ? graphData.messages[0].id : '';
      if (!apiMessageId) {
        await finishQuota('uncertain');
        return responseJson(res, 502, {
          error: 'A Meta não confirmou o identificador da mensagem. Atualize a conversa antes de tentar novamente.',
          outcomeUncertain: true,
        });
      }

      await finishQuota('sent');

      const sendAt = new Date().toISOString();
      const profileResult = await withTimeout(context.userDb.from('profiles').select('full_name').eq('id', context.userId).maybeSingle(), 8_000).catch(() => null);
      const authorName = String(profileResult?.data?.full_name || 'Atendente').slice(0, 100);

      const readReceiptPromise = markLatestCustomerMessageAsRead(adminDb, {
        conversationId: payload.conversationId,
        businessPhoneNumberId: phoneNumberId,
        accessToken,
        beforeTimestamp: outboundRequestedAt,
        fetchMeta,
      });

      const [persistenceOutcome, readReceiptOutcome] = await Promise.allSettled([
        persistWhatsAppSupportOutboundMessage({
          adminDb,
          payload,
          apiMessageId,
          messageType,
          storedText,
          mediaId,
          mediaMimeType,
          mediaFilename,
          message,
          replyToMessageId,
          sendAt,
          userId: context.userId,
          authorName,
          aiSuggestionRawPayload,
          nativeProducts,
          withTimeout,
        }),
        readReceiptPromise,
      ]);

      if (readReceiptOutcome.status === 'fulfilled' && readReceiptOutcome.value === 'failed') {
        console.warn('[WhatsApp Central] A mensagem foi enviada, mas a confirmação de leitura não foi aceita pela Meta.');
      }
      const persistenceResult = persistenceOutcome.status === 'fulfilled'
        ? persistenceOutcome.value
        : { success: false, warning: 'Não foi possível persistir a mensagem enviada.' };

      if (!persistenceResult.success) {
        return responseJson(res, 200, {
          accepted: true,
          persisted: false,
          apiMessageId,
          warning: persistenceResult.warning,
        });
      }

      return responseJson(res, 200, { accepted: true, persisted: true, apiMessageId });
    } catch (error) {
      await finishQuotaReservation?.('released');
      if (error instanceof RequestBodyError) return responseJson(res, error.statusCode, { error: error.message });
      return responseJson(res, 503, { error: 'Não foi possível validar e preparar o envio. Tente novamente.' });
    }
  };
}

export default createWhatsAppSupportSendHandler();
