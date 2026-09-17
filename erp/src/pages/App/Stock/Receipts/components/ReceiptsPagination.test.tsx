// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ReceiptsPagination } from './ReceiptsPagination';

afterEach(cleanup);

describe('ReceiptsPagination [TESTE_AUT]', () => {
    it('deve renderizar contagem e botões corretamente com 15 itens por página', () => {
        const onPageChange = vi.fn();
        render(
            <ReceiptsPagination
                currentPage={1}
                totalPages={3}
                totalItems={38}
                itemsPerPage={15}
                onPageChange={onPageChange}
            />
        );

        expect(screen.getByText(/Exibindo/i)).toBeDefined();
        expect(screen.getByText('1-15')).toBeDefined();
        expect(screen.getByText('38')).toBeDefined();
        expect(screen.getByText('(15 por página)')).toBeDefined();

        const nextButton = screen.getByTitle('Próxima Página') as HTMLButtonElement;
        fireEvent.click(nextButton);
        expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('deve desabilitar botão anterior na primeira página e botão próximo na última', () => {
        const { rerender } = render(
            <ReceiptsPagination
                currentPage={1}
                totalPages={2}
                totalItems={25}
                itemsPerPage={15}
                onPageChange={vi.fn()}
            />
        );

        const prevBtn1 = screen.getByTitle('Página Anterior') as HTMLButtonElement;
        const nextBtn1 = screen.getByTitle('Próxima Página') as HTMLButtonElement;
        expect(prevBtn1.disabled).toBe(true);
        expect(nextBtn1.disabled).toBe(false);

        rerender(
            <ReceiptsPagination
                currentPage={2}
                totalPages={2}
                totalItems={25}
                itemsPerPage={15}
                onPageChange={vi.fn()}
            />
        );

        const prevBtn2 = screen.getByTitle('Página Anterior') as HTMLButtonElement;
        const nextBtn2 = screen.getByTitle('Próxima Página') as HTMLButtonElement;
        expect(prevBtn2.disabled).toBe(false);
        expect(nextBtn2.disabled).toBe(true);
    });

    it('não deve renderizar nada se totalItems for 0', () => {
        const { container } = render(
            <ReceiptsPagination
                currentPage={1}
                totalPages={0}
                totalItems={0}
                itemsPerPage={15}
                onPageChange={vi.fn()}
            />
        );

        expect(container.firstChild).toBeNull();
    });
});
