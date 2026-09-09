import { describe, expect, it } from 'vitest';
import { requiresManualProductConfirmation, validateInboundProductClassification } from '../inboundProductClassification';

const base = { decision: 'NEW_VARIATION_OF_EXISTING_PRODUCT', normalizedParentName: 'Roupeiro Monza 4 Portas', extractedAttributes: { color: 'Freijó/Off White', measure: null, doors: '4', material: null, feet: null, mirror: null }, supplierCode: '87320-02', detectedSupplierCodeFamily: '87320', matchedProductId: 'product-monza', matchedVariationId: null, confidence: 0.91, reasons: ['Nome-base e portas compatíveis'] };

describe('classificação estruturada de itens de NF', () => {
  it('preserva cor composta como atributo de uma nova variação', () => {
    const result = validateInboundProductClassification(base);
    expect(result.decision).toBe('NEW_VARIATION_OF_EXISTING_PRODUCT');
    expect(result.extractedAttributes.color).toBe('Freijó/Off White');
    expect(result.normalizedParentName).toBe('Roupeiro Monza 4 Portas');
  });

  it('não aceita confiança fora do intervalo', () => {
    expect(() => validateInboundProductClassification({ ...base, confidence: 1.1 })).toThrow();
  });

  it('exige confirmação para uma sugestão ambígua ou fraca', () => {
    expect(requiresManualProductConfirmation(validateInboundProductClassification({ ...base, decision: 'UNSURE', confidence: 0.65 }))).toBe(true);
    expect(requiresManualProductConfirmation(validateInboundProductClassification({ ...base, confidence: 0.69 }))).toBe(true);
  });
});
