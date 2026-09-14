// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ProductAutocomplete from './ProductAutocomplete';
vi.mock('./shared/DropdownPortal', () => ({ default: () => null }));
vi.mock('./productAutocompleteUtils', () => ({ fetchAllProductSearchResults: vi.fn().mockResolvedValue([]), getVariationDisplayName: vi.fn(), normalizeProductSearch: (text: string) => text, renderHighlightedProductText: vi.fn() }));
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
