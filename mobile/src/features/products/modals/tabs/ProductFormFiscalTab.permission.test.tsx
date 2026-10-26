import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  taxButtons: [] as Array<{ disabled?: boolean; accessibilityState?: { disabled?: boolean } }>,
  taxInputs: [] as Array<{ editable?: boolean; accessibilityState?: { disabled?: boolean } }>,
  taxGroups: [] as Array<Record<string, unknown>>,
}));

vi.mock('react-native', () => {
  const nodeText = (node: any): string => {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(nodeText).join('');
    if (node && typeof node === 'object' && 'props' in node) return nodeText(node.props.children);
    return '';
  };
  const view = ({ children, ...props }: any) => {
    if (props.pointerEvents) mocks.taxGroups.push(props);
    return React.createElement('div', null, children);
  };
  const text = ({ children }: any) => React.createElement('span', null, children);

  return {
    ActivityIndicator: () => null,
    Alert: { alert: vi.fn() },
    ScrollView: view,
    StyleSheet: { create: (styles: unknown) => styles },
    Text: text,
    TextInput: (props: any) => {
      if (props.accessibilityState?.disabled !== undefined) {
        mocks.taxInputs.push({
          editable: props.editable,
          accessibilityState: props.accessibilityState,
        });
      }
      return React.createElement('input', {
        readOnly: props.editable === false,
        'aria-disabled': props.accessibilityState?.disabled,
      });
    },
    TouchableOpacity: ({ children, disabled, accessibilityState, onPress }: any) => {
      if (accessibilityState?.disabled !== undefined) {
        mocks.taxButtons.push({ disabled, accessibilityState });
      }
      return React.createElement('button', { disabled, onClick: onPress }, children);
    },
    View: view,
  };
});

vi.mock('lucide-react-native', () => ({
  ChevronDown: () => null,
  FileText: () => null,
}));

vi.mock('../../services/mobileProductFiscalService', () => ({
  fetchMobileNcmCatalogEntry: vi.fn().mockResolvedValue(null),
  searchMobileNcms: vi.fn().mockResolvedValue([]),
}));

import { ProductFormFiscalTab } from './ProductFormFiscalTab';

const renderFiscalTab = (
  canConfigureProductTaxes: boolean,
  itemType: 'product' | 'service' = 'product'
) =>
  renderToStaticMarkup(
    <ProductFormFiscalTab
      formData={{
        itemType,
        fiscal: {
          ncm: '94017900',
          codigoServico: '0101',
          cfop: '5933',
          cst: '103',
          origem: '0',
          icmsPercent: 2,
          pisCst: '99',
          cofinsCst: '99',
        },
      }}
      setFormData={vi.fn()}
      dark={false}
      canConfigureProductTaxes={canConfigureProductTaxes}
    />
  );

describe('ProductFormFiscalTab item type and permission rendering', () => {
  beforeEach(() => {
    mocks.taxButtons.length = 0;
    mocks.taxInputs.length = 0;
    mocks.taxGroups.length = 0;
  });

  it('shows product-specific fiscal fields only for a normal product', () => {
    const html = renderFiscalTab(true, 'product');

    expect(html).toContain('Classificação Fiscal (NCM)');
    expect(html).toContain('Código NCM (8 dígitos)');
    expect(html).toContain('Origem da Mercadoria');
    expect(html).toContain('CST / CSOSN ICMS (Simples Nacional)');
    expect(html).toContain('Alíquota ICMS (%)');
    expect(html).not.toContain('Código Municipal / Serviço (LC 116/03)');
    expect(html).not.toContain('CFOP Padrão (Municipal)');
    expect(html).not.toContain('Alíquota ISS (%)');
    expect(html).not.toContain('Código CEST');
  });

  it('shows service-specific fields without labeling them as NCM', () => {
    const html = renderFiscalTab(true, 'service');

    expect(html).toContain('Informações Fiscais para NF-e');
    expect(html).not.toContain('Classificação Fiscal (NCM)');
    expect(html).toContain('Código Municipal / Serviço (LC 116/03)');
    expect(html).toContain('CFOP Padrão (Municipal)');
    expect(html).toContain('CST / CSOSN ISSQN');
    expect(html).toContain('Alíquota ISS (%)');
    expect(html).not.toContain('Código NCM (8 dígitos)');
    expect(html).not.toContain('Origem da Mercadoria');
    expect(html).not.toContain('Código CEST');
    expect(html).not.toContain('Alíquota ICMS (%)');
  });

  it('keeps tax values accessible as disabled when the profile cannot edit them', () => {
    const html = renderFiscalTab(false);

    expect(html).toContain('Seu perfil pode consultar os dados fiscais');
    expect(mocks.taxGroups).toHaveLength(1);
    expect(mocks.taxGroups[0]).toMatchObject({ pointerEvents: 'none' });
    expect(mocks.taxGroups[0]).not.toHaveProperty('accessibilityElementsHidden');
    expect(mocks.taxGroups[0]).not.toHaveProperty('importantForAccessibility');
    expect(mocks.taxButtons.length).toBeGreaterThan(0);
    expect(mocks.taxButtons.every((button) => button.disabled)).toBe(true);
    expect(
      mocks.taxButtons.every((button) => button.accessibilityState?.disabled === true)
    ).toBe(true);
    expect(mocks.taxInputs).toEqual([
      { editable: false, accessibilityState: { disabled: true } },
    ]);
  });

  it('keeps controls enabled for profiles that can configure product taxes', () => {
    renderFiscalTab(true);

    expect(mocks.taxButtons.length).toBeGreaterThan(0);
    expect(mocks.taxButtons.every((button) => button.disabled === false)).toBe(true);
    expect(
      mocks.taxButtons.every((button) => button.accessibilityState?.disabled === false)
    ).toBe(true);
    expect(mocks.taxInputs).toEqual([
      { editable: true, accessibilityState: { disabled: false } },
    ]);
  });
});
