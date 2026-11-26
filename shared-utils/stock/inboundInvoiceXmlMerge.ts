type InvoiceItem = Record<string, unknown>;
type InvoiceSnapshot = Record<string, unknown> & {
  nfeKey?: unknown;
  rawXml?: unknown;
  items?: unknown;
};

export type InboundInvoiceXmlMergeResult<T extends object> = {
  outcome: 'updated' | 'unchanged' | 'conflict';
  invoice: T;
  hasConflicts: boolean;
};

const HEADER_FIELDS = [
  'nfeNumber',
  'series',
  'issuedAt',
  'entryExitAt',
  'model',
  'environment',
  'emitterCnpj',
  'emitterName',
  'emitterTradeName',
  'emitterIe',
  'emitterAddress',
  'recipientCnpj',
  'recipientName',
  'totalProducts',
  'totalFreight',
  'totalIpi',
  'totalDiscount',
  'totalInsurance',
  'totalOtherExpenses',
  'totalIcms',
  'totalIcmsSt',
  'freightPercent',
  'ipiPercent',
  'operationNature',
  'protocol',
  'additionalInfo',
  'totalInvoice',
  'modFrete',
  'carrierName',
  'volumes',
  'netWeight',
  'grossWeight',
  'installments',
  'paymentMethod',
] as const;

const IDENTITY_FIELDS = [
  'nfeKey',
  'nfeNumber',
  'series',
  'model',
  'emitterCnpj',
  'recipientCnpj',
  'totalInvoice',
] as const;

const SUMMARY_ZERO_FIELDS = new Set([
  'totalProducts',
  'totalFreight',
  'totalIpi',
  'totalDiscount',
  'totalInsurance',
  'totalOtherExpenses',
  'totalIcms',
  'totalIcmsSt',
  'totalInvoice',
  'freightPercent',
  'ipiPercent',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isBlank = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0) ||
  (isRecord(value) && Object.keys(value).length === 0);

const normalizeString = (value: string): string => value.trim().replace(/\s+/g, ' ');

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])])
    );
  }
  return typeof value === 'string' ? normalizeString(value) : value;
};

const valuesMatch = (left: unknown, right: unknown): boolean =>
  JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));

const isZero = (value: unknown): boolean =>
  (typeof value === 'number' || typeof value === 'string') &&
  value !== '' &&
  Number.isFinite(Number(value)) &&
  Number(value) === 0;

const mergeMissing = (
  current: unknown,
  incoming: unknown,
  replaceSummaryZero: boolean,
  field: string
): { value: unknown; changed: boolean; conflict: boolean } => {
  if (isBlank(incoming)) return { value: current, changed: false, conflict: false };
  if (isBlank(current)) return { value: incoming, changed: true, conflict: false };

  if (replaceSummaryZero && SUMMARY_ZERO_FIELDS.has(field) && isZero(current)) {
    return { value: incoming, changed: !valuesMatch(current, incoming), conflict: false };
  }

  if (isRecord(current) && isRecord(incoming)) {
    const merged: Record<string, unknown> = { ...current };
    let changed = false;
    let conflict = false;
    for (const [key, value] of Object.entries(incoming)) {
      const result = mergeMissing(current[key], value, replaceSummaryZero, key);
      conflict ||= result.conflict;
      if (result.changed) {
        merged[key] = result.value;
        changed = true;
      }
    }
    return { value: changed ? merged : current, changed, conflict };
  }

  return { value: current, changed: false, conflict: !valuesMatch(current, incoming) };
};

const normalizeIdentityValue = (field: string, value: unknown): unknown => {
  if (value === undefined || value === null) return value;
  if (field === 'totalInvoice') {
    const amount = Number(value);
    return !Number.isFinite(amount) || amount === 0 ? undefined : Math.round(amount * 100);
  }
  if (field === 'emitterCnpj' || field === 'recipientCnpj' || field === 'nfeKey') {
    return String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  if (field === 'nfeNumber' || field === 'series' || field === 'model') {
    return String(value).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  }
  return normalizeString(String(value)).toLocaleLowerCase('pt-BR');
};

const hasIdentityValue = (field: string, value: unknown): boolean => {
  if (isBlank(value)) return false;
  if (field === 'totalInvoice') return Number(value) !== 0;
  return true;
};

const getItemNumber = (item: InvoiceItem, index: number): number =>
  Number(item.itemNumber ?? item.item_index ?? item.item_number ?? item.numeroItem ?? index + 1);

const isSummaryXml = (xml: unknown): boolean =>
  typeof xml === 'string' && /<(?:[\w.-]+:)?resNFe\b/i.test(xml);

export function mergeInboundInvoiceXml<T extends object>(
  existingInvoice: T,
  incomingInvoice: T
): InboundInvoiceXmlMergeResult<T> {
  const existing = existingInvoice as InvoiceSnapshot;
  const incoming = incomingInvoice as InvoiceSnapshot;

  for (const field of IDENTITY_FIELDS) {
    const currentValue = existing[field];
    const incomingValue = incoming[field];
    if (
      hasIdentityValue(field, currentValue) &&
      hasIdentityValue(field, incomingValue) &&
      normalizeIdentityValue(field, currentValue) !== normalizeIdentityValue(field, incomingValue)
    ) {
      return { outcome: 'conflict', invoice: existingInvoice, hasConflicts: true };
    }
  }

  const currentItems = Array.isArray(existing.items) ? (existing.items as InvoiceItem[]) : [];
  const incomingItems = Array.isArray(incoming.items) ? (incoming.items as InvoiceItem[]) : [];
  const existingIsPartial = isSummaryXml(existing.rawXml) || currentItems.length === 0;
  const merged: InvoiceSnapshot = { ...existing };
  let changed = false;
  let hasConflicts = false;

  for (const field of HEADER_FIELDS) {
    const result = mergeMissing(
      existing[field],
      incoming[field],
      existingIsPartial && SUMMARY_ZERO_FIELDS.has(field),
      field
    );
    hasConflicts ||= result.conflict;
    if (result.changed) {
      merged[field] = result.value;
      changed = true;
    }
  }

  const mergedItems = [...currentItems];
  for (let incomingIndex = 0; incomingIndex < incomingItems.length; incomingIndex += 1) {
    const incomingItem = incomingItems[incomingIndex];
    const itemNumber = getItemNumber(incomingItem, incomingIndex);
    const currentIndex = mergedItems.findIndex(
      (item, index) => getItemNumber(item, index) === itemNumber
    );

    if (currentIndex < 0) {
      mergedItems.push(incomingItem);
      changed = true;
      continue;
    }

    const currentItem = mergedItems[currentIndex];
    const mergedItem: InvoiceItem = { ...currentItem };
    let itemChanged = false;
    for (const [field, value] of Object.entries(incomingItem)) {
      const result = mergeMissing(
        currentItem[field],
        value,
        existingIsPartial && SUMMARY_ZERO_FIELDS.has(field),
        field
      );
      hasConflicts ||= result.conflict;
      if (result.changed) {
        mergedItem[field] = result.value;
        itemChanged = true;
      }
    }
    if (itemChanged) {
      mergedItems[currentIndex] = mergedItem;
      changed = true;
    }
  }

  const hasNewRawXml = !existing.rawXml && Boolean(incoming.rawXml);
  const replacesSummaryXml =
    isSummaryXml(existing.rawXml) && incomingItems.length > 0 && Boolean(incoming.rawXml);
  if (hasNewRawXml || replacesSummaryXml) {
    merged.rawXml = incoming.rawXml;
    changed = true;
  }

  if (!changed) {
    return {
      outcome: hasConflicts ? 'conflict' : 'unchanged',
      invoice: existingInvoice,
      hasConflicts,
    };
  }

  merged.items = mergedItems;
  merged.itemsCount = mergedItems.length;
  return { outcome: 'updated', invoice: merged as T, hasConflicts };
}
