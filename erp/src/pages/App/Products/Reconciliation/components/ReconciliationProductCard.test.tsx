// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from } }));
import { ReconciliationProductCard } from './ReconciliationProductCard';
import type { ReconciliationProductItem } from '../types/reconciliation.types';
vi.mock('react-toastify', () => ({ toast: { info: vi.fn(), success: vi.fn() } }));
vi.mock('../../../../../components/SupplierAutocomplete', () => ({ default: () => null }));
vi.mock('../../../../../components/CategoryAutocomplete', () => ({ default: () => null }));
vi.mock('../../components/variationTabs/VariationAttributeValueInput', () => ({ VariationAttributeValueInput: ({ attributeName, value, onChange }: any) => <input aria-label={`Característica ${attributeName}`} value={value} onChange={(event) => onChange(event.target.value)} /> }));
beforeEach(() => {
  mocks.from.mockImplementation(() => {
    const builder: any = { then(resolve: any, reject: any) { return Promise.resolve({ data: [{ id: ' s1 ', full_name: 'Fornecedor A' }], error: null }).then(resolve, reject); } };
    for (const method of ['select', 'or', 'eq', 'order', 'limit']) builder[method] = () => builder;
    return builder;
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
const attribute = { name: 'Cor', value: 'Branco', showName: true, legacyOrigin: 'catalog' };
const product: ReconciliationProductItem = {
  id: 'product-1', name: 'Cadeira', price: 20,
  variations: [{ id: 'variation-1', name: 'Branca', sku: 'SKU-1', price: 25, attributes: [attribute] }],
  pendencies: [{ id: 'ncm', type: 'ncm', level: 'parent', field: 'ncm', label: 'NCM', isCritical: true }],
  hasParentPendencies: true, hasVariationPendencies: false,
};
function setup(value = product, onSaveProduct = vi.fn(async () => true)) {
  render(<ReconciliationProductCard product={value} isSelected={false} onToggleSelect={vi.fn()} onSaveProduct={onSaveProduct} />);
  return onSaveProduct;
}
describe('Reconciliation product card resolver', () => {
  it('keeps an incomplete NCM editable and blocks persistence with a visible error', async () => {
    const save = setup();
    const input = screen.getByPlaceholderText('Ex: 9403.50.00');
    fireEvent.change(input, { target: { value: '9403' } });
    expect(screen.getByPlaceholderText('Ex: 9403.50.00')).toBe(input);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('8 dígitos'));
    expect(save).not.toHaveBeenCalled();
  });
  it('passes normalized NCM and preserved variation metadata to the real owner callback', async () => {
    const save = setup();
    fireEvent.change(screen.getByPlaceholderText('Ex: 9403.50.00'), { target: { value: '9403.50.00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith('product-1', { id: 'product-1', ncm: '94035000', price: 20 }, [
      { id: 'variation-1', price: 25, attributes: [attribute] },
    ]));
  });
  it('rejects negative prices while allowing reconciliation of a partial product', async () => {
    const save = setup({ ...product, price: -1 });
    fireEvent.change(screen.getByPlaceholderText('Ex: 9403.50.00'), { target: { value: '94035000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('negativo'));
    expect(save).not.toHaveBeenCalled();
  });
  it('blocks invalid variation prices before any product update', async () => {
    const save = setup({ ...product, variations: [{ ...product.variations[0], price: Number.NaN }] });
    fireEvent.change(screen.getByPlaceholderText('Ex: 9403.50.00'), { target: { value: '94035000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(save).not.toHaveBeenCalled();
  });
  it('shows callback failures without discarding the pending edits', async () => {
    const save = vi.fn(async () => { throw new Error('Falha ao salvar produto.'); });
    setup(product, save);
    fireEvent.change(screen.getByPlaceholderText('Ex: 9403.50.00'), { target: { value: '94035000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Falha ao salvar produto.'));
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeTruthy();
  });
  it('keeps edits made while saving pending after the original snapshot is confirmed', async () => {
    let finish!: (value: boolean) => void; const save = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; })); setup(product, save);
    fireEvent.change(screen.getByPlaceholderText('Ex: 9403.50.00'), { target: { value: '94035000' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Salvar' })); });
    fireEvent.change(screen.getByPlaceholderText('Ex: 9403.50.00'), { target: { value: '94031000' } });
    await act(async () => { finish(true); }); expect(screen.getByRole('button', { name: 'Salvar' })).toBeTruthy();
    expect(screen.getByPlaceholderText('Ex: 9403.50.00')).toHaveProperty('value', '94031000'); expect(save).toHaveBeenCalledTimes(1);
  });
  it('shows a false callback outcome as an error', async () => {
    const save = setup(product, vi.fn(async () => false)); fireEvent.change(screen.getByPlaceholderText('Ex: 9403.50.00'), { target: { value: '94035000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' })); await screen.findByRole('alert'); expect(save).toHaveBeenCalledTimes(1);
  });
  it('blocks resubmission when the owner cannot confirm persistence', async () => {
    const save = vi.fn(async () => ({ success: false, uncertain: true, error: 'Confira o produto' }));
    render(<ReconciliationProductCard product={product} isSelected={false} onToggleSelect={vi.fn()} onSaveProduct={save} />);
    fireEvent.change(screen.getByPlaceholderText('Ex: 9403.50.00'), { target: { value: '94035000' } }); fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await screen.findByRole('alert'); const button = screen.getByRole('button', { name: 'Salvar' }); expect(button).toHaveProperty('disabled', true); fireEvent.click(button); expect(save).toHaveBeenCalledTimes(1);
  });
  it('searches a supplier through the real resolver and saves the selected ID', async () => {
    vi.useFakeTimers(); const save = setup({ ...product, pendencies: [{ id: 'supplier', type: 'supplier', level: 'parent', field: 'supplierId', label: 'Fornecedor', isCritical: true }] });
    fireEvent.change(screen.getByLabelText('Buscar fornecedor'), { target: { value: 'Fornecedor' } }); await act(async () => { await vi.advanceTimersByTimeAsync(351); });
    fireEvent.click(screen.getByRole('button', { name: 'Fornecedor A' })); await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Salvar' })); });
    expect(save).toHaveBeenCalledWith('product-1', expect.objectContaining({ mainSupplierId: 's1' }), expect.any(Array));
  });
  it('validates provided integer attributes while preserving other incomplete corrections', async () => {
    const save = setup({ ...product, variations: [{ ...product.variations[0], attributes: [{ name: 'Quantidade', value: '', legacyOrigin: 'cadastro' } as any, { name: 'Cor', value: '' }] }],
      pendencies: [
        { id: 'quantity', type: 'category_attribute', level: 'variation', variationId: 'variation-1', field: 'attributes', label: 'Quantidade', attributeName: 'Quantidade', attributeDataType: 'integer', isCritical: true },
        { id: 'color', type: 'category_attribute', level: 'variation', variationId: 'variation-1', field: 'attributes', label: 'Cor', attributeName: 'Cor', attributeDataType: 'text', isCritical: true },
      ] });
    fireEvent.change(screen.getByLabelText('Característica Quantidade'), { target: { value: '1.5' } }); fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await screen.findByRole('alert'); expect(save).not.toHaveBeenCalled();
    expect(screen.getByText(/2\s+pendente\(s\)/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Característica Quantidade'), { target: { value: '2' } }); fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith('product-1', expect.any(Object), [expect.objectContaining({ attributes: [expect.objectContaining({ name: 'Quantidade', value: '2', legacyOrigin: 'cadastro' }), expect.objectContaining({ name: 'Cor', value: '' })] })]));
  });
});
