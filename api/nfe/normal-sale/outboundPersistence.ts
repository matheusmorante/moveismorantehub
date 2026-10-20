import { parseAuthorizedInvoiceLines } from '../../../erp/src/pages/utils/nfe/invoiceLineSnapshot';
import type { Attempt, OutboundDatabase } from './outboundTypes';

export async function persistResultToDatabase(
  db: OutboundDatabase,
  a: Attempt,
  token: string,
  state: string,
  reason: string,
  response: string,
  protocol: string | null = null,
  xml = ''
) {
  const items =
    state === 'authorized'
      ? parseAuthorizedInvoiceLines(xml).map((line) => ({
          item_number: line.invoiceItemNumber,
          product_code: line.productCode,
          description: line.description,
          billed_quantity: line.billedQuantity,
          unit_value: line.unitValue,
          gross_value: line.grossValue,
          discount_value: line.discountValue,
          product_xml: line.productXml,
          taxes_xml: line.taxesXml,
        }))
      : [];

  const result = await db.rpc('persist_nfe_outbound_result', {
    p_document_id: a.document_id,
    p_attempt_token: token,
    p_state: state,
    p_reason: reason,
    p_response_xml: response,
    p_protocol: protocol,
    p_items: items,
  });

  if (result.error) throw new Error('FISCAL_RESULT_PERSIST_FAILED');
}

export async function loadOutboundAttempt(db: OutboundDatabase, documentId: string) {
  const [attempt, document] = await Promise.all([
    db.from('nfe_outbound_attempts').select('*').eq('document_id', documentId).maybeSingle(),
    db.from('nfe_documents').select('*').eq('id', documentId).maybeSingle(),
  ]);

  if (attempt.error || document.error || !attempt.data || !document.data)
    throw new Error('FISCAL_ATTEMPT_UNAVAILABLE');

  return { attempt: attempt.data, document: document.data };
}
