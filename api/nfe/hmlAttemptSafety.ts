import { normalizeRecipientTaxId } from '../../shared-utils/recipientTaxId';

type UnknownRecord = Record<string, unknown>;

export type FiscalSelectionMismatchDetail = {
  field: string;
  snapshotValue?: string;
  currentValue?: string;
};

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {};
const normalized = (value: unknown) => (value == null ? '' : String(value));

const itemFieldLabels: Record<string, string> = {
  ncm: 'NCM',
  cfop: 'CFOP',
  origem: 'origem',
  cest: 'CEST',
  csosn: 'CSOSN',
};

/** Exposes changed fiscal classifications, but never recipient tax identifiers. */
export function getFiscalSelectionMismatchDetails(
  snapshot: unknown,
  command: {
    itemCsosnOverrides?: Record<string, string>;
    itemFiscalSelections?: Record<string, UnknownRecord>;
    recipientTaxId?: string;
    finalConsumer?: boolean;
    deliveryByIssuer?: boolean;
    cardNotIntegrated?: boolean;
    requestedNumber?: number;
  }
): FiscalSelectionMismatchDetail[] {
  const data = asRecord(snapshot);
  const emission = asRecord(data.emissionRequest);
  const savedChoices = asRecord(emission.itemFiscalSelections);
  const currentChoices = asRecord(command.itemFiscalSelections);
  const mismatches = new Map<string, FiscalSelectionMismatchDetail>();

  if (command.itemFiscalSelections !== undefined) {
    const itemNumbers = new Set([...Object.keys(savedChoices), ...Object.keys(currentChoices)]);
    for (const itemNumber of itemNumbers) {
      const saved = asRecord(savedChoices[itemNumber]);
      const current = asRecord(currentChoices[itemNumber]);
      for (const field of Object.keys(itemFieldLabels)) {
        const snapshotValue = normalized(saved[field]);
        const currentValue = normalized(current[field]);
        if (snapshotValue !== currentValue) {
          const label = `Item ${itemNumber} · ${itemFieldLabels[field]}`;
          mismatches.set(label, { field: label, snapshotValue, currentValue });
        }
      }
    }
  }

  const savedOverrides = asRecord(emission.itemCsosnOverrides);
  const currentOverrides = asRecord(command.itemCsosnOverrides);
  if (command.itemCsosnOverrides !== undefined) {
    for (const itemNumber of new Set([
      ...Object.keys(savedOverrides),
      ...Object.keys(currentOverrides),
    ])) {
      const snapshotValue = normalized(savedOverrides[itemNumber]);
      const currentValue = normalized(currentOverrides[itemNumber]);
      if (snapshotValue !== currentValue) {
        const label = `Item ${itemNumber} · CSOSN manual`;
        mismatches.set(label, { field: label, snapshotValue, currentValue });
      }
    }
  }

  const comparisons: Array<[keyof typeof command, string, unknown, unknown]> = [
    [
      'recipientTaxId',
      'documento do destinatário',
      emission.recipientTaxId,
      command.recipientTaxId,
    ],
    ['finalConsumer', 'finalidade da operação', emission.finalConsumer, command.finalConsumer],
    [
      'deliveryByIssuer',
      'responsável pelo transporte',
      emission.deliveryByIssuer,
      command.deliveryByIssuer,
    ],
    [
      'cardNotIntegrated',
      'meio de pagamento',
      emission.cardNotIntegrated,
      command.cardNotIntegrated,
    ],
  ];
  for (const [field, label, saved, current] of comparisons) {
    const normalizedSaved =
      field === 'recipientTaxId' ? normalizeRecipientTaxId(normalized(saved)) : normalized(saved);
    const normalizedCurrent =
      field === 'recipientTaxId'
        ? normalizeRecipientTaxId(normalized(current))
        : normalized(current);
    if (command[field] !== undefined && normalizedSaved !== normalizedCurrent)
      mismatches.set(label, { field: label });
  }
  return [...mismatches.values()].sort((a, b) => a.field.localeCompare(b.field));
}

export type HmlAttemptEvidence = {
  order_id?: unknown;
  emission_request_id?: unknown;
  status?: unknown;
  ambiente?: unknown;
  modelo?: unknown;
  document_type?: unknown;
  hml_attempt_token?: unknown;
  hml_attempt_expires_at?: unknown;
  numero_protocolo?: unknown;
  xml_protocolo?: unknown;
  hml_response_history?: unknown;
};

const TRANSMISSION_FAILURE_PREFIX = 'Resposta da transmissão HML desconhecida: ';

function hasStrictPreTransmissionTlsEvidence(
  entry: UnknownRecord,
  document: HmlAttemptEvidence
): boolean {
  if (typeof entry.reason !== 'string' || !entry.reason.startsWith(TRANSMISSION_FAILURE_PREFIX))
    return false;

  let diagnostic: UnknownRecord;
  try {
    diagnostic = asRecord(JSON.parse(entry.reason.slice(TRANSMISSION_FAILURE_PREFIX.length)));
  } catch {
    return false;
  }

  const model = String(document.modelo || '');
  const prefix = model === '65' ? 'nfce' : model === '55' ? 'nfe' : '';
  const hostname = prefix ? `homologacao.${prefix}.sefa.pr.gov.br` : '';
  const endpointPrefix = hostname ? `https://${hostname}/${prefix}/` : '';
  return Boolean(
    document.emission_request_id &&
      diagnostic.emissionRequestId === document.emission_request_id &&
      diagnostic.code === 'SELF_SIGNED_CERT_IN_CHAIN' &&
      diagnostic.category === 'TLS_FAILURE' &&
      diagnostic.phase === 'tls' &&
      Number(diagnostic.environment) === 2 &&
      diagnostic.model === model &&
      diagnostic.hostname === hostname &&
      typeof diagnostic.endpoint === 'string' &&
      diagnostic.endpoint.startsWith(endpointPrefix) &&
      !('httpStatus' in diagnostic) &&
      normalized(entry.responseXml) === '' &&
      normalized(entry.protocol) === ''
  );
}

/** Abandonment is safe only when strict TLS verification failed before SOAP could be sent. */
export function canAbandonBeforeHmlTransmission(
  document: HmlAttemptEvidence,
  now = Date.now()
): boolean {
  if (
    document.status !== 'pendente' ||
    Number(document.ambiente) !== 2 ||
    !['55', '65'].includes(String(document.modelo)) ||
    document.document_type !== 'outbound' ||
    !document.order_id ||
    !document.emission_request_id ||
    document.hml_attempt_token != null ||
    (document.hml_attempt_expires_at != null &&
      Date.parse(String(document.hml_attempt_expires_at)) > now) ||
    normalized(document.numero_protocolo) !== '' ||
    normalized(document.xml_protocolo) !== ''
  )
    return false;

  const history = Array.isArray(document.hml_response_history)
    ? document.hml_response_history.map(asRecord)
    : [];
  if (!history.length) return false;
  if (
    history.some(
      (entry) => normalized(entry.responseXml) !== '' || normalized(entry.protocol) !== ''
    )
  )
    return false;
  return history.some((entry) => hasStrictPreTransmissionTlsEvidence(entry, document));
}

export function isFormallyAbandonedHmlAttempt(history: unknown): boolean {
  return (
    Array.isArray(history) &&
    history.some(
      (entry) =>
        asRecord(entry).abandonmentCode === 'FISCAL_SNAPSHOT_CHANGED_AFTER_PRE_TRANSMISSION_FAILURE'
    )
  );
}
