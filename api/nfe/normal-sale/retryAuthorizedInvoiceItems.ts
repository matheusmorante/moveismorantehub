import type { SupabaseClient } from '@supabase/supabase-js';
import { parseAuthorizedInvoiceLines } from '../../../erp/src/pages/utils/nfe/invoiceLineSnapshot';
import type { FiscalDatabase } from '../fiscalDatabaseTypes';

export async function syncRetryAuthorizedInvoiceItems(params: {
  db: SupabaseClient<FiscalDatabase>;
  documentId: string;
  signedXml: string;
}): Promise<boolean> {
  const { db, documentId, signedXml } = params;

  try {
    const invoiceLines = parseAuthorizedInvoiceLines(signedXml);
    const { error: linesError } = await db.from('nfe_document_items').upsert(
      invoiceLines.map((line) => ({
        document_id: documentId,
        item_number: line.invoiceItemNumber,
        product_code: line.productCode,
        description: line.description,
        billed_quantity: line.billedQuantity,
        unit_value: line.unitValue,
        gross_value: line.grossValue,
        discount_value: line.discountValue,
        product_xml: line.productXml,
        taxes_xml: line.taxesXml,
      })),
      { onConflict: 'document_id,item_number' }
    );
    if (linesError) {
      console.error(
        '[NF-e Emit] Nota autorizada, mas itens fiscais precisam de reconciliação:',
        linesError.message
      );
      return true;
    }

    return false;
  } catch (snapshotError: any) {
    console.error(
      '[NF-e Emit] Nota autorizada sem snapshot fiscal de itens:',
      snapshotError?.message || 'erro de leitura'
    );
    return true;
  }
}
