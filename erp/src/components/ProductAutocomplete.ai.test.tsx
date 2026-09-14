// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ProductAutocomplete from './ProductAutocomplete';
import { fetchAllProductSearchResults } from './productAutocompleteUtils';
vi.mock('./shared/DropdownPortal', () => ({ default: ({ children, isOpen }: any) => isOpen ? <div>{children}</div> : null }));
vi.mock('./productAutocompleteUtils', () => ({
    fetchAllProductSearchResults: vi.fn().mockResolvedValue([]),
    getVariationDisplayName: (product: any, variation: any) => variation?.name || product.name || product.title || '',
    normalizeProductSearch: (text: string) => text.toLowerCase(),
    renderHighlightedProductText: (text: string) => text,
}));
afterEach(cleanup);

it('mantém o input livre e habilitado para escrita mesmo durante a busca de sugestões', () => {
    const view = render(<ProductAutocomplete onSelect={vi.fn()} isLoadingSuggestions />);
    const input = view.getByRole('textbox') as HTMLInputElement;
    expect(input.disabled).toBe(false);
    expect(input.getAttribute('aria-busy')).toBe('true');
    fireEvent.change(input, { target: { value: 'Guarda Roupa' } });
    expect(input.value).toBe('Guarda Roupa');
});

it('mostra aceite e recusa dentro do campo e libera a pesquisa após recusar', () => {
    const accept = vi.fn(); const reject = vi.fn();
    const view = render(<ProductAutocomplete onSelect={vi.fn()} value="Beliche Rubim" isAiSuggestion onAcceptSuggestion={accept} onRejectSuggestion={reject} />);
    fireEvent.click(view.getByRole('button', { name: 'Aceitar sugestão da IA' }));
    expect(accept).toHaveBeenCalledOnce();
    fireEvent.click(view.getByRole('button', { name: 'Recusar sugestão da IA' }));
    expect(reject).toHaveBeenCalledOnce();
    view.rerender(<ProductAutocomplete onSelect={vi.fn()} value="" />);
    const input = view.getByRole('textbox') as HTMLInputElement;
    expect(input.readOnly).toBe(false);
    expect(input.value).toBe('');
});

it('em busca de produto pai não oferece as variações filhas', async () => {
    const parent = {
        id: 'pai-armario',
        name: 'Armário Multiuso',
        code: '003962',
        variations: [{ id: 'var-branco', name: 'Armário Multiuso Branco', sku: '003962-01' }],
    } as any;
    vi.mocked(fetchAllProductSearchResults).mockResolvedValueOnce([parent]);
    const onSelect = vi.fn();
    const view = render(<ProductAutocomplete onSelect={onSelect} parentsOnly />);

    fireEvent.change(view.getByRole('textbox'), { target: { value: 'armário' } });
    await waitFor(() => expect(view.getByText('Armário Multiuso')).toBeTruthy());
    expect(view.queryByText('Armário Multiuso Branco')).toBeNull();

    fireEvent.click(view.getByText('Armário Multiuso'));
    expect(onSelect).toHaveBeenCalledWith(parent, undefined);
});
