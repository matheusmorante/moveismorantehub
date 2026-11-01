import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({ display: '', inputs: {} as Record<string, any> }));
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, useState: () => [captured.display, vi.fn()], useEffect: vi.fn() };
});
vi.mock('react-native', () => ({
  View: ({ children }: any) => React.createElement(React.Fragment, null, children),
  Text: ({ children }: any) => React.createElement(React.Fragment, null, children),
  TouchableOpacity: ({ children }: any) => React.createElement(React.Fragment, null, children),
  TextInput: (props: any) => {
    captured.inputs[props.accessibilityLabel || 'unlabelled'] = props;
    return null;
  },
  StyleSheet: { create: (styles: unknown) => styles },
  Alert: { alert: vi.fn() },
}));
vi.mock('lucide-react-native', () => ({ LockKeyhole: () => null }));

import { CurrencyInput } from './CurrencyInput';
import { MaskedNumericInput } from './MaskedNumericInput';
import { PurchaseOrderDetailsSection } from '../../features/stock/purchases/modals/purchase-form/PurchaseOrderDetailsSection';

describe('máscaras dos valores no pedido de compra', () => {
  beforeEach(() => { captured.inputs = {}; captured.display = ''; });

  it('inicia em centavos ao substituir o valor selecionado e permite limpar', () => {
    const onChangeValue = vi.fn();
    captured.display = 'R$ 0,00';
    let input = CurrencyInput({ value: 0, onChangeValue });
    input.props.onChangeText('1');
    expect(onChangeValue).toHaveBeenLastCalledWith(0.01);
    captured.display = 'R$ 0,01';
    input = CurrencyInput({ value: 0.01, onChangeValue });
    input.props.onChangeText('R$ 0,012');
    expect(onChangeValue).toHaveBeenLastCalledWith(0.12);
    captured.display = 'R$ 0,12';
    input = CurrencyInput({ value: 0.12, onChangeValue });
    input.props.onChangeText('R$ 0,1');
    expect(onChangeValue).toHaveBeenLastCalledWith(0.01);
    input.props.onChangeText('');
    expect(onChangeValue).toHaveBeenLastCalledWith(null);
  });

  it('trata a primeira tecla como centésimo e mantém colagens com vírgula', () => {
    const onChangeValue = vi.fn();
    captured.display = '0,00';
    let input = MaskedNumericInput({ value: 0, onChangeValue, fractionDigits: 2 });
    input.props.onChangeText('1');
    expect(onChangeValue).toHaveBeenLastCalledWith(0.01);
    captured.display = '0,01';
    input = MaskedNumericInput({ value: 0.01, onChangeValue, fractionDigits: 2 });
    input.props.onChangeText('0,012');
    expect(onChangeValue).toHaveBeenLastCalledWith(0.12);
    captured.display = '0,12';
    input = MaskedNumericInput({ value: 0.12, onChangeValue, fractionDigits: 2 });
    input.props.onChangeText('0,1');
    expect(onChangeValue).toHaveBeenLastCalledWith(0.01);
    input.props.onChangeText('12,34');
    expect(onChangeValue).toHaveBeenLastCalledWith(12.34);
  });

  it('aplica a máscara aos três percentuais e preserva valores numéricos para o formulário', () => {
    const setDiscountPercent = vi.fn();
    const setIpiPercent = vi.fn();
    const setFreightPercent = vi.fn();
    captured.display = '0,00';
    renderToStaticMarkup(
      <PurchaseOrderDetailsSection
        supplierName="" onOpenSupplierPicker={vi.fn()} date="2026-10-31" setDate={vi.fn()}
        discountPercent="0" setDiscountPercent={setDiscountPercent}
        ipiPercent="0" setIpiPercent={setIpiPercent}
        freightPercent="0" setFreightPercent={setFreightPercent}
        colors={{ bg: '#fff', surface: '#fff', border: '#ddd', text: '#000', muted: '#666' }}
      />
    );
    for (const label of ['Desconto (%)', 'IPI (%)', 'Frete (%)']) {
      captured.inputs[label].onChangeText('1');
    }
    expect(setDiscountPercent).toHaveBeenCalledWith('0.01');
    expect(setIpiPercent).toHaveBeenCalledWith('0.01');
    expect(setFreightPercent).toHaveBeenCalledWith('0.01');
  });
});
