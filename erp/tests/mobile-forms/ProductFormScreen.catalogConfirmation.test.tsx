// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  alert: vi.fn(),
  fetchTechnicalFields: vi.fn(),
}));

vi.mock('react-native', () => {
  const view = React.forwardRef(({ children }: any, ref: React.Ref<HTMLDivElement>) =>
    React.createElement('div', { ref }, children)
  );
  const text = ({ children }: any) => React.createElement('span', null, children);

  return {
    ActivityIndicator: () => null,
    Alert: { alert: mocks.alert },
    KeyboardAvoidingView: view,
    Modal: ({ children, visible }: any) =>
      visible ? React.createElement('div', null, children) : null,
    Platform: { OS: 'ios', select: (options: any) => options.ios ?? options.default },
    ScrollView: view,
    StatusBar: () => null,
    StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
    Text: text,
    TextInput: (props: any) => React.createElement('input', {
      value: props.value,
      disabled: props.editable === false,
      onChange: (event: any) => props.onChangeText?.(event.target.value),
    }),
    TouchableOpacity: ({
      children,
      disabled,
      accessibilityRole,
      accessibilityLabel,
      accessibilityState,
      onPress,
    }: any) => React.createElement('button', {
      type: 'button',
      role: accessibilityRole,
      'aria-label': accessibilityLabel,
      'aria-selected': accessibilityState?.selected,
      'aria-disabled': accessibilityState?.disabled,
      disabled,
      onClick: onPress,
    }, children),
    View: view,
  };
});

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

vi.mock('lucide-react-native', () => {
  const icon = () => null;
  return {
    Check: icon,
    ChevronLeft: icon,
    ChevronRight: icon,
    FileText: icon,
    Grid3X3: icon,
    Images: icon,
    Info: icon,
    Lock: icon,
    Package: icon,
    Receipt: icon,
    Save: icon,
    X: icon,
  };
});

vi.mock('../../../mobile/src/features/products/hooks/useProductFormPermissions', () => ({
  useProductFormPermissions: () => ({
    isStockistOnly: false,
    canConfigureProductTaxes: true,
    canManageCategories: true,
    hideCatalogPublicationStatus: false,
  }),
}));

vi.mock('../../../mobile/src/features/products/hooks/useMobileProductJevClassification', () => ({
  useMobileProductJevClassification: () => ({
    onFieldFocus: vi.fn(),
    onFieldBlur: vi.fn(),
    suggestion: null,
    isClassifying: false,
    acceptSuggestion: vi.fn(),
    rejectSuggestion: vi.fn(),
  }),
}));

vi.mock('../../../mobile/src/features/products/services/mobileProductTechnicalService', () => ({
  fetchMobileProductTechnicalFields: mocks.fetchTechnicalFields,
}));
vi.mock('../../../mobile/src/features/products/services/mobileProductFiscalService', () => ({
  fetchMobileProductFiscalDefaults: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../../mobile/src/features/products/services/mobileProductCodeService', () => ({
  getNextSequentialProductCode: vi.fn().mockResolvedValue('ARM-001'),
}));

vi.mock('../../../mobile/src/features/products/modals/tabs/ProductFormBasicTab', () => ({ ProductFormBasicTab: () => null }));
vi.mock('../../../mobile/src/features/products/modals/tabs/ProductFormCompositionTab', () => ({
  ProductFormCompositionTab: ({ setFormData }: any) => React.createElement(
    'button',
    {
      type: 'button',
      onClick: () => setFormData((previous: any) => ({
        ...previous,
        comboItems: [
          { productId: 'component-base', variationId: null, quantity: 0, description: 'Base' },
          { productId: 'component-door', variationId: null, quantity: 1, description: 'Porta' },
        ],
      })),
    },
    'Definir composição inválida'
  ),
}));
vi.mock('../../../mobile/src/features/products/modals/tabs/ProductFormDescriptionTab', () => ({ ProductFormDescriptionTab: () => null }));
vi.mock('../../../mobile/src/features/products/modals/tabs/ProductFormFiscalTab', () => ({ ProductFormFiscalTab: () => null }));
vi.mock('../../../mobile/src/features/products/modals/tabs/ProductFormPhotosTab', () => ({ ProductFormPhotosTab: () => null }));
vi.mock('../../../mobile/src/features/products/modals/tabs/ProductFormPricesTab', () => ({ ProductFormPricesTab: () => null }));
vi.mock('../../../mobile/src/features/products/modals/tabs/ProductFormTechnicalTab', () => ({ ProductFormTechnicalTab: () => null }));
vi.mock('../../../mobile/src/features/products/modals/tabs/ProductFormVariationsTab', () => ({
  ProductFormVariationsTab: ({ setFormData }: any) => React.createElement(
    'button',
    {
      type: 'button',
      onClick: () => setFormData((previous: any) => ({
        ...previous,
        variations: (previous.variations || []).map((variation: any, index: number) =>
          index === 0
            ? {
                ...variation,
                comboItems: [
                  { productId: 'component-base', variationId: null, quantity: 0, description: 'Base' },
                  { productId: 'component-door', variationId: null, quantity: 1, description: 'Porta' },
                ],
              }
            : variation
        ),
      })),
    },
    'Definir quantidade inválida na variação'
  ),
}));

import { ProductFormScreen } from '../../../mobile/src/features/products/screens/ProductFormScreen';

const publishedProduct = () => ({
  id: 'product-published',
  name: 'Armário Aurora',
  title: 'Armário Aurora',
  description: 'Armário de madeira.',
  ecommerce_description: 'Armário de madeira.',
  code: 'ARM-001',
  unit: 'UN',
  item_type: 'product',
  product_kind: 'normal',
  condition: 'novo',
  status: 'published',
  is_draft: false,
  active: true,
  has_variations: false,
  unit_price: 1250,
  cost_price: 650,
  category_id: 'category-1',
  category: 'Móveis',
  main_supplier_id: 'supplier-1',
  width: 80,
  height: 180,
  depth: 50,
  weight: 70,
  technical_specs: {},
  images: ['https://example.test/armario.jpg'],
  allVariations: [{
    id: 'variation-1',
    sku: 'ARM-001-01',
    name: 'Armário Aurora',
    unit_price: 1250,
    price: 1250,
    stock: 0,
    active: true,
    status: 'published',
    images: ['https://example.test/armario.jpg'],
    attributes: [],
  }],
});

const publishedComposition = () => {
  const product = publishedProduct();
  const items = [
    { productId: 'component-base', variationId: null, quantity: 1, description: 'Base' },
    { productId: 'component-door', variationId: null, quantity: 1, description: 'Porta' },
  ];
  return {
    ...product,
    item_type: 'composition',
    combo_items: items,
    allVariations: [{ ...product.allVariations[0], combo_items: items }],
  };
};

const draftComposition = () => {
  const product = publishedComposition();
  return {
    ...product,
    is_draft: true,
    isDraft: true,
    status: 'draft',
    active: false,
    allVariations: product.allVariations.map((variation) => ({
      ...variation,
      status: 'draft',
      active: false,
    })),
  };
};

const publishedCompositionFamily = () => {
  const product = publishedProduct();
  const items = [
    { productId: 'component-base', variationId: null, quantity: 1, description: 'Base' },
    { productId: 'component-door', variationId: null, quantity: 1, description: 'Porta' },
  ];
  const [variation] = product.allVariations;
  return {
    ...product,
    item_type: 'composition',
    has_variations: true,
    allVariations: [
      {
        ...variation,
        id: 'variation-blue',
        sku: 'ARM-001-AZ',
        name: 'Armário Azul',
        attributes: [{ name: 'Cor', value: 'Azul' }],
        combo_items: items,
      },
      {
        ...variation,
        id: 'variation-green',
        sku: 'ARM-001-VD',
        name: 'Armário Verde',
        attributes: [{ name: 'Cor', value: 'Verde' }],
        combo_items: items,
      },
    ],
  };
};

const hiddenFamilyWithIncompleteVariableField = () => {
  const product = publishedProduct();
  const [variation] = product.allVariations;
  return {
    ...product,
    status: 'hidden',
    has_variations: true,
    technical_specs: { variableTechnicalFields: ['Modelo'] },
    allVariations: [
      {
        ...variation,
        id: 'variation-blue',
        sku: 'ARM-001-AZ',
        name: 'Armário Azul',
        attributes: [{ name: 'Cor', value: 'Azul' }],
      },
      {
        ...variation,
        id: 'variation-green',
        sku: 'ARM-001-VD',
        name: 'Armário Verde',
        attributes: [{ name: 'Cor', value: 'Verde' }],
      },
    ],
  };
};

const catalogRequirement = {
  name: 'Material da estrutura',
  requiredCategoryIds: ['category-1'],
};

const getCatalogActions = () => {
  const call = mocks.alert.mock.calls.find(([title]) =>
    title === 'Ocultar produto do Catálogo Digital?'
  );
  if (!call) throw new Error('A confirmação de ocultação não foi exibida.');
  return call[2] as Array<{ text: string; onPress?: () => void }>;
};

const renderEditor = (
  product = publishedProduct(),
  options: {
    enableDraftAutoSave?: boolean;
    onAutoSave?: (payload: any) => Promise<unknown>;
  } = {}
) => {
  const onSave = vi.fn(async () => 'product-published');
  const onClose = vi.fn();
  render(
    <ProductFormScreen
      visible
      product={product}
      dark={false}
      enableDraftAutoSave={options.enableDraftAutoSave ?? false}
      onAutoSave={options.onAutoSave}
      onClose={onClose}
      onSave={onSave}
    />
  );
  return { onSave, onClose };
};

const openCatalogConfirmation = async () => {
  fireEvent.click(await screen.findByRole('tab', { name: 'TRIBUTÁRIO / NF' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Salvar alterações' }));
  await waitFor(() => expect(mocks.alert).toHaveBeenCalledWith(
    'Ocultar produto do Catálogo Digital?',
    expect.stringContaining('Material da estrutura'),
    expect.any(Array),
    expect.objectContaining({ cancelable: true })
  ));
};

describe('ProductFormScreen: validação e confirmação ao editar Produto', () => {
  beforeEach(() => {
    mocks.alert.mockReset();
    mocks.fetchTechnicalFields.mockReset().mockResolvedValue([catalogRequirement]);
  });
  afterEach(cleanup);

  it('mantém o produto publicado sem chamar o save quando o operador escolhe continuar editando', async () => {
    const { onSave, onClose } = renderEditor();
    await openCatalogConfirmation();

    const cancel = getCatalogActions().find(({ text }) => text === 'Continuar editando');
    expect(cancel).toBeDefined();
    act(() => cancel?.onPress?.());

    await waitFor(() => expect(onSave).not.toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('oculta pai e variações e salva quando o operador confirma', async () => {
    const { onSave, onClose } = renderEditor();
    await openCatalogConfirmation();

    const confirm = getCatalogActions().find(({ text }) => text === 'Salvar e ocultar');
    expect(confirm).toBeDefined();
    await act(async () => confirm?.onPress?.());

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      status: 'hidden',
      variations: [expect.objectContaining({ status: 'hidden' })],
    }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('bloqueia o salvamento de composição ativa quando um componente tem quantidade menor que um', async () => {
    const { onSave, onClose } = renderEditor(publishedComposition());

    fireEvent.click(await screen.findByRole('tab', { name: 'COMPOSIÇÃO' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Definir composição inválida' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(mocks.alert).toHaveBeenCalledWith(
      'Confira os campos',
      'Informe quantidade maior ou igual a um para o componente.'
    ));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(mocks.fetchTechnicalFields).not.toHaveBeenCalled();
  });

  it('bloqueia o salvamento quando uma variação composta tem componente com quantidade menor que um', async () => {
    const { onSave, onClose } = renderEditor(publishedCompositionFamily());

    fireEvent.click(await screen.findByRole('tab', { name: /VARIAÇÕES/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Definir quantidade inválida na variação' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(mocks.alert).toHaveBeenCalledWith(
      'Confira os campos',
      'Informe quantidade maior ou igual a um para o componente.'
    ));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(mocks.fetchTechnicalFields).not.toHaveBeenCalled();
  });

  it('permite salvar família quando campo técnico variável ainda não tem valor', async () => {
    const { onSave, onClose } = renderEditor(hiddenFamilyWithIncompleteVariableField());

    fireEvent.click(await screen.findByRole('tab', { name: 'TRIBUTÁRIO / NF' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onClose).toHaveBeenCalledOnce();
    expect(mocks.alert).not.toHaveBeenCalledWith(
      'Confira os campos',
      expect.stringContaining('Informe em cada variação')
    );
  });

  it('salva automaticamente como rascunho uma composição incompleta', async () => {
    const onAutoSave = vi.fn(async () => ({
      productId: 'd02caec3-106c-4c2e-9b8e-120fe0a464d6',
      updatedAt: '2026-10-26T15:00:00.000Z',
    }));
    const { onSave, onClose } = renderEditor(draftComposition(), {
      enableDraftAutoSave: true,
      onAutoSave,
    });

    fireEvent.click(await screen.findByRole('tab', { name: 'COMPOSIÇÃO' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Definir composição inválida' }));

    await waitFor(() => expect(onAutoSave).toHaveBeenCalledOnce(), { timeout: 3000 });
    expect(onAutoSave).toHaveBeenCalledWith(expect.objectContaining({
      isDraft: true,
      status: 'draft',
      active: false,
      comboItems: expect.arrayContaining([
        expect.objectContaining({ productId: 'component-base', quantity: 0 }),
      ]),
      variations: [expect.objectContaining({
        comboItems: expect.arrayContaining([
          expect.objectContaining({ productId: 'component-base', quantity: 0 }),
        ]),
      })],
    }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(mocks.fetchTechnicalFields).not.toHaveBeenCalled();
  });
});
