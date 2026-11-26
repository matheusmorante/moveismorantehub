import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateErpRequest, hasErpPermission } from '../../erp/api/_lib/authenticatedErpRequest.js';
import type { CustomerSupportWhatsAppSendQuota } from '../../shared-utils/customerSupportWhatsAppSendQuota.js';
import { fetchWhatsAppMetaMonthlyUsage, saoPauloMonthStart } from '../whatsappSupportMetaUsage.js';
import { getSupabaseSecretKey } from '../supabaseSecretKey.js';

export const withTimeout = async <T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export function responseJson(res: VercelResponse, status: number, body: Record<string, unknown>) {
  return res.status(status).json(body);
}

export function quotaWaitLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} segundo${seconds === 1 ? '' : 's'}`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minuto${minutes === 1 ? '' : 's'}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hora${hours === 1 ? '' : 's'}`;
}

/** Atende GET /api/whatsapp-support-send retornando a cota fora da janela e o gasto mensal da Meta. */
export async function handleGetSendQuota(
  req: VercelRequest,
  res: VercelResponse,
  fetchMeta: typeof fetch
) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const context = await authenticateErpRequest(req, res, { includeWhatsAppConfig: true }).catch(() => null);
  if (!context) return;
  if (!hasErpPermission(context, 'viewCustomerSupport')) {
    return responseJson(res, 403, { error: 'Você não tem acesso à Central de Atendimento.' });
  }
  const supportPermission = await withTimeout(context.userDb.rpc('customer_support_can_view'), 12_000).catch(() => null);
  if (!supportPermission || supportPermission.error) {
    return responseJson(res, 503, { error: 'Não foi possível validar o acesso à Central.' });
  }
  if (supportPermission?.data !== true) {
    return responseJson(res, 403, { error: 'Sem permissão para usar a Central de Atendimento.' });
  }

  const whatsappConfig = context.whatsappConfig && typeof context.whatsappConfig === 'object'
    ? (context.whatsappConfig as { phoneNumberId?: unknown; wabaId?: unknown })
    : null;
  const phoneNumberId = typeof whatsappConfig?.phoneNumberId === 'string'
    ? whatsappConfig.phoneNumberId.trim()
    : '';
  if (!/^\d{1,32}$/.test(phoneNumberId)) {
    return responseJson(res, 503, { error: 'O canal WhatsApp não está configurado.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim() || '';
  const supabaseSecret = getSupabaseSecretKey();
  if (!supabaseUrl || !supabaseSecret) {
    return responseJson(res, 503, { error: 'Cota de envio indisponível.' });
  }
  const adminDb = createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const quotaResult = await withTimeout(
    adminDb.rpc('customer_support_outside_window_quota', {
      p_business_phone_number_id: phoneNumberId,
      p_source: 'central',
      p_reserve: false,
    }),
    12_000
  ).catch(() => null);
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
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '',
        fetchMeta,
        now,
      })
    : {
        status: 'restricted',
        amount: null,
        currency: null,
        delivered: null,
        service_free: null,
        billable_delivered: null,
        free_entry_point: null,
        period_start: saoPauloMonthStart(now).toISOString(),
        as_of: now.toISOString(),
        message: 'Seu perfil não tem permissão para consultar o gasto da Meta.',
      };
  return responseJson(res, 200, {
    quota: quotaResult.data as CustomerSupportWhatsAppSendQuota,
    metaUsage,
  });
}
