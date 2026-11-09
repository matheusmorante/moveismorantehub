import type { ExtractedMessageContent } from './types.js';

export function enrichWithMetaContext(
  extracted: ExtractedMessageContent,
  msg: any
): ExtractedMessageContent {
  const forwarded = msg?.context?.forwarded === true;
  const frequentlyForwarded = msg?.context?.frequently_forwarded === true;
  const referredProduct = msg?.context?.referred_product;
  const referral =
    msg?.referral && typeof msg.referral === 'object' && !Array.isArray(msg.referral)
      ? msg.referral
      : null;
  const identity =
    msg?.identity && typeof msg.identity === 'object' && !Array.isArray(msg.identity)
      ? msg.identity
      : null;

  if (!forwarded && !frequentlyForwarded && !referredProduct && !referral && !identity) {
    return extracted;
  }

  const safeIdentity = identity
    ? {
        ...(typeof identity.acknowledged === 'boolean' ? { acknowledged: identity.acknowledged } : {}),
        ...(typeof identity.created_timestamp === 'string' ||
        (typeof identity.created_timestamp === 'number' && Number.isFinite(identity.created_timestamp))
          ? { created_timestamp: identity.created_timestamp }
          : {}),
      }
    : null;

  return {
    ...extracted,
    rawPayload: {
      ...(extracted.rawPayload || {}),
      provider_message_type: extracted.rawPayload?.provider_message_type || msg?.type || 'unknown',
      ...(forwarded ? { forwarded: true } : {}),
      ...(frequentlyForwarded ? { frequently_forwarded: true } : {}),
      ...(referredProduct ? { referred_product: referredProduct } : {}),
      ...(referral ? { referral } : {}),
      ...(safeIdentity ? { identity: safeIdentity } : {}),
    },
  };
}
