// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { InboundPostImportActionModal } from './InboundPostImportActionModal';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';

afterEach(cleanup);

describe('InboundPostImportActionModal', () => {
    const mockInvoice = {
        id: 'inv-123',
        nfeNumber: '000129853',
        series: '1',
        emitterName: 'FORNECEDOR EXEMPLO LTDA',
        emitterTradeName: 'FORNECEDOR EXEMPLO',
        emitterCnpj: '00111222000133',
        totalInvoice: 1450.75,
        itemsCount: 3,
        items: [
            { itemNumber: 1, productCode: 'P1', productDescription: 'Produto 1', quantity: 2, unitCost: 100, totalCost: 200 },
            { itemNumber: 2, productCode: 'P2', productDescription: 'Produto 2', quantity: 5, unitCost: 50, totalCost: 250 },
            { itemNumber: 3, productCode: 'P3', productDescription: 'Produto 3', quantity: 10, unitCost: 100, totalCost: 1000 },
        ],
        status: 'pending',
        issuedAt: '2026-09-15',
    } as any as InboundInvoice;

    it('não renderiza nada se isOpen for false', () => {
        const { container } = render(
            <InboundPostImportActionModal
                isOpen={false}
                invoice={mockInvoice}
                onClose={vi.fn()}
                onManageMappings={vi.fn()}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renderiza os dados da nota fiscal salva corretamente', () => {
        render(
            <InboundPostImportActionModal
                isOpen={true}
                invoice={mockInvoice}
                onClose={vi.fn()}
                onManageMappings={vi.fn()}
            />
        );

        expect(screen.getByText('Nota Fiscal Adicionada!')).toBeDefined();
        expect(screen.getByText(/#000129853/)).toBeDefined();
        expect(screen.getByText('FORNECEDOR EXEMPLO')).toBeDefined();
        expect(screen.getByText('3 itens')).toBeDefined();
        expect(screen.getByRole('button', { name: /Gerenciar vínculos/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /Só fechar/i })).toBeDefined();
    });

    it('dispara onManageMappings ao clicar em "Gerenciar vínculos"', () => {
        const onManageMappings = vi.fn();
        const onClose = vi.fn();

        render(
            <InboundPostImportActionModal
                isOpen={true}
                invoice={mockInvoice}
                onClose={onClose}
                onManageMappings={onManageMappings}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Gerenciar vínculos/i }));
        expect(onManageMappings).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('dispara onClose ao clicar em "Só fechar"', () => {
        const onManageMappings = vi.fn();
        const onClose = vi.fn();

        render(
            <InboundPostImportActionModal
                isOpen={true}
                invoice={mockInvoice}
                onClose={onClose}
                onManageMappings={onManageMappings}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Só fechar/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onManageMappings).not.toHaveBeenCalled();
    });
});
