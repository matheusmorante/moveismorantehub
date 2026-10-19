import type { ReviewData, ReviewedLine } from '../types/fiscalOperationDraft.types';
import { parseFiscalXmlDetails } from './fiscalXmlParser';

/** Display adapter only: these review fragments are never used as an emission XML. */
export function parseFiscalOperationReview(review: ReviewData, lines: ReviewedLine[]) {
  const items = lines.map((line, index) =>
    `<det nItem="${index + 1}">${line.product_xml}${line.taxes_xml}</det>`
  ).join('');
  return parseFiscalXmlDetails(
    `<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe>${review.recipient_xml}${items}${review.totals_xml}${review.transport_xml}${review.payment_xml}</infNFe></NFe>`
  );
}
