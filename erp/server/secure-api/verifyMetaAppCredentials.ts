import { createHmac } from 'node:crypto';

export interface VerifyMetaAppCredentialsOptions {
  appId: string;
  appSecret: string;
  accessToken: string;
  graphVersion: string;
  signal: AbortSignal;
}

type GraphErrorKind = 'invalid_appsecret_proof' | 'appsecret_proof_required' | 'invalid_access_token' | 'invalid_parameter' | 'unknown';

export type VerifyMetaAppCredentialsResult =
  | { valid: true }
  | {
      valid: false;
      reason: 'invalid_input' | 'app_credentials_rejected' | 'graph_http_error' | 'invalid_response' | 'token_invalid' | 'app_id_mismatch';
      graphStatus?: number;
      graphCode?: number | string;
      graphSubcode?: number;
      graphErrorKind?: GraphErrorKind;
    };

function getGraphErrorDetails(body: unknown): {
  graphCode?: number | string;
  graphSubcode?: number;
  graphErrorKind: GraphErrorKind;
} {
  const graphError = body && typeof body === 'object' && !Array.isArray(body)
    ? (body as { error?: unknown }).error : undefined;
  const graphCode = graphError && typeof graphError === 'object' && !Array.isArray(graphError)
    ? (graphError as { code?: unknown }).code : undefined;
  const graphSubcode = graphError && typeof graphError === 'object' && !Array.isArray(graphError)
    ? (graphError as { error_subcode?: unknown }).error_subcode : undefined;
  const graphMessage = graphError && typeof graphError === 'object' && !Array.isArray(graphError)
    && typeof (graphError as { message?: unknown }).message === 'string'
    ? (graphError as { message: string }).message.toLowerCase() : '';
  const safeGraphCode = typeof graphCode === 'number' || typeof graphCode === 'string' ? graphCode : undefined;
  const safeGraphSubcode = typeof graphSubcode === 'number' ? graphSubcode : undefined;
  const safeGraphErrorKind: GraphErrorKind = /appsecret[ _-]?proof/.test(graphMessage)
    ? /invalid|incorrect/.test(graphMessage) ? 'invalid_appsecret_proof'
      : /required|missing/.test(graphMessage) ? 'appsecret_proof_required' : 'unknown'
    : /invalid oauth|cannot parse access token|invalid access token/.test(graphMessage) || safeGraphCode === 190
      ? 'invalid_access_token'
      : /invalid parameter/.test(graphMessage) || safeGraphCode === 100 ? 'invalid_parameter' : 'unknown';
  return {
    ...(safeGraphCode !== undefined ? { graphCode: safeGraphCode } : {}),
    ...(safeGraphSubcode !== undefined ? { graphSubcode: safeGraphSubcode } : {}),
    graphErrorKind: safeGraphErrorKind,
  };
}

/**
 * Confirms that the configured App ID and Secret can inspect the production
 * WhatsApp token. The App Secret stays server-side and is sent only as a proof.
 */
export async function verifyMetaAppCredentials({
  appId,
  appSecret,
  accessToken,
  graphVersion,
  signal,
}: VerifyMetaAppCredentialsOptions): Promise<VerifyMetaAppCredentialsResult> {
  const normalizedAppId = appId.trim();
  const normalizedSecret = appSecret.trim();
  const normalizedAccessToken = accessToken.trim();
  if (!/^\d{1,32}$/.test(normalizedAppId) || !normalizedSecret || !normalizedAccessToken) {
    return { valid: false, reason: 'invalid_input' };
  }

  const appAccessToken = `${normalizedAppId}|${normalizedSecret}`;
  const appSecretProof = createHmac('sha256', normalizedSecret).update(appAccessToken).digest('hex');
  const appUrl = new URL(`https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(normalizedAppId)}`);
  appUrl.searchParams.set('fields', 'id');
  appUrl.searchParams.set('appsecret_proof', appSecretProof);
  const appResponse = await fetch(appUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${appAccessToken}` },
    signal,
  });
  const appBody: unknown = await appResponse.json().catch(() => null);
  if (!appResponse.ok) {
    return {
      valid: false,
      reason: 'app_credentials_rejected',
      graphStatus: appResponse.status,
      ...getGraphErrorDetails(appBody),
    };
  }
  if (!appBody || typeof appBody !== 'object' || Array.isArray(appBody)) {
    return { valid: false, reason: 'invalid_response', graphStatus: appResponse.status };
  }
  const verifiedAppId = (appBody as { id?: unknown }).id;
  if (String(verifiedAppId ?? '') !== normalizedAppId) {
    return { valid: false, reason: 'app_id_mismatch', graphStatus: appResponse.status };
  }

  const url = new URL(`https://graph.facebook.com/${encodeURIComponent(graphVersion)}/debug_token`);
  url.searchParams.set('input_token', normalizedAccessToken);
  url.searchParams.set('appsecret_proof', appSecretProof);
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${appAccessToken}` },
    signal,
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    return { valid: false, reason: 'graph_http_error', graphStatus: response.status, ...getGraphErrorDetails(body) };
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, reason: 'invalid_response', graphStatus: response.status };
  }
  const data = (body as { data?: unknown }).data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, reason: 'invalid_response', graphStatus: response.status, ...getGraphErrorDetails(body) };
  }
  const token = data as { app_id?: unknown; is_valid?: unknown };
  if (token.is_valid !== true) return { valid: false, reason: 'token_invalid', graphStatus: response.status };
  if (String(token.app_id ?? '') !== normalizedAppId) {
    return { valid: false, reason: 'app_id_mismatch', graphStatus: response.status };
  }
  return { valid: true };
}
