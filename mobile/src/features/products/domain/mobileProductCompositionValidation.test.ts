import { describe, expect, it } from 'vitest';
import { createMobileProductFormSchema } from '../../../../../shared-utils/mobileProductFormSchema';
import { baseValidProduct } from './mobileProductFormSchemaTestFixtures';
import { PRODUCT_COMPOSITION_PRODUCT_COMPONENTS_REQUIRED_MESSAGE } from '../../../../../shared-utils/productCompositionRequirements';
import { resolveMobileProductFormErrorNavigation } from './mobileProductFormErrorNavigation';

describe('mobileProductFormSchema - composition validation', () => {
  it('permite salvar variação única inativa de composição sem os componentes finais', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const composition = {
      ...baseValidProduct,
      itemType: 'composition',
      active: false,
      comboItems: [],
      variations: [{ ...baseValidProduct.variations[0], active: false, comboItems: [] }],
    };

    expect(schema.safeParse(composition).success).toBe(true);
    expect(schema.safeParse({
      ...composition,
      variations: [{
        ...composition.variations[0],
        comboItems: [{
          productId: 'component-1',
          variationId: 'variation-1',
          quantity: 1,
          description: 'Cadeira Aurora',
        }],
      }],
    }).success).toBe(true);
    expect(schema.safeParse({
      ...composition,
      variations: [{
        ...composition.variations[0],
        comboItems: [{ productId: 'simple-component', variationId: null, quantity: 1, description: 'Mesa Aurora' }],
      }],
    }).success).toBe(true);
  });

  it('exige dois componentes para cada variação ativa de uma composição em família', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const component = (id: string) => ({
      productId: id,
      variationId: `${id}-variation`,
      quantity: 1,
      description: `Componente ${id}`,
    });
    const composition = {
      ...baseValidProduct,
      itemType: 'composition',
      hasVariations: true,
      variations: [
        {
          ...baseValidProduct.variations[0],
          id: 'variation-1',
          active: true,
          attributes: [{ name: 'Cor', value: 'Branco' }],
          images: ['white.jpg'],
          comboItems: [component('base-1'), component('base-2')],
        },
        {
          ...baseValidProduct.variations[0],
          id: 'variation-2',
          sku: '000312-02',
          name: 'Preto',
          active: true,
          attributes: [{ name: 'Cor', value: 'Preto' }],
          images: ['black.jpg'],
          comboItems: [component('part-1')],
        },
      ],
    };

    const activeIncomplete = schema.safeParse(composition);
    expect(activeIncomplete.success).toBe(false);
    if (!activeIncomplete.success) {
      expect(activeIncomplete.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['variacoes', 1, 'comboItems'],
          message: 'Vincule pelo menos 2 produtos componentes para manter ativa esta variação de composição.',
        })
      );
    }

    expect(schema.safeParse({
      ...composition,
      variations: composition.variations.map((variation) => ({
        ...variation,
        active: false,
        comboItems: [],
      })),
    }).success).toBe(true);
  });

  it('exige dois componentes na composição simples ativa e direciona para a aba Composição', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const component = (id: string) => ({
      productId: id,
      variationId: null,
      quantity: 1,
      description: `Componente ${id}`,
    });
    const product = {
      ...baseValidProduct,
      itemType: 'composition',
      active: true,
      comboItems: [component('base')],
      variations: [{ ...baseValidProduct.variations[0], active: false, comboItems: [] }],
    };
    const parsed = schema.safeParse(product);

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toContainEqual(expect.objectContaining({
        path: ['composicao'],
        message: PRODUCT_COMPOSITION_PRODUCT_COMPONENTS_REQUIRED_MESSAGE,
      }));
    }
    expect(resolveMobileProductFormErrorNavigation('composicao')).toEqual({ tab: 'composicao' });
    expect(resolveMobileProductFormErrorNavigation('comboItems_0')).toEqual({ tab: 'composicao' });

    expect(schema.safeParse({ ...product, comboItems: [component('base'), component('seat')] }).success).toBe(true);
  });

  it('mantém composição simples incompleta editável em rascunho ou quando inativa', () => {
    const finalSchema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const draftSchema = createMobileProductFormSchema({
      draft: true,
      isStockistOnly: false,
      published: false,
    });
    const product = {
      ...baseValidProduct,
      itemType: 'composition',
      active: true,
      comboItems: [],
      variations: [{ ...baseValidProduct.variations[0], comboItems: [] }],
    };

    expect(draftSchema.safeParse(product).success).toBe(true);
    expect(finalSchema.safeParse({ ...product, active: false }).success).toBe(true);
  });

  it('direciona o erro de composição ao painel correto da variação', () => {
    expect(resolveMobileProductFormErrorNavigation('variacoes_1_comboItems')).toEqual({
      tab: 'variacoes',
      variationIndex: 1,
      variationPanel: 'compostos',
    });
  });

  it('barra componentes incompletos ou com quantidade menor que um ao finalizar', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const composition = {
      ...baseValidProduct,
      itemType: 'composition',
      variations: [{
        ...baseValidProduct.variations[0],
        comboItems: [{
          productId: 'component-1',
          variationId: 'variation-1',
          quantity: 0,
          description: '',
        }],
      }],
    };
    const parsed = schema.safeParse(composition);

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes('produto de cada componente'))).toBe(true);
      expect(parsed.error.issues.some((issue) => issue.message.includes('quantidade maior ou igual a um'))).toBe(true);
    }
  });

  it('preserva componentes incompletos em rascunhos sem permitir concluir depois sem corrigi-los', () => {
    const composition = {
      ...baseValidProduct,
      itemType: 'composition',
      variations: [{
        ...baseValidProduct.variations[0],
        comboItems: [{ productId: '', quantity: '' }],
      }],
    };
    const draftSchema = createMobileProductFormSchema({
      draft: true,
      isStockistOnly: false,
      published: false,
    });
    const finalSchema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });

    expect(draftSchema.safeParse(composition).success).toBe(true);
    expect(finalSchema.safeParse(composition).success).toBe(false);
  });
});
