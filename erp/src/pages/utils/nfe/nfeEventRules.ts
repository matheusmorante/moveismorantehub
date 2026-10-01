export type SefazEventResult = {
  cStat: string | null;
  xMotivo: string | null;
  protocolNumber: string | null;
  protocolDate: string | null;
  registered: boolean;
  pending: boolean;
};

export type SefazNfeSituation = {
  cStat: string | null;
  xMotivo: string | null;
  state: 'authorized' | 'cancelled' | 'not_found' | 'unknown';
  cancellationEventXml: string | null;
};

const readTag = (xml: string, tag: string): string | null => {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match?.[1]?.replace(/<[^>]+>/g, '').trim() || null;
};

export const getAuthorizedAt = (protocolXml: string | undefined, fallbackDate: string) =>
  readTag(protocolXml || '', 'dhRecbto') || fallbackDate;

export const getCancellationWindow = (model: string, authorizedAt: string, now = Date.now()) => {
  const authorizedTimestamp = new Date(authorizedAt).getTime();
  const limitMs = model === '65' ? 30 * 60 * 1000 : model === '55' ? 168 * 60 * 60 * 1000 : 0;
  const deadline = authorizedTimestamp + limitMs;
  const valid = limitMs > 0 && Number.isFinite(authorizedTimestamp) && authorizedTimestamp <= now;
  return {
    valid,
    deadline: valid ? new Date(deadline) : null,
    remainingMs: valid ? Math.max(deadline - now, 0) : 0,
    // The legal wording is “não superior a X horas”: the exact endpoint is
    // still within the limit; expiry starts on the following instant.
    expired: !valid || now > deadline,
  };
};

export const formatCancellationTimeRemaining = (remainingMs: number) => {
  const totalMinutes = Math.ceil(Math.max(remainingMs, 0) / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  return [
    days ? `${days} dia${days === 1 ? '' : 's'}` : '',
    hours ? `${hours} hora${hours === 1 ? '' : 's'}` : '',
    `${minutes} min`,
  ]
    .filter(Boolean)
    .join(' e ');
};

export const validateCancellationReason = (reason: string): string | null => {
  const length = Array.from(reason.trim()).length;
  if (length < 15 || length > 255) return 'A justificativa deve ter entre 15 e 255 caracteres.';
  return null;
};

export const parseSefazCancellationEvent = (xml: string): SefazEventResult => {
  const eventResponse = xml.match(/<retEvento\b[^>]*>[\s\S]*?<\/retEvento>/i)?.[0];
  if (!eventResponse) {
    const lotStatus = readTag(xml, 'cStat');
    return {
      cStat: lotStatus,
      xMotivo: readTag(xml, 'xMotivo') || 'Retorno da SEFAZ sem resultado final do evento.',
      protocolNumber: null,
      protocolDate: null,
      registered: false,
      pending: lotStatus === '128',
    };
  }
  const cStat = readTag(eventResponse, 'cStat');
  return {
    cStat,
    xMotivo: readTag(eventResponse, 'xMotivo'),
    protocolNumber: readTag(eventResponse, 'nProt'),
    protocolDate: readTag(eventResponse, 'dhRegEvento'),
    registered: cStat === '135' || cStat === '155',
    pending: false,
  };
};

/** CC-e only succeeds when the SEFAZ links the registered event to this NF-e. */
export const parseSefazCceEvent = (xml: string): SefazEventResult => {
  const eventResponse = xml.match(/<retEvento\b[^>]*>[\s\S]*?<\/retEvento>/i)?.[0];
  if (!eventResponse) {
    const lotStatus = readTag(xml, 'cStat');
    return {
      cStat: lotStatus,
      xMotivo: readTag(xml, 'xMotivo') || 'Retorno da SEFAZ sem resultado final da CC-e.',
      protocolNumber: null,
      protocolDate: null,
      registered: false,
      pending: lotStatus === '128' || !lotStatus,
    };
  }
  const cStat = readTag(eventResponse, 'cStat');
  return {
    cStat,
    xMotivo: readTag(eventResponse, 'xMotivo'),
    protocolNumber: readTag(eventResponse, 'nProt'),
    protocolDate: readTag(eventResponse, 'dhRegEvento'),
    registered: cStat === '135',
    // 136 is registered without a document link; 573 may mean the prior request landed.
    pending: cStat === '128' || cStat === '136' || cStat === '573',
  };
};

/** Finds a previously registered CC-e in the SEFAZ protocol consultation response. */
export const findRegisteredSefazCceEvent = (
  xml: string,
  sequence: number
): SefazEventResult | null => {
  const eventBlocks = [...xml.matchAll(/<procEventoNFe\b[^>]*>[\s\S]*?<\/procEventoNFe>/gi)].map(
    (match) => match[0]
  );
  const event = eventBlocks.find(
    (block) => readTag(block, 'tpEvento') === '110110' && Number(readTag(block, 'nSeqEvento')) === sequence
  );
  if (!event) return null;
  const cStat = readTag(event, 'cStat');
  return {
    cStat,
    xMotivo: readTag(event, 'xMotivo'),
    protocolNumber: readTag(event, 'nProt'),
    protocolDate: readTag(event, 'dhRegEvento'),
    registered: cStat === '135',
    pending: cStat !== '135',
  };
};

export const parseSefazNfeSituation = (xml: string): SefazNfeSituation => {
  const eventBlocks = [...xml.matchAll(/<procEventoNFe\b[^>]*>[\s\S]*?<\/procEventoNFe>/gi)].map(
    (match) => match[0]
  );
  const cancellationEventXml =
    eventBlocks.find(
      (event) =>
        readTag(event, 'tpEvento') === '110111' &&
        ['135', '155'].includes(readTag(event, 'cStat') || '')
    ) || null;
  if (cancellationEventXml) {
    return {
      cStat: readTag(cancellationEventXml, 'cStat'),
      xMotivo: readTag(cancellationEventXml, 'xMotivo'),
      state: 'cancelled',
      cancellationEventXml,
    };
  }
  const protocol = xml.match(/<infProt\b[^>]*>[\s\S]*?<\/infProt>/i)?.[0] || xml;
  const cStat = readTag(protocol, 'cStat');
  return {
    cStat,
    xMotivo: readTag(protocol, 'xMotivo'),
    state:
      cStat === '100'
        ? 'authorized'
        : cStat === '101'
          ? 'cancelled'
          : cStat === '217'
            ? 'not_found'
            : 'unknown',
    cancellationEventXml,
  };
};

export type OperationDraftRecoveryDecision =
  | 'authorized'
  | 'confirmed_not_found'
  | 'still_uncertain';

/** Only cStat 217 is a definitive no-key result; transport errors and other cStat values stay pending. */
export function decideOperationDraftRecovery(
  cStat: string | null,
  state: SefazNfeSituation['state']
): OperationDraftRecoveryDecision {
  if (state === 'authorized') return 'authorized';
  if (cStat === '217' && state === 'not_found') return 'confirmed_not_found';
  return 'still_uncertain';
}

export type CancellationRecoveryDecision =
  | 'send'
  | 'already_cancelled'
  | 'retry_after_authorized_consult'
  | 'manual_reconciliation'
  | 'still_uncertain';

export function decideCancellationRecovery(
  previousEventStatus: 'transmitting' | 'registered' | 'rejected' | 'unknown' | null,
  situation: SefazNfeSituation['state']
): CancellationRecoveryDecision {
  if (situation === 'cancelled') return 'already_cancelled';
  if (situation !== 'authorized') return 'still_uncertain';
  if (previousEventStatus === 'registered') return 'manual_reconciliation';
  return previousEventStatus ? 'retry_after_authorized_consult' : 'send';
}
