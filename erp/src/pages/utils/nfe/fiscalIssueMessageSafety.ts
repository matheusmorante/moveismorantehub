import {
  HML_INTERSTATE_MATRIX_NOT_APPROVED,
  INTERSTATE_CSOSN_NOT_RESOLVED,
  INTERSTATE_EXEMPT_IE_NOT_ALLOWED,
  INTERSTATE_RULE_INVALID_COMBINATION,
  INTERSTATE_ST_RULE_NOT_CONFIGURED,
  INTERSTATE_TAX_PROFILE_INCOMPLETE,
  PREPARATION_ERROR_COPY,
} from './fiscalIssueMessageCatalog';

const INTERNAL_IDENTIFIER =
  /\b(?:HML|NFE|SEFAZ|DATABASE)_[A-Z0-9_]+\b|\bHTTP\s*[45]\d\d\b|\b(?:SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_VERIFY_LEAF_SIGNATURE|ERR_TLS_[A-Z0-9_]+)\b|\b(?:diagnosticId|diagnosticStage|emissionRequestId|SOAP|TLS|snapshot|idempot[eê]ncia)\b/i;
const SENSITIVE_VALUE =
  /\bBearer\s+[A-Za-z0-9._~+/=-]+|\b(?:token|senha|password|secret|api[_ -]?key)\s*[:=]\s*\S+/i;

export function isHmlInterstateMatrixBlock(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return (
    value.startsWith(`${HML_INTERSTATE_MATRIX_NOT_APPROVED}:`) ||
    value.startsWith(`${INTERSTATE_RULE_INVALID_COMBINATION}:`) ||
    value.startsWith(`${INTERSTATE_EXEMPT_IE_NOT_ALLOWED}:`) ||
    value.startsWith(`${INTERSTATE_ST_RULE_NOT_CONFIGURED}:`) ||
    value.startsWith(`${INTERSTATE_CSOSN_NOT_RESOLVED}:`) ||
    value.startsWith(`${INTERSTATE_TAX_PROFILE_INCOMPLETE}:`)
  );
}

export function containsTechnicalFiscalIdentifier(value: string): boolean {
  return INTERNAL_IDENTIFIER.test(value);
}

export function safeFiscalIssueMessage(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const message = value.trim();
  const code = message.match(/^([A-Z][A-Z0-9_]+):/)?.[1];
  if (code && PREPARATION_ERROR_COPY[code]) return PREPARATION_ERROR_COPY[code];
  if (!message || containsTechnicalFiscalIdentifier(message) || SENSITIVE_VALUE.test(message))
    return fallback;
  return message;
}
