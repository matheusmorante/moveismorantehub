/** Whitelisted diagnostics only: never serialize Axios request/config, certificates or SOAP. */
export function sefazTransportDiagnostic(error: unknown) {
  const item = error && typeof error === 'object' ? error as Record<string, any> : {};
  const allowed = ['EPROTO', 'ECONNRESET', 'ECONNABORTED', 'ECONNREFUSED', 'ETIMEDOUT',
    'ENOTFOUND', 'EAI_AGAIN', 'ERR_BAD_RESPONSE', 'ERR_BAD_REQUEST',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'CERT_HAS_EXPIRED',
    'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'ERR_TLS_CERT_ALTNAME_INVALID'];
  const code = allowed.includes(item.code) ? item.code : 'UNKNOWN_TRANSPORT_ERROR';
  const status = item.response?.status;
  const message = typeof item.message === 'string' ? item.message.toLowerCase() : '';
  const tlsReason = message.includes('alert unknown ca') ? 'PEER_UNKNOWN_CA'
    : message.includes('alert certificate expired') ? 'PEER_CERTIFICATE_EXPIRED'
    : message.includes('alert bad certificate') ? 'PEER_BAD_CERTIFICATE'
    : message.includes('alert handshake failure') ? 'PEER_HANDSHAKE_FAILURE'
    : undefined;
  return { code, ...(Number.isInteger(status) && status >= 100 && status <= 599 ? { httpStatus: status } : {}),
    ...(tlsReason ? { tlsReason } : {}) };
}
