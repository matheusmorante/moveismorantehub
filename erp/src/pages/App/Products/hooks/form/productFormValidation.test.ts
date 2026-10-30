import { describe, expect, it } from 'vitest';
import type Product from '@/pages/types/product.type';
import { createProductFormSchema, validateProductFormSubmission } from './productFormValidation';
import { PRODUCT_SUPPLIER_REQUIRED_MESSAGE } from '../../../../../../../shared-utils/productSupplierRequirement';
import { PRODUCT_COMPOSITION_PRODUCT_COMPONENTS_REQUIRED_MESSAGE } from '../../../../../../../shared-utils/productCompositionRequirements';

describe('validateProductFormSubmission - fotos opcionais por variação', () => {
  const baseProduct: Partial<Product> = {
    name: 'Mesa de Centro',
    unitPrice: 150,
    hasVariations: false,
    categoryIds: ['sala-de-estar'],
    mainSupplierId: 'sup-1',
    description: 'Mesa elegante para sala.',
    images: ['https://img.test/mesa-pai.jpg'],
  };

  it('permite concluir o cadastro se a variação não possui foto vinculada', () => {
    const productWithEmptyVariation: Partial<Product> = {
      ...baseProduct,
      images: [],
      variations: [
        {
          id: 'var-1',
          name: 'Mesa de Centro Carvalho',
          sku: 'MC-CARV',
          stock: 5,
          unitPrice: 150,
          active: true,
          attributes: [{ name: 'Cor', value: 'Carvalho' }],
          images: [],
        },
      ],
    };

    const result = validateProductFormSubmission(productWithEmptyVariation, {
      isStockistOnly: false,
      saveAsDraft: false,
    });

    expect(result.invalidVariation).toBeUndefined();
    expect(result.errorMessage).not.toContain('foto vinculada');
  });

  it('não bloqueia variações múltiplas sem fotos próprias', () => {
    const productWithMultipleVariations: Partial<Product> = {
      ...baseProduct,
      hasVariations: true,
      variations: [
        {
          id: 'var-1',
          name: 'Mesa de Centro Carvalho',
          sku: 'MC-CARV',
          stock: 5,
          unitPrice: 150,
          active: true,
          attributes: [{ name: 'Cor', value: 'Carvalho' }],
          images: ['https://img.test/mesa-carvalho.jpg'],
        },
        {
          id: 'var-2',
          name: 'Mesa de Centro Nogueira',
          sku: 'MC-NOG',
          stock: 3,
          unitPrice: 160,
          active: true,
          attributes: [{ name: 'Cor', value: 'Nogueira' }],
          images: [],
        },
      ],
    };

    const result = validateProductFormSubmission(productWithMultipleVariations, {
      isStockistOnly: false,
      saveAsDraft: false,
    });

    expect(result.invalidVariation).toBeUndefined();
    expect(result.errorMessage).not.toContain('foto vinculada');
  });

  it('permite salvar rascunho mesmo com variação sem foto vinculada', () => {
    const draftProduct: Partial<Product> = {
      ...baseProduct,
      images: [],
      variations: [
        {
          id: 'var-1',
          name: 'Mesa Rascunho',
          sku: 'MC-RASC',
          stock: 0,
          unitPrice: 0,
          active: false,
          attributes: [],
          images: [],
        },
      ],
    };

    const result = validateProductFormSubmission(draftProduct, {
      isStockistOnly: false,
      saveAsDraft: true,
    });

    // Fotos são opcionais também ao concluir o cadastro.
    expect(result.errors.variations).toBeUndefined();
    expect(result.errors.variationRegistration).toBeUndefined();
    expect(result.invalidVariation).toBeUndefined();
  });

  it('aceita foto via campo image_url legado caso exista', () => {
    const productWithLegacyUrl: Partial<Product> = {
      ...baseProduct,
      variations: [
        {
          id: 'var-1',
          name: 'Mesa de Centro Carvalho',
          sku: 'MC-CARV',
          stock: 5,
          unitPrice: 150,
          active: true,
          attributes: [{ name: 'Cor', value: 'Carvalho' }],
          image_url: 'https://img.test/foto-legada.jpg',
        } as any,
      ],
    };

    const result = validateProductFormSubmission(productWithLegacyUrl, {
      isStockistOnly: false,
      saveAsDraft: false,
    });

    expect(result.errors.variations).toBeUndefined();
    expect(result.invalidVariation).toBeUndefined();
  });
});

describe('createProductFormSchema - modos de variação', () => {
  const base = {
    name: 'Poltrona',
    description: 'Poltrona para sala',
    itemType: 'product',
    productKind: 'normal',
    unitPrice: 100,
    hasVariations: false,
    categoryIds: ['sala'],
    mainSupplierId: 'supplier-1',
    images: ['https://img.test/pai.jpg'],
  };
  const variation = (id: string, name: string, images: string[] = ['https://img.test/var.jpg']) => ({
    id,
    name,
    sku: `SKU-${id}`,
    stock: 1,
    unitPrice: 100,
    active: true,
    attributes: [],
    images,
  });
  const schema = createProductFormSchema({ isStockistOnly: false, saveAsDraft: false });

  it('aceita a foto herdada do produto pai no modo simples', () => {
    const result = schema.safeParse({ ...base, variations: [variation('1', 'Poltrona', [])] });
    expect(result.success).toBe(true);
  });

  it('exige fornecedor na finalização de terceiros e mantém fabricação própria dispensada', () => {
    const missingThirdPartySupplier = schema.safeParse({
      ...base,
      mainSupplierId: undefined,
      supplierId: undefined,
      merchandiseOrigin: 'third_party',
      variations: [variation('1', 'Poltrona')],
    });
    expect(missingThirdPartySupplier.success).toBe(false);
    if (!missingThirdPartySupplier.success) {
      expect(missingThirdPartySupplier.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['mainSupplierId'],
          message: PRODUCT_SUPPLIER_REQUIRED_MESSAGE,
        })
      );
    }

    const ownProductionWithoutSupplier = schema.safeParse({
      ...base,
      mainSupplierId: undefined,
      supplierId: undefined,
      merchandiseOrigin: 'own_production',
      variations: [variation('1', 'Poltrona')],
    });
    expect(ownProductionWithoutSupplier.success).toBe(true);
  });

  it('permite rascunho incompleto sem fornecedor principal', () => {
    const draft = createProductFormSchema({ isStockistOnly: false, saveAsDraft: true }).safeParse({
      name: 'Rascunho sem fornecedor',
      merchandiseOrigin: 'third_party',
    });
    expect(draft.success).toBe(true);
  });

  it('permite manter descontos de variação ainda inválidos enquanto o produto é rascunho', () => {
    const draft = createProductFormSchema({ isStockistOnly: false, saveAsDraft: true }).safeParse({
      name: 'Rascunho com desconto em edição',
      variations: [{ discountPercent: '-1', discountFixed: 'acima do preço' }],
    });

    expect(draft.success).toBe(true);
  });

  it('exige duas variações e nomes completos distintos no modo múltiplo', () => {
    const tooFew = schema.safeParse({
      ...base,
      hasVariations: true,
      variations: [variation('1', 'Poltrona Azul')],
    });
    expect(tooFew.error?.issues.some((issue) => issue.message.includes('pelo menos 2 variações'))).toBe(true);

    const duplicateNames = schema.safeParse({
      ...base,
      hasVariations: true,
      variations: [variation('1', 'Poltrona Azul'), variation('2', 'POLTRONA ÁZUL')],
    });
    expect(duplicateNames.error?.issues.some((issue) => issue.message.includes('nomes completos'))).toBe(true);
  });

  it('permite variações múltiplas sem fotos próprias e deixa rascunhos incompletos', () => {
    const missingVariationPhoto = schema.safeParse({
      ...base,
      hasVariations: true,
      variations: [variation('1', 'Poltrona Azul'), variation('2', 'Poltrona Verde', [])],
    });
    expect(missingVariationPhoto.success).toBe(true);

    const draft = createProductFormSchema({ isStockistOnly: false, saveAsDraft: true }).safeParse({
      name: 'Rascunho',
      hasVariations: true,
      variations: [variation('1', '', [])],
    });
    expect(draft.success).toBe(true);
  });

  it('bloqueia variação ativa de composição sem dois componentes ao concluir o produto', () => {
    const composition = {
      ...base,
      itemType: 'composition',
      hasVariations: true,
      variations: [
        {
          ...variation('1', 'Poltrona Azul'),
          attributes: [{ name: 'Cor', value: 'Azul' }],
          comboItems: [
            { productId: 'base', description: 'Base', quantity: 1, unitPrice: 10, stock: 0 },
            { productId: 'encosto', description: 'Encosto', quantity: 1, unitPrice: 10, stock: 0 },
          ],
        },
        {
          ...variation('2', 'Poltrona Verde'),
          attributes: [{ name: 'Cor', value: 'Verde' }],
          comboItems: [
            { productId: 'base-verde', description: 'Base Verde', quantity: 1, unitPrice: 10, stock: 0 },
          ],
        },
      ],
    } as Partial<Product>;

    const result = validateProductFormSubmission(composition, {
      isStockistOnly: false,
      saveAsDraft: false,
    });

    expect(result.errors.variationRegistration).toBe(true);
    expect(result.invalidVariation?.variation.id).toBe('2');
    expect(result.invalidVariation?.issue).toEqual({
      message: 'Vincule pelo menos 2 produtos componentes para manter ativa esta variação de composição.',
      tab: 'compostos',
    });
  });
});

describe('validateProductFormSubmission - composição simples', () => {
  const composition = {
    name: 'Kit Aurora',
    itemType: 'composition',
    productKind: 'normal',
    active: true,
    hasVariations: false,
    unitPrice: 500,
    categoryIds: ['sala'],
    mainSupplierId: 'supplier-1',
    images: ['https://img.test/kit.jpg'],
    variations: [{
      id: 'primary',
      name: 'Kit Aurora',
      sku: 'KIT-AURORA',
      unitPrice: 500,
      active: true,
      attributes: [],
      images: ['https://img.test/kit.jpg'],
      comboItems: [],
    }],
  } as Partial<Product>;
  const component = (id: string) => ({
    productId: id,
    description: `Componente ${id}`,
    quantity: 1,
  });

  it('blocks an active simple composition with fewer than two parts and returns its tab path', () => {
    const result = validateProductFormSubmission({
      ...composition,
      comboItems: [component('base')],
    } as any, { isStockistOnly: false, saveAsDraft: false });

    expect(result.errors.composicao).toBe(true);
    expect(result.errorMessage).toBe(PRODUCT_COMPOSITION_PRODUCT_COMPONENTS_REQUIRED_MESSAGE);
    expect(validateProductFormSubmission({
      ...composition,
      comboItems: [component('base'), component('seat')],
    } as any, { isStockistOnly: false, saveAsDraft: false }).errors.composicao).toBeUndefined();
  });

  it('allows incomplete inactive compositions and drafts', () => {
    expect(validateProductFormSubmission({
      ...composition,
      active: false,
      comboItems: [],
    }, { isStockistOnly: false, saveAsDraft: false }).errors.composicao).toBeUndefined();

    expect(validateProductFormSubmission({
      ...composition,
      comboItems: [],
    }, { isStockistOnly: false, saveAsDraft: true }).errors.composicao).toBeUndefined();

  });
});
