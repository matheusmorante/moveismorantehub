export interface SefazTransportContext {
  endpoint?: string;
  phase?: 'dns' | 'connect' | 'tls' | 'request' | 'response';
  tlsProtocol?: string;
  model?: '55' | '65';
  environment?: 1 | 2;
  peerCertificate?: {
    subjectCN?: string | string[];
    issuerCN?: string | string[];
    validFrom?: string;
    validTo?: string;
    fingerprint256?: string;
  };
  durationMs?: number;
  timeoutMs?: number;
}

/** Whitelisted diagnostics only: never serialize Axios request/config, certificates or SOAP. */
export function sefazTransportDiagnostic(error: unknown) {
  const item = error && typeof error === 'object' ? (error as Record<string, any>) : {};
  const allowed = [
    'EPROTO',
    'ECONNRESET',
    'ECONNABORTED',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ERR_BAD_RESPONSE',
    'ERR_BAD_REQUEST',
    'ERR_CANCELED',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
    'CERT_HAS_EXPIRED',
    'DEPTH_ZERO_SELF_SIGNED_CERT',
    'SELF_SIGNED_CERT_IN_CHAIN',
    'ERR_TLS_CERT_ALTNAME_INVALID',
    'A1_KEY_MISMATCH',
    'A1_CERTIFICATE_EXPIRED',
    'SEFAZ_SOAP_FAULT',
    'SEFAZ_ENDPOINT_INVALID',
  ];
  const safeCode = (value: unknown) =>
    typeof value === 'string' &&
    (allowed.includes(value) ||
      /^(?:ERR_(?:SSL|TLS|OSSL)_[A-Z0-9_]{1,64}|UND_ERR_[A-Z0-9_]{1,64})$/.test(value))
      ? value
      : 'UNKNOWN_TRANSPORT_ERROR';
  const code =
    typeof item.response?.data === 'string' && /<(?:[\w-]+:)?Fault\b/i.test(item.response.data)
      ? 'SEFAZ_SOAP_FAULT'
      : safeCode(item.code);
  const status = item.response?.status;
  const message = typeof item.message === 'string' ? item.message.toLowerCase() : '';
  const tlsReason = message.includes('alert unknown ca')
    ? 'PEER_UNKNOWN_CA'
    : message.includes('alert certificate expired')
      ? 'PEER_CERTIFICATE_EXPIRED'
      : message.includes('alert bad certificate')
        ? 'PEER_BAD_CERTIFICATE'
        : message.includes('alert handshake failure')
          ? 'PEER_HANDSHAKE_FAILURE'
          : undefined;
  const category =
    code === 'SEFAZ_SOAP_FAULT'
      ? 'SOAP_FAULT'
      : ['A1_KEY_MISMATCH', 'A1_CERTIFICATE_EXPIRED'].includes(code) ||
          tlsReason === 'PEER_BAD_CERTIFICATE'
        ? 'MTLS_CLIENT_CERTIFICATE'
        : [
              'ETIMEDOUT',
              'ECONNABORTED',
              'UND_ERR_CONNECT_TIMEOUT',
              'UND_ERR_HEADERS_TIMEOUT',
              'UND_ERR_BODY_TIMEOUT',
            ].includes(code)
          ? 'TIMEOUT'
          : code === 'ECONNRESET'
            ? 'SOCKET_RESET'
            : ['ENOTFOUND', 'EAI_AGAIN'].includes(code)
              ? 'DNS_FAILURE'
              : ['ECONNREFUSED'].includes(code)
                ? 'TCP_FAILURE'
                : code === 'EPROTO' ||
                    /^(?:ERR_(?:SSL|TLS|OSSL)_|CERT_|UNABLE_|DEPTH_|SELF_SIGNED)/.test(code)
                  ? 'TLS_FAILURE'
                  : Number.isInteger(status)
                    ? 'HTTP_ERROR'
                    : 'TRANSPORT_UNKNOWN';
  const name = ['Error', 'AxiosError', 'TypeError', 'SystemError'].includes(item.name)
    ? item.name
    : 'Error';
  const context = item.sefazTransportContext || {};
  let endpoint: string | undefined;
  let hostname: string | undefined;
  try {
    const url = new URL(context.endpoint);
    if (
      url.protocol === 'https:' &&
      [
        'nfe.sefa.pr.gov.br',
        'nfce.sefa.pr.gov.br',
        'homologacao.nfe.sefa.pr.gov.br',
        'homologacao.nfce.sefa.pr.gov.br',
      ].includes(url.hostname) &&
      /^\/(?:nfe|nfce)\/[A-Za-z0-9]+$/.test(url.pathname)
    ) {
      endpoint = `${url.origin}${url.pathname}`;
      hostname = url.hostname;
    }
  } catch {
    /* Arbitrary URLs and secret-bearing query strings are never logged. */
  }
  const errno =
    typeof item.errno === 'number' && Number.isInteger(item.errno)
      ? item.errno
      : allowed.includes(item.errno)
        ? item.errno
        : undefined;
  const syscall = ['getaddrinfo', 'connect', 'read', 'write', 'send', 'recv'].includes(item.syscall)
    ? item.syscall
    : undefined;
  const causes: Array<{ code: string; errno?: number; syscall?: string }> = [];
  let cause = item.cause;
  for (let depth = 0; cause && typeof cause === 'object' && depth < 2; depth++) {
    causes.push({
      code: safeCode(cause.code),
      ...(Number.isInteger(cause.errno) ? { errno: cause.errno } : {}),
      ...(['getaddrinfo', 'connect', 'read', 'write'].includes(cause.syscall)
        ? { syscall: cause.syscall }
        : {}),
    });
    cause = cause.cause;
  }
  const peer = context.peerCertificate || {};
  const safeCN = (value: unknown) =>
    typeof value === 'string' && /^[\w .,*()/:-]{1,160}$/.test(value) ? value : undefined;
  const safeDate = (value: unknown) =>
    typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value))
      ? value
      : undefined;
  const peerCertificate = {
    subjectCN: safeCN(peer.subjectCN),
    issuerCN: safeCN(peer.issuerCN),
    validFrom: safeDate(peer.validFrom),
    validTo: safeDate(peer.validTo),
    fingerprint256:
      typeof peer.fingerprint256 === 'string' &&
      /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/i.test(peer.fingerprint256)
        ? peer.fingerprint256
        : undefined,
  };
  return {
    name,
    code,
    category,
    message: `${category}: ${tlsReason || code}`,
    ...(Number.isInteger(status) && status >= 100 && status <= 599 ? { httpStatus: status } : {}),
    ...(tlsReason ? { tlsReason } : {}),
    ...(errno !== undefined ? { errno } : {}),
    ...(syscall ? { syscall } : {}),
    ...(endpoint ? { endpoint, hostname } : {}),
    ...(['dns', 'connect', 'tls', 'request', 'response'].includes(context.phase)
      ? { phase: context.phase as SefazTransportContext['phase'] }
      : {}),
    ...(context.tlsProtocol === 'TLSv1.2' || context.tlsProtocol === 'TLSv1.3'
      ? { tlsProtocol: context.tlsProtocol as string }
      : {}),
    ...(['55', '65'].includes(context.model) ? { model: context.model as '55' | '65' } : {}),
    ...([1, 2].includes(context.environment) ? { environment: context.environment as 1 | 2 } : {}),
    ...(Object.values(peerCertificate).some((value) => value !== undefined)
      ? { peerCertificate }
      : {}),
    ...(Number.isFinite(context.durationMs) && context.durationMs >= 0
      ? { durationMs: Math.min(Math.round(context.durationMs), 600_000) }
      : {}),
    ...(Number.isFinite(context.timeoutMs) && context.timeoutMs > 0
      ? { timeoutMs: Math.min(Math.round(context.timeoutMs), 600_000) }
      : {}),
    ...(causes.length ? { cause: causes } : {}),
  };
}
