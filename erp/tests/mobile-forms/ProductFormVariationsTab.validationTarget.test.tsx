// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => {
  const view = React.forwardRef(({ children }: any, ref: React.Ref<HTMLDivElement>) =>
    React.createElement('div', { ref }, children)
  );
  const text = ({ children }: any) => React.createElement('span', null, children);

  return {
    Alert: { alert: vi.fn() },
    Image: () => null,
    Modal: ({ children, visible }: any) =>
      visible ? React.createElement('div', null, children) : null,
    ScrollView: view,
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
      'aria-expanded': accessibilityState?.expanded,
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
    Plus: icon,
    Link2: icon,
    Unlink: icon,
    Info: icon,
    Settings: icon,
    FileText: icon,
    Images: icon,
    Package: icon,
    Network: icon,
    X: icon,
    Check: icon,
    Camera: icon,
    Pencil: icon,
    Sparkles: icon,
    Trash2: icon,
  };
});

vi.mock('../../../mobile/src/features/products/modals/tabs/ProductFormCompositionTab', () => ({
  ProductFormCompositionTab: ({ formData }: any) =>
    React.createElement('div', { 'data-testid': 'variation-composition-panel' },
      `Composição da variação ${formData.name}`),
}));
vi.mock('../../../mobile/src/features/products/modals/tabs/ProductFormTechnicalTab', () => ({
  ProductFormTechnicalTab: () => null,
}));
vi.mock('../../../mobile/src/features/products/modals/components/ProductVariationPhotosEditor', () => ({
  ProductVariationPhotosEditor: () => null,
}));
vi.mock('../../../mobile/src/features/products/modals/ProductVariationGenerationModal', () => ({
  ProductVariationGenerationModal: () => null,
}));
vi.mock('../../../mobile/src/features/products/components/MergedBadge', () => ({
  MergedBadge: () => null,
}));
vi.mock('../../../mobile/src/features/products/services/mobileProductMutationService', () => ({
  checkMobileProductVariationHasMoves: vi.fn().mockResolvedValue(false),
}));

import { ProductFormVariationsTab } from '../../../mobile/src/features/products/modals/tabs/ProductFormVariationsTab';

afterEach(() => cleanup());

describe('Navegação de erro em variações do formulário de Produto', () => {
  it('expande a variação com erro e abre o painel Produtos Componentes', async () => {
    const onValidationTargetHandled = vi.fn();
    const formData = {
      name: 'Armário Aurora',
      code: 'ARM-001',
      itemType: 'composition',
      item_type: 'composition',
      unitPrice: '1250',
      promoPrice: '',
      costPrice: '650',
      categoryIds: [],
      images: [],
      status: 'draft',
      variations: [
        {
          id: 'variation-door',
          sku: 'ARM-001-01',
          name: 'Portas',
          price: 1250,
          stock: 0,
          attributes: [],
        },
        {
          id: 'variation-drawer',
          sku: 'ARM-001-02',
          name: 'Gavetas',
          price: 1250,
          stock: 0,
          attributes: [],
        },
      ],
    };
    const ValidationTargetHarness = () => {
      const [validationTarget, setValidationTarget] = React.useState<{
        tab: 'variacoes';
        variationIndex: number;
        variationPanel: 'compostos';
      } | null>({ tab: 'variacoes', variationIndex: 1, variationPanel: 'compostos' });
      const handleValidationTarget = React.useCallback(() => {
        onValidationTargetHandled();
        setValidationTarget(null);
      }, [onValidationTargetHandled]);

      return (
        <ProductFormVariationsTab
          formData={formData}
          setFormData={vi.fn()}
          dark={false}
          validationTarget={validationTarget}
          onValidationTargetHandled={handleValidationTarget}
        />
      );
    };

    render(<ValidationTargetHarness />);

    await waitFor(() => {
      expect(screen.getByTestId('variation-composition-panel').textContent)
        .toContain('Composição da variação Gavetas');
      expect(screen.getByRole('tab', { name: 'Produtos Componentes' })
        .getAttribute('aria-selected')).toBe('true');
    });
    expect(onValidationTargetHandled).toHaveBeenCalledOnce();
  });
});
