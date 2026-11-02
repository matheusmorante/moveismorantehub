import { normalizeFiscalIdentifier } from './fiscalIdentifiers';
import { withTimeout } from './withTimeout';

export const IN_USE_INVOICE_MESSAGE =
  'Esta nota fiscal já está em uso em outro recebimento. Abra esse registro para retomá-lo ou editá-lo; se estiver Recebido, estorne antes de editar.';

export function effectiveInvoiceReceiptStatus<T extends string>(status: T, key: string, receivedKeys: ReadonlySet<string>): T | 'pending' | 'received' {
  if (receivedKeys.has(normalizeFiscalIdentifier(key))) return 'received';
  return status === 'received' ? 'pending' : status;
}

/** Consulta o recebimento efetivo; o vínculo salvo na NF pode estar desatualizado. */
export async function fetchReceivedInvoiceKeys(
  client: any,
  keys: string[],
  excludeReceiptId?: string,
): Promise<Set<string>> {
  const normalized = [...new Set(keys.map(normalizeFiscalIdentifier).filter(Boolean))];
  if (!normalized.length) return new Set();
  const result = await withTimeout<any | null>(
    Promise.resolve(client.rpc('received_goods_receipt_keys', {
      p_keys: normalized,
      p_exclude_receipt_id: excludeReceiptId || null,
    })),
    12_000,
    null,
    'receipts:invoice-availability',
  );
  if (!result || result.error || !Array.isArray(result.data)) {
    throw new Error('Não foi possível conferir se a nota já foi recebida. Tente novamente.');
  }
  return new Set(result.data.map((row: { fiscal_key: string }) => normalizeFiscalIdentifier(row.fiscal_key)));
}

/** Consulta qualquer recebimento que já reserve a NF, inclusive rascunhos e estornos. */
export async function fetchInUseInvoiceKeys(
  client: any,
  keys: string[],
  excludeReceiptId?: string,
): Promise<Set<string>> {
  const normalized = [...new Set(keys.map(normalizeFiscalIdentifier).filter(Boolean))];
  if (!normalized.length) return new Set();
  const result = await withTimeout<any | null>(
    Promise.resolve(client.rpc('in_use_goods_receipt_keys', {
      p_keys: normalized,
      p_exclude_receipt_id: excludeReceiptId || null,
    })),
    12_000,
    null,
    'receipts:invoice-in-use',
  );
  if (!result || result.error || !Array.isArray(result.data)) {
    throw new Error('Não foi possível conferir se a nota já está em uso. Tente novamente.');
  }
  return new Set(result.data.map((row: { fiscal_key: string }) => normalizeFiscalIdentifier(row.fiscal_key)));
}

export function receiptInvoiceConflictError(error: any): Error | null {
  const message = `${error?.message || ''} ${error?.details || ''}`;
  if (error?.code === '23505' &&
      (message.includes('goods_receipts_fiscal_key_unique') ||
        message.includes('goods_receipts_fiscal_key_alphanumeric_unique') ||
        message.includes('goods_receipts_received_fiscal_key_unique'))) {
    return new Error(IN_USE_INVOICE_MESSAGE);
  }
  return null;
}
