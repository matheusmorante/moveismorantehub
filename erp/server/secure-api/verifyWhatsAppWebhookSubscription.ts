import { createHmac } from 'node:crypto';

export interface VerifyWhatsAppWebhookSubscriptionOptions {
  appId: string;
  appSecret: string;
  accessToken: string;
  wabaId: string;
  graphVersion: string;
  signal: AbortSignal;
}

export type VerifyWhatsAppWebhookSubscriptionResult =
  | { valid: true; subscribed: boolean }
  | {
      valid: false;
      reason: 'invalid_input' | 'graph_http_error' | 'invalid_response' | 'pagination_limit_exceeded';
      graphStatus?: number;
      graphCode?: number | string;
      graphSubcode?: number;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getAppId(subscription: unknown): string {
  if (!isRecord(subscription)) return '';
  if (typeof subscription.id === 'string') return subscription.id;
  if (typeof subscription.app_id === 'string') return subscription.app_id;
  const apiData = subscription.whatsapp_business_api_data;
  return isRecord(apiData) && typeof apiData.id === 'string' ? apiData.id : '';
}

export async function verifyWhatsAppWebhookSubscription({
  appId,
  appSecret,
  accessToken,
  wabaId,
  graphVersion,
  signal,
}: VerifyWhatsAppWebhookSubscriptionOptions): Promise<VerifyWhatsAppWebhookSubscriptionResult> {
  const normalizedAppId = appId.trim();
  const normalizedSecret = appSecret.trim();
  const normalizedToken = accessToken.trim();
  const normalizedWabaId = wabaId.trim();
  if (!/^\d{1,32}$/.test(normalizedAppId) || !/^\d{1,32}$/.test(normalizedWabaId)
    || !normalizedSecret || !normalizedToken || !/^v\d+\.\d+$/.test(graphVersion)) {
    return { valid: false, reason: 'invalid_input' };
  }

  const appSecretProof = createHmac('sha256', normalizedSecret).update(normalizedToken).digest('hex');
  let after: string | undefined;

  for (let page = 0; page < 10; page++) {
    const url = new URL(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(normalizedWabaId)}/subscribed_apps`);
    url.searchParams.set('limit', '100');
    url.searchParams.set('appsecret_proof', appSecretProof);
    if (after) url.searchParams.set('after', after);

    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${normalizedToken}` },
      signal,
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const graphError = isRecord(body) && isRecord(body.error) ? body.error : {};
      return {
        valid: false,
        reason: 'graph_http_error',
        graphStatus: response.status,
        ...(typeof graphError.code === 'number' || typeof graphError.code === 'string' ? { graphCode: graphError.code } : {}),
        ...(typeof graphError.error_subcode === 'number' ? { graphSubcode: graphError.error_subcode } : {}),
      };
    }
    if (!isRecord(body) || !Array.isArray(body.data)) {
      return { valid: false, reason: 'invalid_response', graphStatus: response.status };
    }

    if (body.data.some(subscription => getAppId(subscription) === normalizedAppId)) {
      return { valid: true, subscribed: true };
    }

    const paging = isRecord(body.paging) ? body.paging : {};
    if (typeof paging.next !== 'string' || !paging.next) {
      return { valid: true, subscribed: false };
    }
    const cursors = isRecord(paging.cursors) ? paging.cursors : {};
    const nextAfter = typeof cursors.after === 'string' ? cursors.after : '';
    if (!nextAfter || nextAfter.length > 2048 || nextAfter === after) {
      return { valid: false, reason: 'invalid_response', graphStatus: response.status };
    }
    after = nextAfter;
  }

  return { valid: false, reason: 'pagination_limit_exceeded' };
}
