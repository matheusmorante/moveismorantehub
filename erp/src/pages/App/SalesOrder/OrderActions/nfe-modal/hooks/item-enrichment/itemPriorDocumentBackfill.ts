import type { Item as OrderItem } from '@/pages/types/items.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { parseAuthorizedInvoiceLines } from '@/pages/utils/nfe/invoiceLineSnapshot';
import type { NfeItemWithFiscal } from '../../NfeItemsSection';

export function extractXmlTagValue(xml: string, tag: string): string | null {
  if (!xml || !tag) return null;
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1].trim() : null;
}

export async function backfillMissingNcmFromPriorDocuments(
  orderId: string | number,
  productItems: OrderItem[],
  fallbackItems: NfeItemWithFiscal[]
): Promise<void> {
  if (!fallbackItems.some((fi) => !fi.fiscal.ncm)) return;

  try {
    const { data: priorDocs } = await supabase
      .from('nfe_documents')
      .select('xml_nfe,status')
      .eq('order_id', String(orderId))
      .in('status', ['homologada', 'autorizada'])
      .order('created_at', { ascending: false });

    if (!priorDocs || priorDocs.length === 0) return;

    for (const doc of priorDocs) {
      if (!doc.xml_nfe) continue;
      const lines = parseAuthorizedInvoiceLines(doc.xml_nfe);
      productItems.forEach((item, idx) => {
        if (fallbackItems[idx]?.fiscal?.ncm) return;
        const match = lines.find(
          (l) =>
            (item.code && l.productCode && item.code.trim() === l.productCode.trim()) ||
            (item.description &&
              l.description &&
              item.description.trim().toLocaleLowerCase() ===
                l.description.trim().toLocaleLowerCase())
        );
        if (match?.productXml) {
          const lineNcm = extractXmlTagValue(match.productXml, 'NCM');
          if (lineNcm && fallbackItems[idx]) {
            fallbackItems[idx].fiscal.ncm = lineNcm;
          }
        }
      });
    }
  } catch {
    // Falha silenciosa para não quebrar o fluxo caso nfe_documents esteja inacessível
  }
}
