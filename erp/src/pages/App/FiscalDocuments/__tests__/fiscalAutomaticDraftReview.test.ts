import { describe, expect, it } from 'vitest';
import { buildAutomaticReturnDraftReviewState, buildFiscalOperationDraftReviewState } from '../utils/fiscalOperationDraftReview';
import type { DraftPayload } from '../types/fiscalOperationDraft.types';

function payload(): DraftPayload {
  return {
    draft: { id: 'draft', operation_kind: 'return', status: 'draft', environment: 2, original_access_key: '1'.repeat(44) },
    source: { id: 'source', order_id: 'sale', modelo: '55', ambiente: 2, numero_nfe: 1, serie: '1', chave_acesso: '1'.repeat(44) },
    lines: [{ id: 'line', fiscal_item_number: 1, quantity: 1, originalQuantity: 2, gross_value: 100, discount_value: 0,
      originalDescription: 'Produto de teste', originalProductCode: 'TEST', originalGrossValue: 200, originalDiscountValue: 0,
      originalProductXml: '<prod><CFOP>5102</CFOP><qCom>2.0000</qCom><qTrib>2.0000</qTrib><vProd>200.00</vProd></prod>',
      originalTaxesXml: '<imposto><ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS></imposto>',
      suggestedCfop: '1202', allowedCfops: [{ value: '1202', label: 'Devolução' }] }],
    reviewTemplate: { recipient_xml: '<dest/>', totals_xml: '<total><ICMSTot><vProd>200.00</vProd><vDesc>0.00</vDesc><vFrete>0.00</vFrete><vOutro>0.00</vOutro><vNF>200.00</vNF></ICMSTot></total>', transport_xml: '<transp/>', payment_xml: '<pag/>' },
  };
}

describe('automatic return fiscal review', () => {
  it('confirms the supported zero-tax return after proportional calculation without changing the source', () => {
    const data = payload();
    const before = JSON.stringify(data);
    const result = buildAutomaticReturnDraftReviewState(data);
    expect(result.error).toBeNull();
    expect(result.review).toMatchObject({ item_taxes_confirmed: true, totals_confirmed: true, apportionment_review_confirmed: false });
    expect(result.reviewedLines[0].product_xml).toContain('<qCom>1.0000</qCom>');
    expect(result.review.totals_xml).toContain('<vNF>100.00</vNF>');
    expect(JSON.stringify(data)).toBe(before);
  });

  it('keeps explicit manual confirmations unchecked', () => {
    expect(buildFiscalOperationDraftReviewState(payload()).review).toMatchObject({ item_taxes_confirmed: false, totals_confirmed: false });
  });

  it.each(['estorno', 'model65', 'cfop', 'missingOptions', 'taxedSource', 'taxedReview', 'taxedTotals'])('requires manual review for %s instead of confirming it', scenario => {
    const data = payload();
    if (scenario === 'estorno') data.draft.operation_kind = 'estorno';
    if (scenario === 'model65') data.source.modelo = '65';
    if (scenario === 'cfop') data.lines[0].suggestedCfop = '9999';
    if (scenario === 'missingOptions') data.lines[0].allowedCfops = undefined;
    if (scenario === 'taxedSource') data.lines[0].originalTaxesXml = '<imposto><ICMS><ICMS00><vBC>200.00</vBC><vICMS>36.00</vICMS></ICMS00></ICMS></imposto>';
    if (scenario === 'taxedReview') data.lines[0].reviewed_taxes_xml = '<imposto><ICMS><ICMS00><vBC>100.00</vBC><vICMS>18.00</vICMS></ICMS00></ICMS></imposto>';
    if (scenario === 'taxedTotals') data.reviewTemplate.totals_xml = data.reviewTemplate.totals_xml.replace('<vNF>', '<vICMS>36.00</vICMS><vNF>');
    const result = buildAutomaticReturnDraftReviewState(data);
    expect(result.error).toBeTruthy();
    expect(result.review).toMatchObject({ item_taxes_confirmed: false, totals_confirmed: false });
  });
});
