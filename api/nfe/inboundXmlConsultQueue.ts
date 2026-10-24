export interface InboundSummaryCandidate {
  chave_acesso: string;
  ambiente: number;
}

export interface InboundManifestationAttempt {
  access_key: string;
  environment: number;
  status: string;
}

export interface InboundXmlConsultAttempt {
  access_key: string;
  environment: number;
  consulted_at: string;
}

export const INBOUND_XML_CONSULT_RETRY_INTERVAL_MS = 15 * 60 * 1000;

function queryKey(accessKey: string, environment: number) {
  return `${accessKey}:${Number(environment)}`;
}

function registeredManifestationKeys(events: InboundManifestationAttempt[]) {
  return new Set(
    events
      .filter((event) => event.status === 'registered')
      .map((event) => queryKey(event.access_key, event.environment)),
  );
}

function attemptTime(attempt: InboundXmlConsultAttempt, now: number) {
  const consultedAt = Date.parse(attempt.consulted_at);
  return Number.isFinite(consultedAt) ? consultedAt : now;
}

export function getNextInboundXmlConsultRetryAt(
  summaries: InboundSummaryCandidate[],
  manifestationEvents: InboundManifestationAttempt[],
  consultedKeys: InboundXmlConsultAttempt[],
  now = Date.now(),
): string | null {
  const registered = registeredManifestationKeys(manifestationEvents);
  const attempts = new Map<string, InboundXmlConsultAttempt>(
    consultedKeys.map((attempt): [string, InboundXmlConsultAttempt] => [
      queryKey(attempt.access_key, attempt.environment), attempt,
    ]),
  );
  const retryAt = summaries
    .filter((invoice) => registered.has(queryKey(invoice.chave_acesso, invoice.ambiente)))
    .map((invoice) => attempts.get(queryKey(invoice.chave_acesso, invoice.ambiente)))
    .filter((attempt): attempt is InboundXmlConsultAttempt => Boolean(attempt))
    .map((attempt) => attemptTime(attempt, now) + INBOUND_XML_CONSULT_RETRY_INTERVAL_MS)
    .sort((a, b) => a - b)[0];

  return retryAt === undefined ? null : new Date(Math.max(now, retryAt)).toISOString();
}

export function selectPendingInboundXmlConsults(
  summaries: InboundSummaryCandidate[],
  manifestationEvents: InboundManifestationAttempt[],
  consultedKeys: InboundXmlConsultAttempt[],
  now = Date.now(),
): InboundSummaryCandidate[] {
  const registered = registeredManifestationKeys(manifestationEvents);
  const attempts = new Map<string, InboundXmlConsultAttempt>(
    consultedKeys.map((attempt): [string, InboundXmlConsultAttempt] => [
      queryKey(attempt.access_key, attempt.environment), attempt,
    ]),
  );

  return summaries
    .filter((invoice) => {
      const key = queryKey(invoice.chave_acesso, invoice.ambiente);
      if (!registered.has(key)) return false;
      const attempt = attempts.get(key);
      return !attempt || now >= attemptTime(attempt, now) + INBOUND_XML_CONSULT_RETRY_INTERVAL_MS;
    })
    .sort((a, b) => {
      const aAttempt = attempts.get(queryKey(a.chave_acesso, a.ambiente));
      const bAttempt = attempts.get(queryKey(b.chave_acesso, b.ambiente));
      if (!aAttempt) return bAttempt ? -1 : 0;
      if (!bAttempt) return 1;
      return attemptTime(aAttempt, now) - attemptTime(bAttempt, now);
    });
}
