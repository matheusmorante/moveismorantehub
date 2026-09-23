import { describe, expect, it } from 'vitest';
import type { SupplierProductSummary } from '../services/inboundSupplierProductContext';
import { InboundDeterministicScorerContext, rankAndScoreDeterministic } from '../services/inboundDeterministicScorer';
import { createInboundScorerContext, rankInboundSuggestions } from '../../../../../../mobile/src/features/stock/invoices/utils/inboundDeterministicScorer';

describe('mobile inbound scorer parity with ERP', () => {
  const catalog: SupplierProductSummary[] = [
    {
      id: 'wardrobe',
      name: 'Guarda Roupa Doripel',
      variations: [
        { id: 'new-xangai', name: 'New Xangai 6PT 2GV MDF Off White/Nogueira', attributes: {} },
        { id: 'montevideo', name: 'Montevideu 6PT 2GV MDF Off White/Nogueira', attributes: {} },
      ],
    },
    {
      id: 'cabinet',
      name: 'Armário Aéreo Divina 4PT Cinza',
      variations: [],
    },
  ];

  const mobileCatalog = catalog.flatMap((product) => product.variations.length
    ? product.variations.map((variation) => ({
      id: variation.id,
      productId: product.id,
      variationId: variation.id,
      name: variation.name,
      comparisonName: `${product.name} ${variation.name}`,
    }))
    : [{ id: product.id, productId: product.id, name: product.name, comparisonName: product.name }]);

  const assertParity = (description: string, supplierCode?: string) => {
    const erpContext = new InboundDeterministicScorerContext(catalog);
    const mobileContext = createInboundScorerContext(mobileCatalog);
    const erp = rankAndScoreDeterministic(description, supplierCode, erpContext).topCandidate;
    const mobile = rankInboundSuggestions(description, supplierCode, mobileContext)[0];
    expect(mobile && [mobile.productId, mobile.variationId, mobile.confidence]).toEqual(
      erp && [erp.productId, erp.variationId, erp.confidence],
    );
  };

  it('matches the ERP top suggestion for abbreviated product attributes and model conflicts', () => {
    assertParity('G ROUPA DORIPEL NEW XANGAI 6PT 2GV MDF 68600-72 OFF WHITE/NOGUEIRA');
  });

  it('matches the ERP result when supplier code occurs in the product name', () => {
    assertParity('ARMARIO AEREO DIVINA 4PT CINZA', 'DIVINA');
  });

  it('returns no suggestion when the ERP confidence is below threshold', () => {
    assertParity('PRODUTO SEM RELACAO ALGUMA');
  });
});
