import { describe, expect, it } from 'vitest';
import { createProductFormSchema } from '../../../../../shared-utils/productDomainValidation';
import { createMobileProductFormSchema } from '../../../../../shared-utils/mobileProductFormSchema';
import { getSofaCharacteristicRequirementIssues } from '../../../../../shared-utils/productSofaCharacteristicRequirements';
import {
  findProductTechnicalValueEntry,
  removeProductTechnicalValueAliases,
} from '../../../../../shared-utils/productTechnicalValueAliases';
import { resolveMobileProductFormErrorNavigation } from './mobileProductFormErrorNavigation';
import { baseValidProduct } from './mobileProductFormSchemaTestFixtures';
import { getApplicableProductTechnicalFields } from './productCharacteristics';
import { isTechnicalFieldAllowedForCategories } from '../../../../../shared-utils/productTechnicalFieldScope';

const erpProduct = {
  name: 'Sofá Paris',
  itemType: 'product',
  productKind: 'normal',
  categoryIds: ['sala', 'sofas'],
  mainSupplierId: 'supplier-1',
  unitPrice: 100,
  variations: [{ id: 'v1', name: 'Sofá Paris', sku: 'SOFA-1', stock: 1, unitPrice: 100, active: true, attributes: [], images: [] }],
};

describe('características obrigatórias de Sofás', () => {
  it('exige as duas respostas no ERP e aceita Não como resposta', () => {
    const schema = createProductFormSchema({ isStockistOnly: false, saveAsDraft: false, categoryName: 'Poltronas / Sofás' });
    const missing = schema.safeParse({ ...erpProduct, technicalValues: {} });
    expect(missing.error?.issues.map(({ path }) => path)).toEqual(expect.arrayContaining([
      ['technicalValues', 'É retrátil?'],
      ['technicalValues', 'É reclinável?'],
    ]));
    expect(schema.safeParse({
      ...erpProduct,
      technicalValues: { 'É retrátil?': false, 'É reclinável?': false },
    }).success).toBe(true);
  });

  it('reconhece Sofás em seleção múltipla no app e permite rascunho incompleto', () => {
    const options = { isStockistOnly: false, published: false };
    const product = { ...baseValidProduct, category: 'Poltronas', categoryNames: ['Poltronas', 'Sofás'], technicalValues: {} };
    const result = createMobileProductFormSchema({ ...options, draft: false }).safeParse(product);
    expect(result.error?.issues.map(({ path }) => path)).toEqual(expect.arrayContaining([
      ['technicalValues', 'É retrátil?'],
      ['technicalValues', 'É reclinável?'],
    ]));
    expect(createMobileProductFormSchema({ ...options, draft: false }).safeParse({
      ...product,
      technicalValues: { 'É retrátil?': 'Não', 'É reclinável?': 'Sim' },
    }).success).toBe(true);
    expect(createMobileProductFormSchema({ ...options, draft: true }).safeParse(product).success).toBe(true);
  });

  it('exige resposta própria em cada variação quando o campo varia', () => {
    const issues = getSofaCharacteristicRequirementIssues({
      category: 'Sofás',
      technicalValues: { 'É retrátil?': false, 'É reclinável?': true },
      variableTechnicalFields: ['É reclinável?'],
      variations: [
        { attributes: [{ name: 'Reclinável', value: false }] },
        { attributes: [] },
      ],
    });
    expect(issues).toEqual([expect.objectContaining({
      path: ['variations', 1, 'technicalValues', 'É reclinável?'],
    })]);
  });

  it('inclui as duas perguntas uma única vez e preserva aplicações de outras categorias', () => {
    const fields = getApplicableProductTechnicalFields([
      { id: 'old', name: 'Reclinável', categoryIds: ['sofas'] },
      { id: 'canonical', name: 'É reclinável?', categoryIds: ['sofas'] },
      { id: 'retractable', name: 'É retrátil?', categoryIds: ['sofas'] },
    ], ['sofas'], {}, [], 'Sofás');
    expect(fields.map(({ name }) => name).sort()).toEqual(['É reclinável?', 'É retrátil?'].sort());
    expect(fields.every((field) => field.isRequiredForProduct)).toBe(true);
    expect(isTechnicalFieldAllowedForCategories('É reclinável?', ['Poltronas'], [
      { categoryId: 'poltronas', application: 'required' },
    ], ['poltronas'])).toBe(true);
  });

  it('impede finalizar no app quando uma variação não respondeu uma característica variável', () => {
    const schema = createMobileProductFormSchema({ isStockistOnly: false, published: false, draft: false });
    const result = schema.safeParse({
      ...baseValidProduct,
      categoryNames: ['Sofás'],
      hasVariations: true,
      variableTechnicalFields: ['É reclinável?'],
      technicalValues: { 'É retrátil?': false, 'É reclinável?': true },
      variations: [
        { ...baseValidProduct.variations[0], name: 'Azul', attributes: [{ name: 'É reclinável?', value: false }] },
        { ...baseValidProduct.variations[0], id: 'var-2', sku: '000312-02', name: 'Bege', attributes: [] },
      ],
    });
    expect(result.error?.issues).toContainEqual(expect.objectContaining({
      path: ['variations', 1, 'technicalValues', 'É reclinável?'],
    }));
  });

  it('lê e substitui grafias legadas com ou sem interrogação', () => {
    const values = { 'É reclinável': false, 'Retrátil?': true, Cor: 'Azul' };
    expect(findProductTechnicalValueEntry(values, 'É reclinável?')?.value).toBe(false);
    expect(findProductTechnicalValueEntry(values, 'É retrátil?')?.value).toBe(true);
    expect(removeProductTechnicalValueAliases(values, 'É reclinável?')).toEqual({ 'Retrátil?': true, Cor: 'Azul' });
  });

  it('leva os erros do produto e da variação às respectivas abas técnicas no app', () => {
    expect(resolveMobileProductFormErrorNavigation('technicalValues_É reclinável?')).toEqual({ tab: 'technical' });
    expect(resolveMobileProductFormErrorNavigation('variations_1_technicalValues_É reclinável?')).toEqual({
      tab: 'variacoes', variationIndex: 1, variationPanel: 'tecnico',
    });
  });
});
