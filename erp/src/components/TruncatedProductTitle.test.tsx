// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TruncatedProductTitle } from './TruncatedProductTitle';

vi.mock('./productAutocompleteUtils', () => ({
    renderHighlightedProductText: (text: string) => text,
}));

afterEach(cleanup);

describe('TruncatedProductTitle', () => {
    it('renderiza o texto formatado corretamente', () => {
        render(
            <TruncatedProductTitle
                fullName="Cômoda 4 Gavetas 2 Portas Londres Canela/Off White"
                displayName="Cômoda 4 Gavetas 2 Portas Londres Canela/Off White"
                query="Londres"
            />
        );

        expect(screen.getByText(/Cômoda 4 Gavetas 2 Portas/i)).toBeDefined();
    });

    it('NÃO exibe tooltip nem title quando o texto cabe inteiro (sem reticências)', () => {
        const { container } = render(
            <TruncatedProductTitle
                fullName="Cômoda Londres"
                displayName="Cômoda Londres"
                query="Londres"
            />
        );

        const span = container.querySelector('span')!;
        // Simula que o texto cabe perfeitamente
        Object.defineProperty(span, 'scrollWidth', { configurable: true, value: 100 });
        Object.defineProperty(span, 'clientWidth', { configurable: true, value: 200 });

        fireEvent.mouseEnter(span);

        expect(span.getAttribute('title')).toBeNull();
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('exibe tooltip e title com o nome completo quando o texto estiver truncado (com reticências)', () => {
        const fullName = 'Cômoda 4 Gavetas 2 Portas Londres Canela/Off White';
        const { container } = render(
            <TruncatedProductTitle
                fullName={fullName}
                displayName="Cômoda 4 Gavetas 2 Portas Londres ..."
                query="Londres"
            />
        );

        const span = container.querySelector('span')!;
        // Simula texto truncado (scrollWidth > clientWidth)
        Object.defineProperty(span, 'scrollWidth', { configurable: true, value: 350 });
        Object.defineProperty(span, 'clientWidth', { configurable: true, value: 180 });
        span.getBoundingClientRect = vi.fn().mockReturnValue({
            top: 100,
            bottom: 120,
            left: 50,
            right: 230,
            width: 180,
            height: 20,
        });

        fireEvent.mouseEnter(span);

        // Deve definir o title nativo e renderizar o tooltip visual
        expect(span.getAttribute('title')).toBe(fullName);
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toBeDefined();
        expect(tooltip.textContent).toContain(fullName);

        // Ao sair com o mouse, o tooltip deve sumir
        fireEvent.mouseLeave(span);
        expect(screen.queryByRole('tooltip')).toBeNull();
    });
});
