import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateErpRequest, hasErpPermission } from '../erp/api/_lib/authenticatedErpRequest.js';
import { supportCustomerSendSchema } from '../shared-utils/customerSupportFormSchemas.js';
import { getSupabaseSecretKey } from './supabaseSecretKey.js';
import { RequestBodyError } from './whatsappSupportRequestError.js';
import {
  resolveWhatsAppSupportCatalogMessage,
  type ResolvedCatalogMessage,
} from './whatsappSupportCatalogMessage.js';
import {
  classifyWhatsAppSupportFile,
  type WhatsAppSupportContentType,
} from './whatsappSupportFileClassifier.js';
import {
  parseMultipart,
  UUID_PATTERN,
  type SendPayload,
} from './whatsappSupportSendRequest.js';
export { classifyWhatsAppSupportFile };

const GRAPH_VERSION = 'v26.0';
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const CARE_WINDOW_MS = 24 * 60 * 60 * 1000;

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
  if (code === 131047) return 'A janela de atendimento de 24 horas expirou. Atualize a conversa antes de tentar novamente.';
  if (code === 131030) return 'O WhatsApp não reconheceu este telefone como destinatário autorizado.';
  if (code === 131026) return 'O WhatsApp não conseguiu entregar a mensagem a este contato.';
  return 'O WhatsApp recusou o envio. Confira o arquivo e a conexão do canal.';
}

function responseJson(res: VercelResponse, status: number, body: Record<string, unknown>) {
  return res.status(status).json(body);
}

export function createWhatsAppSupportSendHandler(dependencies: { fetchMeta?: typeof fetch } = {}) {
  const fetchMeta = dependencies.fetchMeta || ((input, init) => globalThis.fetch(input, init));

  return async function handler(req: VercelRequest, res: VercelResponse) {
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
        const replyToWamid = typeof parsed.replyToWamid === 'string' ? parsed.replyToWamid.trim() : '';
        const forwarded = parsed.forwarded === true;
        const contact = parsed.contact && typeof parsed.contact === 'object' && !Array.isArray(parsed.contact)
          ? parsed.contact as { name?: unknown; phone?: unknown }
          : undefined;
        const catalogSelection = parsed.catalogSelection;
        if (!UUID_PATTERN.test(conversationId)) throw new RequestBodyError('Conversa inválida.', 400);
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
    if (!hasErpPermission(context, 'sendCustomerSupportMessages')) {
      return responseJson(res, 403, { error: 'Você não tem permissão para enviar mensagens pela Central.' });
    }

    try {
      const permission = await withTimeout(context.userDb.rpc('customer_support_can_view'), 12_000);
      if (permission.error) return responseJson(res, 503, { error: 'Não foi possível validar o acesso à Central.' });
      if (permission.data !== true) return responseJson(res, 403, { error: 'Sem permissão para usar a Central de Atendimento.' });

      const conversationResult = await withTimeout(context.userDb
        .from('whatsapp_conversations')
        .select('id,business_phone_number_id,contact_phone,last_customer_message_at,is_archived')
        .eq('id', payload.conversationId)
        .maybeSingle(), 12_000);
      if (conversationResult.error) return responseJson(res, 503, { error: 'Não foi possível validar a conversa.' });
      const conversation = conversationResult.data;
      if (!conversation) return responseJson(res, 404, { error: 'Conversa não encontrada.' });
      if (conversation.is_archived) return responseJson(res, 409, { error: 'Reabra o atendimento antes de enviar uma mensagem.' });

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

      const lastCustomerMessageAt = Date.parse(String(conversation.last_customer_message_at || ''));
      const elapsed = Date.now() - lastCustomerMessageAt;
      if (!Number.isFinite(lastCustomerMessageAt) || elapsed < 0 || elapsed >= CARE_WINDOW_MS) {
        return responseJson(res, 403, { error: 'A janela de atendimento de 24 horas está fechada. Aguarde uma nova mensagem do cliente.' });
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

      const sendAt = new Date().toISOString();
      let messageType: WhatsAppSupportContentType | 'text' | 'contacts' | 'interactive' = payload.contact ? 'contacts' : 'text';
      let mediaId: string | null = null;
      let mediaMimeType: string | null = null;
      let mediaFilename: string | null = null;
      let graphPayload: Record<string, unknown>;
      let storedText = message;

      if (payload.contact) {
        graphPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'contacts',
          contacts: [{
            name: { formatted_name: payload.contact.name, first_name: payload.contact.name },
            phones: [{ phone: `+${payload.contact.phone}`, type: 'WORK' }],
          }],
        };
        storedText = `Contato compartilhado: ${payload.contact.name} (+${payload.contact.phone})`;
      } else if (payload.file) {
        const classified = classifyWhatsAppSupportFile(payload.file);
        const uploadForm = new FormData();
        uploadForm.set('messaging_product', 'whatsapp');
        uploadForm.set('type', classified.mimeType);
        uploadForm.set('file', new Blob([new Uint8Array(payload.file.bytes)], { type: classified.mimeType }), payload.file.name);
        const uploadController = new AbortController();
        const uploadTimeout = setTimeout(() => uploadController.abort(), 25_000);
        let uploadResponse: Response;
        try {
          uploadResponse = await fetchMeta(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/media`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: uploadForm,
            signal: uploadController.signal,
          });
        } catch {
          return responseJson(res, uploadController.signal.aborted ? 504 : 502, {
            error: 'Não foi possível enviar o arquivo à Meta. O arquivo não foi enviado ao cliente.',
          });
        } finally {
          clearTimeout(uploadTimeout);
        }
        const uploadData = await uploadResponse.json().catch(() => ({})) as Record<string, any>;
        mediaId = typeof uploadData.id === 'string' ? uploadData.id : null;
        if (!uploadResponse.ok || !mediaId) {
          return responseJson(res, 502, { error: 'O WhatsApp não aceitou este arquivo. Confira o formato e o tamanho.' });
        }

        messageType = classified.type;
        mediaMimeType = classified.mimeType;
        mediaFilename = payload.file.name.slice(0, 255);
        const mediaKey = classified.type;
        graphPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: classified.type,
          [mediaKey]: {
            id: mediaId,
            ...(classified.type === 'document' ? { filename: mediaFilename } : {}),
            ...(classified.type !== 'sticker' && message ? { caption: message } : {}),
          },
        };
        storedText = classified.type === 'sticker' ? '[Figurinha]' : message || mediaFilename || `[${classified.type === 'image' ? 'Imagem' : classified.type === 'video' ? 'Vídeo' : classified.type === 'audio' ? 'Áudio' : 'Documento'}]`;
      } else if (nativeProducts) {
        if (!/^\d{1,32}$/.test(catalogId)) {
          return responseJson(res, 503, { error: 'Configure um catálogo da Meta vinculado ao WhatsApp antes de enviar cards nativos.' });
        }
        graphPayload = buildWhatsAppNativeCatalogMessage({
          recipient,
          catalogId,
          bodyText: message,
          retailerIds: nativeProducts.map((product) => product.retailerId),
        });
        messageType = 'interactive';
        storedText = [
          message,
          nativeProducts.length === 1
            ? `Produto do catálogo: ${nativeProducts[0].name}`
            : `Lista nativa com ${nativeProducts.length} produtos: ${nativeProducts.slice(0, 4).map((product) => product.name).join(', ')}`,
        ].filter(Boolean).join('\n\n');
      } else {
        graphPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'text',
          text: { body: message },
        };
      }

      if (payload.replyToWamid) graphPayload.context = { message_id: payload.replyToWamid };

      const sendController = new AbortController();
      const sendTimeout = setTimeout(() => sendController.abort(), 25_000);
      let graphResponse: Response;
      try {
        graphResponse = await fetchMeta(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(graphPayload),
          signal: sendController.signal,
        });
      } catch {
        return responseJson(res, sendController.signal.aborted ? 504 : 502, {
          error: 'Resultado do envio incerto. Atualize a conversa antes de tentar novamente.',
          outcomeUncertain: true,
        });
      } finally {
        clearTimeout(sendTimeout);
      }

      const graphData = await graphResponse.json().catch(() => ({})) as Record<string, any>;
      if (!graphResponse.ok) return responseJson(res, 502, {
        error: nativeProducts
          ? 'A Meta recusou o card nativo. Confira a conexão do canal, o catálogo vinculado e se os produtos estão sincronizados e publicados.'
          : metaErrorMessage(graphData),
        ...(graphResponse.status >= 500 ? { outcomeUncertain: true } : {}),
      });
      const apiMessageId = typeof graphData.messages?.[0]?.id === 'string' ? graphData.messages[0].id : '';
      if (!apiMessageId) {
        return responseJson(res, 502, {
          error: 'A Meta não confirmou o identificador da mensagem. Atualize a conversa antes de tentar novamente.',
          outcomeUncertain: true,
        });
      }

      const profileResult = await withTimeout(context.userDb.from('profiles').select('full_name').eq('id', context.userId).maybeSingle(), 8_000).catch(() => null);
      const authorName = String(profileResult?.data?.full_name || 'Atendente').slice(0, 100);
      try {
        const insertResult = await withTimeout(adminDb.from('whatsapp_messages').insert({
          conversation_id: payload.conversationId,
          api_message_id: apiMessageId,
          direction: 'outbound',
          message_type: messageType,
          text_content: storedText,
          media_id: mediaId,
          media_mime_type: mediaMimeType,
          media_filename: mediaFilename,
          media_caption: payload.file ? message || null : null,
          reply_to_message_id: replyToMessageId,
          reply_to_wamid: payload.replyToWamid || null,
          status: 'sent',
          raw_payload: {
            author_id: context.userId,
            author_name: authorName,
            origin: payload.forwarded ? 'customer_support_forward' : 'customer_support_composer',
            ...(payload.forwarded ? { forwarded: true } : {}),
          },
          timestamp: sendAt,
        }), 12_000);
        if (insertResult.error) throw new Error('insert failed');
        const conversationUpdate = await withTimeout(adminDb.from('whatsapp_conversations').update({
          last_message_text: storedText,
          last_message_at: sendAt,
          updated_at: sendAt,
        }).eq('id', payload.conversationId), 12_000);
        if (conversationUpdate.error) throw new Error('conversation update failed');
      } catch {
        return responseJson(res, 200, {
          accepted: true,
          persisted: false,
          apiMessageId,
          warning: 'A Meta aceitou a mensagem, mas o histórico não foi atualizado. Atualize a conversa e não reenvie este conteúdo.',
        });
      }

      return responseJson(res, 200, { accepted: true, persisted: true, apiMessageId });
    } catch (error) {
      if (error instanceof RequestBodyError) return responseJson(res, error.statusCode, { error: error.message });
      return responseJson(res, 503, { error: 'Não foi possível validar e preparar o envio. Tente novamente.' });
    }
  };
}

export default createWhatsAppSupportSendHandler();
