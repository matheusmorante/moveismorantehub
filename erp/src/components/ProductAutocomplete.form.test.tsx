// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock('./productAutocompleteUtils', () => ({ fetchAllProductSearchResults: mocks.search, getVariationDisplayName: (product: any, variation: any) => variation?.name || product.name, normalizeProductSearch: (value: string) => value.toLocaleLowerCase(), renderHighlightedProductText: (value: string) => value }));
vi.mock('./shared/DropdownPortal', () => ({ default: ({ children, isOpen }: any) => isOpen ? <div>{children}</div> : null }));
import ProductAutocomplete from './ProductAutocomplete';
const product = { id: 'product', name: 'Armário', code: '1', supplierId: 'supplier', active: true, unitPrice: 0, stock: 0, productKind: 'normal', itemType: 'product', variations: [] };
beforeEach(() => { vi.resetAllMocks(); mocks.search.mockResolvedValue([product]); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('shared product search form', () => {
  it('uses parsed supplier/query before service and selects only the current suggestion', async () => {
    const select = vi.fn(); render(<ProductAutocomplete onSelect={select} supplierId=" supplier " />); fireEvent.change(screen.getByRole('textbox'), { target: { value: ' Armário ' } });
    const suggestion = await screen.findByRole('button', { name: /Armário/ }); expect(mocks.search).toHaveBeenCalledWith('Armário', 'supplier', false); fireEvent.click(suggestion); expect(select).toHaveBeenCalledWith(product, undefined);
  });
  it('shows a resolver error before dispatch for an invalid supplier', async () => {
    render(<ProductAutocomplete onSelect={vi.fn()} supplierId="  " />); fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Armário' } });
    await screen.findByRole('alert'); expect(mocks.search).not.toHaveBeenCalled();
  });
  it('shows service failure and retries explicitly through the resolver', async () => {
    mocks.search.mockRejectedValueOnce(new Error('Offline')); render(<ProductAutocomplete onSelect={vi.fn()} />); fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Armário' } });
    await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: 'Tentar buscar novamente' })); await screen.findByRole('button', { name: /Armário/ }); expect(mocks.search).toHaveBeenCalledTimes(2);
  });
  it('bounds the read and prevents selecting stale results after changing the query', async () => {
    vi.useFakeTimers(); let resolve!: (value: any) => void; mocks.search.mockReturnValueOnce(new Promise((yes) => { resolve = yes; })).mockResolvedValue([]); const select = vi.fn(); render(<ProductAutocomplete onSelect={select} />);
    await act(async () => { fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Armário' } }); await vi.advanceTimersByTimeAsync(300); });
    await act(async () => { fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Mesa' } }); await vi.advanceTimersByTimeAsync(300); resolve([product]); }); expect(screen.queryByRole('button', { name: /Armário/ })).toBeNull(); expect(select).not.toHaveBeenCalled();
    mocks.search.mockReturnValue(new Promise(() => {})); await act(async () => { fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Outro' } }); await vi.advanceTimersByTimeAsync(10_301); }); expect(screen.getByRole('alert')).toBeTruthy();
  });
  it('does not query or allow old suggestions when disabled by the owning form', async () => {
    const select = vi.fn(); const view = render(<ProductAutocomplete onSelect={select} />); fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Armário' } }); const previous = await screen.findByRole('button', { name: /Armário/ });
    view.rerender(<ProductAutocomplete onSelect={select} disabled />); fireEvent.click(previous); expect(select).not.toHaveBeenCalled(); expect(screen.getByRole('textbox')).toHaveProperty('disabled', true); await waitFor(() => expect(mocks.search).toHaveBeenCalledOnce());
  });
});
