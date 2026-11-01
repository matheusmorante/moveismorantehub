import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ onLayout: null as null | ((event: any) => void) }));
vi.mock('react-native', () => ({
  View: ({ children, onLayout }: any) => { if (onLayout) mock.onLayout = onLayout; return <div>{children}</div>; },
  Text: ({ children }: any) => <span>{children}</span>,
  TextInput: ({ accessibilityLabel, value, onChangeText }: any) => <input aria-label={accessibilityLabel} value={value} onChange={(event) => onChangeText?.(event.target.value)} />,
  TouchableOpacity: ({ children, onPress, accessibilityLabel, accessibilityState, disabled }: any) => (
    <button aria-label={accessibilityLabel} aria-expanded={accessibilityState?.expanded} onClick={onPress} disabled={disabled}>{children}</button>
  ),
  Pressable: ({ children, onPress, accessibilityLabel }: any) => <button aria-label={accessibilityLabel} onClick={onPress}>{children}</button>,
  Modal: ({ visible, children }: any) => visible ? <div role="dialog">{children}</div> : null,
  StyleSheet: { create: (styles: unknown) => styles, absoluteFill: {} },
  Alert: { alert: vi.fn() },
}));
vi.mock('lucide-react-native', () => ({ ChevronDown: () => null, MoreVertical: () => null, Plus: () => null, Trash2: () => null }));
vi.mock('../../../mobile/src/components/shared/CurrencyInput', () => ({
  CurrencyInput: ({ accessibilityLabel, value }: any) => <input aria-label={accessibilityLabel} value={value} readOnly />,
}));
vi.mock('../../../mobile/src/features/stock/purchases/hooks/usePurchaseForm', () => ({
  formatMoney: (value: number) => `R$ ${value.toFixed(2)}`,
  parseNumber: (value: string) => Number(value) || 0,
}));

import { PurchaseOrderItems } from '../../../mobile/src/features/stock/purchases/modals/purchase-form/PurchaseOrderItems';

afterEach(() => { cleanup(); mock.onLayout = null; });

describe('itens do pedido no aplicativo', () => {
  it('expande um item por vez, mostra a composição separada e confirma a remoção', () => {
    const onRemoveItem = vi.fn();
    const onOpenProductPicker = vi.fn();
    const items = [
      { productId: 'a', description: 'Mesa', quantity: 2, baseCost: 10, unitCost: 10, totalCost: 20 },
      { productId: 'b', description: 'Cadeira', quantity: 1, baseCost: 20, unitCost: 20, totalCost: 20 },
    ];
    const props = {
      items, discountPercent: '0', ipiPercent: '3', freightPercent: '7',
      onOpenProductPicker, onAddItemRow: vi.fn(), onUpdateItem: vi.fn(), onRemoveItem,
      colors: { bg: '#fff', surface: '#fff', border: '#ddd', text: '#000', muted: '#666' },
    };
    const { rerender } = render(<PurchaseOrderItems {...props} />);
    act(() => mock.onLayout?.({ nativeEvent: { layout: { width: 320 } } }));
    expect(screen.getAllByRole('button', { name: 'Adicionar item' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Expandir item Mesa' }));
    expect(screen.getByRole('button', { name: 'Recolher item Mesa' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Expandir item Cadeira' }).getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar ou alterar produto: Mesa' }));
    expect(onOpenProductPicker).toHaveBeenCalledWith(0);
    expect(screen.getByText('Composição do custo por unidade')).toBeTruthy();
    expect(screen.getByText('Desconto / unidade')).toBeTruthy();
    expect(screen.getByText(/IPI \/ unidade/)).toBeTruthy();
    expect(screen.getByText(/Frete \/ unidade/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções de Mesa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remover item' }));
    expect(onRemoveItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onRemoveItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções de Mesa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remover item' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));
    expect(onRemoveItem).toHaveBeenCalledWith(0);

    rerender(<PurchaseOrderItems {...props} items={[...items, { productId: '', description: '', quantity: 1, baseCost: 0, unitCost: 0, totalCost: 0 }]} />);
    expect(screen.getByRole('button', { name: 'Recolher item Produto não informado' }).getAttribute('aria-expanded')).toBe('true');
    act(() => mock.onLayout?.({ nativeEvent: { layout: { width: 800 } } }));
    expect(screen.getAllByRole('button', { name: 'Adicionar item' })).toHaveLength(1);
    act(() => mock.onLayout?.({ nativeEvent: { layout: { width: 1200 } } }));
    expect(screen.getByText('Qtd.')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Quantidade de Mesa' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Expandir composição de Mesa' }));
    expect(screen.getByText(/IPI \/ unidade/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Adicionar item' })).toHaveLength(1);
  });
});
