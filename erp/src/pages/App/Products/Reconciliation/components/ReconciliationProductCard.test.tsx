// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReconciliationProductCard } from './ReconciliationProductCard';
import type { ReconciliationProductItem } from '../types/reconciliation.types';
vi.mock('react-toastify', () => ({ toast: { info: vi.fn(), success: vi.fn() } }));
vi.mock('../../../../../components/SupplierAutocomplete', () => ({ default: () => null }));
vi.mock('../../../../../components/CategoryAutocomplete', () => ({ default: () => null }));
vi.mock('../../components/variationTabs/VariationAttributeValueInput', () => ({ VariationAttributeValueInput: () => null }));
afterEach(cleanup);
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
});
