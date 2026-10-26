import { createHmac } from 'node:crypto';

export interface EnsureWhatsAppEchoWebhookSubscriptionOptions {
  appId: string;
  appSecret: string;
  verifyToken: string;
  graphVersion: string;
  signal: AbortSignal;
}

export type EnsureWhatsAppEchoWebhookSubscriptionResult =
  | { valid: true; changed: boolean; fields: string[] }
  | {
      valid: false;
      reason:
        | 'invalid_input'
        | 'subscription_not_found'
        | 'messages_not_subscribed'
        | 'subscription_inactive'
        | 'callback_not_allowed'
        | 'verify_token_missing'
        | 'graph_http_error'
        | 'invalid_response'
        | 'verification_failed';
      graphStatus?: number;
      graphCode?: number | string;
    };

type AppSubscription = {
  object?: unknown;
  callback_url?: unknown;
  active?: unknown;
  fields?: unknown;
  include_values?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function fieldNames(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const names = value.map((field) => {
    if (typeof field === 'string') return field;
    return isRecord(field) && typeof field.name === 'string' ? field.name : '';
  });
  if (names.some((name) => !name)) return null;
  return [...new Set(names)];
}

function callbackIsProduction(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const callback = new URL(value);
    return callback.protocol === 'https:'
      && ['morantehub.com', 'morantehub.vercel.app'].includes(callback.hostname)
      && callback.pathname === '/api/whatsapp-webhook'
      && !callback.username && !callback.password && !callback.search && !callback.hash;
  } catch {
    return false;
  }
}

function graphErrorDetails(body: unknown): { graphCode?: number | string } {
  const error = isRecord(body) && isRecord(body.error) ? body.error : {};
  return typeof error.code === 'number' || typeof error.code === 'string'
    ? { graphCode: error.code }
    : {};
}

function parseSubscriptionList(body: unknown): AppSubscription[] | null {
  if (!isRecord(body) || !Array.isArray(body.data)) return null;
  return body.data.filter(isRecord) as AppSubscription[];
}

export async function ensureWhatsAppEchoWebhookSubscription({
  appId,
  appSecret,
  verifyToken,
  graphVersion,
  signal,
}: EnsureWhatsAppEchoWebhookSubscriptionOptions): Promise<EnsureWhatsAppEchoWebhookSubscriptionResult> {
  const normalizedAppId = appId.trim();
  const normalizedSecret = appSecret.trim();
  const normalizedVerifyToken = verifyToken.trim();
  if (!/^\d{1,32}$/.test(normalizedAppId) || !normalizedSecret || !/^v\d+\.\d+$/.test(graphVersion)) {
    return { valid: false, reason: 'invalid_input' };
  }
  if (!normalizedVerifyToken) return { valid: false, reason: 'verify_token_missing' };

  const appAccessToken = `${normalizedAppId}|${normalizedSecret}`;
  const appSecretProof = createHmac('sha256', normalizedSecret).update(appAccessToken).digest('hex');
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${normalizedAppId}/subscriptions`);
  url.searchParams.set('appsecret_proof', appSecretProof);

  const getSubscriptions = async (): Promise<
    | { ok: true; response: Response; subscription: AppSubscription; fields: string[] }
    | { ok: false; result: EnsureWhatsAppEchoWebhookSubscriptionResult }
  > => {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${appAccessToken}` },
      signal,
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      return { ok: false, result: { valid: false, reason: 'graph_http_error', graphStatus: response.status, ...graphErrorDetails(body) } };
    }
    const subscriptions = parseSubscriptionList(body);
    if (!subscriptions) {
      return { ok: false, result: { valid: false, reason: 'invalid_response', graphStatus: response.status } };
    }
    const matches = subscriptions.filter((subscription) => subscription.object === 'whatsapp_business_account');
    if (matches.length !== 1) {
      return { ok: false, result: { valid: false, reason: matches.length ? 'invalid_response' : 'subscription_not_found' } };
    }
    const subscription = matches[0];
    const fields = fieldNames(subscription.fields);
    if (!fields) {
      return { ok: false, result: { valid: false, reason: 'invalid_response', graphStatus: response.status } };
    }
    return { ok: true, response, subscription, fields };
  };

  const currentResult = await getSubscriptions();
  if (!currentResult.ok) return currentResult.result;
  const { subscription: current, fields: currentFields } = currentResult;
  if (current.active !== true) return { valid: false, reason: 'subscription_inactive' };
  if (!currentFields.includes('messages')) return { valid: false, reason: 'messages_not_subscribed' };
  if (!callbackIsProduction(current.callback_url)) return { valid: false, reason: 'callback_not_allowed' };
  if (currentFields.includes('smb_message_echoes')) {
    return { valid: true, changed: false, fields: currentFields };
  }

  const form = new URLSearchParams({
    object: 'whatsapp_business_account',
    callback_url: current.callback_url,
    verify_token: normalizedVerifyToken,
    fields: [...currentFields, 'smb_message_echoes'].join(','),
  });
  if (typeof current.include_values === 'boolean') {
    form.set('include_values', String(current.include_values));
  }
  const updateResponse = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${appAccessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
    signal,
  });
  const updateBody: unknown = await updateResponse.json().catch(() => null);
  if (!updateResponse.ok) {
    return { valid: false, reason: 'graph_http_error', graphStatus: updateResponse.status, ...graphErrorDetails(updateBody) };
  }

  const verifiedResult = await getSubscriptions();
  if (!verifiedResult.ok) return verifiedResult.result;
  const { subscription: verified, fields: verifiedFields } = verifiedResult;
  const preservedFields = currentFields.every((field) => verifiedFields.includes(field));
  if (verified.active !== true || verified.callback_url !== current.callback_url
    || !preservedFields || !verifiedFields.includes('messages') || !verifiedFields.includes('smb_message_echoes')) {
    return { valid: false, reason: 'verification_failed' };
  }
  return { valid: true, changed: true, fields: verifiedFields };
}
