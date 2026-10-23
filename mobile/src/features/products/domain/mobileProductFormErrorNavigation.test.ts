import { describe, expect, it } from 'vitest';
import { flattenFormErrors } from '../../../hooks/useZodForm';
import { resolveMobileProductFormErrorNavigation } from './mobileProductFormErrorNavigation';

describe('mobileProductFormErrorNavigation', () => {
  it.each(['discountPercent', 'discountFixed'])(
    'leva o erro de %s à variação e ao painel de precificação',
    (field) => {
      const errors = flattenFormErrors({
        variacoes: [{ [field]: { type: 'custom', message: 'Confira o desconto.' } }],
      } as never);
      const fieldPath = Object.keys(errors)[0];

      expect(fieldPath).toBe(`variacoes_0_${field}`);
      expect(resolveMobileProductFormErrorNavigation(fieldPath)).toEqual({
        tab: 'variacoes',
        variationIndex: 0,
        variationPanel: 'estoque',
      });
    }
  );

  it('leva erro de preço da variação selecionada ao painel de precificação', () => {
    const errors = flattenFormErrors({
      variacoes: [{}, { price: { type: 'custom', message: 'Preço de venda inválido.' } }],
    } as never);
    const fieldPath = Object.keys(errors)[0];

    expect(fieldPath).toBe('variacoes_1_price');
    expect(resolveMobileProductFormErrorNavigation(fieldPath)).toEqual({
      tab: 'variacoes',
      variationIndex: 1,
      variationPanel: 'estoque',
    });
  });

  it('leva erro de foto da variação selecionada ao painel de fotos', () => {
    const errors = flattenFormErrors({
      variacoes: [{}, { images: { type: 'custom', message: 'Vincule uma foto.' } }],
    } as never);
    const fieldPath = Object.keys(errors)[0];

    expect(fieldPath).toBe('variacoes_1_images');
    expect(resolveMobileProductFormErrorNavigation(fieldPath)).toEqual({
      tab: 'variacoes',
      variationIndex: 1,
      variationPanel: 'fotos',
    });
  });

  it('mantém o roteamento de erros registrados diretamente em uma aba', () => {
    expect(resolveMobileProductFormErrorNavigation('fiscal')).toEqual({ tab: 'fiscal' });
  });

  it('não inventa destino para caminhos que não pertencem ao formulário de produto', () => {
    expect(resolveMobileProductFormErrorNavigation('supplier_id')).toBeUndefined();
  });
});
