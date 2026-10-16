// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InventoryScopeModal from './InventoryScopeModal';
import type Product from '@/pages/types/product.type';
import type Person from '@/pages/types/person.type';
import type { ScopeConfiguration } from '../types/inventoryScope.types';

vi.mock('@/pages/utils/productService', () => ({ fetchProductsPage: vi.fn(() => { throw new Error('Unexpected catalog request'); }) }));

const product: Product = { id: 'product-1', description: 'Produto', stock: 0, active: false, unit: 'UN', unitPrice: 0, itemType: 'product', variations: [] };
const employee = { id: 'employee-1', type: 'employees', fullName: 'Operador Teste', role: 'manager' } as Person;
const products = [product];
const employees = [employee];
const suppliers: Person[] = [];

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

function setup(allProducts = products, onConfirm = vi.fn<(config: ScopeConfiguration) => void | boolean | Promise<void | boolean>>().mockResolvedValue(true), copiedItems?: React.ComponentProps<typeof InventoryScopeModal>['copiedItems']) {
  const onCancel = vi.fn();
  const props = { allProducts, suppliers, employees, onCancel, onConfirm, copiedItems };
  const view = render(<InventoryScopeModal {...props} />);
  const selectType = (type: 'full' | 'custom' = 'full') => fireEvent.click(screen.getByRole('button', {
    name: type === 'full' ? /Estoque Completo/ : /Seleção Personalizada/,
  }));
  const selectResponsible = () => {
    fireEvent.change(screen.getByPlaceholderText('Buscar responsável (digite 2+ letras)'), { target: { value: 'Operador' } });
    fireEvent.click(screen.getByRole('button', { name: /Operador Teste/ }));
  };
  const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Confirmar e Iniciar' }));
  return { ...view, props, onCancel, onConfirm, selectType, selectResponsible, submit };
}

describe('inventory scope owner with real builder, children and RHF/resolver', () => {
  it('shows the resolver error and prevents confirmation without a responsible employee', async () => {
    const view = setup(); view.selectType(); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Selecione o responsável'));
    expect(view.onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByText('Validando e iniciando inventário...')).toBeNull();
  });

  it('validates the complete snapshot before the callback', async () => {
    const view = setup([{ ...product, stock: Number.NaN }]); view.selectType(); view.selectResponsible(); view.submit();
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(view.onConfirm).not.toHaveBeenCalled();
  });

  it.each([undefined, true])('preserves zero stock and false activity with a successful %s callback', async (result) => {
    const onConfirm = vi.fn().mockResolvedValue(result);
    const view = setup(products, onConfirm); view.selectType(); view.selectResponsible(); view.submit();
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByText('Validando e iniciando inventário...')).toBeNull());
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      type: 'full', hasStages: true, responsibleId: 'employee-1', supplierId: '',
      itemsSnapshot: [expect.objectContaining({ productId: 'product-1', systemStock: 0, isActive: false, unit: 'UN' })],
    }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(view.onCancel).not.toHaveBeenCalled();
  });

  it('preserves the empty custom scope before any offline catalog synchronization', async () => {
    const view = setup([{ ...product, stock: Number.NaN }]); view.selectType('custom'); view.selectResponsible(); view.submit();
    await waitFor(() => expect(view.onConfirm).toHaveBeenCalledWith({
      type: 'custom', name: 'Inventário Personalizado', supplierId: '', responsibleId: 'employee-1',
      hasStages: false, itemsSnapshot: [],
    }));
    expect(screen.getByText('Índice offline ainda não sincronizado neste navegador')).toBeTruthy();
  });

  it('locks synchronously through validation and callback, including fields and close actions', async () => {
    let finish!: () => void;
    const onConfirm = vi.fn().mockReturnValue(new Promise<boolean>((resolve) => { finish = () => resolve(true); }));
    const view = setup(products, onConfirm); view.selectType(); view.selectResponsible();
    const submit = screen.getByRole('button', { name: 'Confirmar e Iniciar' });
    act(() => {
      fireEvent.click(submit); fireEvent.click(submit);
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      fireEvent.click(screen.getByRole('button', { name: 'Fechar escopo' }));
    });
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce());
    expect(view.onCancel).not.toHaveBeenCalled();
    expect(screen.getByText('Validando e iniciando inventário...')).toBeTruthy();
    expect((screen.getByPlaceholderText('Buscar responsável (digite 2+ letras)').closest('fieldset') as HTMLFieldSetElement).disabled).toBe(true);
    await act(async () => { finish(); });
    expect(screen.queryByText('Validando e iniciando inventário...')).toBeNull();
  });

  it.each(['false', 'rejection'])('reports %s as failure and permits a known-failure retry', async (failure) => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    if (failure === 'false') onConfirm.mockResolvedValueOnce(false);
    else onConfirm.mockRejectedValueOnce(new Error('Local storage unavailable'));
    const view = setup(products, onConfirm); view.selectType('custom'); view.selectResponsible(); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Não foi possível iniciar'));
    expect(view.onCancel).not.toHaveBeenCalled();
    view.submit();
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('releases progress at 60 seconds and blocks replay, including after a late acknowledgment', async () => {
    let finish!: () => void;
    const onConfirm = vi.fn().mockReturnValue(new Promise<boolean>((resolve) => { finish = () => resolve(true); }));
    const view = setup(products, onConfirm); view.selectType('custom'); view.selectResponsible();
    vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {});
    await act(async () => { view.submit(); });
    expect(onConfirm).toHaveBeenCalledOnce();
    await act(async () => { await vi.advanceTimersByTimeAsync(59_999); });
    expect(screen.getByText('Validando e iniciando inventário...')).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(screen.queryByText('Validando e iniciando inventário...')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('não foi confirmado no prazo');
    view.submit(); expect(onConfirm).toHaveBeenCalledOnce();
    await act(async () => { finish(); });
    expect(screen.getByRole('alert').textContent).toContain('Confira os rascunhos');
    fireEvent.click(screen.getByRole('button', { name: 'Fechar escopo' }));
    expect(view.onCancel).toHaveBeenCalledOnce();
  });

  it.each([{ uncertain: true }, new TypeError('Failed to fetch')])('blocks replay of an uncertain rejection %#', async (cause) => {
    const onConfirm = vi.fn().mockRejectedValue(cause);
    const view = setup(products, onConfirm); view.selectType('custom'); view.selectResponsible(); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Confira os rascunhos'));
    view.submit(); expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.queryByText('Validando e iniciando inventário...')).toBeNull();
  });

  it('checks the latest employee list after resolver validation', async () => {
    const view = setup(); view.selectType(); view.selectResponsible();
    act(() => {
      view.submit();
      view.rerender(<InventoryScopeModal {...view.props} employees={[]} />);
    });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('responsável não está mais disponível'));
    expect(view.onConfirm).not.toHaveBeenCalled();
  });

  it('does not invoke the callback after unmount during the resolver', async () => {
    const view = setup(); view.selectType(); view.selectResponsible();
    act(() => { view.submit(); view.unmount(); });
    await act(async () => {});
    expect(view.onConfirm).not.toHaveBeenCalled();
  });

  it('does not affect a new opening when the old callback finishes', async () => {
    let finish!: () => void;
    const onConfirm = vi.fn().mockReturnValue(new Promise<boolean>((resolve) => { finish = () => resolve(false); }));
    const old = setup(products, onConfirm); old.selectType('custom'); old.selectResponsible(); old.submit();
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce());
    old.unmount();
    const current = setup();
    await act(async () => { finish(); });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(current.onCancel).not.toHaveBeenCalled(); expect(current.onConfirm).not.toHaveBeenCalled();
  });

  it('duplicates the chosen products with current stock and no historical count or scanned labels', async () => {
    const copy = [{ productId: 'product-1', variationId: 'v1', name: 'Nome antigo', systemStock: 99, physicalCount: 40, scannedLabelIds: ['old-label'] }];
    const current = { ...product, stock: 5, active: true, variations: [{ id: 'v1', name: 'Variação atual', stock: 5, sku: 'CURRENT', active: true }] } as Product;
    const view = setup([current], undefined, copy);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar e Iniciar' })).toBeTruthy());
    view.selectResponsible(); view.submit();
    await waitFor(() => expect(view.onConfirm).toHaveBeenCalledOnce());
    const data = view.onConfirm.mock.calls[0][0];
    expect(data).toMatchObject({ type: 'custom', hasStages: false, itemsSnapshot: [{ productId: 'product-1', variationId: 'v1', systemStock: 5, sku: 'CURRENT' }] });
    expect(data.itemsSnapshot[0]).not.toHaveProperty('physicalCount');
    expect(data.itemsSnapshot[0]).not.toHaveProperty('scannedLabelIds');
  });

  it.each([{ copy: [] }, { copy: [{ productId: 'missing', name: '', systemStock: 1, physicalCount: null }] },
    { copy: [{ productId: 'product-1', variationId: 'missing', name: '', systemStock: 1, physicalCount: null }] }])('shows an unavailable or empty copy without starting %#', async ({ copy }) => {
    const view = setup(products, undefined, copy);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('cópia contém itens indisponíveis'));
    expect(view.onConfirm).not.toHaveBeenCalled();
  });

  it('rejects a catalog change during validation instead of persisting an old baseline', async () => {
    const view = setup(); view.selectType(); view.selectResponsible(); view.submit();
    view.rerender(<InventoryScopeModal {...view.props} allProducts={[{ ...product, stock: 7 }]} />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('catálogo mudou'));
    expect(view.onConfirm).not.toHaveBeenCalled();
  });
});
