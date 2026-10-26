import { describe, expect, it } from 'vitest';
import { flattenFormErrors } from '../../../hooks/useZodForm';
import {
  hasMobileProductDescriptionTechnicalValidationError,
  isMobileProductDescriptionTabDisabled,
  isMobileProductCategoryError,
  isMobileProductNameError,
  isMobileProductCostPriceError,
  isMobileProductSupplierError,
  isMobileProductUnitPriceError,
  resolveMobileProductFormErrorMessage,
  resolveMobileProductFormErrorNavigation,
  resolveMobileProductReadinessTab,
} from './mobileProductFormErrorNavigation';
import { PRODUCT_NAME_REQUIRED_MESSAGE } from '../../../../../shared-utils/productNameRequirement';
import { PRODUCT_CATEGORY_REQUIRED_MESSAGE } from '../../../../../shared-utils/productCategoryRequirement';

describe('mobileProductFormErrorNavigation', () => {
  it('permite a aba Descrição antes da validação técnica, como o ERP', () => {
    expect(isMobileProductDescriptionTabDisabled({
      hasCategory: true,
      hasProductName: true,
      hasTechnicalValidationError: false,
    })).toBe(false);
  });

  it('bloqueia a aba Descrição somente quando a submissão sinaliza erro técnico', () => {
    expect(hasMobileProductDescriptionTechnicalValidationError({ technical: 'Preencha Marca.' })).toBe(true);
    expect(hasMobileProductDescriptionTechnicalValidationError({ variationRegistration: 'Preencha em cada variação.' })).toBe(false);
    expect(isMobileProductDescriptionTabDisabled({
      hasCategory: true,
      hasProductName: true,
      hasTechnicalValidationError: true,
    })).toBe(true);
  });

  it('resolve o requisito para uma aba habilitada do formulário', () => {
    const enabledTabs = ['geral', 'fotos', 'estoque'] as const;

    expect(resolveMobileProductReadinessTab('name', 'geral', enabledTabs)).toBe('geral');
    expect(resolveMobileProductReadinessTab('unitPrice', 'estoque', enabledTabs)).toBe('estoque');
    expect(resolveMobileProductReadinessTab('dimensions', undefined, enabledTabs)).toBeUndefined();
  });

  it('leva fotos da variação única à aba Fotos e respeita abas ocultas/desabilitadas', () => {
    expect(resolveMobileProductReadinessTab('variationPhotos', 'variacoes', ['geral', 'fotos'])).toBe(
      'fotos'
    );
    expect(resolveMobileProductReadinessTab('variationPhotos', 'variacoes', ['geral'])).toBeUndefined();
    expect(resolveMobileProductReadinessTab('categories', 'geral', ['estoque'])).toBeUndefined();
  });

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

  it('leva erro de preço do produto pai à aba Estoque e Precificação', () => {
    const errors = flattenFormErrors({
      unitPrice: { type: 'custom', message: 'Informe o preço de venda do produto.' },
    } as never);
    const fieldPath = Object.keys(errors)[0];

    expect(fieldPath).toBe('unitPrice');
    expect(resolveMobileProductFormErrorNavigation(fieldPath)).toEqual({ tab: 'estoque' });
  });

  it('leva e destaca custo de aquisição inválido na aba Estoque e Precificação', () => {
    const errors = flattenFormErrors({
      costPrice: { type: 'custom', message: 'Informe um custo de aquisição válido.' },
    } as never);
    const fieldPath = Object.keys(errors)[0];

    expect(fieldPath).toBe('costPrice');
    expect(resolveMobileProductFormErrorNavigation(fieldPath)).toEqual({ tab: 'estoque' });
    expect(isMobileProductCostPriceError(fieldPath, errors)).toBe(true);
    expect(isMobileProductCostPriceError('estoque', errors)).toBe(false);
  });

  it('leva erro de nome do produto para Geral e reconhece somente o erro obrigatório do schema', () => {
    const errors = flattenFormErrors({
      name: { type: 'custom', message: PRODUCT_NAME_REQUIRED_MESSAGE },
    } as never);
    const fieldPath = Object.keys(errors)[0];

    expect(fieldPath).toBe('name');
    expect(resolveMobileProductFormErrorNavigation(fieldPath)).toEqual({ tab: 'geral' });
    expect(isMobileProductNameError(fieldPath, errors)).toBe(true);
    expect(isMobileProductNameError('estoque', errors)).toBe(false);
  });

  it('leva categoria ausente à aba Geral e reconhece o erro para realçar o campo', () => {
    const errors = flattenFormErrors({
      categoryIds: { type: 'custom', message: PRODUCT_CATEGORY_REQUIRED_MESSAGE },
    } as never);
    const fieldPath = Object.keys(errors)[0];

    expect(fieldPath).toBe('categoryIds');
    expect(resolveMobileProductFormErrorNavigation(fieldPath)).toEqual({ tab: 'geral' });
    expect(isMobileProductCategoryError(fieldPath, errors)).toBe(true);
    expect(isMobileProductCategoryError('geral', errors)).toBe(false);
    expect(resolveMobileProductFormErrorMessage(fieldPath, errors)).toBe(
      'Preencha todos os campos obrigatórios.'
    );
  });

  it.each([
    [false, 'Preencha todos os campos obrigatórios.'],
    [true, PRODUCT_NAME_REQUIRED_MESSAGE],
  ])('usa o feedback ERP para nome obrigatório no rascunho=%s', (isDraft, expected) => {
    expect(
      resolveMobileProductFormErrorMessage(
        'name',
        { name: PRODUCT_NAME_REQUIRED_MESSAGE },
        isDraft
      )
    ).toBe(expected);
  });

  it.each([
    ['unitPrice', 'Informe um número finito maior ou igual a zero.'],
    ['estoque', 'Informe o preço de venda do produto.'],
  ])('usa a mensagem de preço do ERP para o erro raiz em %s', (fieldPath, message) => {
    expect(resolveMobileProductFormErrorMessage(fieldPath, { [fieldPath]: message })).toBe(
      'Por favor, informe o Preço de Venda do produto na aba Estoque e Precificação.'
    );
  });

  it.each([
    ['unitPrice', 'Informe um número finito maior ou igual a zero.', true],
    ['estoque', 'Informe o preço de venda do produto.', true],
    ['estoque', 'Selecione um fornecedor.', false],
  ])('identifica somente erro de preço para o caminho %s', (fieldPath, message, expected) => {
    expect(isMobileProductUnitPriceError(fieldPath, { [fieldPath]: message })).toBe(expected);
  });

  it('usa o erro genérico do ERP para Estoque Mínimo inválido na finalização', () => {
    expect(
      resolveMobileProductFormErrorMessage('minStock', {
        minStock: 'Informe um número finito maior ou igual a zero.',
      })
    ).toBe('Preencha todos os campos obrigatórios.');
  });

  it('usa a mensagem de schema do ERP para Estoque Mínimo inválido no rascunho', () => {
    expect(
      resolveMobileProductFormErrorMessage(
        'minStock',
        { minStock: 'Informe um número finito maior ou igual a zero.' },
        true
      )
    ).toBe('Informe um valor finito maior ou igual a zero.');
  });

  it.each(['estoque', 'mainSupplierId'])(
    'identifica o erro de fornecedor obrigatório em %s',
    (fieldPath) => {
      expect(
        isMobileProductSupplierError(fieldPath, { [fieldPath]: 'Selecione um fornecedor.' })
      ).toBe(true);
    }
  );

  it('não confunde outros erros da aba com fornecedor obrigatório', () => {
    expect(
      isMobileProductSupplierError('estoque', {
        estoque: 'Informe o preço de venda do produto.',
      })
    ).toBe(false);
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
