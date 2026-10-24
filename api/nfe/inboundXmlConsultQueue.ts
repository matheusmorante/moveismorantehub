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
}

export function selectPendingInboundXmlConsults(
  summaries: InboundSummaryCandidate[],
  manifestationEvents: InboundManifestationAttempt[],
  consultedKeys: InboundXmlConsultAttempt[],
): InboundSummaryCandidate[] {
  const registeredEvents = new Set(
    manifestationEvents
      .filter((event) => event.status === 'registered')
      .map((event) => `${event.access_key}:${Number(event.environment)}`),
  );
  const consulted = new Set(
    consultedKeys.map((attempt) => `${attempt.access_key}:${Number(attempt.environment)}`),
  );

  return summaries.filter((invoice) => {
    const key = `${invoice.chave_acesso}:${Number(invoice.ambiente)}`;
    return registeredEvents.has(key) && !consulted.has(key);
  });
}
